// Validação geral do site da Khaus: todas as páginas, 6 larguras de tela, tema claro e escuro.
// Procura erros de JavaScript, recursos que não carregam, imagens quebradas, rolagem lateral,
// textos cortados em botões e links internos quebrados. Uso: node testes/valida-site.js [url] [--rapido]
const puppeteer = require("C:/Users/Douglas/Desktop/CLAUDE/majex-produtos/node_modules/puppeteer-core");
const fs = require("fs"), path = require("path");
const B = (process.argv[2] && !process.argv[2].startsWith("--") ? process.argv[2] : "http://localhost:4060").replace(/\/$/, "");
const LOCAL = /localhost|127\.0\.0\.1/.test(B);
const CAT = B + "/catalogo" + (LOCAL ? "?fonte=local" : "");
const RAPIDO = process.argv.includes("--rapido");
const LARG = [[360, 740], [390, 844], [768, 1024], [1024, 768], [1366, 860], [1920, 1080]];
const problemas = [];
const anota = (onde, txt) => { problemas.push(onde + ": " + txt); };
const espera = ms => new Promise(r => setTimeout(r, ms));

// roda dentro da página: rolagem lateral, botões com texto cortado, imagens quebradas
const INSPECAO = () => {
  const r = { lateral: 0, cortados: [], quebradas: [] };
  r.lateral = document.documentElement.scrollWidth - innerWidth;
  const visivel = e => { const s = getComputedStyle(e); if (s.display === "none" || s.visibility === "hidden" || +s.opacity === 0) return false; const b = e.getBoundingClientRect(); return b.width > 0 && b.height > 0; };
  for (const e of document.querySelectorAll("button, a.btn, .btn, .cat, .pill, .orc-btn, .kx-busca button")) {
    if (!visivel(e) || e.closest("[hidden],[aria-hidden='true'],.mq,.marq,.cats")) continue;
    if (getComputedStyle(e).overflow === "visible" || e.textContent.trim().length < 3) continue;
    const caixa = e.getBoundingClientRect(), rg = document.createRange(); rg.selectNodeContents(e);
    let esq = 1e9, dir = -1e9;
    const tw = document.createTreeWalker(e, NodeFilter.SHOW_TEXT);
    while (tw.nextNode()) { const t = tw.currentNode; if (!t.textContent.trim()) continue; const rr = document.createRange(); rr.selectNodeContents(t); for (const q of rr.getClientRects()) { if (q.width) { esq = Math.min(esq, q.left); dir = Math.max(dir, q.right); } } }
    if (dir > esq && (esq < caixa.left - 1 || dir > caixa.right + 1))
      r.cortados.push((e.id ? "#" + e.id : e.className.toString().split(" ")[0]) + " “" + e.textContent.trim().slice(0, 30) + "” (texto " + Math.round(dir - esq) + "px, botão " + Math.round(caixa.width) + "px)");
  }
  for (const i of document.images) if (i.complete && i.currentSrc && i.naturalWidth === 0 && visivel(i)) r.quebradas.push(i.currentSrc.slice(-60));
  return r;
};

(async () => {
  const b = await puppeteer.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: true, args: ["--no-sandbox"] });
  async function abre(url, [w, h], tema, onde) {
    const p = await b.newPage();
    await p.setViewport({ width: w, height: h, isMobile: w < 768, hasTouch: w < 768 });
    await p.emulateMediaFeatures([{ name: "prefers-color-scheme", value: tema }, { name: "prefers-reduced-motion", value: "no-preference" }]);
    await p.evaluateOnNewDocument(t => { try { localStorage.setItem("khaus-theme", t); } catch (e) { } window.open = () => null; }, tema);
    p.on("pageerror", e => anota(onde, "erro de JavaScript: " + e.message));
    p.on("console", m => { if (m.type() === "error" && !/Failed to load resource/.test(m.text())) anota(onde, "console: " + m.text().slice(0, 140)); });
    p.on("requestfailed", r => { const u = r.url(); if (!/google-analytics|googletagmanager|facebook|doubleclick/.test(u) && r.failure() && !/ERR_ABORTED/.test(r.failure().errorText)) anota(onde, "não carregou: " + u.slice(0, 110) + " (" + r.failure().errorText + ")"); });
    p.on("response", r => { const u = r.url(); if (r.status() >= 400 && !/favicon|\/functions\/v1\//.test(u)) anota(onde, `HTTP ${r.status()}: ${u.slice(0, 110)}`); });
    await p.goto(url, { waitUntil: "networkidle2", timeout: 60000 });
    await espera(900);
    return p;
  }
  async function inspeciona(p, onde) {
    const r = await p.evaluate(INSPECAO);
    if (r.lateral > 1) anota(onde, `rolagem lateral de ${r.lateral}px`);
    for (const c of r.cortados) anota(onde, "texto cortado em " + c);
    for (const q of r.quebradas) anota(onde, "imagem quebrada " + q);
  }
  async function rolaTudo(p) { await p.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += innerHeight * .8) { scrollTo(0, y); await new Promise(r => setTimeout(r, 120)); } scrollTo(0, 0); }); await espera(600); }

  const larguras = RAPIDO ? [LARG[1], LARG[4]] : LARG;
  for (const tema of ["light", "dark"]) for (const vp of larguras) {
    const tag = `${vp[0]}px ${tema === "light" ? "claro" : "escuro"}`;
    process.stdout.write(`  ${tag} … `);
    // página inicial
    let p = await abre(B + "/", vp, tema, "início " + tag);
    await rolaTudo(p); await inspeciona(p, "início " + tag);
    const card = await p.$("#grid .card, #grid [data-open], [data-open]");
    if (card) {
      await p.evaluate(e => e.scrollIntoView({ block: "center" }), card); await espera(300);
      await p.evaluate(e => e.click(), card); await espera(900);
      await inspeciona(p, "início (ficha aberta) " + tag);
      const add = await p.$("#pmAdd"); if (add) { await p.evaluate(e => e.click(), add); await espera(700); await inspeciona(p, "início (orçamento) " + tag); }
    } else anota("início " + tag, "não achei cartão de produto para abrir a ficha");
    await p.close();
    // catálogo
    p = await abre(CAT, vp, tema, "catálogo " + tag);
    await inspeciona(p, "catálogo " + tag);
    await p.evaluate(() => scrollTo(0, document.body.scrollHeight)); await espera(900); await inspeciona(p, "catálogo (rolado) " + tag);
    await p.evaluate(() => scrollTo(0, 0));
    await p.evaluate(() => document.querySelector(".card .c-foto").click()); await espera(700);
    await inspeciona(p, "catálogo (ficha) " + tag);
    await p.evaluate(() => document.querySelector("#fiAdd").click()); await espera(500);
    await p.evaluate(() => document.querySelector("#orcBtn").click()); await espera(600);
    await inspeciona(p, "catálogo (orçamento) " + tag);
    if (vp[0] < 1020) { await p.evaluate(() => { document.querySelector("[data-fecha]") && document.querySelectorAll(".gaveta [data-fecha]")[0].click(); }); await espera(400); await p.evaluate(() => document.querySelector("#fAbre").click()); await espera(500); await inspeciona(p, "catálogo (filtros) " + tag); }
    await p.close();
    // painel (tela de entrada)
    p = await abre(B + "/painel", vp, tema, "painel " + tag); await inspeciona(p, "painel " + tag); await p.close();
    console.log("ok");
  }

  // páginas de produto e links internos
  console.log("  páginas de produto e links …");
  const pags = fs.readdirSync(path.join(__dirname, "..", "p")).filter(f => f.endsWith(".html"));
  const p = await b.newPage(); await p.setViewport({ width: 1366, height: 860 });
  p.on("pageerror", e => anota("página de produto", "erro de JavaScript: " + e.message));
  const links = new Set();
  for (const f of pags) {
    const r = await p.goto(B + "/p/" + f.replace(/\.html$/, ""), { waitUntil: "domcontentloaded" });
    if (!r || r.status() >= 400) { anota("/p/" + f, "HTTP " + (r && r.status())); continue; }
    (await p.$$eval("a[href]", as => as.map(a => a.href))).forEach(h => links.add(h));
  }
  for (const u of [B + "/", CAT]) { await p.goto(u, { waitUntil: "domcontentloaded" }); (await p.$$eval("a[href]", as => as.map(a => a.href))).forEach(h => links.add(h)); }
  let nLinks = 0;
  for (const h of links) {
    if (!h || /^(mailto:|tel:|javascript:)/i.test(h)) continue;
    const u = h.split("https://khaus-site.vercel.app").join(B);
    if (!u.startsWith(B)) continue;
    if (!u.startsWith(B)) continue;
    nLinks++;
    const r = await fetch(u.split("#")[0]).catch(() => null);
    if (!r || r.status >= 400) anota("link interno", `${h} → ${r ? r.status : "sem resposta"}`);
  }
  await b.close();
  console.log(`  ${pags.length} páginas de produto, ${nLinks} links internos conferidos.`);
  const unicos = [...new Set(problemas)];
  if (!unicos.length) { console.log("\nNenhum problema encontrado."); process.exit(0); }
  console.log(`\n${unicos.length} problema(s):`); unicos.forEach(x => console.log("  - " + x)); process.exit(1);
})().catch(e => { console.error(e); process.exit(1); });
