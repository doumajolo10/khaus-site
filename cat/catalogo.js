// Catálogo completo da Khaus: produtos da XBZ (estoque ao vivo) + produtos próprios do painel.
import { categoria, semAcento, CAT_NOME, capaDe } from "../xbz/core.js";

const SUPA = "https://cwsjddppdogvyitspbfr.supabase.co";
const CHAVE = "sb_publishable_zpNPLwlPqkOR6pnvrxRGHw_78r3siqN";
const WA = "5555999768527";
const POR_PAGINA = 36;
const URLP = new URLSearchParams(location.search);
const LOCAL = URLP.get("fonte") === "local";

const $ = s => document.querySelector(s);
const brl = v => v == null ? "Sob consulta" : v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const int = n => Number(n || 0).toLocaleString("pt-BR");
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const ls = (k, v) => { try { if (v === undefined) return JSON.parse(localStorage.getItem(k) || "null"); localStorage.setItem(k, JSON.stringify(v)); } catch (e) { return null; } };

// cores dos produtos próprios da Khaus (mesmo mapa do site)
const FIN = { azulmarinho: ["Azul marinho", "#1c2a55"], verdebandeira: ["Verde bandeira", "#1f9a3c"], rosachoque: ["Rosa choque", "#f0409a"], cinza: ["Cinza", "#8b8f96"], rosa: ["Rosa", "#e979a8"], marrom: ["Marrom", "#6b4a2e"], amarelo: ["Amarelo", "#f2c230"], verdepetroleo: ["Verde petróleo", "#1e5e5a"], inox: ["Inox escovado", "#d9dde1"], preto: ["Preto fosco", "#1e2226"], branco: ["Branco", "#f0eee9"], verde: ["Verde", "#1f8f5a"], azul: ["Azul marinho", "#17294f"], laranja: ["Laranja", "#e0621e"], cru: ["Algodão cru", "#d8cdb6"], madeira: ["Madeira", "#b8925a"], kraft: ["Kraft", "#9a7b52"], vermelho: ["Vermelho", "#b3271e"], menta: ["Verde menta", "#6AD4AE"], roxo: ["Roxo", "#5B3DF5"] };
// cor de cada família (para as bolinhas e o filtro)
const FAMILIA = { preto: "#17181c", azul: "#2459c9", branco: "#ffffff", verde: "#1f8f5a", vermelho: "#c8292c", rosa: "#ec7aa8", pink: "#e8448f", cinza: "#8f949c", chumbo: "#4b5058", laranja: "#ec6b23", prata: "linear-gradient(135deg,#eef0f3,#a9aeb6 55%,#e3e6ea)", inox: "linear-gradient(135deg,#f1f3f5,#b9bec5 55%,#e6e8eb)", roxo: "#6b46c1", lilas: "#bba7ef", amarelo: "#f3c432", bege: "#e4d4b7", creme: "#f1e7d0", champanhe: "#e6d3ad", marrom: "#6e4a2f", madeira: "linear-gradient(135deg,#c79a63,#9b6b3c)", bambu: "linear-gradient(135deg,#e2c98f,#bf9c5a)", kraft: "#b48c5e", dourado: "linear-gradient(135deg,#f4dc8a,#c99b2e 60%,#f0d47a)", transparente: "repeating-conic-gradient(#e7e9ee 0 25%,#fff 0 50%) 0 0/8px 8px", colorido: "conic-gradient(#e8448f,#f3c432,#1f8f5a,#2459c9,#6b46c1,#e8448f)", algodao: "#d8cdb6", menta: "#6AD4AE", unica: "#d5d8de" };
const familia = nome => {
  const n = semAcento(nome).replace(/[^a-z ]/g, "").trim();
  const p = n.split(" ")[0];
  if (FAMILIA[p]) return p;
  if (/marinho|azul/.test(n)) return "azul";
  if (/verde/.test(n)) return "verde";
  return p || "unica";
};
const swatch = fam => FAMILIA[fam] || "#d5d8de";

const FAIXAS_PRECO = [["ate5", "Até R$ 5", 0, 5], ["5a15", "R$ 5 a 15", 5, 15], ["15a40", "R$ 15 a 40", 15, 40], ["40a100", "R$ 40 a 100", 40, 100], ["100", "Acima de R$ 100", 100, 1e9]];

const E = { q: "", cat: "", cores: new Set(), preco: "", qtd: 0, soEstoque: true, soPonta: false, ordem: "rel", pagina: 1 };
let PRAZOS = [], PRAZOS_DEMO = true;
let TODOS = [], POR_ID = new Map(), CATS = [], FAIXAS = [[1, 0]], DEMO = true, CDN = "https://cdn.xbzbrindes.com.br/img/produtos/", VERSAO = "", DESC = null, ATUAL = [];

/* ---------- dados ---------- */
async function pega(url, op) {
  const ctrl = new AbortController(), t = setTimeout(() => ctrl.abort(), 9000);
  try { const r = await fetch(url, { ...op, signal: ctrl.signal }); if (!r.ok) throw new Error(r.status); return await r.json(); }
  finally { clearTimeout(t); }
}
async function carregaXbz() {
  const urls = LOCAL ? ["dados/catalogo.json"] : [SUPA + "/storage/v1/object/public/khaus-catalogo/catalogo.json", "dados/catalogo.json"];
  for (const u of urls) { try { return await pega(u, { cache: "no-cache" }); } catch (e) { /* tenta o próximo */ } }
  return null;
}
async function carregaKhaus() {
  const op = { headers: { apikey: CHAVE, Accept: "application/json" }, cache: "no-store" };
  try {
    const [prods, cfg] = await Promise.all([
      pega(SUPA + "/rest/v1/khaus_produtos?select=*&ativo=eq.true&order=ordem", op),
      pega(SUPA + "/rest/v1/khaus_config?select=chave,valor", op).catch(() => [])
    ]);
    return { prods, cfg: Object.fromEntries((cfg || []).map(c => [c.chave, c.valor])) };
  } catch (e) {
    try { const c = await pega("painel/catalogo.json", { cache: "no-cache" }); return { prods: (c.produtos || []).filter(p => p.ativo !== false), cfg: {} }; }
    catch (e2) { return { prods: [], cfg: {} }; }
  }
}

const foto = (img, tam) => !img ? "" : /^https?:|^img\//.test(img) ? img : CDN + tam + "/" + img;

function deXbz(p) {
  const cores = p.k.map(([nome, img, est, rep, cod]) => ({ nome, img, est, rep, cod, fam: familia(nome) }));
  return {
    id: p.i, fonte: "x", nome: p.n, cat: p.c, preco: p.p, min: p.m, est: p.e, tipo: p.t, med: p.d, cores,
    maxCor: Math.max(0, ...cores.map(c => c.est)), destaque: !!p.h
  };
}
function deKhaus(p, esgotadoCfg) {
  const est = p.estoque || {};
  const esg = new Set([...(p.esgotadas || []), ...((esgotadoCfg || {})[p.id] || [])]);
  const img = p.foto || "img/" + p.id + ".webp";
  const cores = (p.cores || []).map(id => ({
    nome: (FIN[id] || [id])[0], hex: (FIN[id] || [, "#d5d8de"])[1], img, est: esg.has(id) ? 0 : (est[id] ?? null), rep: "", cod: p.id + (id ? "-" + id : ""), fam: familia((FIN[id] || [id])[0])
  }));
  if (!cores.length) cores.push({ nome: "Única", img, est: esg.size ? 0 : (est._ ?? null), rep: "", cod: p.id, fam: "unica" });
  const faixas = (p.faixas || []).filter(f => f && f[1] > 0);
  const total = cores.some(c => c.est == null) ? null : cores.reduce((s, c) => s + c.est, 0);
  return {
    id: "k-" + p.id, fonte: "k", nome: p.nome, cat: p.cat_catalogo && CAT_NOME[p.cat_catalogo] ? p.cat_catalogo : categoria(p.nome), preco: faixas.length ? faixas[0][1] : null, min: p.min || 1,
    est: total, tipo: "", med: 0, cores, faixasAbs: faixas, maxCor: total == null ? 1e9 : Math.max(0, ...cores.map(c => c.est ?? 0)),
    desc: p.descricao && p.descricao !== p.sub ? p.descricao : (p.specs || ""), destaque: true, fotoK: p.foto ? null : p.id
  };
}

// ordem padrão: alterna categorias para a primeira página mostrar variedade
function intercala(lista) {
  const grupos = new Map();
  for (const p of lista) { if (!grupos.has(p.cat)) grupos.set(p.cat, []); grupos.get(p.cat).push(p); }
  for (const g of grupos.values()) g.sort((a, b) => (b.destaque - a.destaque) || ((b.est > 0) - (a.est > 0)) || (b.est ?? 1e6) - (a.est ?? 1e6));
  const filas = [...grupos.values()].sort((a, b) => b.length - a.length), out = [];
  for (let i = 0; out.length < lista.length; i++) for (const f of filas) if (f[i]) out.push(f[i]);
  return out;
}

async function inicia() {
  const [xbz, kh] = await Promise.all([carregaXbz(), carregaKhaus()]);
  const lista = [];
  if (xbz) {
    CDN = xbz.cdn || CDN; FAIXAS = xbz.faixas || FAIXAS; DEMO = !!xbz.demo; VERSAO = xbz.v || "";
    CRUS = xbz.p;
    for (const p of xbz.p) lista.push(deXbz(p));
  }
  for (const p of kh.prods || []) lista.push(deKhaus(p, kh.cfg.esgotado));
  if (kh.cfg.precosDemo === false && !xbz) DEMO = false;
  PRAZOS = (Array.isArray(kh.cfg.prazos) ? kh.cfg.prazos : []).slice().sort((a, b) => (a.extra || 0) - (b.extra || 0));
  PRAZOS_DEMO = kh.cfg.prazosDemo !== false;
  for (const p of lista) {
    p.busca = semAcento([p.nome, CAT_NOME[p.cat] || "", ...p.cores.map(c => c.nome), p.id.replace(/^k-/, "")].join(" "));
    p.fams = new Set(p.cores.map(c => c.fam));
    POR_ID.set(p.id, p);
  }
  TODOS = intercala(lista);
  const cont = {};
  for (const p of TODOS) cont[p.cat] = (cont[p.cat] || 0) + 1;
  CATS = Object.keys(CAT_NOME).filter(id => cont[id]).map(id => ({ id, nome: CAT_NOME[id], n: cont[id], img: capa(id) }));
  montaTopo(); montaFiltros(); leUrl(); desenha(true); atualizaOrc();
  const id = URLP.get("produto"); if (id && POR_ID.has(id)) abreFicha(POR_ID.get(id));
  else if (URLP.get("orcamento")) { abre("#orc"); const u = new URL(location.href); u.searchParams.delete("orcamento"); history.replaceState(null, "", u); }
}

let CRUS = [];
function capa(cat) {
  const x = capaDe(CRUS, cat);
  const k = x && (x.k.find(k => k[2] > 0) || x.k[0]);
  return k ? foto(k[1], 1) : "";
}

/* ---------- topo, categorias e filtros ---------- */
function montaTopo() {
  const comEst = TODOS.filter(p => p.est !== 0).length;
  $("#totalTit").textContent = "Mais de " + int(Math.max(100, Math.floor(comEst / 100) * 100)) + " brindes para gravar a sua marca";
  if (VERSAO) {
    const d = new Date(VERSAO), hoje = new Date();
    const hora = d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    const dia = d.toDateString() === hoje.toDateString() ? "hoje" : d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
    $("#atualizado").textContent = `Estoque atualizado ${dia} às ${hora}`;
  } else $("#atualizado").textContent = "Estoque confirmado no orçamento";
  $("#cats").innerHTML = `<button type="button" class="cat" data-cat=""><span class="cat-nome">Todos</span><span class="cat-n">${int(TODOS.length)}</span></button>` +
    CATS.map(c => `<button type="button" class="cat" data-cat="${c.id}">${c.img ? `<img src="${c.img}" alt="" width="40" height="40" loading="lazy" decoding="async">` : ""}<span class="cat-nome">${esc(c.nome)}</span><span class="cat-n">${int(c.n)}</span></button>`).join("");
}

function montaFiltros() {
  $("#precos").innerHTML = FAIXAS_PRECO.map(([id, rot]) => `<button type="button" class="pill" data-preco="${id}">${rot}</button>`).join("");
  const cont = {};
  for (const p of TODOS) for (const f of p.fams) cont[f] = (cont[f] || 0) + 1;
  const fams = Object.entries(cont).filter(([f, n]) => n >= 8 && f !== "unica").sort((a, b) => b[1] - a[1]).slice(0, 22);
  $("#coresF").innerHTML = fams.map(([f]) => `<button type="button" class="cor-f" data-cor="${f}" aria-pressed="false" title="${esc(f[0].toUpperCase() + f.slice(1))}"><i style="background:${swatch(f)}"></i><span>${esc(f === "lilas" ? "Lilás" : f[0].toUpperCase() + f.slice(1))}</span></button>`).join("");
}

function leUrl() {
  E.q = URLP.get("q") || ""; E.cat = URLP.get("cat") || "";
  if (E.cat && !CAT_NOME[E.cat]) E.cat = "";
  $("#q").value = E.q;
}
function gravaUrl() {
  const u = new URL(location.href);
  for (const [k, v] of [["q", E.q], ["cat", E.cat]]) v ? u.searchParams.set(k, v) : u.searchParams.delete(k);
  history.replaceState(null, "", u);
}

/* ---------- preço ---------- */
function unitario(p, q) {
  if (p.fonte === "k") {
    if (!p.faixasAbs.length) return null;
    let v = p.faixasAbs[0][1];
    for (const [a, b] of p.faixasAbs) if (q >= a) v = b;
    return v;
  }
  let d = 0;
  for (const [a, pc] of FAIXAS) if (q >= a) d = pc;
  return Math.round(p.preco * (1 - d / 100) * 100) / 100;
}
function tabela(p) {
  if (p.fonte === "k") return p.faixasAbs.map(([q]) => q);
  const qs = FAIXAS.map(f => f[0]).filter(q => q > p.min);
  return [p.min, ...qs];
}
const precoRef = p => unitario(p, Math.max(p.min, E.qtd || 0));
const comPrazo = (v, pz) => v == null ? null : Math.round(v * (1 + ((pz && pz.extra) || 0) / 100) * 100) / 100;
const prazoTxt = z => { if (!z) return ""; const c = PRAZOS.find(x => x.id === z.id) || z; return `${z.nome}${c.de ? ` (${c.de} a ${c.ate} dias úteis)` : ""}`; };

/* ---------- filtro e ordem ---------- */
function bate(p, toks) {
  return toks.every(t => p.busca.includes(t) || (t.length >= 5 && p.busca.includes(t.slice(0, -1))));
}
function filtra() {
  const toks = semAcento(E.q).split(/[\s,]+/).filter(t => t.length > 1);
  const fx = FAIXAS_PRECO.find(f => f[0] === E.preco);
  let r = TODOS.filter(p => {
    if (E.cat && p.cat !== E.cat) return false;
    if (E.soPonta && !p.tipo) return false;
    if (E.soEstoque && p.est === 0) return false;
    if (E.qtd && p.maxCor < E.qtd) return false;
    if (E.cores.size && ![...E.cores].some(c => p.fams.has(c))) return false;
    if (fx) { const v = precoRef(p); if (v == null || v < fx[2] || v >= fx[3]) return false; }
    if (toks.length && !bate(p, toks)) return false;
    return true;
  });
  const ord = E.ordem;
  if (ord === "menor") r.sort((a, b) => (precoRef(a) ?? 1e9) - (precoRef(b) ?? 1e9));
  else if (ord === "maior") r.sort((a, b) => (precoRef(b) ?? -1) - (precoRef(a) ?? -1));
  else if (ord === "estoque") r.sort((a, b) => (b.est ?? -1) - (a.est ?? -1));
  else if (ord === "az") r.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  else if (toks.length) {
    const nota = p => { const n = semAcento(p.nome); return (n.startsWith(toks[0]) ? 4 : 0) + (toks.every(t => n.includes(t)) ? 2 : 0) + (p.destaque ? 1 : 0) + (p.est > 0 ? 1 : 0); };
    r = r.map(p => [nota(p), p]).sort((a, b) => b[0] - a[0]).map(x => x[1]);
  }
  return r;
}

/* ---------- grade ---------- */
function cartao(p) {
  const corIni = p.cores.find(c => c.est !== 0) || p.cores[0];
  const q = Math.max(p.min, E.qtd || 0), un = unitario(p, q);
  const tq = tabela(p), ultimo = tq[tq.length - 1], menor = unitario(p, ultimo);
  const sel = p.tipo === "P" ? "Ponta de estoque" : p.tipo === "E" ? "Edição limitada" : p.tipo === "O" ? "Oferta" : p.fonte === "k" ? "Destaque Khaus" : "";
  const bol = p.cores.length > 1 || p.cores[0].nome !== "Única" ? p.cores.slice(0, 7).map((c, i) =>
    `<button type="button" class="bol${c.est === 0 ? " esg" : ""}" data-cor="${i}" style="background:${c.hex || swatch(c.fam)}" aria-label="${esc(c.nome)}${c.est === 0 ? " (esgotada)" : ""}" title="${esc(c.nome)}"></button>`).join("") + (p.cores.length > 7 ? `<span class="bol-mais">+${p.cores.length - 7}</span>` : "") : "";
  let est = "";
  if (p.est === 0) { const rep = p.cores.map(c => c.rep).filter(Boolean).sort()[0]; est = `<p class="c-est sem">${rep ? "Volta em " + dataCurta(rep) : "Sem estoque agora"}</p>`; }
  else if (p.est != null) est = `<p class="c-est">${int(p.est)} em estoque</p>`;
  const img = corIni.img;
  const imgHtml = p.fonte === "k" && p.fotoK
    ? `<img src="img/${p.fotoK}-480.webp" srcset="img/${p.fotoK}-240.webp 240w, img/${p.fotoK}-480.webp 480w" sizes="(max-width:640px) 46vw, 280px" alt="" loading="lazy" decoding="async">`
    : `<img src="${foto(img, 1)}" srcset="${foto(img, 1)} 300w, ${foto(img, 2)} 652w" sizes="(max-width:640px) 46vw, 280px" alt="" loading="lazy" decoding="async">`;
  return `<article class="card${p.est === 0 ? " fora" : ""}" data-id="${esc(p.id)}">
  <button type="button" class="c-foto" aria-label="Ver ${esc(p.nome)}">${imgHtml}${sel ? `<span class="selo${p.fonte === "k" ? " selo-k" : ""}">${sel}</span>` : ""}</button>
  <div class="c-corpo">
    <h3 class="c-nome"><button type="button">${esc(p.nome)}</button></h3>
    ${bol ? `<div class="c-cores">${bol}</div>` : ""}
    <div class="c-preco">${un == null ? `<b class="cons">Sob consulta</b>` : `<b>${brl(un)}</b><span>/un.${E.qtd ? ` com ${int(q)}` : ` · mín. ${int(p.min)}`}</span>`}</div>
    ${un != null && menor != null && menor < un && !E.qtd ? `<p class="c-faixa">até ${brl(menor)} com ${int(ultimo)}+</p>` : ""}
    ${est}
  </div>
</article>`;
}
const dataCurta = iso => { const [a, m, d] = iso.split("-"); return `${d}/${m}`; };

let observador;
function desenha(reinicia) {
  if (reinicia) { ATUAL = filtra(); E.pagina = 1; }
  const grade = $("#grade"), fim = Math.min(ATUAL.length, E.pagina * POR_PAGINA);
  const ini = reinicia ? 0 : (E.pagina - 1) * POR_PAGINA;
  const html = ATUAL.slice(ini, fim).map(cartao).join("");
  if (reinicia) { grade.innerHTML = html; } else grade.insertAdjacentHTML("beforeend", html);
  $("#conta").innerHTML = `<b>${int(ATUAL.length)}</b> ${ATUAL.length === 1 ? "produto" : "produtos"}${E.cat ? " em " + esc(CAT_NOME[E.cat]) : ""}`;
  $("#vazio").hidden = ATUAL.length > 0;
  $("#vazioWa").href = `https://wa.me/${WA}?text=${encodeURIComponent(`Olá, Khaus! Procurei "${E.q || CAT_NOME[E.cat] || "um brinde"}" no catálogo e não encontrei. Vocês conseguem?`)}`;
  $("#mais").hidden = fim >= ATUAL.length;
  if (reinicia) { pintaAtivos(); pintaCats(); gravaUrl(); }
}
function maisPagina() {
  if (E.pagina * POR_PAGINA >= ATUAL.length) return;
  E.pagina++; desenha(false);
}

function pintaCats() {
  document.querySelectorAll(".cat").forEach(b => b.setAttribute("aria-pressed", b.dataset.cat === E.cat));
  const at = document.querySelector(`.cat[data-cat="${E.cat}"]`);
  if (at) at.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
}
function pintaAtivos() {
  const chips = [];
  if (E.q) chips.push(["q", `“${E.q}”`]);
  if (E.qtd) chips.push(["qtd", `${int(E.qtd)} un. em estoque`]);
  if (E.preco) chips.push(["preco", FAIXAS_PRECO.find(f => f[0] === E.preco)[1]]);
  for (const c of E.cores) chips.push(["cor:" + c, "Cor: " + c]);
  if (E.soPonta) chips.push(["ponta", "Ponta de estoque"]);
  if (!E.soEstoque) chips.push(["est", "Incluindo esgotados"]);
  $("#ativos").innerHTML = chips.map(([k, t]) => `<button type="button" class="ativo" data-tira="${esc(k)}">${esc(t)}<span aria-hidden="true">×</span></button>`).join("");
  const n = chips.filter(c => c[0] !== "q").length;
  $("#fN").hidden = !n; $("#fN").textContent = n;
  document.querySelectorAll(".pill").forEach(b => b.setAttribute("aria-pressed", b.dataset.preco === E.preco));
  document.querySelectorAll(".cor-f").forEach(b => b.setAttribute("aria-pressed", E.cores.has(b.dataset.cor)));
  $("#soEstoque").checked = E.soEstoque; $("#soPonta").checked = E.soPonta;
  $("#qtd").value = E.qtd || ""; $("#qLimpa").hidden = !E.q;
}

/* ---------- ficha ---------- */
let F = null; // { p, cor, q }
async function descricao(p) {
  if (p.fonte === "k") return p.desc || "";
  if (!DESC) {
    const urls = LOCAL ? ["dados/descricoes.json"] : [SUPA + "/storage/v1/object/public/khaus-catalogo/descricoes.json", "dados/descricoes.json"];
    for (const u of urls) { try { DESC = await pega(u, {}); break; } catch (e) { } }
    DESC = DESC || {};
  }
  return DESC[p.id] || "";
}
function abreFicha(p, corIdx) {
  const ci = corIdx != null ? corIdx : Math.max(0, p.cores.findIndex(c => c.est !== 0));
  F = { p, cor: ci, q: Math.max(p.min, E.qtd || p.min), pz: PRAZOS[0] || null };
  pintaPrazos();
  const nomeCat = CAT_NOME[p.cat] || "";
  $("#fiCat").innerHTML = `<button type="button" data-ircat="${p.cat}">${esc(nomeCat)}</button>${p.tipo === "P" ? " · Ponta de estoque" : p.tipo === "E" ? " · Edição limitada" : ""}`;
  $("#fichaNome").textContent = p.nome;
  $("#fiMinis").innerHTML = p.fonte === "x" && p.cores.length > 1 ? p.cores.map((c, i) => `<button type="button" class="mini" data-mini="${i}" aria-label="${esc(c.nome)}"><img src="${foto(c.img, 1)}" alt="" loading="lazy"></button>`).join("") : "";
  $("#fiCores").innerHTML = p.cores.map((c, i) => `<button type="button" class="fcor${c.est === 0 ? " esg" : ""}" role="radio" data-fcor="${i}" aria-label="${esc(c.nome)}" title="${esc(c.nome)}${c.est === 0 ? " (esgotada)" : ""}"><i style="background:${c.hex || swatch(c.fam)}"></i></button>`).join("");
  $("#fiDemo").hidden = !DEMO;
  const med = p.med || [];
  const linhas = [["Altura", med[0], "cm"], ["Largura", med[1], "cm"], ["Profundidade", med[2], "cm"], ["Peso", med[3], "g"]].filter(l => l[1] > 0);
  $("#fiMed").innerHTML = linhas.map(([r, v, u]) => `<div><dt>${r}</dt><dd>${String(v).replace(".", ",")} ${u}</dd></div>`).join("");
  $("#fiDesc").textContent = "";
  descricao(p).then(t => { if (F && F.p === p) { $("#fiDesc").textContent = t || "Fale com a Khaus para mais detalhes deste produto."; } });
  pintaFicha();
  abre("#ficha");
  const u = new URL(location.href); u.searchParams.set("produto", p.id); history.replaceState(null, "", u);
}
function pintaFicha() {
  const { p, cor } = F, c = p.cores[cor];
  const box = $("#fiFoto");
  const src = p.fonte === "k" && p.fotoK ? `img/${p.fotoK}.webp` : foto(c.img, 2);
  const srcset = p.fonte === "k" && p.fotoK ? "" : `${foto(c.img, 2)} 652w, ${foto(c.img, 3)} 1000w`;
  box.innerHTML = `<img src="${src}" ${srcset ? `srcset="${srcset}" sizes="(max-width:820px) 92vw, 520px"` : ""} alt="${esc(p.nome + " — " + c.nome)}">`;
  document.querySelectorAll(".mini").forEach(b => b.setAttribute("aria-current", +b.dataset.mini === cor));
  document.querySelectorAll(".fcor").forEach(b => b.setAttribute("aria-checked", +b.dataset.fcor === cor));
  $("#fiCorNome").textContent = c.nome;
  let est = "";
  if (c.est === 0) est = `<span class="sem">Esgotada nesta cor${c.rep ? ` · reposição prevista para ${dataCurta(c.rep)}` : ""}</span>`;
  else if (c.est != null) est = `<span class="ok">${int(c.est)} em estoque nesta cor</span>`;
  else est = `<span class="ok">Disponível</span>`;
  $("#fiEstoque").innerHTML = est;
  $("#fiQ").value = F.q;
  $("#fiMin").textContent = `mínimo ${int(p.min)} un.`;
  pintaPreco();
}
function pintaPrazos() {
  const box = $("#fiPrazos"); if (!box) return;
  box.hidden = !PRAZOS.length;
  box.innerHTML = PRAZOS.length ? `<div class="fi-rot"><span>Prazo de produção</span><em>dias úteis após aprovar a arte</em></div><div class="pzs">` + PRAZOS.map((z, i) => `<button type="button" class="pzc" data-pzi="${i}" aria-pressed="${F && F.pz && F.pz.id === z.id}"><b>${esc(z.nome)}</b><span>${z.de} a ${z.ate} dias</span><em>${z.extra ? "+" + z.extra + "%" : "sem custo"}</em></button>`).join("") + `</div>${PRAZOS_DEMO ? `<p class="fi-nota">Prazos de demonstração, confirmados no orçamento.</p>` : ""}` : "";
}
function pintaPreco() {
  const { p } = F, q = F.q, c = p.cores[F.cor], un = comPrazo(unitario(p, q), F.pz);
  $("#fiPreco").innerHTML = un == null ? `<b>Sob consulta</b>` : `<b>${brl(un)}</b><span>por unidade, com ${int(q)} un.</span>`;
  const qs = tabela(p);
  $("#fiFaixas").innerHTML = un == null ? "" : `<p class="fx-tit">Quanto mais unidades, menor o preço</p>` + qs.map((a, i) => {
    const b = qs[i + 1], ativa = q >= a && (!b || q < b);
    return `<button type="button" class="fx${ativa ? " on" : ""}" data-fx="${a}"><span>${int(a)}${b ? "–" + int(b - 1) : "+"} un.</span><b>${brl(comPrazo(unitario(p, a), F.pz))}</b></button>`;
  }).join("");
  $("#fiTotal").textContent = un == null ? "A combinar" : brl(un * q);
  const av = [];
  if (q < p.min) av.push(`O mínimo deste produto é ${int(p.min)} unidades.`);
  if (c.est != null && c.est > 0 && q > c.est) av.push(`Temos ${int(c.est)} nesta cor agora. Para mais, a Khaus confirma o prazo ou combina outra cor.`);
  if (c.est === 0) av.push("Esta cor está esgotada. Você pode pedir assim mesmo: a Khaus avisa o prazo da reposição.");
  $("#fiAviso").hidden = !av.length; $("#fiAviso").textContent = av.join(" ");
  $("#fiAdd").disabled = q < p.min;
}

/* ---------- orçamento ---------- */
let ORC = (ls("khaus-orcamento") || []).filter(i => i && i.id && i.q > 0);
const codigo = () => {
  let c = ls("khaus-orc-cod");
  if (!c) { const d = new Date(); c = "KH-" + String(d.getDate()).padStart(2, "0") + String(d.getMonth() + 1).padStart(2, "0") + "-" + Math.random().toString(36).slice(2, 5).toUpperCase(); ls("khaus-orc-cod", c); }
  return c;
};
function salvaOrc() { ls("khaus-orcamento", ORC); atualizaOrc(); }
function atualizaOrc() {
  const n = ORC.length;
  $("#orcN").textContent = n; $("#orcN").classList.toggle("tem", n > 0);
  let total = 0, temConsulta = false;
  $("#orcItens").innerHTML = n ? ORC.map((it, i) => {
    const p = POR_ID.get(it.id); if (!p) return "";
    const c = p.cores[it.cor] || p.cores[0], un = comPrazo(unitario(p, it.q), it.pz);
    if (un == null) temConsulta = true; else total += un * it.q;
    const mini = p.fonte === "k" && p.fotoK ? `img/${p.fotoK}-240.webp` : foto(c.img, 1);
    return `<div class="it"><img src="${mini}" alt="" width="64" height="64" loading="lazy"><div class="it-info"><b>${esc(p.nome)}</b><span>${c.nome !== "Única" ? esc(c.nome) + (un != null ? " · " : "") : ""}${un != null ? brl(un) + "/un." : ""}${it.pz ? " · " + esc(it.pz.nome) : ""}</span>
      <div class="it-q"><button type="button" data-iq="${i}" data-d="-1" aria-label="Menos">−</button><input type="number" inputmode="numeric" value="${it.q}" min="${p.min}" data-iqv="${i}" aria-label="Quantidade de ${esc(p.nome)}"><button type="button" data-iq="${i}" data-d="1" aria-label="Mais">+</button><em>${un != null ? brl(un * it.q) : "Sob consulta"}</em></div>
      ${it.q < p.min ? `<small class="it-av">Mínimo ${int(p.min)} un.</small>` : ""}</div><button type="button" class="it-x" data-tirai="${i}" aria-label="Remover ${esc(p.nome)}">×</button></div>`;
  }).join("") : `<div class="gav-vazio"><b>Seu orçamento está vazio.</b><p>Escolha um produto, a cor e a quantidade e toque em “Adicionar ao orçamento”.</p></div>`;
  $("#orcTotal").textContent = brl(total) + (temConsulta ? " + itens sob consulta" : "");
  $("#orcDemo").hidden = !DEMO || !n;
  $("#orcForm").hidden = !n;
  previa();
}
function adiciona() {
  const { p, cor, q } = F;
  const pz = F.pz ? { id: F.pz.id, nome: F.pz.nome, extra: F.pz.extra || 0, de: F.pz.de, ate: F.pz.ate } : undefined;
  const i = ORC.findIndex(it => it.id === p.id && it.cor === cor);
  const novo = { id: p.id, cor, q }; if (pz) novo.pz = pz;
  if (i >= 0) ORC[i] = novo; else ORC.push(novo);
  salvaOrc(); fecha("#ficha");
  aviso(`${p.nome} (${p.cores[cor].nome}) no orçamento`, "Ver orçamento", () => abre("#orc"));
}
// Mensagem do WhatsApp: *negrito* e _itálico_ do próprio WhatsApp, um bloco por item, resumo e dados do cliente
function mensagem() {
  const L = [`*Pedido de orçamento · Khaus Brindes*`, `Código: ${codigo()}`, "", "Olá! Montei este orçamento no site:", ""];
  let total = 0, economia = 0, unidades = 0, n = 0, consulta = 0;
  for (const it of ORC) {
    const p = POR_ID.get(it.id); if (!p) continue;
    const c = p.cores[it.cor] || p.cores[0], un = comPrazo(unitario(p, it.q), it.pz), base = comPrazo(unitario(p, p.min), it.pz);
    n++; unidades += it.q;
    L.push(`*${n}. ${p.nome}*`);
    L.push((c.nome !== "Única" ? `Cor: ${c.nome} · ` : "") + `Ref.: ${c.cod}`);
    if (un != null) {
      L.push(`${int(it.q)} un. × ${brl(un)} = *${brl(un * it.q)}*`);
      total += un * it.q;
      if (base != null && base > un) economia += (base - un) * it.q;
    } else { L.push(`${int(it.q)} un. · preço sob consulta`); consulta++; }
    if (it.pz) L.push(`Prazo: ${prazoTxt(it.pz)}${it.pz.extra ? ` (+${it.pz.extra}%)` : ""}`);
    if (it.q < p.min) L.push(`_Abaixo do mínimo de ${int(p.min)} un._`);
    L.push("");
  }
  L.push("━━━━━━━━━━━━━━");
  L.push(`*Total estimado: ${brl(total)}*${consulta ? " + itens sob consulta" : ""}`);
  L.push(`${n} ${n === 1 ? "produto" : "produtos"} · ${int(unidades)} unidades`);
  if (economia >= 0.01) L.push(`Economia pela quantidade: ${brl(economia)}`);
  if (DEMO) L.push("_Valores de demonstração: o preço final vem no orçamento._");
  const dados = [["Nome", $("#oNome").value], ["Empresa", $("#oEmpresa").value], ["Cidade", $("#oCidade").value], ["Precisa até", $("#oData").value ? $("#oData").value.split("-").reverse().join("/") : ""], ["Obs.", $("#oObs").value]].filter(d => d[1].trim());
  if (dados.length) L.push("", "*Meus dados*", ...dados.map(([k, v]) => `${k}: ${v.trim()}`));
  L.push("", "Vou mandar o logo da empresa aqui na conversa (PNG ou PDF, de preferência com fundo transparente).");
  return L.join("\n");
}
// mostra como o WhatsApp vai exibir: *negrito* e _itálico_
function previa() { const pre = $("#orcPrev"); if (pre && ORC.length) pre.innerHTML = esc(mensagem()).replace(/\*([^*\n]+)\*/g, "<b>$1</b>").replace(/(^|\s)_([^_\n]+)_/g, "$1<i>$2</i>"); }
function envia() {
  if (!$("#oNome").value.trim()) { $("#oNome").focus(); $("#oNome").reportValidity(); return; }
  ls("khaus-cliente", { nome: $("#oNome").value, empresa: $("#oEmpresa").value, cidade: $("#oCidade").value });
  window.open(`https://wa.me/${WA}?text=${encodeURIComponent(mensagem())}`, "_blank", "noopener");
}

/* ---------- janelas ---------- */
let focoAntes = null;
function abre(sel) {
  focoAntes = document.activeElement;
  const el = $(sel); el.hidden = false; document.documentElement.classList.add("trava");
  requestAnimationFrame(() => el.classList.add("on"));
  setTimeout(() => (el.querySelector(".x") || el).focus(), 30);
}
function fecha(sel) {
  const el = $(sel); el.classList.remove("on");
  setTimeout(() => { el.hidden = true; if (!document.querySelector(".modal.on,.gaveta.on")) document.documentElement.classList.remove("trava"); }, 220);
  if (sel === "#ficha") { F = null; const u = new URL(location.href); u.searchParams.delete("produto"); history.replaceState(null, "", u); }
  if (focoAntes && focoAntes.focus) focoAntes.focus();
}
let tAviso;
function aviso(txt, acao, fn) {
  const t = $("#toast");
  t.innerHTML = esc(txt) + (acao ? ` <button type="button">${esc(acao)}</button>` : "");
  if (acao) t.querySelector("button").onclick = () => { t.classList.remove("on"); fn(); };
  t.classList.add("on"); clearTimeout(tAviso); tAviso = setTimeout(() => t.classList.remove("on"), 4200);
}

/* ---------- eventos ---------- */
let tBusca;
$("#q").addEventListener("input", e => { clearTimeout(tBusca); tBusca = setTimeout(() => { E.q = e.target.value.trim(); desenha(true); }, 160); });
$("#q").addEventListener("keydown", e => { if (e.key === "Enter") { e.preventDefault(); e.target.blur(); document.querySelector(".lista").scrollIntoView({ behavior: "smooth" }); } });
$("#qLimpa").onclick = () => { E.q = ""; $("#q").value = ""; desenha(true); $("#q").focus(); };
$("#ordem").onchange = e => { E.ordem = e.target.value; desenha(true); };
$("#soEstoque").onchange = e => { E.soEstoque = e.target.checked; desenha(true); };
$("#soPonta").onchange = e => { E.soPonta = e.target.checked; desenha(true); };
let tQtd;
$("#qtd").addEventListener("input", e => { clearTimeout(tQtd); tQtd = setTimeout(() => { E.qtd = Math.max(0, Math.round(+e.target.value || 0)); desenha(true); }, 300); });
$("#fLimpar").onclick = () => { Object.assign(E, { cores: new Set(), preco: "", qtd: 0, soEstoque: true, soPonta: false }); desenha(true); };
$("#fAbre").onclick = () => { $("#filtros").classList.add("aberto"); document.documentElement.classList.add("trava"); };
const fechaFiltros = () => { $("#filtros").classList.remove("aberto"); document.documentElement.classList.remove("trava"); };
$("#fFecha").onclick = fechaFiltros; $("#fVer").onclick = () => { fechaFiltros(); document.querySelector(".lista").scrollIntoView({ behavior: "smooth" }); };
$("#tema").onclick = () => {
  const t = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", t); try { localStorage.setItem("khaus-theme", t); } catch (e) { }
};
$("#orcBtn").onclick = () => abre("#orc");
$("#orcEnviar").onclick = envia;
$("#orcForm").addEventListener("input", previa);
$("#fiAdd").onclick = adiciona;
$("#fiQ").addEventListener("input", e => { F.q = Math.max(0, Math.round(+e.target.value || 0)); pintaPreco(); });
$("#fiMenos").onclick = () => { F.q = Math.max(F.p.min, F.q - passo(F.q)); $("#fiQ").value = F.q; pintaPreco(); };
$("#fiMais").onclick = () => { F.q = F.q + passo(F.q); $("#fiQ").value = F.q; pintaPreco(); };
const passo = q => q < 50 ? 5 : q < 200 ? 10 : q < 1000 ? 50 : 100;

document.addEventListener("click", e => {
  const t = e.target;
  const cat = t.closest(".cat"); if (cat) { E.cat = cat.dataset.cat; desenha(true); return; }
  const ir = t.closest("[data-ircat]"); if (ir) { fecha("#ficha"); E.cat = ir.dataset.ircat; E.q = ""; $("#q").value = ""; desenha(true); return; }
  const pill = t.closest(".pill"); if (pill) { E.preco = E.preco === pill.dataset.preco ? "" : pill.dataset.preco; desenha(true); return; }
  const cf = t.closest(".cor-f"); if (cf) { const c = cf.dataset.cor; E.cores.has(c) ? E.cores.delete(c) : E.cores.add(c); desenha(true); return; }
  const at = t.closest(".ativo"); if (at) {
    const k = at.dataset.tira;
    if (k === "q") { E.q = ""; $("#q").value = ""; } else if (k === "qtd") E.qtd = 0; else if (k === "preco") E.preco = ""; else if (k === "ponta") E.soPonta = false; else if (k === "est") E.soEstoque = true; else if (k.startsWith("cor:")) E.cores.delete(k.slice(4));
    desenha(true); return;
  }
  const card = t.closest(".card");
  if (card) { const p = POR_ID.get(card.dataset.id); const b = t.closest(".bol"); abreFicha(p, b ? +b.dataset.cor : undefined); return; }
  const mini = t.closest("[data-mini]"); if (mini && F) { F.cor = +mini.dataset.mini; pintaFicha(); return; }
  const fc = t.closest("[data-fcor]"); if (fc && F) { F.cor = +fc.dataset.fcor; pintaFicha(); return; }
  const pzb = t.closest("[data-pzi]"); if (pzb && F) { F.pz = PRAZOS[+pzb.dataset.pzi]; pintaPrazos(); pintaPreco(); return; }
  const fx = t.closest("[data-fx]"); if (fx && F) { F.q = +fx.dataset.fx; $("#fiQ").value = F.q; pintaPreco(); return; }
  const iq = t.closest("[data-iq]"); if (iq) { const it = ORC[+iq.dataset.iq], p = POR_ID.get(it.id); it.q = Math.max(p ? p.min : 1, it.q + (+iq.dataset.d) * passo(it.q)); salvaOrc(); return; }
  const tira = t.closest("[data-tirai]"); if (tira) { ORC.splice(+tira.dataset.tirai, 1); salvaOrc(); return; }
  const fe = t.closest("[data-fecha]"); if (fe) { fecha("#" + fe.closest(".modal,.gaveta").id); }
});
document.addEventListener("change", e => {
  const v = e.target.closest("[data-iqv]"); if (v) { const it = ORC[+v.dataset.iqv]; it.q = Math.max(1, Math.round(+v.value || 1)); salvaOrc(); }
});
// passar o mouse na bolinha troca a foto do cartão
document.addEventListener("pointerover", e => {
  const b = e.target.closest(".bol"); if (!b) return;
  const card = b.closest(".card"), p = POR_ID.get(card.dataset.id), c = p && p.cores[+b.dataset.cor];
  if (!c || p.fonte !== "x") return;
  const img = card.querySelector(".c-foto img"); img.srcset = `${foto(c.img, 1)} 300w, ${foto(c.img, 2)} 652w`; img.src = foto(c.img, 1);
});
document.addEventListener("keydown", e => {
  if (e.key === "Escape") { if ($("#ficha").classList.contains("on")) fecha("#ficha"); else if ($("#orc").classList.contains("on")) fecha("#orc"); else if ($("#filtros").classList.contains("aberto")) fechaFiltros(); }
  if (e.key === "/" && document.activeElement.tagName !== "INPUT" && document.activeElement.tagName !== "TEXTAREA") { e.preventDefault(); $("#q").focus(); }
});
observador = new IntersectionObserver(es => { if (es.some(x => x.isIntersecting)) maisPagina(); }, { rootMargin: "900px 0px" });
observador.observe($("#mais"));
try { const ev = localStorage.getItem("khaus-evento"); if (ev && !$("#oData").value) $("#oData").value = ev; } catch (e) { }
const cli = ls("khaus-cliente"); if (cli) { $("#oNome").value = cli.nome || ""; $("#oEmpresa").value = cli.empresa || ""; $("#oCidade").value = cli.cidade || ""; }
const topo = $("#topo"); addEventListener("scroll", () => topo.classList.toggle("rolou", scrollY > 8), { passive: true });

inicia();
