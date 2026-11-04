/* Khaus · Painel · aba "XBZ e preços": integração com a API da XBZ.
   Visão geral (atualização e consultas do dia), regra de preço, produtos da XBZ (custo, preço no site, ocultar/destacar)
   e pedidos (montar a partir da mensagem do orçamento, enviar, acompanhar e cancelar).
   Usa as funções do painel expostas em window.KhausPainel e o núcleo /xbz/core.js. */
(function () {
  "use strict";
  const K = () => window.KhausPainel;
  let C = null;
  const X = { en: null, aj: {}, regras: null, opcoes: {}, status: null, f: { q: "", cat: "", vis: "" }, pag: 1, ped: null, hist: null, novo: [], ordem: "", det: "" };
  const CDN = "https://cdn.xbzbrindes.com.br/img/produtos/";
  const foto = (img, t) => !img ? "" : /^https?:/.test(img) ? img : CDN + (t || 1) + "/" + img;
  const ehDemo = () => K().DEMO;

  async function core() { if (!C) C = await import("/xbz/core.js"); return C; }
  async function fn(acao, corpo) {
    const k = K();
    const faz = async () => fetch(k.S.url + "/functions/v1/khaus-xbz", { method: "POST", headers: { apikey: k.S.chave, Authorization: "Bearer " + (await k.token()), "Content-Type": "application/json" }, body: JSON.stringify(Object.assign({ acao }, corpo || {})) });
    let r; try { r = await faz(); if (r.status === 401) { await k.renova(); r = await faz(); } } catch (e) { return { ok: false, erro: "Sem conexão com a internet." }; }
    return r.json().catch(() => ({ ok: false, erro: "Resposta inválida do servidor (" + r.status + ")." }));
  }
  async function privado(nome) {
    const k = K();
    try {
      const r = await fetch(k.S.url + "/storage/v1/object/authenticated/khaus-xbz/" + nome, { headers: { apikey: k.S.chave, Authorization: "Bearer " + (await k.token()) }, cache: "no-store" });
      return r.ok ? r.json() : null;
    } catch (e) { return null; }
  }
  const hora = s => s ? new Date(s).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "—";
  const pct = v => (Math.round(v * 10) / 10).toLocaleString("pt-BR") + "%";

  /* ---------- casca da aba ---------- */
  function pagina(sub, html) {
    const k = K();
    const subs = [["xbz", "Visão geral e preços"], ["xbz/produtos", "Produtos da XBZ"], ["xbz/pedidos", "Pedidos na XBZ"]];
    k.app.innerHTML = k.casca(`<div class="cab-lista"><div><h1>XBZ e preços</h1><p class="sub">Catálogo da XBZ ligado ao site: estoque atualizado sozinho, preço calculado pela sua margem.</p></div></div>
<nav class="xsub" aria-label="Partes da integração">${subs.map(([h, t]) => `<a href="#${h}" data-ir="${h}"${sub === h ? ' aria-current="page"' : ""}>${t}</a>`).join("")}</nav>
<div class="blocos" id="xcorpo">${html}</div>`, "xbz");
    k.ligaCasca();
  }
  function carregando(sub) { pagina(sub, '<div class="carregando-tela" role="status" aria-label="Carregando"></div>'); }

  async function tela(h) {
    const sub = h.startsWith("xbz/produtos") ? "xbz/produtos" : h.startsWith("xbz/pedidos") ? "xbz/pedidos" : "xbz";
    document.title = "XBZ e preços · Painel Khaus";
    if (ehDemo()) return pagina(sub, `<section class="bloco"><h2>Indisponível no modo demonstração</h2><p class="sub">A integração com a XBZ usa o banco de verdade. Entre no painel sem o <b>?demo</b> no endereço.</p></section>`);
    carregando(sub);
    try {
      await core();
      if (!X.regras) {
        const r = await K().rest("khaus_xbz_regras?select=regras,opcoes&id=eq.1");
        X.regras = Object.assign({}, C.REGRAS_PADRAO, (r && r[0] && r[0].regras) || {});
        X.opcoes = (r && r[0] && r[0].opcoes) || {};
      }
      if (sub === "xbz") return visao();
      if (!X.en) {
        const [en, aj] = await Promise.all([privado("enxuto.json"), K().rest("khaus_xbz_ajustes?select=*")]);
        X.en = en || [];
        X.aj = {}; (aj || []).forEach(a => { X.aj[a.cod] = a; });
      }
      if (sub === "xbz/produtos") return produtos();
      return pedidos();
    } catch (er) { K().trataErro(er); }
  }

  /* ---------- visão geral e regra de preço ---------- */
  async function visao() {
    const st = X.status = await fn("status");
    const k = K(), R = X.regras;
    const semToken = st.ok && !st.temToken;
    const meta = st.meta || {};
    const ult = (st.log || []).find(l => /^sync:/.test(l.acao));
    const cats = C.CATEGORIAS.map(c => c[0]).concat("outros");
    const linhaLog = l => `<tr><td>${hora(l.quando)}</td><td>${esc(rotuloAcao(l.acao))}</td><td>${l.ok ? '<span class="xok">ok</span>' : '<span class="xerro">falhou</span>'}</td><td>${esc(resumoLog(l))}</td></tr>`;
    pagina("xbz", `
<section class="bloco"><h2>${k.I.relogio}Atualização automática</h2>
  <div class="conteudo">
    ${!st.ok ? `<div class="msg msg-erro">${esc(st.erro || "Não foi possível ler a situação da integração.")}</div>` : ""}
    ${semToken ? `<div class="msg msg-erro"><b>Falta o token da XBZ.</b> Cadastre as secrets <code>XBZ_CNPJ</code> e <code>XBZ_TOKEN</code> no Supabase (Edge Functions → Secrets). Sem isso o catálogo não atualiza.</div>` : ""}
    <div class="xcards">
      <div><span>Última atualização</span><b>${meta.sincronizado ? hora(meta.sincronizado) : "Ainda não rodou"}</b><small>${meta.produtos ? k.num(meta.produtos) + " produtos da XBZ" : ""}</small></div>
      <div><span>Consultas usadas hoje</span><b>${st.usadas ?? "—"} de ${st.limite ?? 12}</b><small>8 automáticas por dia; o resto fica para pedidos</small></div>
      <div><span>Novidades na última</span><b>${meta.novos ? meta.novos.length : 0} novos · ${meta.saiu ? meta.saiu.length : 0} saíram</b><small>${ult && !ult.ok ? "A última tentativa falhou" : "Atualiza às 7h, 9h, 11h, 13h, 15h, 17h, 19h e 21h"}</small></div>
    </div>
    <div class="xacoes"><button type="button" class="btn btn-azul" id="x-sync"${semToken ? " disabled" : ""}>${k.I.envia}Atualizar agora (1 consulta)</button><a class="btn btn-linha" href="${k.SITE_PUB}/catalogo" target="_blank" rel="noopener">${k.I.externo}Ver o catálogo no site</a></div>
  </div></section>

<form class="bloco" id="x-regra" novalidate><h2>${k.I.etiqueta}Regra de preço</h2><p class="sub">O site nunca mostra o custo. O preço de venda é calculado assim, para todos os produtos da XBZ.</p>
  <div class="conteudo">
    <div class="xform">
      <label class="campo"><span>Multiplicar o custo por</span><input class="ent num" name="multiplicador" type="number" step="0.05" min="1" value="${R.multiplicador}"></label>
      <label class="campo"><span>Somar por unidade (R$)</span><input class="ent num" name="acrescimo" type="number" step="0.10" min="0" value="${R.acrescimo}"></label>
      <label class="campo"><span>Quantidade mínima</span><input class="ent num" name="minimo" type="number" step="1" min="1" value="${R.minimo}"></label>
    </div>
    <div class="xexemplo" id="x-exemplo"></div>
    <label class="interruptor"><input type="checkbox" name="final90"${R.final90 ? " checked" : ""}><span>Arredondar para terminar em <b>,90</b> (acima de R$ 10)</span></label>
    <div><b class="xrot">Desconto por quantidade</b><p class="dica">A partir de quantas unidades cada desconto vale. O site mostra a tabela na ficha do produto.</p>
      <div class="xfaixas" id="x-faixas">${R.faixas.map((f, i) => faixaHtml(f, i)).join("")}</div>
      <button type="button" class="btn btn-linha" id="x-faixa-mais">${k.I.mais}Incluir faixa</button></div>
    <details class="xdet"><summary>Margem diferente por categoria</summary><p class="dica">Deixe em branco para usar a regra geral.</p>
      <div class="xcat-tab"><div class="xcat-cab"><span>Categoria</span><span>Multiplicar por</span><span>Somar R$</span><span>Mínimo</span></div>
      ${cats.map(id => { const c = (R.categorias || {})[id] || {}; return `<div class="xcat-l" data-cat="${id}"><span>${esc(C.CAT_NOME[id])}</span><input class="ent num" data-k="multiplicador" type="number" step="0.05" value="${c.multiplicador ?? ""}" placeholder="${R.multiplicador}" aria-label="Multiplicador de ${esc(C.CAT_NOME[id])}"><input class="ent num" data-k="acrescimo" type="number" step="0.10" value="${c.acrescimo ?? ""}" placeholder="${R.acrescimo}" aria-label="Acréscimo de ${esc(C.CAT_NOME[id])}"><input class="ent num" data-k="minimo" type="number" step="1" value="${c.minimo ?? ""}" placeholder="${R.minimo}" aria-label="Mínimo de ${esc(C.CAT_NOME[id])}"></div>`; }).join("")}</div></details>
    <label class="interruptor"><input type="checkbox" name="esconderSemEstoque"${R.esconderSemEstoque ? " checked" : ""}><span>Esconder do site os produtos sem estoque e sem data de reposição</span></label>
    <label class="interruptor"><input type="checkbox" name="demo"${R.demo ? " checked" : ""}><span>Mostrar no site que os preços são <b>valores de demonstração</b></span></label>
  </div>
  <div class="rodape-ed"><div class="estado" id="estado">Tudo salvo.</div><button type="submit" class="btn btn-azul" id="x-salvar">Salvar e publicar no site</button></div>
</form>

<section class="bloco"><h2>${k.I.lista}Registro</h2><p class="sub">Tudo o que a integração fez, do mais novo para o mais antigo.</p>
  <div class="conteudo"><div class="xtab-wrap"><table class="xtab"><thead><tr><th>Quando</th><th>O quê</th><th></th><th>Detalhe</th></tr></thead><tbody>${(st.log || []).map(linhaLog).join("") || '<tr><td colspan="4">Nada ainda.</td></tr>'}</tbody></table></div></div></section>`);

    const f = $("#x-regra");
    const marca = () => { const e = $("#estado"); e.className = "estado sujo"; e.textContent = "Alterações não salvas"; exemplo(); };
    f.addEventListener("input", marca); f.addEventListener("change", marca);
    f.addEventListener("click", e => {
      const t = e.target.closest("[data-tira-faixa]"); if (t) { t.closest(".xfaixa").remove(); marca(); }
      if (e.target.closest("#x-faixa-mais")) { const box = $("#x-faixas"); box.insertAdjacentHTML("beforeend", faixaHtml([0, 0], box.children.length)); marca(); }
    });
    f.addEventListener("submit", async e => { e.preventDefault(); await salvaRegra(); });
    $("#x-sync").addEventListener("click", sincroniza);
    exemplo();
  }
  function faixaHtml(f, i) { return `<div class="xfaixa"><span>A partir de</span><input class="ent num" data-fq type="number" min="1" value="${f[0] || ""}" aria-label="Quantidade da faixa ${i + 1}"><span>un.</span><input class="ent num" data-fp type="number" min="0" max="80" step="0.5" value="${f[1] ?? ""}" aria-label="Desconto da faixa ${i + 1}"><span>% de desconto</span><button type="button" class="ico-btn" data-tira-faixa aria-label="Tirar a faixa">${K().I.x}</button></div>`; }
  function leRegra() {
    const f = $("#x-regra"), v = n => f.elements[n];
    const r = Object.assign({}, X.regras);
    r.multiplicador = +v("multiplicador").value || 1; r.acrescimo = +v("acrescimo").value || 0; r.minimo = Math.max(1, Math.round(+v("minimo").value || 1));
    r.final90 = v("final90").checked; r.demo = v("demo").checked; r.esconderSemEstoque = v("esconderSemEstoque").checked;
    r.faixas = $$(".xfaixa", f).map(l => [Math.round(+$("[data-fq]", l).value || 0), +$("[data-fp]", l).value || 0]).filter(x => x[0] > 0).sort((a, b) => a[0] - b[0]);
    r.categorias = {};
    $$(".xcat-l", f).forEach(l => { const o = {}; $$("input", l).forEach(i => { if (i.value !== "") o[i.dataset.k] = +i.value; }); if (Object.keys(o).length) r.categorias[l.dataset.cat] = o; });
    return r;
  }
  function exemplo() {
    const r = leRegra(), g = C.regrasDe(r, "");
    const ex = [5, 20, 60].map(c => { const p = C.precoVenda(c, g); return `custo <b>${K().BRL(c)}</b> → site <b>${K().BRL(p)}</b> <small>(${pct((p / c - 1) * 100)} sobre o custo)</small>`; });
    const ult = r.faixas[r.faixas.length - 1];
    $("#x-exemplo").innerHTML = `<span>Exemplos na quantidade mínima:</span> ${ex.join(" · ")}${ult ? `<br><span>Com ${K().num(ult[0])}+ un.:</span> ${ult[1]}% a menos.` : ""}`;
  }
  async function salvaRegra() {
    const r = leRegra();
    if (!(r.multiplicador >= 1)) return K().aviso("O multiplicador precisa ser 1 ou mais (abaixo de 1 vende abaixo do custo).", { erro: true });
    if (!r.faixas.length) return K().aviso("Inclua pelo menos uma faixa de quantidade.", { erro: true });
    const b = $("#x-salvar"); b.classList.add("carregando"); b.disabled = true;
    try {
      await K().rest("khaus_xbz_regras?id=eq.1", { metodo: "PATCH", corpo: { regras: r, atualizado: new Date().toISOString() }, prefer: "return=minimal" });
      X.regras = r;
      const p = await fn("publicar");
      if (!p.ok) throw new Error(p.erro || "Não consegui publicar.");
      K().aviso(`Regra salva. O site já mostra os preços novos em ${K().num(p.produtos)} produtos.`, { link: ["Ver no site", K().SITE_PUB + "/catalogo"] });
      const e = $("#estado"); e.className = "estado"; e.textContent = "Tudo salvo.";
    } catch (er) { K().trataErro(er); }
    b.classList.remove("carregando"); b.disabled = false;
  }
  async function sincroniza() {
    const b = $("#x-sync"); b.classList.add("carregando"); b.disabled = true;
    const r = await fn("sincronizar");
    b.classList.remove("carregando"); b.disabled = false;
    if (!r.ok) return K().aviso(r.erro || "A atualização falhou.", { erro: true });
    X.en = null;
    K().aviso(`Catálogo atualizado: ${K().num(r.produtos)} produtos, ${r.novos} novos, ${r.semEstoque} sem estoque.`);
    visao();
  }
  function rotuloAcao(a) {
    return ({ "sync:auto": "Atualização automática", "sync:manual": "Atualização pelo painel", "xbz:produtos": "Consulta de produtos", "xbz:pedidos": "Consulta de pedidos", "xbz:enviar": "Pedido enviado", "xbz:cancelar": "Cancelamento", "xbz:entrega": "Opções de entrega", "xbz:pagamento": "Formas de pagamento", "xbz:empresas": "Transportadoras e gravação" })[a] || a;
  }
  function resumoLog(l) {
    const d = l.detalhe || {};
    if (d.erro) return d.erro;
    if (/^sync/.test(l.acao)) return `${K().num(d.produtos || 0)} produtos · ${d.novos || 0} novos · ${d.semEstoque || 0} sem estoque`;
    if (d.linhas != null) return `${K().num(d.linhas)} linhas`;
    return "";
  }

  /* ---------- produtos ---------- */
  function linhaProd(it) {
    const a = X.aj[it.cod] || {};
    const cat = a.categoria || C.categoria(it.nome);
    const regra = C.regrasDe(X.regras, cat);
    if (a.multiplicador != null) regra.multiplicador = +a.multiplicador;
    if (a.acrescimo != null) regra.acrescimo = +a.acrescimo;
    if (a.minimo) regra.minimo = +a.minimo;
    const vs = it.v.filter(v => v.custo > 0);
    const custo = vs.length ? Math.min(...vs.map(v => v.custo)) : 0;
    return { it, a, cat, custo, preco: C.precoVenda(custo, regra), min: regra.minimo, est: it.v.reduce((s, v) => s + v.est, 0), img: (it.v.find(v => v.img) || {}).img, nome: a.nome || C.nomeBonito(it.nome) };
  }
  function produtos() {
    const k = K();
    const cats = C.CATEGORIAS.map(c => c[0]).concat("outros");
    pagina("xbz/produtos", `
<section class="bloco"><div class="conteudo">
  ${!X.en.length ? `<div class="msg msg-erro">Ainda não há dados da XBZ. Rode “Atualizar agora” em Visão geral.</div>` : ""}
  <div class="barra"><div class="busca">${k.I.busca}<input class="ent" id="xp-q" type="search" placeholder="Buscar por nome ou código" value="${esc(X.f.q)}" aria-label="Buscar"></div>
    <select class="ent" id="xp-cat" aria-label="Categoria"><option value="">Todas as categorias</option>${cats.map(id => `<option value="${id}"${X.f.cat === id ? " selected" : ""}>${esc(C.CAT_NOME[id])}</option>`).join("")}</select>
    <select class="ent" id="xp-vis" aria-label="Situação"><option value="">Todos</option><option value="oculto"${X.f.vis === "oculto" ? " selected" : ""}>Ocultos no site</option><option value="destaque"${X.f.vis === "destaque" ? " selected" : ""}>Em destaque</option><option value="ajustado"${X.f.vis === "ajustado" ? " selected" : ""}>Com margem própria</option><option value="sem"${X.f.vis === "sem" ? " selected" : ""}>Sem estoque</option></select></div>
  <p class="dica" id="xp-conta"></p>
  <div class="xtab-wrap"><table class="xtab xprod"><thead><tr><th></th><th>Produto</th><th class="n">Custo</th><th class="n">No site</th><th class="n">Estoque</th><th>No site</th><th></th></tr></thead><tbody id="xp-l"></tbody></table></div>
  <div class="xpag" id="xp-pag"></div>
</div></section>`);
    const pinta = () => {
      const q = k.sem(X.f.q).trim();
      const todos = X.en.map(linhaProd).filter(r =>
        (!X.f.cat || r.cat === X.f.cat) &&
        (!X.f.vis || (X.f.vis === "oculto" ? r.a.oculto : X.f.vis === "destaque" ? r.a.destaque : X.f.vis === "ajustado" ? (r.a.multiplicador != null || r.a.acrescimo != null || r.a.minimo) : !r.est)) &&
        (!q || k.sem(r.nome + " " + r.it.nome + " " + r.it.cod + " " + r.it.v.map(v => v.comp).join(" ")).includes(q)));
      const POR = 50, tot = Math.max(1, Math.ceil(todos.length / POR)); X.pag = Math.min(X.pag, tot);
      $("#xp-conta").textContent = `${k.num(todos.length)} ${todos.length === 1 ? "produto" : "produtos"}`;
      $("#xp-l").innerHTML = todos.slice((X.pag - 1) * POR, X.pag * POR).map(r => `<tr data-cod="${esc(r.it.cod)}"${r.a.oculto ? ' class="xoculto"' : ""}>
        <td><img src="${foto(r.img)}" alt="" width="48" height="48" loading="lazy"></td>
        <td><b>${esc(r.nome)}</b><small>${esc(r.it.cod)} · ${esc(C.CAT_NOME[r.cat])}${r.a.multiplicador != null || r.a.acrescimo != null ? " · margem própria" : ""}</small></td>
        <td class="n">${k.BRL(r.custo)}</td><td class="n"><b>${k.BRL(r.preco)}</b><small>mín. ${r.min}</small></td>
        <td class="n">${r.est ? k.num(r.est) : '<span class="xerro">0</span>'}</td>
        <td><label class="mini-check"><input type="checkbox" data-vis${r.a.oculto ? "" : " checked"}> Aparece</label><label class="mini-check"><input type="checkbox" data-dest${r.a.destaque ? " checked" : ""}> Destaque</label></td>
        <td><button type="button" class="ico-btn" data-ed aria-label="Ajustar ${esc(r.nome)}">${k.I.editar}</button></td></tr>`).join("") || '<tr><td colspan="7">Nenhum produto.</td></tr>';
      $("#xp-pag").innerHTML = tot > 1 ? `<button type="button" class="btn btn-linha" data-p="-1"${X.pag <= 1 ? " disabled" : ""}>Anterior</button><span>Página ${X.pag} de ${tot}</span><button type="button" class="btn btn-linha" data-p="1"${X.pag >= tot ? " disabled" : ""}>Próxima</button>` : "";
    };
    let t; $("#xp-q").addEventListener("input", e => { clearTimeout(t); t = setTimeout(() => { X.f.q = e.target.value; X.pag = 1; pinta(); }, 200); });
    $("#xp-cat").addEventListener("change", e => { X.f.cat = e.target.value; X.pag = 1; pinta(); });
    $("#xp-vis").addEventListener("change", e => { X.f.vis = e.target.value; X.pag = 1; pinta(); });
    $("#xp-pag").addEventListener("click", e => { const b = e.target.closest("[data-p]"); if (b) { X.pag += +b.dataset.p; pinta(); scrollTo(0, 0); } });
    $("#xp-l").addEventListener("change", async e => {
      const tr = e.target.closest("tr"), cod = tr.dataset.cod;
      if (e.target.matches("[data-vis]")) await gravaAjuste(cod, { oculto: !e.target.checked });
      if (e.target.matches("[data-dest]")) await gravaAjuste(cod, { destaque: e.target.checked });
      pinta();
    });
    $("#xp-l").addEventListener("click", async e => { if (e.target.closest("[data-ed]")) { await editaProduto(e.target.closest("tr").dataset.cod); pinta(); } });
    pinta();
  }
  let tPub;
  async function gravaAjuste(cod, mud) {
    const novo = Object.assign({ cod, oculto: false, destaque: false }, X.aj[cod] || {}, mud, { atualizado: new Date().toISOString() });
    delete novo.created_at;
    try {
      const r = await K().rest("khaus_xbz_ajustes?on_conflict=cod", { metodo: "POST", corpo: novo, prefer: "resolution=merge-duplicates,return=representation" });
      X.aj[cod] = (r && r[0]) || novo;
      clearTimeout(tPub);
      tPub = setTimeout(async () => { const p = await fn("publicar"); if (p.ok) K().aviso("Site atualizado."); else K().aviso(p.erro || "Não consegui publicar.", { erro: true }); }, 1200);
    } catch (er) { K().trataErro(er); }
  }
  async function editaProduto(cod) {
    const it = X.en.find(x => x.cod === cod), r = linhaProd(it), a = r.a, k = K();
    const cats = C.CATEGORIAS.map(c => c[0]).concat("outros");
    const ok = await k.dialogo({
      titulo: "Ajustar produto", foto: foto(r.img, 2),
      corpo: `<p class="dica">${esc(it.nome)} · ${esc(cod)} · custo a partir de ${k.BRL(r.custo)}</p>
      <div class="campo"><label for="xe-nome">Nome no site</label><input class="ent" id="xe-nome" value="${esc(a.nome || "")}" placeholder="${esc(C.nomeBonito(it.nome))}"></div>
      <div class="campo"><label for="xe-cat">Categoria</label><select class="ent" id="xe-cat">${cats.map(id => `<option value="${id}"${r.cat === id ? " selected" : ""}>${esc(C.CAT_NOME[id])}</option>`).join("")}</select></div>
      <div class="xform"><div class="campo"><label for="xe-mult">Multiplicar por</label><input class="ent num" id="xe-mult" type="number" step="0.05" value="${a.multiplicador ?? ""}" placeholder="regra geral"></div>
      <div class="campo"><label for="xe-acr">Somar R$</label><input class="ent num" id="xe-acr" type="number" step="0.10" value="${a.acrescimo ?? ""}" placeholder="regra geral"></div>
      <div class="campo"><label for="xe-min">Mínimo</label><input class="ent num" id="xe-min" type="number" step="1" value="${a.minimo || ""}" placeholder="${r.min}"></div></div>
      <p class="dica">Cores: ${it.v.map(v => `${esc(v.cor)} (${k.num(v.est)})`).join(", ")}</p>`,
      botoes: [{ texto: "Cancelar", valor: null }, { texto: "Salvar", classe: "btn-azul", valor: "ok", antes: async veu => {
        const v = id => $(id, veu).value.trim();
        const mud = { nome: v("#xe-nome") || null, categoria: v("#xe-cat") === C.categoria(it.nome) ? null : v("#xe-cat"), multiplicador: v("#xe-mult") === "" ? null : +v("#xe-mult"), acrescimo: v("#xe-acr") === "" ? null : +v("#xe-acr"), minimo: v("#xe-min") === "" ? null : Math.round(+v("#xe-min")) };
        if (mud.multiplicador != null && mud.multiplicador < 1) throw new Error("O multiplicador precisa ser 1 ou mais.");
        await gravaAjuste(cod, mud); return true;
      } }]
    });
    if (ok) K().aviso("Produto ajustado. O site atualiza em instantes.");
  }

  /* ---------- pedidos ---------- */
  function achaRef(ref) {
    const R = ref.toUpperCase();
    for (const it of X.en) for (const v of it.v) if ((v.comp || "").toUpperCase() === R || (v.sku || "").toUpperCase() === R) return { it, v };
    // aceita o código sem a cor secundária (19114-PRE em vez de 19114-PRE/INO)
    for (const it of X.en) for (const v of it.v) if ((v.comp || "").toUpperCase().split("/")[0] === R.split("/")[0]) return { it, v };
    return null;
  }
  function interpreta(txt) {
    const itens = [];
    const ordem = (txt.match(/KH-\d{4}-[A-Z0-9]{3}/) || [])[0] || "";
    for (const l of txt.split(/\n/)) {
      let m = l.match(/Ref\.?\s*([^\s·]+)\s*·\s*([\d.]+)\s*un/i) || l.match(/^\s*([A-Z0-9@$][A-Z0-9@$\-\/]{3,})\s+[x×]?\s*([\d.]+)\s*$/i);
      if (!m) continue;
      itens.push({ ref: m[1], q: +m[2].replace(/\./g, "") });
    }
    return { itens, ordem };
  }
  async function pedidos() {
    const k = K();
    if (!X.ped) X.ped = await privado("pedidos.json");
    try { X.hist = await k.rest("khaus_xbz_pedidos?select=*&order=quando.desc&limit=30"); } catch (e) { X.hist = []; }
    const op = X.opcoes || {};
    const opt = (lista, idK, nomeK) => (lista || []).map(o => `<option value="${esc(o[idK])}">${esc(o[nomeK] || o.nome || o.textoCombo)}</option>`).join("");
    const grupos = {};
    for (const p of (X.ped && X.ped.pedidos) || []) { (grupos[p.numero] = grupos[p.numero] || []).push(p); }
    const linhasPed = Object.values(grupos).map(g => { const p = g[0]; const fim = /CANCELADO|FINALIZADO/i.test(p.statusLogistico || ""); return `<tr><td><b>${esc(p.numero)}</b><small>${hora(p.dataEmissao)}${p.ordemDeCompra ? " · " + esc(p.ordemDeCompra) : ""}</small></td><td>${g.map(i => `${esc(i.produtoCodigoComposto)} × ${k.num(i.quantidade)}`).join("<br>")}</td><td class="n">${k.BRL(p.pedidoValorTotal || 0)}</td><td>${esc(p.statusLogistico || "")}</td><td>${fim ? "" : `<button type="button" class="btn btn-linha" data-cancela="${esc(p.numero)}">Cancelar</button>`}</td></tr>`; }).join("");
    pagina("xbz/pedidos", `
<section class="bloco"><h2>${k.I.envia}Enviar pedido para a XBZ</h2><p class="sub">Cole a mensagem que o cliente mandou pelo WhatsApp (ou digite um código e a quantidade por linha). O painel acha cada item na XBZ.</p>
  <div class="conteudo">
    <textarea class="ent" id="xn-txt" rows="5" placeholder="Ex.: Ref. 19114-PRE · 100 un.&#10;ou: 09453-AZU 500"></textarea>
    <div><button type="button" class="btn btn-linha" id="xn-ler">${k.I.busca}Ler itens</button></div>
    <div id="xn-itens"></div>
    <div class="xform">
      <div class="campo"><label for="xn-pag">Pagamento</label><select class="ent" id="xn-pag"><option value="">Escolha</option>${opt(op.pagamento, "id", "nome")}</select></div>
      <div class="campo"><label for="xn-ent">Entrega</label><select class="ent" id="xn-ent"><option value="">Escolha</option>${opt(op.entrega, "id", "nome")}</select></div>
      <div class="campo"><label for="xn-emp">Transportadora ou gravação</label><select class="ent" id="xn-emp"><option value="0">Nenhuma</option>${opt(op.empresas, "id", "textoCombo")}</select></div>
    </div>
    ${!op.pagamento ? `<p class="dica">As formas de pagamento e entrega vêm da XBZ. <button type="button" class="link" id="xn-op">Buscar agora (usa 3 consultas)</button></p>` : `<p class="dica">Opções buscadas em ${hora(op.quando)}. <button type="button" class="link" id="xn-op">Buscar de novo (3 consultas)</button></p>`}
    <div class="xform"><div class="campo"><label for="xn-ordem">Ordem de compra (controle da Khaus)</label><input class="ent" id="xn-ordem" maxlength="40" value="${esc(X.ordem)}"></div>
    <div class="campo"><label for="xn-det">Observações para a XBZ</label><input class="ent" id="xn-det" maxlength="300" value="${esc(X.det)}"></div></div>
    <div class="xacoes"><button type="button" class="btn btn-azul" id="xn-enviar">${k.I.envia}Enviar pedido (1 consulta)</button></div>
  </div></section>

<section class="bloco"><h2>${k.I.caixa}Pedidos na XBZ</h2><p class="sub">${X.ped ? "Consultado em " + hora(X.ped.quando) + " (últimos " + X.ped.dias + " dias)." : "Ainda não consultado."}</p>
  <div class="conteudo"><div><button type="button" class="btn btn-linha" id="xp-cons">${k.I.relogio}Consultar pedidos (1 consulta)</button></div>
  <div class="xtab-wrap"><table class="xtab"><thead><tr><th>Pedido</th><th>Itens</th><th class="n">Valor</th><th>Situação</th><th></th></tr></thead><tbody>${linhasPed || '<tr><td colspan="5">Nenhum pedido na lista.</td></tr>'}</tbody></table></div></div></section>

<section class="bloco"><h2>Enviados pelo painel</h2>
  <div class="conteudo"><div class="xtab-wrap"><table class="xtab"><thead><tr><th>Quando</th><th>Quem</th><th>Itens</th><th>Resultado</th></tr></thead><tbody>${(X.hist || []).map(h => `<tr><td>${hora(h.quando)}</td><td>${esc(h.usuario || "")}</td><td>${(h.itens || []).map(i => `${esc(i.produtoCodigoXbz)} × ${k.num(i.quantidade)}`).join("<br>")}</td><td>${h.status === 200 ? `<span class="xok">Pedido ${esc(h.numero)}</span>` : `<span class="xerro">Recusado (${h.status})</span>`}</td></tr>`).join("") || '<tr><td colspan="4">Nenhum ainda.</td></tr>'}</tbody></table></div></div></section>`);

    pintaNovo();
    $("#xn-ler").addEventListener("click", () => {
      const r = interpreta($("#xn-txt").value);
      if (!r.itens.length) return k.aviso("Não achei itens. Use o formato da mensagem do site ou “código quantidade” por linha.", { erro: true });
      X.novo = r.itens.map(i => Object.assign(i, { achou: achaRef(i.ref) }));
      if (r.ordem && !$("#xn-ordem").value) { $("#xn-ordem").value = r.ordem; X.ordem = r.ordem; }
      pintaNovo();
    });
    $("#xn-ordem").addEventListener("input", e => { X.ordem = e.target.value; });
    $("#xn-det").addEventListener("input", e => { X.det = e.target.value; });
    $("#xn-op").addEventListener("click", async () => {
      const r = await fn("opcoes"); if (!r.ok) return k.aviso(r.erro, { erro: true });
      X.opcoes = r.opcoes; pedidos();
    });
    $("#xn-itens").addEventListener("input", e => { const i = e.target.closest("[data-qi]"); if (i) { X.novo[+i.dataset.qi].q = Math.max(1, Math.round(+i.value || 1)); pintaTotal(); } });
    $("#xn-itens").addEventListener("click", e => { const t = e.target.closest("[data-ti]"); if (t) { X.novo.splice(+t.dataset.ti, 1); pintaNovo(); } });
    $("#xn-enviar").addEventListener("click", enviaPedido);
    $("#xp-cons").addEventListener("click", async () => {
      const r = await fn("pedidos", { dias: 60 }); if (!r.ok) return k.aviso(r.erro, { erro: true });
      X.ped = { quando: new Date().toISOString(), dias: 60, pedidos: r.pedidos }; pedidos();
    });
    document.querySelectorAll("[data-cancela]").forEach(b => b.addEventListener("click", async () => {
      const n = b.dataset.cancela;
      const ok = await k.dialogo({ titulo: "Cancelar o pedido " + n + "?", texto: "A XBZ só cancela pedidos que ainda não entraram em produção. Usa 1 consulta.", botoes: [{ texto: "Voltar", valor: null }, { texto: "Cancelar pedido", classe: "btn-perigo", valor: "s" }] });
      if (!ok) return;
      const r = await fn("cancelar", { numero: n });
      if (!r.ok) return k.aviso(r.erro, { erro: true });
      k.aviso("Pedido " + n + " cancelado."); X.ped = null; pedidos();
    }));
  }
  function pintaNovo() {
    const k = K();
    $("#xn-itens").innerHTML = X.novo.length ? `<div class="xtab-wrap"><table class="xtab"><thead><tr><th>Item</th><th class="n">Qtd.</th><th class="n">Estoque</th><th class="n">Custo un.</th><th class="n">Subtotal</th><th></th></tr></thead><tbody>${X.novo.map((i, n) => {
      const a = i.achou;
      if (!a) return `<tr><td><b>${esc(i.ref)}</b><small class="xerro">Não é um item da XBZ (produto próprio ou código errado). Não vai no pedido.</small></td><td class="n">${k.num(i.q)}</td><td></td><td></td><td></td><td><button type="button" class="ico-btn" data-ti="${n}" aria-label="Tirar">${k.I.x}</button></td></tr>`;
      return `<tr><td><b>${esc(C.nomeBonito(a.it.nome))}</b><small>${esc(a.v.cor)} · ${esc(a.v.comp)} · ${esc(a.v.sku)}</small></td><td class="n"><input class="ent num xq" data-qi="${n}" type="number" min="1" value="${i.q}" aria-label="Quantidade"></td><td class="n">${a.v.est < i.q ? `<span class="xerro">${k.num(a.v.est)}</span>` : k.num(a.v.est)}</td><td class="n">${k.BRL(a.v.custo)}</td><td class="n" data-sub="${n}">${k.BRL(a.v.custo * i.q)}</td><td><button type="button" class="ico-btn" data-ti="${n}" aria-label="Tirar">${k.I.x}</button></td></tr>`;
    }).join("")}</tbody></table></div><p class="xtotal" id="xn-total"></p>` : "";
    pintaTotal();
  }
  function pintaTotal() {
    const el = $("#xn-total"); if (!el) return;
    let t = 0; X.novo.forEach((i, n) => { if (i.achou) { t += i.achou.v.custo * i.q; const s = $(`[data-sub="${n}"]`); if (s) s.textContent = K().BRL(i.achou.v.custo * i.q); } });
    const falta = X.novo.filter(i => i.achou && i.achou.v.est < i.q).length;
    el.innerHTML = `Custo dos produtos na XBZ: <b>${K().BRL(t)}</b> <small>(sem impostos e frete, que a XBZ calcula)</small>${falta ? `<br><span class="xerro">${falta} item(ns) acima do estoque: a XBZ recusa.</span>` : ""}`;
  }
  async function enviaPedido() {
    const k = K();
    const itens = X.novo.filter(i => i.achou).map(i => ({ sku: i.achou.v.sku, quantidade: i.q }));
    if (!itens.length) return k.aviso("Leia os itens do pedido primeiro.", { erro: true });
    const pag = $("#xn-pag").value, ent = $("#xn-ent").value, emp = $("#xn-emp").value;
    if (!pag || !ent) return k.aviso("Escolha o pagamento e a entrega.", { erro: true });
    const total = X.novo.filter(i => i.achou).reduce((s, i) => s + i.achou.v.custo * i.q, 0);
    const ok = await k.dialogo({ titulo: "Enviar este pedido para a XBZ?", texto: `${itens.length} ${itens.length === 1 ? "item" : "itens"}, custo de ${k.BRL(total)} mais impostos e frete. <b>É um pedido de verdade</b>: a XBZ separa e cobra.`, botoes: [{ texto: "Voltar", valor: null }, { texto: "Enviar pedido", classe: "btn-azul", valor: "s" }] });
    if (!ok) return;
    const b = $("#xn-enviar"); b.classList.add("carregando"); b.disabled = true;
    const r = await fn("enviar", { itens, pagamentoTipoId: +pag, entregaTipoId: +ent, entregaTransportadoraGravacaoId: +emp || 0, ordemDeCompra: $("#xn-ordem").value, detalhes: $("#xn-det").value });
    b.classList.remove("carregando"); b.disabled = false;
    if (!r.ok) return k.aviso(r.erro || "A XBZ recusou o pedido.", { erro: true });
    k.aviso("Pedido enviado à XBZ" + (r.numero ? ": número " + r.numero : "") + ".");
    X.novo = []; X.ordem = ""; X.det = ""; X.ped = null; pedidos();
  }

  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const esc = s => String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  window.KhausXbz = { tela, interpreta };
})();
