// Gera uma página estática por produto da XBZ (/c/<código>) e o sitemap.xml, a partir do catálogo público.
// Serve para o Google achar os produtos (o catálogo em /catalogo monta tudo por JavaScript).
// Uso: node ferramentas/gera-paginas-xbz.js [--local]   (--local lê dados/catalogo.json e dados/descricoes.json)
// Roda uma vez por dia no GitHub (.github/workflows/paginas.yml).
const fs = require("fs"), path = require("path");
const RAIZ = path.join(__dirname, "..");
const SITE = (process.env.SITE_URL || "https://khaus-site.vercel.app").replace(/\/$/, "");
const SUPA = "https://cwsjddppdogvyitspbfr.supabase.co/storage/v1/object/public/khaus-catalogo/";
const LOCAL = process.argv.includes("--local");
const DIR = path.join(RAIZ, "c");

const esc = s => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const brl = v => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const arquivo = cod => String(cod).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

async function pega(nome) {
  if (LOCAL) return JSON.parse(fs.readFileSync(path.join(RAIZ, "dados", nome), "utf8"));
  const r = await fetch(SUPA + nome, { cache: "no-store" });
  if (!r.ok) throw new Error(`Não consegui baixar ${nome} (${r.status})`);
  return r.json();
}

function pagina(p, desc, cat, faixas, demo, cdn) {
  const url = `${SITE}/c/${arquivo(p.i)}`;
  const k0 = p.k.find(k => k[2] > 0) || p.k[0];
  const img = /^https?:/.test(k0[1]) ? k0[1] : cdn + "2/" + k0[1];
  const titulo = `${p.n} personalizado com a sua marca | Khaus Brindes`;
  const resumo = (desc || `${p.n} para personalizar com o logo da sua empresa.`).replace(/\s+/g, " ").trim();
  const metaDesc = (resumo.length > 150 ? resumo.slice(0, 147).replace(/\s\S*$/, "") + "…" : resumo) + " Orçamento pelo WhatsApp.";
  const maiorDesc = Math.max(0, ...faixas.filter(f => f[0] >= p.m).map(f => f[1]));
  const menor = Math.round(p.p * (1 - maiorDesc / 100) * 100) / 100;
  const cores = p.k.map(k => k[0]).filter(c => c !== "Única");
  const ld = {
    "@context": "https://schema.org", "@type": "Product", name: p.n, image: [img], description: resumo, sku: p.i, category: cat,
    brand: { "@type": "Brand", name: "Khaus Brindes Corporativos" }
  };
  if (!demo && p.p > 0) ld.offers = { "@type": "AggregateOffer", priceCurrency: "BRL", lowPrice: menor.toFixed(2), highPrice: p.p.toFixed(2), offerCount: p.k.length, availability: p.e > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock", url };
  const destino = `/catalogo?produto=${encodeURIComponent(p.i)}`;
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(titulo)}</title><meta name="description" content="${esc(metaDesc)}"><link rel="canonical" href="${url}">
<meta property="og:type" content="product"><meta property="og:title" content="${esc(titulo)}"><meta property="og:description" content="${esc(metaDesc)}"><meta property="og:image" content="${esc(img)}"><meta property="og:url" content="${url}"><meta property="og:site_name" content="Khaus Brindes Corporativos"><meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="/favicon-32.png"><link rel="stylesheet" href="/fonts/fonts.css">
<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, "\\u003c")}</script>
<style>:root{color-scheme:light}body{margin:0;background:#F5F6F9;color:#0F1117;font:400 16px/1.55 Outfit,system-ui,sans-serif}a{color:inherit}
.t{max-width:1080px;margin:0 auto;padding:18px 20px;display:flex;align-items:center;justify-content:space-between;gap:12px}.t img{width:112px;height:auto}.t a.v{font-weight:600;text-decoration:none}
.m{max-width:1080px;margin:0 auto 60px;padding:0 20px;display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:36px;align-items:start}
.f{background:#fff;border:1px solid #E3E5EC;border-radius:22px;aspect-ratio:1;display:grid;place-items:center;padding:6%}.f img{width:100%;height:100%;object-fit:contain}
.c{font:500 12px "Chivo Mono",monospace;letter-spacing:.05em;text-transform:uppercase;color:#646979}h1{font:800 clamp(28px,4vw,42px)/1.05 Archivo,system-ui,sans-serif;margin:8px 0 14px}
.p{font:800 30px Archivo,system-ui,sans-serif}.p small{font:400 15px Outfit,system-ui,sans-serif;color:#646979}.d{color:#454A5A}.n{font-size:13px;color:#646979}
.k{display:flex;flex-wrap:wrap;gap:6px;margin:14px 0}.k span{border:1px solid #CDD1DB;border-radius:999px;padding:4px 11px;font-size:14px}
.b{display:inline-flex;align-items:center;justify-content:center;height:54px;padding:0 26px;border-radius:999px;background:#0F1117;color:#fff;font-weight:600;text-decoration:none;margin-top:10px}
.e{font:500 13px "Chivo Mono",monospace;color:#0B7A57}.e.s{color:#A33A2B}@media(max-width:760px){.m{grid-template-columns:1fr;gap:20px}}</style></head>
<body><header class="t"><a href="/"><img src="/logo/khaus-logo-claro-600.webp" alt="Khaus Brindes Corporativos" width="600" height="207"></a><a class="v" href="/catalogo">Ver o catálogo completo</a></header>
<main class="m"><div class="f"><img src="${esc(img)}" alt="${esc(p.n)}" width="652" height="652"></div>
<div><p class="c"><a href="/catalogo?cat=${esc(p.c)}">${esc(cat)}</a></p><h1>${esc(p.n)}</h1>
${p.p > 0 ? `<p class="p">${brl(p.p)} <small>por unidade, mínimo ${p.m} un.${menor < p.p ? ` · até ${brl(menor)} no volume` : ""}</small></p>` : ""}
${demo ? `<p class="n">Valores de demonstração. O preço final vem no orçamento.</p>` : ""}
<p class="e${p.e > 0 ? "" : " s"}">${p.e > 0 ? "Em estoque · quantidade atualizada no catálogo" : "Sem estoque no momento"}</p>
${cores.length ? `<div class="k">${cores.map(c => `<span>${esc(c)}</span>`).join("")}</div>` : ""}
<p class="d">${esc(resumo)}</p>
<p>Com a gravação do logo da sua empresa. Arte digital para aprovar antes de produzir e envio para todo o Brasil.</p>
<a class="b" href="${destino}">Escolher cor e quantidade</a></div></main></body></html>`;
}

(async () => {
  const cat = await pega("catalogo.json");
  const desc = await pega("descricoes.json").catch(() => ({}));
  if (!cat || !Array.isArray(cat.p) || cat.p.length < 500) throw new Error("Catálogo vazio ou incompleto; nada foi gerado.");
  const nomeCat = Object.fromEntries((cat.cats || []).map(c => [c[0], c[1]]));
  fs.mkdirSync(DIR, { recursive: true });
  const feitos = new Set();
  for (const p of cat.p) {
    const f = arquivo(p.i) + ".html";
    if (feitos.has(f)) continue;
    feitos.add(f);
    fs.writeFileSync(path.join(DIR, f), pagina(p, desc[p.i], nomeCat[p.c] || "Brindes", cat.faixas || [], !!cat.demo, cat.cdn));
  }
  // remove páginas de produtos que saíram do catálogo
  let removidas = 0;
  for (const f of fs.readdirSync(DIR)) if (f.endsWith(".html") && !feitos.has(f)) { fs.unlinkSync(path.join(DIR, f)); removidas++; }

  const urls = [[SITE + "/", "1.0"], [SITE + "/catalogo", "0.9"]];
  for (const f of fs.readdirSync(path.join(RAIZ, "p")).filter(f => f.endsWith(".html")).sort()) urls.push([`${SITE}/p/${f.slice(0, -5)}`, "0.8"]);
  for (const f of [...feitos].sort()) urls.push([`${SITE}/c/${f.slice(0, -5)}`, "0.6"]);
  const hoje = new Date().toISOString().slice(0, 10);
  fs.writeFileSync(path.join(RAIZ, "sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    urls.map(([u, pr]) => `<url><loc>${u}</loc><lastmod>${hoje}</lastmod><priority>${pr}</priority></url>`).join("\n") + `\n</urlset>\n`);
  console.log(`${feitos.size} páginas de produto em /c, ${removidas} removidas, sitemap com ${urls.length} endereços.`);
})().catch(e => { console.error(e.message); process.exit(1); });
