// Orçamento único: ficha da página inicial + catálogo na mesma lista, prazo de produção e migração do carrinho antigo.
// Uso: node testes/testa-orcamento-unico.js [url]
const puppeteer = require("C:/Users/Douglas/Desktop/CLAUDE/majex-produtos/node_modules/puppeteer-core");
const B = (process.argv[2] || "http://localhost:4060").replace(/\/$/, "");
let falhas = 0; const ok = (c, m) => { if (c) console.log("  ok  " + m); else { falhas++; console.log("  FALHA " + m); } };
const espera = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const b = await puppeteer.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: true, args: ["--no-sandbox"] });
  const erros = [];
  const p = await b.newPage(); await p.setViewport({ width: 1366, height: 900 });
  p.on("pageerror", e => erros.push(e.message));
  await p.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "reduce" }]);
  await p.evaluateOnNewDocument(() => { window.open = u => { window.__wa = u; return null; }; });
  const lista = () => p.evaluate(() => JSON.parse(localStorage.getItem("khaus-orcamento") || "[]"));

  console.log("== carrinho antigo passa para o novo");
  await p.goto(B + "/", { waitUntil: "domcontentloaded" });
  await p.evaluate(() => { localStorage.clear(); localStorage.setItem("khaus-cart", JSON.stringify([{ type: "p", id: "bone-poliester", fin: 1, grav: "def", q: 30 }])); });
  await p.goto(B + "/", { waitUntil: "networkidle2" }); await espera(1800);
  let l = await lista();
  ok(l.length === 1 && l[0].id === "k-bone-poliester" && l[0].cor === 1 && l[0].q === 30, "item do carrinho antigo migrou");
  ok(await p.evaluate(() => !localStorage.getItem("khaus-cart")), "carrinho antigo foi limpo");
  ok(await p.$eval("#cartN", e => e.textContent) === "1", "contador do topo mostra 1");

  console.log("== ficha da página inicial grava na lista única");
  await p.goto(B + "/?produto=garrafa-termica-canudo", { waitUntil: "networkidle2" }); await espera(1500);
  await p.waitForSelector("#pmAdd", { timeout: 8000 });
  const nCores = await p.$$eval("#pmFins button", e => e.length);
  if (nCores > 1) await p.evaluate(() => document.querySelectorAll("#pmFins button")[1].click());
  await p.evaluate(() => { const q = document.querySelector("#pmQ"); q.value = "40"; q.dispatchEvent(new Event("input", { bubbles: true })); q.dispatchEvent(new Event("change", { bubbles: true })); });
  const exp = await p.$('#pmPrazo .pz[data-pz="expresso"]'); if (exp) { await p.evaluate(e => e.click(), exp); await espera(200); }
  await p.evaluate(() => document.querySelector("#pmAdd").click()); await espera(600);
  l = await lista();
  const copo = l.find(x => x.id === "k-garrafa-termica-canudo");
  ok(!!copo && copo.q === 40, "copo entrou com 40 un.");
  ok(!!copo && copo.cor === (nCores > 1 ? 1 : 0), "com a cor escolhida");
  ok(!exp || (copo && copo.pz && copo.pz.id === "expresso" && copo.pz.extra > 0), "com o prazo expresso e o acréscimo");
  ok(await p.$eval("#cartN", e => e.textContent) === "2", "contador mostra 2");
  ok(await p.evaluate(() => !document.querySelector("#modal.open")), "ficha fecha depois de adicionar");

  console.log("== botão Orçamento abre o resumo do catálogo");
  await Promise.all([p.waitForNavigation({ waitUntil: "networkidle2" }), p.evaluate(() => document.querySelector("#cartBtn").click())]);
  ok(/\/catalogo/.test(p.url()), "foi para o catálogo");
  await p.waitForSelector("#orc.on", { timeout: 15000 });
  const itens = await p.$$eval(".it", e => e.map(x => x.textContent));
  ok(itens.length === 2, "resumo com os 2 itens");
  ok(itens.some(t => /Garrafa térmica/i.test(t) && /Expresso/.test(t)), "copo aparece com o prazo");

  console.log("== produto da XBZ no catálogo soma na mesma lista");
  await p.evaluate(() => document.querySelector(".gaveta [data-fecha]").click()); await espera(300);
  await p.type("#q", "caneta metal"); await espera(500);
  await p.evaluate(() => document.querySelector('.card:not([data-id^="k-"]) .c-foto').click()); await espera(500);
  await p.evaluate(() => document.querySelector("#fiAdd").click()); await espera(400);
  l = await lista(); ok(l.length === 3, "3 itens na lista");
  await p.evaluate(() => document.querySelector("#orcBtn").click()); await espera(500);
  await p.type("#oNome", "Teste"); await p.evaluate(() => document.querySelector("#orcEnviar").click()); await espera(300);
  const msg = decodeURIComponent((await p.evaluate(() => window.__wa || "")).split("text=")[1] || "");
  ok(/Boné/i.test(msg) && /Garrafa térmica/i.test(msg) && /Caneta/i.test(msg), "mensagem tem os 3 produtos");
  ok(/Prazo: Expresso/.test(msg), "mensagem tem o prazo");

  console.log("== volta para a página inicial");
  await p.goto(B + "/", { waitUntil: "networkidle2" }); await espera(1800);
  ok(await p.$eval("#cartN", e => e.textContent) === "3", "página inicial mostra 3 no contador");
  ok(!erros.length, "sem erros" + (erros.length ? ": " + erros.slice(0, 3).join(" | ") : ""));
  await b.close();
  console.log(falhas ? `\n${falhas} FALHA(S)` : "\nTudo certo."); process.exit(falhas ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
