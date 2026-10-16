// Painel da Khaus + site lendo o painel, com Supabase de mentira. Uso: node testes/testa-painel.js [url]
const puppeteer = require("C:/Users/Douglas/Desktop/CLAUDE/majex-produtos/node_modules/puppeteer-core");
const path = require("path");
const falso = require("./supabase-falso.js");
const CAT = require("../painel/catalogo.json");
const B = process.argv[2] || "http://localhost:4060";
const EQ = "equipe@khaus.test", SENHA = "senha-teste-1";
let falhas = 0; const ok = (c, m) => { if (c) console.log("  ok  " + m); else { falhas++; console.log("  FALHA " + m); } };
const espera = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const b = await puppeteer.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: true, args: ["--no-sandbox"] });
  const erros = [];
  const F = falso({ produtos: CAT.produtos, config: { prazos: [{ id: "padrao", nome: "Padrão", de: 20, ate: 25, extra: 0, tag: "Recomendado" }, { id: "expresso", nome: "Expresso", de: 12, ate: 15, extra: 15, tag: "" }, { id: "turbo", nome: "Turbo", de: 7, ate: 10, extra: 25, tag: "Mais rápido" }], prazosDemo: true, precosDemo: true, cores: {} }, equipe: [EQ], usuarios: { [EQ]: SENHA } });
  async function pagina(vp) {
    const ctx = await b.createBrowserContext(); const p = await ctx.newPage(); await p.setViewport(vp || { width: 1366, height: 860 });
    await p.setRequestInterception(true); p.on("request", async r => { if (await F.trata(r)) return; r.continue(); });
    p.on("pageerror", e => erros.push(e.message)); p.on("console", m => { if (m.type() === "error" && !/Failed to load resource/.test(m.text())) erros.push(m.text()); });
    p.on("dialog", d => { erros.push("diálogo nativo: " + d.message()); d.dismiss(); });
    return p;
  }
  const clica = (p, s) => p.$eval(s, e => e.click());
  console.log("== painel: entrar e listar");
  const p = await pagina();
  await p.goto(B + "/painel", { waitUntil: "networkidle2" });
  await p.type("#e-email", EQ); await p.type("#e-senha", SENHA); await clica(p, "#b-entrar");
  await p.waitForSelector(".cartao", { timeout: 10000 });
  ok((await p.$$eval(".cartao", l => l.length)) === CAT.produtos.length, `lista os ${CAT.produtos.length} produtos`);
  await p.type("#l-busca", "garrafa"); await espera(150);
  const nG = await p.$$eval(".cartao", l => l.length); ok(nG > 0 && nG < CAT.produtos.length, "busca por 'garrafa' filtra (" + nG + ")");
  await p.$eval("#l-busca", e => { e.value = ""; e.dispatchEvent(new Event("input", { bubbles: true })); });

  console.log("== painel: editar preço, cores e estoque");
  await p.goto(B + "/painel#editar/garrafa-500ml", { waitUntil: "networkidle2" }); await p.waitForSelector("#f-ed");
  const preto = Object.keys(CAT.cores).find(k => /preto/i.test(CAT.cores[k][0])) , branco = Object.keys(CAT.cores).find(k => /^branco$/i.test(CAT.cores[k][0]));
  await clica(p, `#sw-todas [data-cor="${preto}"]`); await clica(p, `#sw-todas [data-cor="${branco}"]`); await espera(100);
  await p.$eval(`[data-ec="${preto}"]`, e => { e.value = "375"; e.dispatchEvent(new Event("input", { bubbles: true })); });
  await p.$eval(`[data-ec="${branco}"]`, e => { e.value = "0"; e.dispatchEvent(new Event("input", { bubbles: true })); });
  await p.$eval("#faixas [data-fp]", e => { e.value = "59,90"; e.dispatchEvent(new Event("input", { bubbles: true })); });
  await clica(p, "#b-salvar"); await p.waitForSelector(".cartao", { timeout: 8000 }); await espera(300);
  const g = F.db.produtos.find(x => x.id === "garrafa-500ml");
  ok(g.cores.includes(preto) && g.cores.includes(branco), "cores gravadas");
  ok(g.estoque[preto] === 375 && g.estoque[branco] === 0, "estoque por cor gravado (preto 375, branco 0)");
  ok(g.faixas[0][1] === 59.9, "preço da 1ª faixa gravado (59,90)");
  ok(F.db.log.some(l => l.metodo === "PATCH" && /id=eq.garrafa-500ml/.test(l.q) && l.quem === EQ), "PATCH feito pelo usuário da equipe");

  console.log("== painel: planilha de estoque");
  await p.goto(B + "/painel#estoque", { waitUntil: "networkidle2" }); await p.waitForSelector("#tab-est input[data-est]");
  await p.$eval('#tab-est input[data-est="copo-termico-473ml"]', e => { e.value = "120"; e.dispatchEvent(new Event("change", { bubbles: true })); });
  await espera(600);
  ok(F.db.produtos.find(x => x.id === "copo-termico-473ml").estoque._ === 120, "estoque total salvo sozinho ao sair do campo (120)");
  ok(/Salvo/.test(await p.$eval('[data-st="copo-termico-473ml|_"]', e => e.textContent)), "mostra 'Salvo' na linha");

  console.log("== painel: prazos e ajustes");
  await p.goto(B + "/painel#ajustes", { waitUntil: "networkidle2" }); await p.waitForSelector("#f-aj");
  await p.$eval('.pz-l[data-i="1"] [data-k="extra"]', e => { e.value = "20"; e.dispatchEvent(new Event("input", { bubbles: true })); });
  await p.$eval("#aj-prdemo", e => { e.checked = false; e.dispatchEvent(new Event("change", { bubbles: true })); });
  await clica(p, "#aj-salvar"); await espera(800);
  const pz = (F.db.config.find(c => c.chave === "prazos") || {}).valor;
  ok(pz && pz.find(z => z.id === "expresso").extra === 20, "acréscimo do Expresso gravado (20%)");
  ok((F.db.config.find(c => c.chave === "precosDemo") || {}).valor === false, "aviso de preço de demonstração desligado");

  console.log("== painel: produto novo com foto");
  await p.goto(B + "/painel#novo", { waitUntil: "networkidle2" }); await p.waitForSelector("#c-nome");
  await p.type("#c-nome", "Squeeze teste 500ml");
  ok((await p.$eval("#c-id", e => e.value)) === "squeeze-teste-500ml", "código montado pelo nome");
  const arq = await p.$("#arq"); await arq.uploadFile(path.join(__dirname, "..", "img", "garrafa-500ml-480.webp"));
  await p.waitForFunction(() => !document.querySelector("#foto-prev .progresso"), { timeout: 15000 });
  await p.$eval("#faixas [data-fp]", e => { e.value = "12,50"; e.dispatchEvent(new Event("input", { bubbles: true })); });
  await clica(p, "#b-salvar"); await p.waitForSelector(".cartao", { timeout: 8000 }); await espera(300);
  const nv = F.db.produtos.find(x => x.id === "squeeze-teste-500ml");
  ok(!!nv && /\/khaus-fotos\/squeeze-teste-500ml\/.+-g\.webp$/.test(nv.foto || ""), "produto novo criado com a foto enviada");
  ok(Object.keys(F.db.arquivos).filter(k => k.startsWith("squeeze-teste-500ml/")).length === 2, "foto em 2 tamanhos no armazenamento");

  console.log("== painel: ocultar");
  await p.$eval('.cartao[data-id="copo-cuia-330ml"] [data-vis-toggle]', e => e.click()); await espera(500);
  ok(F.db.produtos.find(x => x.id === "copo-cuia-330ml").ativo === false, "ocultar grava ativo=false");

  console.log("== site: lê o painel");
  const s = await pagina();
  await s.goto(B + "/?fresco=1", { waitUntil: "networkidle2" }); await espera(2500);
  ok((await s.evaluate(() => document.documentElement.dataset.vivo)) === "ok", "site carregou os dados do painel");
  ok(!(await s.$('[data-open="copo-cuia-330ml"]')), "produto oculto saiu do catálogo e da vitrine");
  ok(!!(await s.$('[data-open="squeeze-teste-500ml"]')), "produto novo apareceu no catálogo");
  ok(await s.$eval('[data-open="squeeze-teste-500ml"] img', i => /khaus-fotos/.test(i.src)), "produto novo usa a foto do painel");
  await s.goto(B + "/?produto=garrafa-500ml&fresco=1", { waitUntil: "networkidle2" }); await espera(3000);
  ok(/375/.test(await s.$eval("#pmEst", e => e.textContent).catch(() => "")), "ficha mostra 375 em estoque na cor preta");
  ok(await s.$$eval("#pmFins button.out", l => l.length >= 1), "cor com estoque zero aparece esgotada");
  ok(/\+20%/.test(await s.$eval('[data-pz="expresso"]', e => e.textContent)), "prazo Expresso com o acréscimo novo (+20%)");
  ok(!/Valores de demonstração/.test(await s.$eval("#mpn", e => e.textContent)), "aviso de preço de demonstração sumiu");
  await s.close(); await p.close();
  console.log("erros:", erros.length ? erros.slice(0, 6) : 0);
  ok(!erros.length, "sem erros de JavaScript nem diálogos nativos");
  await b.close(); console.log(falhas ? "FALHAS: " + falhas : "TUDO PASSOU"); process.exit(falhas ? 1 : 0);
})().catch(e => { console.error("ERRO", e); process.exit(2); });
