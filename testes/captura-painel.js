// Passada visual pelo painel em modo demonstração (computador e celular). Uso: node testes/captura-painel.js
const puppeteer = require("C:/Users/Douglas/Desktop/CLAUDE/majex-produtos/node_modules/puppeteer-core");
const path = require("path"); const B = process.argv[2] || "http://localhost:4060";
const espera = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const b = await puppeteer.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: true, args: ["--no-sandbox"] });
  for (const [n, vp] of [["pc", { width: 1366, height: 860 }], ["cel", { width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }]]) {
    const ctx = b.createBrowserContext ? await b.createBrowserContext() : await b.createIncognitoBrowserContext(); const p = await ctx.newPage(); await p.setViewport(vp); const erros = [];
    p.on("pageerror", e => erros.push(e.message)); p.on("console", m => { if (m.type() === "error") erros.push(m.text()); });
    await p.goto(B + "/painel?demo", { waitUntil: "networkidle2" });
    await p.screenshot({ path: path.join(__dirname, "shots", `painel-${n}-1-entrada.png`) });
    await p.type("#e-email", "teste@demo.local"); await p.type("#e-senha", "demo1234"); await p.$eval("#b-entrar", e => e.click());
    await p.waitForSelector(".cartao", { timeout: 10000 }); await espera(500);
    await p.screenshot({ path: path.join(__dirname, "shots", `painel-${n}-2-lista.png`) });
    await p.goto(B + "/painel?demo#editar/garrafa-500ml", { waitUntil: "networkidle2" }); await p.waitForSelector("#f-ed"); await espera(400);
    await p.$eval('#sw-todas [data-cor]', e => e.click()); await espera(150);
    await p.screenshot({ path: path.join(__dirname, "shots", `painel-${n}-3-editor.png`), fullPage: n === "pc" });
    await p.evaluate(() => { window.KhausPainel.E.ed.sujo = false; });
    await p.goto(B + "/painel?demo#estoque", { waitUntil: "networkidle2" }); await p.waitForSelector("#tab-est .te-linha"); await espera(300);
    await p.screenshot({ path: path.join(__dirname, "shots", `painel-${n}-4-estoque.png`) });
    await p.goto(B + "/painel?demo#ajustes", { waitUntil: "networkidle2" }); await p.waitForSelector("#f-aj"); await espera(300);
    await p.screenshot({ path: path.join(__dirname, "shots", `painel-${n}-5-ajustes.png`), fullPage: n === "pc" });
    const larg = await p.evaluate(() => document.documentElement.scrollWidth);
    console.log(n, "erros:", erros.length ? erros.slice(0, 4) : 0, "largura", larg, "de", vp.width);
    await p.close();
  }
  await b.close();
})();
