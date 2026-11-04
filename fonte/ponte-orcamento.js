/* Página inicial → orçamento único do catálogo (/catalogo).
   O "Adicionar ao orçamento" da ficha da página inicial grava na mesma lista do catálogo (localStorage "khaus-orcamento")
   e o botão "Orçamento" abre o resumo do catálogo. Itens do carrinho antigo ("khaus-cart") passam para a lista nova. */
(function () {
  "use strict";
  var KEY = "khaus-orcamento";
  function le(k, padrao) { try { return JSON.parse(localStorage.getItem(k) || "null") || padrao; } catch (e) { return padrao; } }
  function grava(v) { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch (e) { } }
  function conta() { var b = document.getElementById("cartN"); if (b) b.textContent = le(KEY, []).length; }

  // carrinho antigo da página inicial
  var velho = le("khaus-cart", []);
  if (velho.length) {
    var v = le(KEY, []);
    velho.forEach(function (it) {
      if (!it || it.type !== "p" || !it.id) return;
      var id = "k-" + it.id, cor = +it.fin || 0, i = v.findIndex(function (x) { return x.id === id && x.cor === cor; });
      if (i < 0) v.push({ id: id, cor: cor, q: +it.q || 1 });
    });
    grava(v);
    try { localStorage.removeItem("khaus-cart"); } catch (e) { }
  }

  function aviso(txt) {
    var t = document.getElementById("khPonte");
    if (!t) {
      t = document.createElement("div"); t.id = "khPonte"; t.setAttribute("role", "status");
      t.style.cssText = "position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:9999;background:#0F1117;color:#fff;padding:12px 14px 12px 18px;border-radius:14px;font:500 14.5px Outfit,system-ui,sans-serif;display:flex;gap:14px;align-items:center;box-shadow:0 18px 40px -16px rgba(0,0,0,.5);max-width:calc(100vw - 32px)";
      document.body.appendChild(t);
    }
    t.innerHTML = "";
    var s = document.createElement("span"); s.textContent = txt; t.appendChild(s);
    var a = document.createElement("a"); a.href = "catalogo?orcamento=1"; a.textContent = "Ver orçamento"; a.style.cssText = "color:#6AD4AE;font-weight:600;white-space:nowrap;text-decoration:none"; t.appendChild(a);
    t.style.display = "flex"; clearTimeout(aviso.t); aviso.t = setTimeout(function () { t.style.display = "none"; }, 5000);
  }

  document.addEventListener("click", function (e) {
    var add = e.target.closest && e.target.closest("#pmAdd,#bbAdd");
    if (add) {
      var id = new URLSearchParams(location.search).get("produto");
      if (add.disabled || !id) return;
      e.preventDefault(); e.stopImmediatePropagation();
      var q = Math.max(1, parseInt((document.getElementById("pmQ") || {}).value, 10) || 1);
      var fb = document.querySelector("#pmFins button.on"), cor = fb ? +fb.dataset.pf || 0 : 0;
      var pz = document.querySelector("#pmPrazo .pz.on"), prazo = null;
      if (pz) { var x = pz.querySelector(".pz-x"); prazo = { id: pz.dataset.pz, nome: (pz.querySelector(".pz-n b") || {}).textContent || "", extra: x ? parseFloat(x.textContent.replace(/[^\d.,]/g, "").replace(",", ".")) || 0 : 0 }; }
      var dd = pz ? (pz.querySelector(".pz-d") || {}).textContent || "" : "", m = dd.match(/(\d+)\s*a\s*(\d+)/);
      if (prazo && m) { prazo.de = +m[1]; prazo.ate = +m[2]; }
      var lista = le(KEY, []), k = "k-" + id, i = lista.findIndex(function (it) { return it.id === k && it.cor === cor; });
      var item = { id: k, cor: cor, q: q }; if (prazo) item.pz = prazo;
      if (i >= 0) lista[i] = item; else lista.push(item);
      grava(lista); conta();
      var nome = (document.querySelector("#mpn h2, #mpn h3") || {}).textContent || "Produto";
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
      aviso(nome.trim() + " no orçamento");
      return;
    }
    var abre = e.target.closest && e.target.closest("#cartBtn,[data-open-cart]");
    if (abre) { e.preventDefault(); e.stopImmediatePropagation(); location.href = "catalogo?orcamento=1"; }
  }, true);
  window.addEventListener("storage", function (e) { if (e.key === KEY) conta(); });
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", function () { conta(); setTimeout(conta, 1500); });
  else { conta(); setTimeout(conta, 1500); }
})();
