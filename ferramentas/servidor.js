// Servidor local que imita a Vercel deste projeto (cleanUrls + vercel.json): porta 4060.
// /painel -> painel/index.html; /__nao__XXXX sem arquivo -> imovel.html (página-molde).
const http = require("http"), fs = require("fs"), path = require("path");
const RAIZ = path.join(__dirname, ".."), PORTA = +(process.env.PORT || 4060);
const TIPOS = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".svg": "image/svg+xml", ".webp": "image/webp", ".woff2": "font/woff2", ".json": "application/json", ".png": "image/png", ".jpg": "image/jpeg" };
const CFG = JSON.parse(fs.readFileSync(path.join(RAIZ, "vercel.json"), "utf8"));
const existe = f => { try { return fs.statSync(f).isFile(); } catch (e) { return false; } };
http.createServer((req, res) => {
  let u = decodeURIComponent(req.url.split("?")[0]);
  const local = p => path.join(RAIZ, path.normalize(p).replace(/^([/\\])+/, ""));
  let f = local(u);
  if (!f.startsWith(RAIZ)) { res.writeHead(403); return res.end(); }
  if (!existe(f)) {
    const tentativas = [local(u + ".html"), local(path.join(u, "index.html"))];
    f = tentativas.find(existe) || (/^\/__nao__/.test(u) ? local("/imovel.html") : null);
  }
  if (!f) { res.writeHead(404, { "Content-Type": TIPOS[".html"] }); return res.end("404"); }
  // mesmos cabeçalhos de segurança do vercel.json (sem HSTS e sem upgrade-insecure-requests, que não cabem em http://localhost)
  const cab = {};
  for (const h of CFG.headers || []) if (new RegExp("^" + h.source.replace(/\(\.\*\)/g, ".*") + "$").test(u)) for (const { key, value } of h.headers) cab[key] = value;
  delete cab["Strict-Transport-Security"];
  if (cab["Content-Security-Policy"]) cab["Content-Security-Policy"] = cab["Content-Security-Policy"].replace(/;\s*upgrade-insecure-requests/, "");
  res.writeHead(200, Object.assign(cab, { "Content-Type": TIPOS[path.extname(f).toLowerCase()] || "application/octet-stream", "Cache-Control": "no-store" }));
  fs.createReadStream(f).pipe(res);
}).listen(PORTA, () => console.log("Khaus em http://localhost:" + PORTA));
