// Troca a seção "Categorias" da página inicial pelas categorias do catálogo completo (XBZ + Khaus).
// Gera os quadros já prontos no HTML (sem esperar a rede) e um script curto que atualiza as contagens
// com o resumo publicado pela função khaus-xbz. Idempotente. Uso: node ferramentas/home-categorias.js
const fs = require("fs"), path = require("path");
const RAIZ = path.join(__dirname, "..");
const ARQ = path.join(RAIZ, "index.html");

(async () => {
  const { categoria } = await import("file:///" + path.join(RAIZ, "xbz/core.js").replace(/\\/g, "/"));
  const resumo = JSON.parse(fs.readFileSync(path.join(RAIZ, "dados/resumo.json"), "utf8"));
  const kh = JSON.parse(fs.readFileSync(path.join(RAIZ, "painel/catalogo.json"), "utf8")).produtos || [];
  const extra = {};
  for (const p of kh) { const c = categoria(p.nome); extra[c] = (extra[c] || 0) + 1; }
  const CDN = "https://cdn.xbzbrindes.com.br/img/produtos/";
  const cats = resumo.cats.filter(c => c[0] !== "outros");
  const total = resumo.total + kh.length;
  const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
  const tiles = cats.map(([id, nome, n, img]) => {
    const t = n + (extra[id] || 0);
    return `<a class="kxc" href="catalogo?cat=${id}" data-kxc="${id}" data-k="${extra[id] || 0}"><span class="kxc-f">${img ? `<img src="${CDN}1/${esc(img)}" srcset="${CDN}1/${esc(img)} 300w, ${CDN}2/${esc(img)} 652w" sizes="(max-width:640px) 44vw, 220px" alt="" loading="lazy" decoding="async" width="300" height="300">` : ""}</span><span class="kxc-t"><b>${esc(nome)}</b><small>${t.toLocaleString("pt-BR")} produtos</small></span></a>`;
  }).join("");
  const bloco = `<!--kx-cats--><div class="kx-cats">${tiles}<a class="kxc kxc-todos" href="catalogo"><span class="kxc-t"><b>Ver o catálogo completo</b><small data-kx-total>${total.toLocaleString("pt-BR")} produtos com estoque atualizado</small></span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg></a></div><div id="kitGrid" hidden></div><!--/kx-cats-->`;

  let h = fs.readFileSync(ARQ, "utf8");
  if (h.includes("<!--kx-cats-->")) h = h.replace(/<!--kx-cats-->[\s\S]*?<!--\/kx-cats-->/, bloco);
  else {
    const velho = '<div class="bento" id="kitGrid"></div>';
    if (!h.includes(velho)) throw new Error("Não achei a grade de categorias da página inicial.");
    h = h.replace(velho, bloco);
  }
  h = h.replace(/<h2>Tudo pra sua marca, <span class="grad">em [^<]+<\/span><\/h2><\/div><p>[^<]*<\/p>/,
    `<h2>Tudo pra sua marca, <span class="grad">em ${cats.length} categorias.</span></h2></div><p>Mais de ${Math.floor(total / 100) * 100 >= 1000 ? (Math.floor(total / 100) * 100).toLocaleString("pt-BR") : total} brindes com estoque atualizado ao longo do dia. Toque em uma categoria para ver os produtos.</p>`);

  const css = `<style id="kx-cats-css">
.kx-cats{display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:12px}
@media (min-width:1100px){.kx-cats{grid-template-columns:repeat(5,minmax(0,1fr))}}
.kxc{display:flex;flex-direction:column;border-radius:18px;overflow:hidden;background:var(--sf);border:1px solid var(--line);text-decoration:none;color:var(--ink);transition:transform .35s var(--ease),box-shadow .35s var(--ease),border-color .2s}
.kxc:hover{transform:translateY(-3px);border-color:var(--line2);box-shadow:0 18px 40px -24px rgba(15,17,23,.35)}
.kxc-f{aspect-ratio:1/.82;background:#fff;display:grid;place-items:center;overflow:hidden;border-bottom:1px solid var(--line)}
.kxc-f img{width:78%;height:78%;object-fit:contain;transition:transform .5s var(--ease)}
.kxc:hover .kxc-f img{transform:scale(1.06)}
.kxc-t{display:flex;flex-direction:column;gap:2px;padding:12px 14px 14px}
.kxc-t b{font:700 15px/1.25 var(--fb)}
.kxc-t small{font:500 12px var(--fm);color:var(--ink3)}
.kxc-todos{background:#0F1117;color:#F6F6FA;border-color:#0F1117;justify-content:space-between;padding:6px 4px 14px;min-height:100%}
.kxc-todos .kxc-t b{font:800 22px/1.1 var(--fd);font-stretch:110%}
.kxc-todos .kxc-t small{color:#6AD4AE;font-size:12.5px;margin-top:6px}
.kxc-todos svg{width:28px;height:28px;margin:0 14px;fill:none;stroke:#6AD4AE;stroke-width:2;align-self:flex-end}
html[data-theme="dark"] .kxc-todos{background:#6AD4AE;color:#0B0C12}
html[data-theme="dark"] .kxc-todos .kxc-t small{color:#0B0C12}
html[data-theme="dark"] .kxc-todos svg{stroke:#0B0C12}
@media (max-width:640px){.kx-cats{grid-template-columns:1fr 1fr;gap:10px}.kxc-t{padding:10px 11px 12px}.kxc-t b{font-size:14px}.kxc-todos .kxc-t b{font-size:19px}}
</style>
<script>addEventListener("DOMContentLoaded",function(){fetch("https://cwsjddppdogvyitspbfr.supabase.co/storage/v1/object/public/khaus-catalogo/resumo.json",{cache:"no-cache"}).then(function(r){if(!r.ok)throw 0;return r.json();}).then(function(d){var tot=0;(d.cats||[]).forEach(function(c){var a=document.querySelector('[data-kxc="'+c[0]+'"]');if(!a)return;var n=c[2]+(+a.dataset.k||0);tot+=n;a.querySelector("small").textContent=n.toLocaleString("pt-BR")+" produtos";});var t=document.querySelector("[data-kx-total]");if(t&&tot)t.textContent=tot.toLocaleString("pt-BR")+" produtos com estoque atualizado";}).catch(function(){});});</script>`;
  h = h.replace(/<style id="kx-cats-css">[\s\S]*?<\/script>\n?/, "");
  h = h.replace("</head>", css + "\n</head>");
  fs.writeFileSync(ARQ, h);
  console.log(`Categorias da página inicial: ${cats.length} quadros, ${total} produtos.`);
})();
