// Supabase de mentira para os testes da Khaus (intercepta as requisições do Chrome no puppeteer).
// Auth (senha, renovação), REST de khaus_produtos / khaus_config / khaus_equipe com as regras do khaus.sql, e Storage khaus-fotos.
const fs = require("fs"), path = require("path");
const FOTO = fs.readFileSync(path.join(__dirname, "..", "img", "garrafa-500ml-240.webp"));
const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "apikey, authorization, content-type, prefer, x-upsert, cache-control, accept", "Access-Control-Allow-Methods": "GET, POST, PATCH, PUT, DELETE, OPTIONS" };
const b64 = o => Buffer.from(JSON.stringify(o)).toString("base64").replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
module.exports = function falso({ produtos, config = {}, equipe = [], usuarios = {}, fora = false }) {
  const db = { produtos: JSON.parse(JSON.stringify(produtos)).map(p => Object.assign({ alterado_em: "2026-10-01T12:00:00Z", alterado_por: null }, p)), config: Object.keys(config).map(k => ({ chave: k, valor: config[k] })), equipe: equipe.slice(), usuarios: Object.assign({}, usuarios), tokens: {}, arquivos: {}, log: [], fora };
  let n = 0;
  const emite = email => { const exp = Math.floor(Date.now() / 1000) + 3600; const t = b64({ alg: "HS256" }) + "." + b64({ email, exp }) + ".s" + (++n); db.tokens[t] = { email, exp }; return { access_token: t, token_type: "bearer", expires_in: 3600, expires_at: exp, refresh_token: "r" + n + "-" + email, user: { email } }; };
  const quem = h => { const a = (h.authorization || "").replace(/^Bearer /, ""); const t = db.tokens[a]; return t && t.exp > Date.now() / 1000 ? t.email : null; };
  const daEquipe = e => !!e && db.equipe.includes(e);
  const eqs = u => { const f = []; for (const [k, v] of u.searchParams) { const m = /^eq\.(.*)$/.exec(v); if (m && !["select", "order", "on_conflict"].includes(k)) f.push([k, m[1]]); } return f; };
  const casa = (x, f) => f.every(([k, v]) => String(x[k]) === v);
  async function trata(req) {
    const url = new URL(req.url()); if (!/supabase\.co$/.test(url.host)) return false;
    const resp = (status, corpo) => req.respond({ status, headers: CORS, contentType: "application/json", body: corpo === undefined ? "" : JSON.stringify(corpo) });
    const metodo = req.method(), h = req.headers(), p = url.pathname;
    if (metodo === "OPTIONS") { await req.respond({ status: 204, headers: CORS, body: "" }); return true; }
    let corpo = null; try { corpo = req.postData() ? JSON.parse(req.postData()) : null; } catch (e) { }
    db.log.push({ metodo, p, q: url.search, corpo, quem: quem(h), tipo: h["content-type"] || "" });
    if (db.fora) { await resp(503, { message: "fora" }); return true; }
    if (p === "/auth/v1/token") { const g = url.searchParams.get("grant_type"); if (g === "password") { if (db.usuarios[corpo.email] === corpo.password) await resp(200, emite(corpo.email)); else await resp(400, { error: "invalid_grant", error_description: "Invalid login credentials" }); return true; } const m = /^r\d+-(.*)$/.exec((corpo || {}).refresh_token || ""); if (m) await resp(200, emite(m[1])); else await resp(400, { error: "invalid_grant" }); return true; }
    if (p === "/auth/v1/logout") { await resp(204); return true; }
    const e = quem(h), eq = daEquipe(e);
    if (p === "/rest/v1/khaus_equipe") { await resp(200, eq ? [{ email: e, nome: e.split("@")[0] }] : []); return true; }
    if (p === "/rest/v1/khaus_config") {
      if (metodo === "GET") { await resp(200, db.config); return true; }
      if (!eq) { await resp(403, { code: "42501", message: "rls" }); return true; }
      const i = db.config.findIndex(c => c.chave === corpo.chave); const r = { chave: corpo.chave, valor: corpo.valor };
      if (i >= 0) db.config[i] = r; else db.config.push(r); await resp(201, [r]); return true;
    }
    if (p === "/rest/v1/khaus_produtos") {
      const f = eqs(url), vis = db.produtos.filter(x => eq || x.ativo);
      if (metodo === "GET") { await resp(200, vis.filter(x => casa(x, f)).sort((a, b) => a.ordem - b.ordem)); return true; }
      if (!eq) { if (metodo === "POST") await resp(403, { code: "42501", message: "rls" }); else await resp(200, []); return true; }
      const carimbo = x => Object.assign(x, { alterado_em: new Date().toISOString(), alterado_por: e });
      if (metodo === "POST") { if (db.produtos.some(x => x.id === corpo.id)) { await resp(409, { code: "23505" }); return true; } const x = carimbo(Object.assign({ ativo: true, cores: [], esgotadas: [], estoque: {}, faixas: [], ordem: 0, foto: null }, corpo)); db.produtos.push(x); await resp(201, [x]); return true; }
      if (metodo === "PATCH") { const l = db.produtos.filter(x => casa(x, f)); l.forEach(x => carimbo(Object.assign(x, corpo))); await resp(200, l); return true; }
      if (metodo === "DELETE") { const l = db.produtos.filter(x => casa(x, f)); db.produtos = db.produtos.filter(x => !casa(x, f)); await resp(200, l); return true; }
    }
    const pub = "/storage/v1/object/public/khaus-fotos/";
    if (p.startsWith(pub)) { await req.respond({ status: db.arquivos[decodeURIComponent(p.slice(pub.length))] ? 200 : 404, headers: CORS, contentType: "image/webp", body: FOTO }); return true; }
    if (p.startsWith("/storage/v1/object/khaus-fotos/") && metodo === "POST") { if (!eq) { await resp(403, { message: "rls" }); return true; } db.arquivos[decodeURIComponent(p.slice("/storage/v1/object/khaus-fotos/".length))] = h["content-type"]; await resp(200, { Key: "x" }); return true; }
    if (p === "/storage/v1/object/khaus-fotos" && metodo === "DELETE") { (corpo.prefixes || []).forEach(k => delete db.arquivos[k]); await resp(200, []); return true; }
    await resp(404, { message: "rota falsa não implementada: " + metodo + " " + p }); return true;
  }
  return { db, trata };
};
