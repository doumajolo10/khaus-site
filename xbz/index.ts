// Função "khaus-xbz" (Supabase Edge Function): liga o site da Khaus à API da XBZ.
// Ações: auto (agendada), sincronizar, publicar, opcoes, pedidos, enviar, cancelar, status.
// O token fica nas secrets do Supabase (XBZ_CNPJ e XBZ_TOKEN), nunca no código.
import { createClient } from "npm:@supabase/supabase-js@2";
import * as C from "./core.js";

const BASE = "https://api.minhaxbz.com.br:5001/api/clientes/";
const LIMITE_DIA = Number(Deno.env.get("XBZ_LIMITE_DIA") || 12); // a XBZ liberou 12 acessos por dia
const RESERVA = 4;          // o automático para quando sobram 4, que ficam para pedidos e uso manual
const INTERVALO_MIN = 110;  // o automático não repete antes disso
const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, apikey, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};
const resp = (d: unknown, status = 200) => new Response(JSON.stringify(d), { status, headers: { ...CORS, "Content-Type": "application/json" } });

// meia-noite de hoje no horário de Brasília (UTC-3), em UTC
function inicioDoDia(): string {
  const agora = new Date(Date.now() - 3 * 3600e3);
  agora.setUTCHours(0, 0, 0, 0);
  return new Date(agora.getTime() + 3 * 3600e3).toISOString();
}
function horaBrasilia(): number { return new Date(Date.now() - 3 * 3600e3).getUTCHours(); }

async function usadasHoje(): Promise<number> {
  const { count } = await sb.from("khaus_xbz_log").select("id", { count: "exact", head: true }).like("acao", "xbz:%").gte("quando", inicioDoDia());
  return count || 0;
}

async function registra(acao: string, status: number | null, ok: boolean, detalhe: unknown) {
  await sb.from("khaus_xbz_log").insert({ acao, status, ok, detalhe });
}

type Chamada = { metodo?: string; corpo?: unknown; query?: Record<string, string> };
async function xbz(caminho: string, op: Chamada, acao: string, limite = LIMITE_DIA) {
  const cnpj = Deno.env.get("XBZ_CNPJ"), token = Deno.env.get("XBZ_TOKEN");
  if (!cnpj || !token) return { status: 0, dados: null, erro: "Faltam as secrets XBZ_CNPJ e XBZ_TOKEN no Supabase." };
  const usadas = await usadasHoje();
  if (usadas >= limite) return { status: 429, dados: null, erro: `Limite de consultas de hoje atingido (${usadas} de ${LIMITE_DIA}).` };
  const q = new URLSearchParams(op.query || {});
  const url = BASE + caminho + (q.toString() ? "?" + q : "");
  let status = 0, dados: unknown = null, erro = "";
  try {
    const r = await fetch(url, {
      method: op.metodo || "GET",
      headers: { cnpj, token, ...(op.corpo ? { "Content-Type": "application/json" } : {}) },
      body: op.corpo ? JSON.stringify(op.corpo) : undefined,
      signal: AbortSignal.timeout(110000)
    });
    status = r.status;
    const txt = await r.text();
    try { dados = JSON.parse(txt); } catch { dados = txt.slice(0, 500); }
    if (!r.ok) erro = ({ 401: "CNPJ ou token recusados pela XBZ.", 403: "A XBZ bloqueou: limite diário ou IP.", 500: "Erro interno da XBZ." } as Record<number, string>)[status] || `A XBZ respondeu ${status}.`;
  } catch (e) { erro = "Sem resposta da XBZ: " + (e as Error).message; }
  await registra(acao, status, !erro, { caminho, linhas: Array.isArray(dados) ? dados.length : null, erro: erro || undefined, resposta: erro ? dados : undefined });
  return { status, dados, erro };
}

async function baixa(bucket: string, nome: string) {
  const { data } = await sb.storage.from(bucket).download(nome);
  return data ? JSON.parse(await data.text()) : null;
}
async function sobe(bucket: string, nome: string, conteudo: string, cache = "60") {
  const { error } = await sb.storage.from(bucket).upload(nome, new Blob([conteudo], { type: "application/json" }), { upsert: true, contentType: "application/json", cacheControl: cache });
  if (error) throw new Error(`Falha ao gravar ${bucket}/${nome}: ${error.message}`);
}

// monta o catálogo público a partir do último retrato da XBZ + regras e ajustes do painel
async function publica(enxuto?: any[]) {
  const en = enxuto || await baixa("khaus-xbz", "enxuto.json");
  if (!en) throw new Error("Ainda não há dados da XBZ. Rode uma sincronização.");
  const { data: rg } = await sb.from("khaus_xbz_regras").select("regras").eq("id", 1).single();
  const { data: aj } = await sb.from("khaus_xbz_ajustes").select("*");
  const ajustes: Record<string, unknown> = {};
  for (const a of aj || []) ajustes[a.cod] = a;
  const quando = (await baixa("khaus-xbz", "meta.json"))?.sincronizado || new Date().toISOString();
  const { catalogo, descricoes, resumo } = C.montaCatalogo(en, rg?.regras || {}, ajustes, quando);
  await sobe("khaus-catalogo", "catalogo.json", JSON.stringify(catalogo));
  await sobe("khaus-catalogo", "resumo.json", JSON.stringify(resumo));
  await sobe("khaus-catalogo", "descricoes.json", JSON.stringify(descricoes), "3600");
  return { produtos: catalogo.p.length, categorias: catalogo.cats.length };
}

async function sincroniza(acao: string, limite: number) {
  // GetListaDeProdutos traz preço e estoque; o ProdutosListar desta conta só traz o cadastro (sem preço nem estoque)
  const r = await xbz("GetListaDeProdutos", { query: { cnpj: Deno.env.get("XBZ_CNPJ") || "", token: Deno.env.get("XBZ_TOKEN") || "" } }, "xbz:produtos", limite);
  if (r.erro) return { ok: false, erro: r.erro };
  const linhas = r.dados as Record<string, unknown>[];
  // proteção: uma resposta vazia ou muito menor que o normal não apaga o catálogo do site
  if (!Array.isArray(linhas) || linhas.length < 1000) {
    await registra(acao, r.status, false, { erro: "Resposta suspeita, catálogo mantido", linhas: Array.isArray(linhas) ? linhas.length : null });
    return { ok: false, erro: `A XBZ devolveu só ${Array.isArray(linhas) ? linhas.length : 0} linhas; mantive o catálogo anterior.` };
  }
  const novo = C.enxuga(linhas);
  const comPreco = novo.filter(p => p.v.some(v => v.custo > 0)).length;
  if (comPreco < 500) {
    await registra(acao, r.status, false, { erro: "Resposta sem preço, catálogo mantido", linhas: linhas.length, produtos: novo.length, comPreco });
    return { ok: false, erro: `A XBZ devolveu ${novo.length} produtos, mas só ${comPreco} com preço; mantive o catálogo anterior.` };
  }
  const antigo: any[] | null = await baixa("khaus-xbz", "enxuto.json");
  const antes = new Set((antigo || []).map(p => p.cod)), agora = new Set(novo.map(p => p.cod));
  const novos = novo.filter(p => !antes.has(p.cod)).map(p => p.cod);
  const saiu = antigo ? [...antes].filter(c => !agora.has(c)) : [];
  const quando = new Date().toISOString();
  await sobe("khaus-xbz", "enxuto.json", JSON.stringify(novo), "0");
  await sobe("khaus-xbz", "meta.json", JSON.stringify({ sincronizado: quando, linhas: linhas.length, produtos: novo.length, novos: novos.slice(0, 200), saiu: saiu.slice(0, 200) }), "0");
  const pub = await publica(novo);
  const resumo = { linhas: linhas.length, ...pub, novos: novos.length, saiu: saiu.length, semEstoque: novo.filter(p => !p.v.some(v => v.est > 0)).length };
  await registra(acao, 200, true, resumo);
  return { ok: true, ...resumo };
}

async function usuarioDaEquipe(req: Request): Promise<string | null> {
  const jwt = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (!jwt) return null;
  const { data } = await sb.auth.getUser(jwt);
  const email = data?.user?.email?.toLowerCase();
  if (!email) return null;
  const { data: eq } = await sb.from("khaus_equipe").select("email").ilike("email", email).maybeSingle();
  return eq ? email : null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  let corpo: Record<string, any> = {};
  try { corpo = await req.json(); } catch { /* sem corpo */ }
  const acao = String(corpo.acao || "auto");

  try {
    // agendada: qualquer um pode chamar, mas ela mesma se limita (horário, intervalo e reserva de consultas)
    if (acao === "auto") {
      const h = horaBrasilia();
      if (h < 6 || h > 22) return resp({ ok: true, pulou: "fora do horário" });
      const { data: ult } = await sb.from("khaus_xbz_log").select("quando").in("acao", ["sync:auto", "sync:manual"]).eq("ok", true).order("quando", { ascending: false }).limit(1);
      if (ult?.[0] && Date.now() - new Date(ult[0].quando).getTime() < INTERVALO_MIN * 60e3) return resp({ ok: true, pulou: "sincronizado há pouco" });
      return resp(await sincroniza("sync:auto", LIMITE_DIA - RESERVA));
    }

    const email = await usuarioDaEquipe(req);
    if (!email) return resp({ ok: false, erro: "Entre no painel com um login da equipe." }, 401);

    if (acao === "status") {
      const { data: log } = await sb.from("khaus_xbz_log").select("quando,acao,status,ok,detalhe").order("quando", { ascending: false }).limit(30);
      return resp({ ok: true, usadas: await usadasHoje(), limite: LIMITE_DIA, meta: await baixa("khaus-xbz", "meta.json"), log, temToken: !!Deno.env.get("XBZ_TOKEN") });
    }
    if (acao === "sincronizar") return resp(await sincroniza("sync:manual", LIMITE_DIA - 1));
    if (acao === "publicar") return resp({ ok: true, ...(await publica()) });

    if (acao === "opcoes") {
      const [ent, pag, emp] = [
        await xbz("EntregaTipoListar", {}, "xbz:entrega"),
        await xbz("PagamentoTipoListar", {}, "xbz:pagamento"),
        await xbz("EmpresasGravacaoTransportadoraListar", { query: { tipo: "0" } }, "xbz:empresas")
      ];
      const erro = ent.erro || pag.erro || emp.erro;
      if (erro) return resp({ ok: false, erro });
      const opcoes = { entrega: ent.dados, pagamento: pag.dados, empresas: emp.dados, quando: new Date().toISOString() };
      await sb.from("khaus_xbz_regras").update({ opcoes }).eq("id", 1);
      return resp({ ok: true, opcoes });
    }

    if (acao === "pedidos") {
      const dias = String(Math.min(180, Math.max(1, Number(corpo.dias) || 30)));
      const r = await xbz("PedidosListar", { query: { qtd_dias: dias, exibir_finalizados: "true", exibir_cancelados: "true" } }, "xbz:pedidos");
      if (r.erro) return resp({ ok: false, erro: r.erro });
      await sobe("khaus-xbz", "pedidos.json", JSON.stringify({ quando: new Date().toISOString(), dias, pedidos: r.dados }), "0");
      return resp({ ok: true, pedidos: r.dados });
    }

    if (acao === "enviar") {
      const itens = Array.isArray(corpo.itens) ? corpo.itens : [];
      const pagamentoTipoId = Number(corpo.pagamentoTipoId), entregaTipoId = Number(corpo.entregaTipoId);
      const empresa = Number(corpo.entregaTransportadoraGravacaoId) || 0;
      if (!itens.length) return resp({ ok: false, erro: "Pedido sem itens." }, 400);
      if (!pagamentoTipoId || !entregaTipoId) return resp({ ok: false, erro: "Escolha a forma de pagamento e o tipo de entrega." }, 400);
      if ((entregaTipoId === 30 || entregaTipoId === 40) && !empresa) return resp({ ok: false, erro: "Escolha a transportadora ou a empresa de gravação." }, 400);
      const linhas = itens.map((it: any) => ({
        ordemDeCompra: String(corpo.ordemDeCompra || "").slice(0, 40),
        pagamentoTipoId, entregaTipoId, entregaTransportadoraGravacaoId: empresa,
        produtoCodigoXbz: String(it.sku || ""), quantidade: Math.max(1, Math.round(Number(it.quantidade) || 0)),
        detalhes: String(corpo.detalhes || "").slice(0, 500)
      }));
      if (linhas.some((l: any) => !l.produtoCodigoXbz)) return resp({ ok: false, erro: "Item sem código XBZ." }, 400);
      const r = await xbz("PedidoEnviar", { metodo: "POST", corpo: linhas }, "xbz:enviar");
      const numero = Array.isArray(r.dados) && r.dados[0] ? String((r.dados[0] as any).numero || "") : "";
      await sb.from("khaus_xbz_pedidos").insert({ usuario: email, ordem: linhas[0].ordemDeCompra, itens: linhas, resposta: r.dados, status: r.status, numero });
      if (r.erro) {
        const motivo = ({ 400: "formato inválido", 406: "produto não identificado", 407: "quantidade inválida", 408: "tipo de entrega não informado", 409: "transportadora ou gravação inválida", 410: "forma de pagamento não informada", 411: "não há estoque para a quantidade pedida" } as Record<number, string>)[r.status];
        return resp({ ok: false, erro: motivo ? `A XBZ recusou: ${motivo}.` : r.erro, resposta: r.dados });
      }
      return resp({ ok: true, numero, resposta: r.dados });
    }

    if (acao === "cancelar") {
      const numero = String(corpo.numero || "").trim();
      if (!numero) return resp({ ok: false, erro: "Informe o número do pedido." }, 400);
      const r = await xbz("PedidoCancelar", { metodo: "PUT", corpo: [{ numero }] }, "xbz:cancelar");
      if (r.erro) {
        const motivo = ({ 404: "número de pedido não reconhecido", 409: "pedido já estava cancelado", 422: "pedido já entrou em produção e não pode ser cancelado por aqui" } as Record<number, string>)[r.status];
        return resp({ ok: false, erro: motivo ? `A XBZ recusou: ${motivo}.` : r.erro });
      }
      return resp({ ok: true, resposta: r.dados });
    }

    return resp({ ok: false, erro: "Ação desconhecida." }, 400);
  } catch (e) {
    await registra("erro:" + acao, null, false, { erro: (e as Error).message });
    return resp({ ok: false, erro: (e as Error).message }, 500);
  }
});
