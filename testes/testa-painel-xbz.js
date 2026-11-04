// Aba "XBZ e preços" do painel, com Supabase e função khaus-xbz de mentira (nenhuma consulta real à XBZ).
// Precisa de dados/enxuto.json (retrato privado da XBZ, fora do git). Uso: node testes/testa-painel-xbz.js [url]
const puppeteer = require("C:/Users/Douglas/Desktop/CLAUDE/majex-produtos/node_modules/puppeteer-core");
const path = require("path"), fs = require("fs");
const falso = require("./supabase-falso.js");
const CAT = require("../painel/catalogo.json");
const ENX = fs.readFileSync(path.join(__dirname, "..", "dados", "enxuto.json"), "utf8");
const B = process.argv[2] || "http://localhost:4060";
const EQ = "equipe@khaus.test", SENHA = "senha-teste-1";
const SH = path.join(__dirname, "shots");
let falhas = 0; const ok = (c, m) => { if (c) console.log("  ok  " + m); else { falhas++; console.log("  FALHA " + m); } };
const espera = ms => new Promise(r => setTimeout(r, ms));
const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*", "Access-Control-Allow-Methods": "GET, POST, PATCH, PUT, DELETE, OPTIONS" };

(async () => {
  const b = await puppeteer.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: true, args: ["--no-sandbox"] });
  const erros = [];
  const F = falso({ produtos: CAT.produtos, config: {}, equipe: [EQ], usuarios: { [EQ]: SENHA } });
  const X = { regras: {}, opcoes: {}, ajustes: [], pedidosTab: [], chamadas: [], usadas: 2 };
  const json = (req, status, corpo) => req.respond({ status, headers: CORS, contentType: "application/json", body: JSON.stringify(corpo) });
  async function trataXbz(req) {
    const u = new URL(req.url()); if (!/supabase\.co$/.test(u.host)) return false;
    const p = u.pathname, m = req.method();
    if (m === "OPTIONS") { await req.respond({ status: 204, headers: CORS, body: "" }); return true; }
    let c = null; try { c = req.postData() ? JSON.parse(req.postData()) : null; } catch (e) { }
    if (p === "/rest/v1/khaus_xbz_regras") { if (m === "GET") return json(req, 200, [{ regras: X.regras, opcoes: X.opcoes }]), true; X.regras = c.regras; return req.respond({ status: 204, headers: CORS, body: "" }), true; }
    if (p === "/rest/v1/khaus_xbz_ajustes") { if (m === "GET") return json(req, 200, X.ajustes), true; const ls = Array.isArray(c) ? c : [c]; X.ajustes = X.ajustes.filter(a => !ls.some(l => l.cod === a.cod)).concat(ls); return json(req, 201, ls), true; }
    if (p === "/rest/v1/khaus_xbz_pedidos") return json(req, 200, X.pedidosTab), true;
    if (p === "/storage/v1/object/authenticated/khaus-xbz/enxuto.json") return req.respond({ status: 200, headers: CORS, contentType: "application/json", body: ENX }), true;
    if (p.startsWith("/storage/v1/object/authenticated/khaus-xbz/")) return json(req, 404, { message: "not found" }), true;
    if (p === "/functions/v1/khaus-xbz") {
      X.chamadas.push(c);
      const a = c.acao;
      if (a === "status") return json(req, 200, { ok: true, usadas: X.usadas, limite: 12, temToken: true, meta: { sincronizado: "2026-11-04T13:00:00Z", produtos: 3732, novos: ["19300"], saiu: [] }, log: [{ quando: "2026-11-04T13:00:00Z", acao: "sync:auto", ok: true, status: 200, detalhe: { produtos: 3625, novos: 1, semEstoque: 107 } }] }), true;
      if (a === "publicar") return json(req, 200, { ok: true, produtos: 3625, categorias: 24 }), true;
      if (a === "opcoes") { X.usadas += 3; X.opcoes = { pagamento: [{ id: 1, nome: "Boleto 28 dias" }], entrega: [{ id: 10, nome: "Retirada" }, { id: 30, nome: "Transportadora" }], empresas: [{ id: 77, textoCombo: "[123] Transportadora Teste" }], quando: new Date().toISOString() }; return json(req, 200, { ok: true, opcoes: X.opcoes }), true; }
      if (a === "enviar") { X.usadas++; return json(req, 200, { ok: true, numero: "P-000123", resposta: [] }), true; }
      if (a === "pedidos") { X.usadas++; return json(req, 200, { ok: true, pedidos: [{ numero: "P-000123", dataEmissao: "2026-11-04T14:00:00", ordemDeCompra: "KH-0411-ABC", produtoCodigoComposto: "19114-PRE", quantidade: 100, pedidoValorTotal: 3650, statusLogistico: "PEDIDO EMITIDO" }] }), true; }
      return json(req, 400, { ok: false, erro: "ação falsa não prevista" }), true;
    }
    return false;
  }
  const ctx = await b.createBrowserContext(); const pg = await ctx.newPage(); await pg.setViewport({ width: 1366, height: 900 });
  await pg.setRequestInterception(true);
  pg.on("request", async r => { if (await trataXbz(r)) return; if (await F.trata(r)) return; r.continue(); });
  pg.on("pageerror", e => erros.push(e.message)); pg.on("console", m => { if (m.type() === "error" && !/Failed to load resource/.test(m.text())) erros.push(m.text()); });
  const clica = s => pg.$eval(s, e => e.click());

  console.log("== entrar e abrir a aba");
  await pg.goto(B + "/painel", { waitUntil: "networkidle2" });
  await pg.type("#e-email", EQ); await pg.type("#e-senha", SENHA); await clica("#b-entrar");
  await pg.waitForSelector(".cartao", { timeout: 10000 });
  ok(await pg.$('[data-ir="xbz"]') !== null, "aba XBZ e preços no menu");
  await pg.goto(B + "/painel#xbz", { waitUntil: "networkidle2" }); await pg.waitForSelector("#x-regra", { timeout: 10000 });
  ok(/2 de 12/.test(await pg.$eval(".xcards", e => e.textContent)), "mostra as consultas usadas no dia");
  ok(/custo/.test(await pg.$eval("#x-exemplo", e => e.textContent)), "exemplo de preço calculado");
  const pend = await pg.$$eval(".xpend li", l => l.map(x => x.textContent));
  ok(pend.some(t => /demonstração/.test(t)) && pend.some(t => /repetidos/.test(t)), "lista as pendências antes de vender (" + pend.length + ")");
  await pg.screenshot({ path: path.join(SH, "painel-xbz-1.png"), fullPage: true });

  console.log("== regra de preço");
  await pg.$eval('[name="multiplicador"]', e => { e.value = "2"; e.dispatchEvent(new Event("input", { bubbles: true })); });
  ok(/R\$\s?13,90/.test(await pg.$eval("#x-exemplo", e => e.textContent)), "custo 5 × 2 + 3 = R$ 13,90 no exemplo");
  await pg.$eval('[data-cat="copos"] [data-k="multiplicador"]', e => { e.value = "2.2"; e.dispatchEvent(new Event("input", { bubbles: true })); });
  await clica("#x-salvar"); await espera(800);
  ok(X.regras.multiplicador === 2 && X.regras.categorias.copos.multiplicador === 2.2, "grava a regra geral e a da categoria");
  ok(X.chamadas.some(c => c.acao === "publicar"), "publica o catálogo depois de salvar");
  await pg.waitForSelector("#x-regra", { timeout: 8000 });
  await pg.$eval('[name="demo"]', e => e.click()); await pg.evaluate(() => document.querySelector("#x-salvar").click()); await espera(900);
  ok(X.regras.demo === false && F.db.config.some(c => c.chave === "precosDemo" && c.valor === false), "desligar a demonstração vale para o site todo");

  console.log("== repetidos");
  await pg.goto(B + "/painel#xbz/repetidos", { waitUntil: "networkidle2" }); await pg.waitForSelector("[data-rep]", { timeout: 15000 });
  const nRep = await pg.$$eval("[data-rep='mesmo']", l => l.length);
  ok(nRep >= 5 && nRep <= 70, "sugere repetidos para conferir (" + nRep + ")");
  const par = await pg.$eval("[data-rep='mesmo']", b => { const tr = b.closest("tr"); return [tr.dataset.cod, tr.dataset.kh]; });
  await pg.$eval("[data-rep='mesmo']", b => b.click()); await espera(1500);
  ok(X.ajustes.some(a => a.cod === par[0] && a.oculto === true && a.vinculo === par[1]), "“É o mesmo” esconde o da XBZ e liga ao produto da Khaus");
  const par2 = await pg.$eval("[data-rep='dif']", b => { const tr = b.closest("tr"); return [tr.dataset.cod, tr.dataset.kh]; });
  await pg.$eval("[data-rep='dif']", b => b.click()); await espera(1200);
  ok(X.ajustes.some(a => a.cod === par2[0] && a.vinculo === "!" + par2[1] && !a.oculto), "“São diferentes” some da lista sem esconder nada");
  ok((await pg.$$eval("[data-rep='mesmo']", l => l.length)) === nRep - 2, "lista diminui depois de decidir");
  await pg.screenshot({ path: path.join(SH, "painel-xbz-repetidos.png") });

  console.log("== produtos");
  await pg.goto(B + "/painel#xbz/produtos", { waitUntil: "networkidle2" }); await pg.waitForSelector("#xp-l tr[data-cod]", { timeout: 15000 });
  ok(/3\.7\d\d produtos/.test(await pg.$eval("#xp-conta", e => e.textContent)), "lista os produtos da XBZ: " + await pg.$eval("#xp-conta", e => e.textContent));
  await pg.type("#xp-q", "19114"); await espera(400);
  const linha = await pg.$eval("#xp-l tr", e => e.textContent);
  ok(/Copo Térmico 700ml/.test(linha) && /36,50/.test(linha), "mostra custo do copo 19114 (R$ 36,50)");
  ok(/R\$\s?83,90/.test(linha), "preço no site com a margem dos copos (36,50 × 2,2 + 3 = 83,30 → 83,90)");
  await pg.$eval("#xp-l [data-vis]", e => e.click()); await espera(1600);
  ok(X.ajustes.some(a => a.cod === "19114" && a.oculto === true), "ocultar grava o ajuste");
  ok(X.chamadas.filter(c => c.acao === "publicar").length >= 2, "ocultar republica o site");
  await pg.screenshot({ path: path.join(SH, "painel-xbz-2.png") });
  console.log("== vários de uma vez");
  await pg.goto(B + "/painel#xbz/produtos", { waitUntil: "networkidle2" }); await pg.waitForSelector("#xp-l tr[data-cod]", { timeout: 15000 });
  ok(await pg.$eval('.abas [data-ir="xbz/produtos"]', e => e.getAttribute("aria-current") === "page"), "“Produtos da XBZ” direto no menu do painel");
  await pg.$eval("#xp-q", e => { e.value = ""; e.dispatchEvent(new Event("input", { bubbles: true })); });
  await pg.select("#xp-cat", "brinquedos"); await espera(400);
  const nBrinq = +(await pg.$eval("#xp-conta", e => e.textContent)).replace(/[^0-9]/g, "");
  await pg.$eval("#xp-todos", e => e.click()); await espera(200);
  ok(/50 selecionados/.test(await pg.$eval("#xp-sel", e => e.textContent)), "marca os 50 da página");
  await pg.$eval('#xp-sel [data-acao="filtrados"]', e => e.click()); await espera(200);
  ok(new RegExp(nBrinq + " selecionados").test(await pg.$eval("#xp-sel", e => e.textContent)), "seleciona todos os " + nBrinq + " da busca");
  const antes = X.chamadas.filter(c => c.acao === "publicar").length;
  await pg.$eval('#xp-sel [data-acao="ocultar"]', e => e.click()); await pg.waitForSelector(".dialogo", { timeout: 5000 });
  await pg.$$eval(".dialogo .dacoes button", l => l[l.length - 1].click()); await espera(1500);
  ok(X.ajustes.filter(a => a.oculto).length >= nBrinq, "ocultou todos de uma vez (" + X.ajustes.filter(a => a.oculto).length + ")");
  ok(X.chamadas.filter(c => c.acao === "publicar").length === antes + 1, "publica o site uma vez só");
  await pg.screenshot({ path: path.join(SH, "painel-xbz-lote.png") });


  console.log("== pedido");
  await pg.goto(B + "/painel#xbz/pedidos", { waitUntil: "networkidle2" }); await pg.waitForSelector("#xn-txt", { timeout: 15000 });
  await pg.type("#xn-txt", "Olá, Khaus! Quero um orçamento (KH-0411-ABC):\n\n1. Copo Térmico 700ml — Preto\n   Ref. 19114-PRE · 100 un. × R$ 66,14 = R$ 6.614,00\n\n2. Kit churrasco\n   Ref. kit-churrasco-2-pecas · 5 un.");
  await clica("#xn-ler"); await espera(300);
  ok((await pg.$$eval("#xn-itens tbody tr", l => l.length)) === 2, "lê os 2 itens da mensagem");
  ok(/Não é um item da XBZ/.test(await pg.$eval("#xn-itens", e => e.textContent)), "avisa que o kit da Khaus não vai no pedido");
  ok(await pg.$eval("#xn-ordem", e => e.value) === "KH-0411-ABC", "pega o código do orçamento como ordem de compra");
  await clica("#xn-op"); await pg.waitForSelector('#xn-pag option[value="1"]', { timeout: 8000 });
  await pg.select("#xn-pag", "1"); await pg.select("#xn-ent", "10");
  await clica("#xn-enviar"); await espera(600); console.log("     avisos:", await pg.$eval("#avisos", e => e.textContent), "| itens:", await pg.$$eval("#xn-itens tbody tr", l => l.length)); await pg.waitForSelector(".dialogo", { timeout: 5000 });
  ok(/pedido de verdade/.test(await pg.$eval(".dialogo", e => e.textContent)), "pede confirmação antes de enviar");
  await pg.screenshot({ path: path.join(SH, "painel-xbz-3.png") });
  await pg.$$eval(".dialogo .dacoes button", l => l[l.length - 1].click()); await espera(900);
  const env = X.chamadas.find(c => c.acao === "enviar");
  ok(env && env.itens.length === 1 && env.itens[0].quantidade === 100 && /^X/.test(env.itens[0].sku) && env.ordemDeCompra === "KH-0411-ABC", "envia só o item da XBZ, com o SKU e a quantidade");
  await clica("#xp-cons"); await espera(900);
  ok(/PEDIDO EMITIDO/.test(await pg.content()), "consulta mostra a situação do pedido");

  ok(!erros.length, "sem erros" + (erros.length ? ": " + erros.slice(0, 3).join(" | ") : ""));
  await b.close();
  console.log(falhas ? `\n${falhas} FALHA(S)` : "\nTudo certo.");
  process.exit(falhas ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
