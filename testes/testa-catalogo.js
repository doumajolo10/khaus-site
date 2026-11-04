// Testa o catálogo completo (/catalogo): busca, filtros, ficha, orçamento e mensagem do WhatsApp.
// Uso: node testes/testa-catalogo.js [url]   (padrão: servidor local com os dados de dados/)
const puppeteer = require("C:/Users/Douglas/Desktop/CLAUDE/majex-produtos/node_modules/puppeteer-core");
const path = require("path"), fs = require("fs");
const URL0 = process.argv[2] || "http://localhost:4060/catalogo?fonte=local";
const SH = path.join(__dirname, "shots"); fs.mkdirSync(SH, { recursive: true });
let falhas = 0; const ok = (c, m) => { if (c) console.log("  ok  " + m); else { falhas++; console.log("  FALHA " + m); } };
const espera = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const b = await puppeteer.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: true, args: ["--no-sandbox"] });
  const erros = [];
  const nova = async (vp, tema) => {
    const p = await b.newPage(); await p.setViewport(vp);
    p.on("console", m => { if (m.type() === "error" && !/favicon|Failed to load resource/.test(m.text())) erros.push(m.text()); });
    p.on("pageerror", e => erros.push("pageerror: " + e.message));
    await p.emulateMediaFeatures([{ name: "prefers-color-scheme", value: tema || "light" }]);
    await p.evaluateOnNewDocument(() => { localStorage.clear(); window.__aberto = []; window.open = (u) => { window.__aberto.push(u); return null; }; });
    await p.goto(URL0, { waitUntil: "networkidle2", timeout: 60000 });
    await p.waitForSelector(".card", { timeout: 20000 });
    return p;
  };
  const cards = p => p.$$eval(".card", cs => cs.length);
  const conta = p => p.$eval("#conta b", e => +e.textContent.replace(/\D/g, ""));

  console.log("Desktop");
  const p = await nova({ width: 1440, height: 900 });
  await espera(800);
  await p.screenshot({ path: path.join(SH, "cat-1-desktop.png") });
  const total = await conta(p);
  ok(total > 2500, `lista inicial com ${total} produtos (só com estoque)`);
  ok(await cards(p) === 36, "primeira página com 36 cartões");
  await p.evaluate(() => scrollTo(0, document.body.scrollHeight)); await espera(700);
  ok(await cards(p) > 36, "rolagem carrega mais produtos");

  await p.evaluate(() => scrollTo(0, 0));
  await p.type("#q", "copo termico"); await espera(500);
  const nomes = await p.$$eval(".c-nome", e => e.slice(0, 8).map(x => x.textContent));
  ok(nomes.length && nomes.every(n => /copo/i.test(n)), "busca 'copo termico' traz copos: " + nomes.slice(0, 3).join(" | "));
  await p.screenshot({ path: path.join(SH, "cat-2-busca.png") });
  await p.click("#qLimpa"); await espera(300);

  await p.click('.cat[data-cat="canetas"]'); await espera(400);
  const nCan = await conta(p);
  ok(nCan > 100 && nCan < total, `categoria canetas: ${nCan}`);
  await p.type("#qtd", "5000"); await espera(700);
  const nQtd = await conta(p);
  ok(nQtd > 0 && nQtd < nCan, `filtro de 5.000 un. em estoque: ${nQtd} canetas`);
  const precoCom = await p.$eval(".c-preco span", e => e.textContent);
  ok(/com 5\.000/.test(precoCom), "preço do cartão na faixa de 5.000 un.: " + precoCom);
  await p.click("#fLimpar"); await p.click('.cat[data-cat=""]'); await espera(400);

  // ficha
  await p.type("#q", "copo térmico 700ml"); await espera(500);
  await p.click(".card .c-foto"); await espera(500);
  ok(await p.$eval("#ficha", e => !e.hidden && e.classList.contains("on")), "ficha abre");
  ok(/produto=/.test(p.url()), "endereço da ficha pode ser compartilhado");
  const nCores = await p.$$eval(".fcor", e => e.length);
  ok(nCores >= 2, `ficha com ${nCores} cores`);
  const foto1 = await p.$eval("#fiFoto img", e => e.src);
  await p.click('.fcor[data-fcor="1"]'); await espera(200);
  const foto2 = await p.$eval("#fiFoto img", e => e.src);
  ok(foto1 !== foto2, "trocar a cor troca a foto");
  const preco10 = await p.$eval("#fiPreco b", e => e.textContent);
  const faixas = await p.$$(".fx"); await faixas[faixas.length - 1].click(); await espera(200);
  const precoMax = await p.$eval("#fiPreco b", e => e.textContent);
  ok(preco10 !== precoMax, `faixa maior baixa o preço: ${preco10} → ${precoMax}`);
  await espera(600);
  await p.screenshot({ path: path.join(SH, "cat-3-ficha.png") });
  await p.click("#fiQ", { clickCount: 3 }); await p.type("#fiQ", "100"); await espera(200);
  await p.click("#fiAdd"); await espera(400);
  ok(await p.$eval("#orcN", e => e.textContent) === "1", "item entra no orçamento");

  // segundo item, produto próprio da Khaus
  await p.click("#qLimpa"); await espera(300);
  await p.type("#q", "kit churrasco 5"); await espera(500);
  const kh = await p.$('.card[data-id^="k-"] .c-foto');
  if (kh) { await kh.click(); await espera(400); await p.click("#fiAdd"); await espera(300); }
  ok(await p.$eval("#orcN", e => e.textContent) === "2", "produto da Khaus também entra no orçamento");

  await p.click("#orcBtn"); await espera(500);
  ok(await p.$$eval(".it", e => e.length) === 2, "gaveta mostra 2 itens");
  await p.type("#oNome", "Teste Automático"); await p.type("#oEmpresa", "Empresa Teste");
  await p.screenshot({ path: path.join(SH, "cat-4-orcamento.png") });
  await p.click("#orcEnviar"); await espera(300);
  const wa = await p.evaluate(() => window.__aberto[0] || "");
  const msg = decodeURIComponent((wa.split("text=")[1] || ""));
  ok(wa.startsWith("https://wa.me/5555999768527"), "abre o WhatsApp da Khaus");
  ok(/KH-\d{4}-/.test(msg) && /Ref\. 19114-/.test(msg) && /100 un\./.test(msg) && /Total estimado/.test(msg) && /Teste Automático/.test(msg), "mensagem com código, referência, quantidade, total e nome");
  console.log("\n" + msg.split("\n").map(l => "     | " + l).join("\n") + "\n");
  // não vaza custo nem a palavra XBZ na página
  const html = await p.content();
  ok(!/xbz/i.test(html.replace(/cdn\.xbzbrindes\.com\.br/g, "").replace(/xbz\/core\.js/g, "")), "a página não menciona o fornecedor");

  console.log("Escuro");
  const d = await nova({ width: 1440, height: 900 }, "dark"); await espera(800);
  ok(await d.$eval("html", e => e.dataset.theme) === "dark", "segue o tema escuro do aparelho");
  await d.screenshot({ path: path.join(SH, "cat-5-escuro.png") });

  console.log("Celular");
  const m = await nova({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  await espera(800);
  await m.screenshot({ path: path.join(SH, "cat-6-celular.png") });
  const larg = await m.evaluate(() => document.documentElement.scrollWidth);
  ok(larg <= 390, "sem rolagem lateral no celular (" + larg + "px)");
  await m.click("#fAbre"); await espera(450);
  ok(await m.$eval("#filtros", e => e.classList.contains("aberto")), "filtros abrem por baixo no celular");
  await m.screenshot({ path: path.join(SH, "cat-7-celular-filtros.png") });
  await m.click("#fVer"); await espera(400);
  await m.click(".card .c-foto"); await espera(600);
  await m.screenshot({ path: path.join(SH, "cat-8-celular-ficha.png") });

  ok(!erros.length, "sem erros no console" + (erros.length ? ": " + erros.slice(0, 3).join(" | ") : ""));
  await b.close();
  console.log(falhas ? `\n${falhas} FALHA(S)` : "\nTudo certo.");
  process.exit(falhas ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
