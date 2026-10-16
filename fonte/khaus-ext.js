/* ===== EXTENSÕES KHAUS (fonte/khaus-ext.js) =====
   Injetado dentro do script principal do index.html por ferramentas/aplica.js (entre os marcadores KH-EXT).
   Roda dentro do mesmo DOMContentLoaded, então enxerga P, cart, cur, pmState, line, addItem, pmCalc, openP...
   1) Prazo de produção na ficha (Padrão / Expresso / Turbo), com data prevista em dias úteis e aviso pela data do evento
   2) Estoque por cor (quando o painel informa)
   3) Carteira ao vivo: produtos, preços, estoque e prazos vêm do painel (Supabase); sem banco, fica o que está na página */
var KH_SUPA = { url: "https://cwsjddppdogvyitspbfr.supabase.co", chave: "sb_publishable_zpNPLwlPqkOR6pnvrxRGHw_78r3siqN" };
var PRAZOS = [
  { id: "padrao", nome: "Padrão", de: 20, ate: 25, extra: 0, tag: "Recomendado" },
  { id: "expresso", nome: "Expresso", de: 12, ate: 15, extra: 15, tag: "" },
  { id: "turbo", nome: "Turbo", de: 7, ate: 10, extra: 25, tag: "Mais rápido" }
];
var PRAZOS_DEMO = true;      // prazos e acréscimos ainda não confirmados pela Khaus
var PROVA_DIAS = 1;          // prova digital em até 1 dia útil (antes de começar a produzir)
var ENVIO_FOLGA = 3;         // dias corridos de folga entre ficar pronto e o evento (envio/retirada)

/* ---------- dias úteis (sem sábado, domingo e feriados nacionais) ---------- */
function khIso(d) { return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }
function khPascoa(a) { var b = a % 19, c = Math.floor(a / 100), d = a % 100, e = Math.floor(c / 4), f = c % 4, g = Math.floor((c + 8) / 25), h = Math.floor((c - g + 1) / 3), i = (19 * b + c - e - h + 15) % 30, k = Math.floor(d / 4), l = d % 4, m = (32 + 2 * f + 2 * k - i - l) % 7, n = Math.floor((b + 11 * i + 22 * m) / 451), x = i + m - 7 * n + 114; return new Date(a, Math.floor(x / 31) - 1, (x % 31) + 1); }
var KH_FER = {};
function khFeriados(a) {
  if (KH_FER[a]) return KH_FER[a];
  var s = {}; ["01-01", "04-21", "05-01", "09-07", "10-12", "11-02", "11-15", "11-20", "12-25"].forEach(function (d) { s[a + "-" + d] = 1; });
  var p = khPascoa(a); [-48, -47, -2, 60].forEach(function (o) { var d = new Date(p); d.setDate(d.getDate() + o); s[khIso(d)] = 1; }); // carnaval, sexta santa, corpus christi
  return (KH_FER[a] = s);
}
function khUtil(d) { var w = d.getDay(); return w !== 0 && w !== 6 && !khFeriados(d.getFullYear())[khIso(d)]; }
function khSomaUteis(d, n) { var x = new Date(d.getFullYear(), d.getMonth(), d.getDate()); while (n > 0) { x.setDate(x.getDate() + 1); if (khUtil(x)) n--; } return x; }
var KH_DS = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
function khData(d) { return KH_DS[d.getDay()] + ", " + String(d.getDate()).padStart(2, "0") + "/" + String(d.getMonth() + 1).padStart(2, "0"); }
function khHoje() { var d = new Date(); return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
function prazoDe(id) { for (var i = 0; i < PRAZOS.length; i++) if (PRAZOS[i].id === id) return PRAZOS[i]; return PRAZOS[0]; }
function prazoPronto(z) { return khSomaUteis(khHoje(), PROVA_DIAS + z.ate); }
function prazoTexto(z) { return (z.de === z.ate ? z.ate : z.de + " a " + z.ate) + " dias úteis"; }
function khEvento() { try { var v = localStorage.getItem("khaus-evento"); return v ? new Date(v + "T12:00:00") : null; } catch (e) { return null; } }
function khChegaATempo(z, ev) { if (!ev) return null; var lim = new Date(ev); lim.setDate(lim.getDate() - ENVIO_FOLGA); return prazoPronto(z) <= lim; }
function khRound(v) { return Math.round(v * 100) / 100; }

/* ---------- estoque por cor (do painel) ---------- */
// produto com cores: estoque por cor ({cor: qtd}); produto sem cores: estoque total na chave "_"
function estoqueDe(p, fin) { if (!p || !p.estoque) return null; var v = p.estoque[fin || "_"]; return (v === undefined || v === null || v === "") ? null : +v; }

/* ---------- ficha: bloco de prazo + estoque ---------- */
function khFichaPrazo() {
  var z0 = prazoDe(pmState.prazo), ev = khEvento();
  var opc = PRAZOS.map(function (z) {
    var ok = khChegaATempo(z, ev);
    return '<button type="button" class="pz' + (z.id === z0.id ? " on" : "") + (ok === false ? " late" : "") + '" data-pz="' + z.id + '" role="radio" aria-checked="' + (z.id === z0.id) + '">' +
      '<span class="pz-r" aria-hidden="true"></span><span class="pz-n"><b>' + esc(z.nome) + '</b>' + (z.tag ? '<em>' + esc(z.tag) + '</em>' : '') + '</span>' +
      '<span class="pz-d">Pronto em ' + prazoTexto(z) + '<br><small>previsão: até ' + khData(prazoPronto(z)) + (ok === true ? ' · <i class="okk">chega a tempo</i>' : ok === false ? ' · <i class="nok">não chega a tempo</i>' : '') + '</small></span>' +
      '<span class="pz-x">' + (z.extra ? "+" + z.extra + "%" : "Sem custo") + '</span></button>';
  }).join("");
  var evv = ev ? khIso(ev) : "";
  return '<div class="pzbox" id="pmPrazo"><label>Prazo de produção</label><div class="pzs" role="radiogroup" aria-label="Prazo de produção">' + opc + '</div>' +
    '<div class="pzev"><span>Tem data marcada?</span><input type="date" id="pmEvento" value="' + evv + '" min="' + khIso(khHoje()) + '" aria-label="Data do evento ou da entrega"></div>' +
    '<small class="pznote">Contado a partir da aprovação da arte (prova digital em até ' + PROVA_DIAS + ' dia útil). Dias úteis, sem fins de semana e feriados.' + (PRAZOS_DEMO ? ' Prazos e acréscimos de demonstração, confirmados no orçamento.' : '') + '</small></div>';
}
function khPintaPrazo() {
  var box = $("#pmPrazo"); if (!box || !cur) return;
  var tmp = document.createElement("div"); tmp.innerHTML = khFichaPrazo(); box.replaceWith(tmp.firstChild);
}
function khPintaEstoque() {
  if (!cur) return; var el = $("#pmEst"); var fin = cur.fins.length ? cur.fins[pmState.fin] : null; var e = estoqueDe(cur, fin);
  if (e === null) { if (el) el.remove(); return; }
  var q = pmState.q || cur.min, nc = fin ? " nesta cor" : "";
  var html = e <= 0 ? '<span class="z">Sem estoque' + nc + ' no momento: sob encomenda, o prazo pode aumentar</span>' : (q > e ? '<span class="w"><b>' + e + '</b> em estoque' + nc + '. Acima disso, o restante é sob encomenda e o prazo pode aumentar.</span>' : '<span class="ok"><b>' + e + '</b> em estoque' + nc + '</span>');
  if (!el) { var ref = $("#pmFins") || $("#mpn .qty"); if (!ref) return; ref.insertAdjacentHTML("afterend", '<div class="est" id="pmEst"></div>'); el = $("#pmEst"); }
  el.innerHTML = html;
}

var _khOpen = openP;
openP = function (id) {
  _khOpen(id); if (!cur) return;
  if (!pmState.prazo) pmState.prazo = "padrao";
  var ref = $("#pmNudge"); if (ref && !$("#pmPrazo")) ref.insertAdjacentHTML("afterend", khFichaPrazo());
  pmCalc();
};
var _khCalc = pmCalc;
pmCalc = function () {
  _khCalc(); if (!cur) return;
  var z = prazoDe(pmState.prazo), q = pmState.q;
  if (cur.tiers.length && z.extra) {
    var u = khRound(unit(cur.tiers, q) * (1 + z.extra / 100)), tot = khRound(u * q), fin = cur.fins.length ? FIN[cur.fins[pmState.fin]][0] : "cor a combinar";
    var a = $("#pmU"); if (a) a.innerHTML = BRL(u) + '<small> /un</small>';
    var b = $("#pmU2"); if (b) b.textContent = BRL(u);
    var c = $("#pmTot"); if (c) c.textContent = BRL(tot);
    var d = $("#bbPrice"); if (d) d.textContent = BRL(tot);
    var s = $("#bbSub"); if (s) s.textContent = q + " un × " + BRL(u) + " · " + fin + " · " + z.nome;
  }
  var tl = $("#pmTotS"); if (tl && cur.tiers.length) tl.textContent = q + " un" + (z.extra ? " · " + z.nome + " +" + z.extra + "%" : "");
  khPintaEstoque();
};
document.addEventListener("click", function (e) {
  var b = e.target.closest && e.target.closest("[data-pz]"); if (!b || !cur) return;
  pmState.prazo = b.dataset.pz; khPintaPrazo(); pmCalc();
});
document.addEventListener("change", function (e) {
  if (e.target && e.target.id === "pmEvento") {
    try { if (e.target.value) localStorage.setItem("khaus-evento", e.target.value); else localStorage.removeItem("khaus-evento"); } catch (er) { }
    var ev = khEvento(), cd = $("#cData"); if (cd && ev) cd.value = String(ev.getDate()).padStart(2, "0") + "/" + String(ev.getMonth() + 1).padStart(2, "0") + "/" + ev.getFullYear();
    // escolhe sozinho o prazo mais barato que chega a tempo
    if (ev && khChegaATempo(prazoDe(pmState.prazo), ev) === false) {
      var achou = null; for (var i = 0; i < PRAZOS.length; i++) if (khChegaATempo(PRAZOS[i], ev)) { achou = PRAZOS[i]; break; }
      if (achou) { pmState.prazo = achou.id; toast("Prazo " + achou.nome + " escolhido para chegar a tempo"); }
      else { var rap = PRAZOS.slice().sort(function (a, b) { return a.ate - b.ate; })[0]; pmState.prazo = rap.id; toast("Nenhum prazo fica pronto até " + khData(ev) + ". Chame a Khaus no WhatsApp para ver uma urgência.", 6500); }
    }
    khPintaPrazo(); pmCalc();
  }
});

/* ---------- carrinho e mensagem ---------- */
var _khLine = line;
line = function (it) {
  var L = _khLine(it); if (it.type !== "p") return L;
  var z = prazoDe(it.prazo); L.prazo = z;
  if (z.extra && L.u) L.u = khRound(L.u * (1 + z.extra / 100));
  L.sub = L.sub + " · Prazo " + z.nome + (z.extra ? " (+" + z.extra + "%)" : "");
  return L;
};
var _khAdd = addItem;
addItem = function (it, el) {
  if (it && it.type === "p" && !it.prazo) it.prazo = (cur && cur.id === it.id && pmState.prazo) || "padrao";
  _khAdd(it, el);
  cart.forEach(function (c) { if (c.type === it.type && c.id === it.id && c.fin === it.fin && c.grav === it.grav) c.prazo = it.prazo; });
  save();
};
function khResumoPrazo() {
  var maior = null; cart.forEach(function (it) { if (it.type !== "p") return; var z = prazoDe(it.prazo); if (!maior || prazoPronto(z) > prazoPronto(maior)) maior = z; });
  return maior;
}
var _khPaint = paintCart;
paintCart = function () {
  _khPaint();
  var z = khResumoPrazo(), alvo = $("#cartTot"), box = $("#cartPrazo"); if (!alvo) return;
  if (!z) { if (box) box.remove(); return; }
  var ev = khEvento(), ok = khChegaATempo(z, ev);
  var html = '<b>Produção:</b> previsão até ' + khData(prazoPronto(z)) + ' <span>(' + (cart.length > 1 ? "item mais demorado: " : "") + z.nome + ', ' + prazoTexto(z) + ')</span>' + (ok === false ? '<em class="nok">Não chega a tempo para ' + khData(ev) + '. Abra o produto e escolha um prazo mais rápido.</em>' : ok === true ? '<em class="okk">Chega a tempo para ' + khData(ev) + '</em>' : '');
  if (!box) { var host = alvo.closest(".sum") || alvo.parentNode; host.insertAdjacentHTML("afterend", '<div class="cartpz" id="cartPrazo"></div>'); box = $("#cartPrazo"); }
  box.innerHTML = html;
};
var _khMsg = msg;
msg = function () {
  var t = _khMsg(), z = khResumoPrazo();
  if (!z) return t;
  var ev = khEvento();
  var linha = "\nPrazo de produção: " + z.nome + " (" + prazoTexto(z) + (z.extra ? ", +" + z.extra + "%" : "") + "), previsão até " + khData(prazoPronto(z)) + (ev ? "\nData do evento: " + khData(ev) + (khChegaATempo(z, ev) ? " (chega a tempo)" : " (NÃO chega a tempo no prazo escolhido)") : "");
  if (ev) t = t.replace(/\nData do evento: [^\n]*/, "");
  return t.replace("\n\nPedido montado no site da Khaus", linha + "\n\nPedido montado no site da Khaus");
};
// o seletor antigo "Prazo desejado" do carrinho vira o resumo acima
(function () { var s = $("#cPrazo"); if (s) { s.value = ""; s.style.display = "none"; s.setAttribute("aria-hidden", "true"); } })();
cart.forEach(function (c) { if (c.type === "p" && !c.prazo) c.prazo = "padrao"; });

/* ---------- carteira ao vivo (painel) ---------- */
var _khPimg = pimg;
pimg = function (id, cls) {
  var p = null; try { p = byId(id); } catch (e) { }
  if (p && p.foto) { var sm = /\bsm\b/.test(cls || ""), src = sm ? p.foto.replace(/-g\.(webp|jpg)$/, "-p.$1") : p.foto; return '<div class="pw ' + (cls || "") + '"><img src="' + esc(src) + '" alt="' + esc(p.name) + '" ' + (/eager/.test(cls || "") ? "" : 'loading="lazy" ') + 'decoding="async"></div>'; }
  return _khPimg(id, cls);
};
var KH_FOTO_OK = KH_SUPA.url + "/storage/v1/object/public/khaus-fotos/";
function khAplica(dados) {
  if (!dados || !Array.isArray(dados.produtos) || !dados.produtos.length) return false;
  var cfg = {}; (dados.config || []).forEach(function (c) { cfg[c.chave] = c.valor; });
  if (Array.isArray(cfg.prazos) && cfg.prazos.length) PRAZOS = cfg.prazos.filter(function (z) { return z && z.id && z.nome && +z.ate > 0; }).map(function (z) { return { id: String(z.id), nome: String(z.nome), de: +z.de || +z.ate, ate: +z.ate, extra: +z.extra || 0, tag: z.tag ? String(z.tag) : "" }; });
  if (typeof cfg.prazosDemo === "boolean") PRAZOS_DEMO = cfg.prazosDemo;
  if (typeof cfg.precosDemo === "boolean") PRECO_DEMO = cfg.precosDemo;
  if (cfg.cores && typeof cfg.cores === "object") Object.keys(cfg.cores).forEach(function (k) { var v = cfg.cores[k]; if (!FIN[k] && Array.isArray(v) && /^#[0-9a-f]{6}$/i.test(v[1])) FIN[k] = [String(v[0]), v[1]]; });
  var antigos = {}; P.forEach(function (p) { antigos[p.id] = p; });
  var novo = dados.produtos.slice().sort(function (a, b) { return (a.ordem || 0) - (b.ordem || 0); }).map(function (r) {
    var b = antigos[r.id] || { id: r.id, h: "#6AD4AE", ic: "box", grav: ["def"], fins: [] };
    var p = Object.assign({}, b);
    p.cat = r.cat || b.cat; p.name = r.nome || b.name; p.sub = r.sub || ""; p.desc = r.descricao || ""; if (r.specs) p.specs = r.specs;
    p.fins = (r.cores || []).filter(function (f) { return !!FIN[f]; });
    p.min = Math.max(1, +r.min || 1); p.minKnown = true; p.pop = r.ordem || 0;
    p.tiers = Array.isArray(r.faixas) ? r.faixas.filter(function (t) { return Array.isArray(t) && +t[0] > 0 && +t[1] > 0; }).map(function (t) { return [+t[0], +t[1]]; }).sort(function (x, y) { return x[0] - y[0]; }) : [];
    p.estoque = r.estoque && typeof r.estoque === "object" ? r.estoque : null;
    p.foto = typeof r.foto === "string" && r.foto.indexOf(KH_FOTO_OK) === 0 && /^[\w\-\/.%:]+$/.test(r.foto) ? r.foto : null;
    var esg = (r.esgotadas || []).slice(); if (p.estoque) p.fins.forEach(function (f) { if (estoqueDe(p, f) === 0 && esg.indexOf(f) < 0) esg.push(f); });
    if (esg.length) ESGOTADO[p.id] = esg; else delete ESGOTADO[p.id];
    return p;
  });
  P.length = 0; novo.forEach(function (p) { P.push(p); });
  return true;
}
function khBusca() {
  var h = { apikey: KH_SUPA.chave, Accept: "application/json" };
  var ctrl = window.AbortController ? new AbortController() : null; var t = setTimeout(function () { if (ctrl) ctrl.abort(); }, 4000);
  var op = { headers: h, cache: "no-store", signal: ctrl ? ctrl.signal : undefined };
  return Promise.all([
    fetch(KH_SUPA.url + "/rest/v1/khaus_produtos?select=*&ativo=eq.true", op).then(function (r) { if (!r.ok) throw r.status; return r.json(); }),
    fetch(KH_SUPA.url + "/rest/v1/khaus_config?select=chave,valor", op).then(function (r) { return r.ok ? r.json() : []; }).catch(function () { return []; })
  ]).then(function (v) { clearTimeout(t); return { produtos: v[0], config: v[1] }; });
}
(function () {
  var CH = "khaus-vivo-v1";
  function aplicaEDesenha(d) {
    if (!khAplica(d)) return;
    try { renderGrid(); } catch (e) { }
    // faixa "Vitrine" (montada antes dos dados chegarem): tira produtos ocultos ou excluídos no painel
    $$("#stripT [data-open]").forEach(function (el) { if (!byId(el.dataset.open)) el.remove(); });
    cart = cart.filter(function (it) { return it.type !== "p" || byId(it.id); }); try { paintCart(); } catch (e) { }
    if (cur) { var aberto = byId(cur.id); if (aberto) { cur = aberto; khPintaPrazo(); try { pmCalc(); } catch (e) { } } }
    document.documentElement.setAttribute("data-vivo", "ok");
  }
  var fresco = /[?&]fresco/.test(location.search), guardado = null;
  try { var g = JSON.parse(localStorage.getItem(CH) || "null"); if (g && Date.now() - g.t < 30000) guardado = g.d; } catch (e) { }
  if (guardado && !fresco) { aplicaEDesenha(guardado); return; }
  khBusca().then(function (d) { try { localStorage.setItem(CH, JSON.stringify({ t: Date.now(), d: d })); } catch (e) { } aplicaEDesenha(d); })
    .catch(function () { document.documentElement.setAttribute("data-vivo", "sem-banco"); });
})();
window.KhausExt = { PRAZOS: function () { return PRAZOS; }, prazoPronto: prazoPronto, khSomaUteis: khSomaUteis, khFeriados: khFeriados };
/* ===== FIM DAS EXTENSÕES ===== */
