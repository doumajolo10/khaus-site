// Captura o topo da página inicial (selo com o símbolo oficial) e o bloco do catálogo completo.
const puppeteer = require("C:/Users/Douglas/Desktop/CLAUDE/majex-produtos/node_modules/puppeteer-core");
const path = require("path");
(async () => {
  const b = await puppeteer.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: true });
  const p = await b.newPage(); await p.setViewport({ width: 1440, height: 900 });
  await p.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "reduce" }, { name: "prefers-color-scheme", value: "light" }]);
  await p.goto(process.argv[2] || "http://localhost:4060/", { waitUntil: "networkidle2" });
  await new Promise(r => setTimeout(r, 1500));
  await p.screenshot({ path: path.join(__dirname, "shots", "home-topo.png") });
  const el = await p.$(".kx-cat"); await el.scrollIntoView(); await new Promise(r => setTimeout(r, 800));
  const bx = await el.boundingBox();
  await p.screenshot({ path: path.join(__dirname, "shots", "home-catalogo.png"), clip: { x: 0, y: Math.max(0, bx.y - 120), width: 1440, height: bx.height + 220 } });
  await b.close();
})();
