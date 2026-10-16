// Testa o prazo de produção, o estoque por cor e o carrinho/mensagem. Uso: node testes/testa-prazo.js [url]
const puppeteer = require("C:/Users/Douglas/Desktop/CLAUDE/majex-produtos/node_modules/puppeteer-core");
const path = require("path"), fs = require("fs");
const B = process.argv[2] || "http://localhost:4060/";
const SH = path.join(__dirname, "shots"); fs.mkdirSync(SH, { recursive: true });
let falhas = 0; const ok = (c, m) => { if (c) console.log("  ok  " + m); else { falhas++; console.log("  FALHA " + m); } };
const espera = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const b = await puppeteer.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: true, args: ["--no-sandbox"] });
  const erros = [];
  const nova = async (vp) => {
    const p = await b.newPage(); await p.setViewport(vp || { width: 1366, height: 860 });
    p.on("console", m => { if (m.type() === "error") erros.push(m.text()); }); p.on("pageerror", e => erros.push("pageerror: " + e.message));
    await p.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "reduce" }]);
    await p.setRequestInterception(true);
    p.on("request", r => { if (/supabase\.co/.test(r.url())) return r.respond({ status: r.method() === "OPTIONS" ? 204 : 503, headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*" }, body: "" }); r.continue(); }); // banco simulado fora do ar: dados da página
    return p;
  };
  let p = await nova();
  await p.goto(B + "?produto=copo-termico-473ml", { waitUntil: "networkidle2" }); await espera(2500);
  await p.waitForSelector("#pmPrazo", { timeout: 8000 }).catch(() => { });
  ok(!!(await p.$("#pmPrazo")), "ficha mostra o bloco Prazo de produção");
  ok((await p.$$eval(".pz", l => l.length)) === 3, "3 opções de prazo");
  const base = await p.$eval("#pmU2", e => e.textContent);
  const prev = await p.$$eval(".pz .d small", l => l.map(e => e.textContent));
  ok(prev.every(t => /previsão: até \w{3}, \d\d\/\d\d/.test(t)), "cada opção mostra a data prevista (" + prev[0] + ")");
  await p.$eval('[data-pz="expresso"]', e => e.click()); await espera(200);
  const exp = await p.$eval("#pmU2", e => e.textContent);
  const num = s => +s.replace(/[^\d,]/g, "").replace(",", ".");
  ok(Math.abs(num(exp) - Math.round(num(base) * 1.15 * 100) / 100) < 0.011, `Expresso soma 15% no preço (${base} → ${exp})`);
  ok(await p.$eval('[data-pz="expresso"]', e => e.classList.contains("on") && e.getAttribute("aria-checked") === "true"), "opção marcada visualmente e para leitor de tela");
  // data do evento curta: escolhe sozinho um prazo que chega
  const d = new Date(); d.setDate(d.getDate() + 30); const iso = d.toISOString().slice(0, 10);
  await p.$eval('[data-pz="padrao"]', e => e.click()); await espera(100);
  await p.$eval("#pmEvento", (e, v) => { e.value = v; e.dispatchEvent(new Event("change", { bubbles: true })); }, iso); await espera(300);
  const esc = await p.$eval(".pz.on", e => e.dataset.pz);
  ok(esc !== "padrao", "evento em 30 dias: troca sozinho para um prazo que chega a tempo (" + esc + ")");
  ok((await p.$$eval(".pz .nok", l => l.length)) >= 1, "opções que não chegam a tempo ficam marcadas");
  await p.screenshot({ path: path.join(SH, "ficha-prazo.png") });
  await p.$eval("#pmAdd", e => e.click()); await espera(600);
  const carrinho = await p.evaluate(() => JSON.parse(localStorage.getItem("khaus-cart") || "[]"));
  ok(carrinho.length === 1 && carrinho[0].prazo === esc, "carrinho guarda o prazo do item (" + (carrinho[0] && carrinho[0].prazo) + ")");
  await p.evaluate(() => document.querySelector("#cartBtn").click()); await espera(500);
  ok(!!(await p.$("#cartPrazo")), "carrinho mostra a previsão de produção");
  ok(await p.$eval("#cPrazo", e => getComputedStyle(e).display === "none"), "seletor antigo 'Prazo desejado' saiu");
  // mensagem do WhatsApp
  const url = await p.evaluate(() => new Promise(res => { const o = window.open; window.open = (u) => { res(u); window.open = o; return null; }; document.querySelector("#cartSend").click(); }));
  const t = decodeURIComponent(url.split("text=")[1] || "");
  ok(/Prazo de produção: (Expresso|Turbo) \(.+dias úteis, \+\d+%\), previsão até/.test(t), "mensagem traz o prazo e a previsão");
  ok(/Data do evento: .+\(chega a tempo\)/.test(t), "mensagem traz a data do evento e se chega a tempo");
  ok(/Prazo (Expresso|Turbo) \(\+\d+%\)/.test(t), "linha do item mostra o prazo e o acréscimo");
  console.log("\n--- mensagem ---\n" + t + "\n---");
  await p.screenshot({ path: path.join(SH, "carrinho-prazo.png") });
  await p.close();
  // feriados e dias úteis
  p = await nova(); await p.goto(B, { waitUntil: "domcontentloaded" }); await espera(1500);
  const f = await p.evaluate(() => { const K = window.KhausExt; const r = K.khSomaUteis(new Date(2026, 10, 13), 5); return { natal: !!K.khFeriados(2026)["2026-12-25"], sextaSanta: !!K.khFeriados(2026)["2026-04-03"], carnaval: !!K.khFeriados(2027)["2027-02-09"], cn: !!K.khFeriados(2026)["2026-11-20"], r: r.toISOString().slice(0, 10) }; });
  ok(f.natal && f.sextaSanta && f.carnaval && f.cn, "feriados nacionais (Natal, Sexta Santa, Carnaval, Consciência Negra)");
  ok(f.r === "2026-11-23", "5 dias úteis a partir de 13/11/2026 pulam fim de semana e o feriado de 20/11 (" + f.r + ")");
  // celular
  await p.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
  await p.goto(B + "?produto=garrafa-500ml", { waitUntil: "networkidle2" }); await espera(2500);
  ok(!!(await p.$("#pmPrazo")), "celular: bloco de prazo na ficha");
  ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), "celular: sem rolagem lateral");
  await p.evaluate(() => document.querySelector("#pmPrazo").scrollIntoView({ block: "center" })); await espera(300);
  await p.screenshot({ path: path.join(SH, "ficha-prazo-cel.png") });
  await p.close();
  console.log("erros de console:", erros.length ? erros.slice(0, 5) : 0);
  ok(!erros.filter(e => !/503|Failed to load resource/.test(e)).length, "sem erros de JavaScript");
  await b.close(); console.log(falhas ? "FALHAS: " + falhas : "TUDO PASSOU"); process.exit(falhas ? 1 : 0);
})().catch(e => { console.error("ERRO", e); process.exit(2); });
