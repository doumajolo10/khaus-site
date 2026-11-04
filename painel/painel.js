/* Khaus · Painel de produtos e estoque.
   Fala direto com o Supabase (Auth, REST e Storage) por fetch, sem biblioteca. Base: painel da Kiesel (login, sessão, avisos).
   Com ?demo na URL roda sem banco (dados do catálogo publicado, guardados só neste navegador). */
(function () {
  "use strict";
  const S = { url: "https://cwsjddppdogvyitspbfr.supabase.co", chave: "sb_publishable_zpNPLwlPqkOR6pnvrxRGHw_78r3siqN", tabela: "khaus_produtos", balde: "khaus-fotos" };
  const DEMO = /[?&]demo\b/.test(location.search);
  const SITE_PUB = /khaus-site\.vercel\.app|localhost|127\.0\.0\.1/.test(location.host) ? location.origin : "https://khaus-site.vercel.app";
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const esc = s => String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const app = $("#app");
  const sem = s => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const BRL = v => Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const num = v => Number(v).toLocaleString("pt-BR");
  const FOTO_OK = S.url + "/storage/v1/object/public/" + S.balde + "/";
  const fotoProd = (p, t) => p.foto ? (/^blob:/.test(p.foto) ? p.foto : (t === "p" ? p.foto.replace(/-g\.(webp|jpg)$/, "-p.$1") : p.foto)) : "/img/" + p.id + "-" + (t === "p" ? "240" : "480") + ".webp";
  const linkSite = id => SITE_PUB + "/?produto=" + encodeURIComponent(id) + "&fresco=1";
  const slug = s => sem(s).replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);

  const I = {
    mais: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
    menos: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M5 12h14"/></svg>',
    busca: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>',
    editar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16v4zM13.5 6.5l4 4"/></svg>',
    olho: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>',
    olhoNao: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M3 3l18 18M10.6 5.1A10.6 10.6 0 0 1 12 5c6.4 0 10 7 10 7a17 17 0 0 1-3.2 4M6.6 6.6A17 17 0 0 0 2 12s3.6 7 10 7a10 10 0 0 0 5.4-1.6M9.9 9.9a3 3 0 0 0 4.2 4.2"/></svg>',
    caixa: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M3 7l9-4 9 4-9 4-9-4zM3 7v10l9 4 9-4V7M12 11v10"/></svg>',
    ajustes: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/></svg>',
    lista: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>',
    lixo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg>',
    sair: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M15 4h4v16h-4M10 8l-4 4 4 4M6 12h11"/></svg>',
    chave: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="8" cy="15" r="4"/><path d="M11 12l9-9M17 6l3 3M14 9l2 2"/></svg>',
    externo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M14 4h6v6M20 4l-9 9M18 14v6H4V6h6"/></svg>',
    envia: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M7 18a5 5 0 0 1-.6-10A6 6 0 0 1 18 8.5a4.5 4.5 0 0 1-.5 9.5"/><path d="M12 12v9M8.5 15.5L12 12l3.5 3.5"/></svg>',
    x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    seta: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M19 12H5M11 6l-6 6 6 6"/></svg>',
    ok: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true"><path d="M5 12l5 5 9-10"/></svg>',
    alerta: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 8v5M12 16.5v.5M10.3 3.9L2.4 18a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/></svg>',
    relogio: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
    etiqueta: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M3 12V4h8l10 10-8 8z"/><circle cx="7.5" cy="8.5" r="1.5"/></svg>'
  };

  // =====================================================================
  // sessão e acesso ao banco (mesma base do painel da Kiesel)
  // =====================================================================
  const SES = DEMO ? "khaus-painel-sessao-demo" : "khaus-painel-sessao";
  const guarda = { get: k => { try { return JSON.parse(localStorage.getItem(k) || "null"); } catch (e) { return null; } }, set: (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } } };
  let sessao = guarda.get(SES);
  function salvaSessao(d) {
    sessao = { access_token: d.access_token, refresh_token: d.refresh_token, expires_at: d.expires_at || Math.floor(Date.now() / 1000) + (Number(d.expires_in) || 3600), email: (d.user && d.user.email) || (sessao && sessao.email) || "" };
    guarda.set(SES, sessao);
  }
  function erro(msg, extra) { const e = new Error(msg); Object.assign(e, extra || {}); return e; }
  const SEM_REDE = "Sem conexão com a internet agora. Nada foi perdido: confira a conexão e tente de novo.";
  async function chama(url, op) { try { return await fetch(url, op); } catch (e) { throw erro(SEM_REDE, { rede: true }); } }
  function traduzAuth(j, st) {
    const m = sem(j.error_description || j.msg || j.message || j.error || j.error_code || "");
    if (st === 429 || m.includes("rate limit")) return "Muitas tentativas seguidas. Espere um minuto e tente de novo.";
    if (m.includes("invalid login") || m.includes("invalid_credentials") || m.includes("invalid grant")) return "E-mail ou senha incorretos.";
    if (m.includes("not confirmed")) return "Este e-mail ainda não foi confirmado. Abra o convite que chegou por e-mail.";
    if (m.includes("same") && m.includes("password")) return "A nova senha precisa ser diferente da atual.";
    if (m.includes("weak") || m.includes("at least") || m.includes("should be")) return "Senha fraca: use pelo menos 8 caracteres, misturando letras e números.";
    if (m.includes("expired") || m.includes("invalid") && m.includes("token")) return "O link expirou ou já foi usado. Peça um novo em \"Esqueci minha senha\".";
    return "Não foi possível concluir agora. Tente de novo em instantes.";
  }
  async function auth(caminho, corpo, metodo, tk) {
    const r = await chama(S.url + "/auth/v1/" + caminho, { method: metodo || "POST", headers: Object.assign({ apikey: S.chave, "Content-Type": "application/json" }, tk ? { Authorization: "Bearer " + tk } : {}), body: corpo ? JSON.stringify(corpo) : undefined });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw erro(traduzAuth(j, r.status), { status: r.status });
    return j;
  }
  let renovando = null;
  async function renova() {
    if (!sessao || !sessao.refresh_token) throw erro("Sua sessão terminou. Entre de novo.", { sessao: true });
    if (!renovando) renovando = auth("token?grant_type=refresh_token", { refresh_token: sessao.refresh_token }).then(salvaSessao).catch(e => { if (!e.rede) { sessao = null; guarda.set(SES, null); } throw e.rede ? e : erro("Sua sessão terminou. Entre de novo.", { sessao: true }); }).finally(() => { renovando = null; });
    return renovando;
  }
  async function token() {
    if (!sessao) throw erro("Sua sessão terminou. Entre de novo.", { sessao: true });
    if (sessao.expires_at - 90 < Date.now() / 1000) await renova();
    return sessao.access_token;
  }
  const SEM_PERMISSAO = "Seu usuário não tem permissão para alterar produtos. Peça para incluírem o seu e-mail na equipe do painel.";
  function traduzRest(j, st, ctx) {
    const c = j.code || "", m = sem(j.message || "");
    if (c === "23505") return ctx && ctx.id ? `Já existe um produto com o código ${ctx.id}. Mude o nome ou o código.` : "Esse registro já existe.";
    if (c === "42501" || st === 403) return SEM_PERMISSAO;
    if (c === "23514" || c === "22P02") return "Algum campo está com um valor inválido. Confira nome, quantidades e preços.";
    if (c === "42P01" || c === "PGRST205" || m.includes("does not exist") || m.includes("could not find the table")) return "O banco do painel ainda não foi preparado (falta rodar o arquivo khaus.sql no Supabase).";
    if (st >= 500) return "O banco de dados não respondeu. Tente de novo em instantes.";
    return "Não foi possível salvar: " + (j.message || "erro " + st) + ".";
  }
  async function rest(caminho, o) {
    o = o || {};
    const faz = async () => chama(S.url + "/rest/v1/" + caminho, { method: o.metodo || "GET", headers: Object.assign({ apikey: S.chave, Authorization: "Bearer " + (await token()), "Content-Type": "application/json", Accept: "application/json" }, o.prefer ? { Prefer: o.prefer } : {}), body: o.corpo ? JSON.stringify(o.corpo) : undefined });
    let r = await faz();
    if (r.status === 401) { await renova(); r = await faz(); }
    if (r.status === 401) throw erro("Sua sessão terminou. Entre de novo.", { sessao: true });
    if (!r.ok) { const j = await r.json().catch(() => ({})); throw erro(traduzRest(j, r.status, o.ctx), { status: r.status }); }
    if (r.status === 204) return null;
    const t = await r.text(); return t ? JSON.parse(t) : null;
  }
  const caminhoBalde = url => { const m = String(url).split(FOTO_OK)[1]; return m ? decodeURIComponent(m.split("?")[0]) : null; };
  const CAMPOS = ["cat", "cat_catalogo", "nome", "sub", "descricao", "specs", "cores", "esgotadas", "estoque", "min", "faixas", "ativo", "ordem", "foto"];

  const nuvem = {
    async entrar(email, senha) { salvaSessao(await auth("token?grant_type=password", { email, password: senha })); },
    async recuperar(email) { await auth("recover?redirect_to=" + encodeURIComponent(location.origin + location.pathname), { email }); },
    async novaSenha(senha) { await auth("user", { password: senha }, "PUT", await token()); },
    async sair() { const tk = sessao && sessao.access_token; sessao = null; guarda.set(SES, null); if (tk) { try { await fetch(S.url + "/auth/v1/logout", { method: "POST", headers: { apikey: S.chave, Authorization: "Bearer " + tk } }); } catch (e) { } } },
    async equipe() { return rest("khaus_equipe?select=email,nome"); },
    async listar() { return rest(S.tabela + "?select=*&order=ordem.asc"); },
    async config() { return rest("khaus_config?select=chave,valor"); },
    async gravaConfig(chave, valor) { const r = await rest("khaus_config?on_conflict=chave", { metodo: "POST", corpo: { chave, valor }, prefer: "resolution=merge-duplicates,return=representation" }); if (!r || !r.length) throw erro(SEM_PERMISSAO); return r[0]; },
    async criar(d) { const r = await rest(S.tabela, { metodo: "POST", corpo: d, prefer: "return=representation", ctx: { id: d.id } }); if (!r || !r.length) throw erro(SEM_PERMISSAO); return r[0]; },
    async alterar(id, d) { const r = await rest(S.tabela + "?id=eq." + encodeURIComponent(id), { metodo: "PATCH", corpo: d, prefer: "return=representation" }); if (!r || !r.length) throw erro(SEM_PERMISSAO); return r[0]; },
    async excluir(id) { const r = await rest(S.tabela + "?id=eq." + encodeURIComponent(id), { metodo: "DELETE", prefer: "return=representation" }); if (!r || !r.length) throw erro(SEM_PERMISSAO); },
    async enviarFoto(caminho, blob) {
      const faz = async () => chama(S.url + "/storage/v1/object/" + S.balde + "/" + caminho, { method: "POST", headers: { apikey: S.chave, Authorization: "Bearer " + (await token()), "Content-Type": blob.type, "Cache-Control": "31536000", "x-upsert": "false" }, body: blob });
      let r = await faz(); if (r.status === 401) { await renova(); r = await faz(); }
      if (!r.ok) { const j = await r.json().catch(() => ({})); throw erro(r.status === 403 || /policy|unauthorized/i.test(j.message || j.error || "") ? SEM_PERMISSAO : r.status === 413 ? "Foto grande demais." : "A foto não subiu (" + (j.message || r.status) + ")."); }
      return FOTO_OK + caminho;
    },
    async apagarFotos(urls) {
      const prefixes = urls.map(caminhoBalde).filter(Boolean).flatMap(c => [c, c.replace(/-g\.(webp|jpg)$/, "-p.$1")]); if (!prefixes.length) return;
      await chama(S.url + "/storage/v1/object/" + S.balde, { method: "DELETE", headers: { apikey: S.chave, Authorization: "Bearer " + (await token()), "Content-Type": "application/json" }, body: JSON.stringify({ prefixes }) });
    }
  };

  // modo demonstração: mesma interface, dados só neste navegador
  const DEMO_K = "khaus-painel-demo-v1";
  const demo = {
    lista: null, cfg: null,
    async carrega() {
      if (this.lista) return;
      const g = guarda.get(DEMO_K); if (g) { this.lista = g.lista; this.cfg = g.cfg; return; }
      const c = await catalogo();
      this.lista = c.produtos.map(p => Object.assign({}, p, { alterado_em: c.gerado + "T12:00:00Z", alterado_por: null }));
      this.cfg = { prazos: [{ id: "padrao", nome: "Padrão", de: 20, ate: 25, extra: 0, tag: "Recomendado" }, { id: "expresso", nome: "Expresso", de: 12, ate: 15, extra: 15, tag: "" }, { id: "turbo", nome: "Turbo", de: 7, ate: 10, extra: 25, tag: "Mais rápido" }], prazosDemo: true, precosDemo: true, cores: {} };
    },
    grava() { guarda.set(DEMO_K, { lista: this.lista.map(x => Object.assign({}, x, { foto: x.foto && /^blob:/.test(x.foto) ? null : x.foto })), cfg: this.cfg }); },
    espera: () => new Promise(r => setTimeout(r, 220)),
    async entrar(email) { await this.espera(); salvaSessao({ access_token: "demo", refresh_token: "demo", expires_in: 86400, user: { email: email || "demo@khaus" } }); },
    async recuperar() { await this.espera(); },
    async novaSenha() { await this.espera(); },
    async sair() { sessao = null; guarda.set(SES, null); },
    async equipe() { return [{ email: sessao.email, nome: "Demonstração" }]; },
    async listar() { await this.carrega(); return this.lista.map(x => JSON.parse(JSON.stringify(x))); },
    async config() { await this.carrega(); return Object.keys(this.cfg).map(k => ({ chave: k, valor: JSON.parse(JSON.stringify(this.cfg[k])) })); },
    async gravaConfig(chave, valor) { await this.carrega(); await this.espera(); this.cfg[chave] = valor; this.grava(); return { chave, valor }; },
    async criar(d) { await this.carrega(); await this.espera(); if (this.lista.some(x => x.id === d.id)) throw erro(`Já existe um produto com o código ${d.id}. Mude o nome ou o código.`); const r = Object.assign({}, d, { alterado_em: new Date().toISOString(), alterado_por: sessao.email }); this.lista.push(r); this.grava(); return JSON.parse(JSON.stringify(r)); },
    async alterar(id, d) { await this.carrega(); await this.espera(); const x = this.lista.find(y => y.id === id); Object.assign(x, d, { alterado_em: new Date().toISOString(), alterado_por: sessao.email }); this.grava(); return JSON.parse(JSON.stringify(x)); },
    async excluir(id) { await this.carrega(); await this.espera(); this.lista = this.lista.filter(y => y.id !== id); this.grava(); },
    async enviarFoto(caminho, blob) { await this.espera(); return URL.createObjectURL(blob); },
    async apagarFotos() { }
  };
  const api = DEMO ? demo : nuvem;

  // categorias e cores do catálogo publicado (painel/catalogo.json, gerado por ferramentas/gera-sql.js)
  let CAT_PROMESSA = null;
  function catalogo() { if (!CAT_PROMESSA) CAT_PROMESSA = fetch("/painel/catalogo.json", { cache: "no-cache" }).then(r => { if (!r.ok) throw 0; return r.json(); }).catch(() => ({ categorias: [], cores: {}, produtos: [] })); return CAT_PROMESSA; }

  // =====================================================================
  // utilidades de tela
  // =====================================================================
  function aviso(texto, o) {
    o = o || {};
    const box = $("#avisos"), el = document.createElement("div");
    $$(".aviso" + (o.erro ? ".erro" : ":not(.erro)"), box).forEach(a => a.remove());
    while (box.children.length > 1) box.firstChild.remove();
    el.className = "aviso" + (o.erro ? " erro" : "");
    el.innerHTML = (o.erro ? I.alerta : I.ok) + "<span>" + esc(texto) + "</span>" + (o.acao ? `<a href="#" role="button">${esc(o.acao)}</a>` : "") + (o.link ? `<a href="${esc(o.link[1])}" target="_blank" rel="noopener">${esc(o.link[0])}</a>` : "");
    if (o.acao) $("a[role=button]", el).addEventListener("click", e => { e.preventDefault(); el.remove(); o.fn(); });
    box.appendChild(el);
    setTimeout(() => el.remove(), o.tempo || (o.erro ? 7000 : 5200));
  }
  function dialogo({ titulo, texto, foto, corpo, botoes }) {
    return new Promise(resolve => {
      const veu = document.createElement("div"); veu.className = "veu";
      veu.innerHTML = `<div class="dialogo" role="dialog" aria-modal="true" aria-labelledby="dlg-t">${foto ? `<div class="dfoto"><img src="${esc(foto)}" alt=""></div>` : ""}<div class="dcorpo"><h2 id="dlg-t">${esc(titulo)}</h2>${texto ? `<p>${texto}</p>` : ""}${corpo || ""}</div><div class="dacoes">${botoes.map((b, i) => `<button type="button" class="btn ${b.classe || "btn-linha"}${b.esq ? " esq" : ""}" data-i="${i}">${b.texto}</button>`).join("")}</div></div>`;
      const anterior = document.activeElement;
      const fecha = v => { veu.remove(); document.body.classList.remove("travada"); document.removeEventListener("keydown", tecla); if (anterior && anterior.focus) anterior.focus(); resolve(v); };
      const tecla = e => { if (e.key === "Escape") fecha(null); if (e.key === "Tab") { const f = $$("button,input,a[href]", veu); const p = f[0], u = f[f.length - 1]; if (e.shiftKey && document.activeElement === p) { e.preventDefault(); u.focus(); } else if (!e.shiftKey && document.activeElement === u) { e.preventDefault(); p.focus(); } } };
      veu.addEventListener("click", async e => {
        if (e.target === veu) return fecha(null);
        const b = e.target.closest("button[data-i]"); if (!b) return;
        const def = botoes[+b.dataset.i];
        if (def.antes) { b.classList.add("carregando"); const ok = await def.antes(veu).catch(er => { mostraErroDialogo(veu, er.message); return false; }); b.classList.remove("carregando"); if (!ok) return; }
        fecha(def.valor);
      });
      document.addEventListener("keydown", tecla);
      document.body.appendChild(veu); document.body.classList.add("travada");
      const foco = $("input", veu) || $$("button[data-i]", veu).slice(-1)[0]; if (foco) foco.focus();
    });
  }
  function mostraErroDialogo(veu, msg) { let m = $(".msg-erro", veu); if (!m) { m = document.createElement("div"); m.className = "msg msg-erro"; m.style.marginTop = "14px"; $(".dcorpo", veu).appendChild(m); } m.textContent = msg; }
  const dataBR = s => { if (!s) return ""; const d = new Date(s.length <= 10 ? s + "T12:00:00" : s); return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: d.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined }); };
  const inicial = s => (s || "?").trim().charAt(0);
  const senhaBoa = s => s.length >= 8 && /[A-Za-zÀ-ÿ]/.test(s) && /\d/.test(s);
  function trataErro(er) {
    if (er.sessao) { aviso(er.message, { erro: true }); E.ed = null; return telaEntrada(er.message); }
    aviso(er.message || "Algo deu errado. Tente de novo.", { erro: true });
  }

  // =====================================================================
  // estado
  // =====================================================================
  const E = { lista: [], cfg: {}, cats: [], cores: {}, equipe: null, filtro: { vis: "ativo", cat: "", busca: "", est: "" }, ed: null, aj: null, carregou: false };
  try { const f = JSON.parse(sessionStorage.getItem("khaus-painel-filtro") || "null"); if (f) Object.assign(E.filtro, f); } catch (e) { }
  const guardaFiltro = () => { try { sessionStorage.setItem("khaus-painel-filtro", JSON.stringify(E.filtro)); } catch (e) { } };
  const catNome = id => (E.cats.find(c => c[0] === id) || [id, id])[1];
  const corDe = k => E.cores[k] || [k, "#999999"];
  function linha(r) {
    const x = { id: r.id, cat: r.cat || "", cat_catalogo: r.cat_catalogo || "", nome: r.nome || "", sub: r.sub || "", descricao: r.descricao || "", specs: r.specs || "", cores: Array.isArray(r.cores) ? r.cores.slice() : [], esgotadas: Array.isArray(r.esgotadas) ? r.esgotadas.slice() : [], estoque: r.estoque && typeof r.estoque === "object" ? Object.assign({}, r.estoque) : {}, min: +r.min || 1, faixas: Array.isArray(r.faixas) ? r.faixas.map(t => [+t[0], +t[1]]) : [], ativo: r.ativo !== false, ordem: +r.ordem || 0, foto: r.foto || null, alterado_em: r.alterado_em || null, alterado_por: r.alterado_por || null };
    return x;
  }
  // estoque: por cor ({cor: qtd}) ou total na chave "_" quando o produto não tem cores; vazio = não controla
  function estoqueTotal(p) {
    const ch = p.cores.length ? p.cores : ["_"]; let t = 0, tem = false;
    ch.forEach(k => { const v = p.estoque[k]; if (v !== undefined && v !== null && v !== "") { tem = true; t += +v; } });
    return tem ? t : null;
  }
  function situacao(p) {
    const t = estoqueTotal(p);
    const esgCores = p.cores.length && p.cores.every(c => p.esgotadas.includes(c) || p.estoque[c] === 0);
    if (esgCores || t === 0) return ["esgotado", "Sem estoque"];
    if (t !== null && t < p.min) return ["baixo", "Estoque baixo"];
    if (t === null) return ["livre", "Sem controle"];
    return ["ok", "Em estoque"];
  }

  // =====================================================================
  // entrada, senha nova e sem acesso
  // =====================================================================
  function ladoMarca(frase) {
    const itens = [[I.caixa, "Estoque por produto e por cor"], [I.etiqueta, "Preços por faixa de quantidade"], [I.relogio, "Prazos de produção e acréscimos"], [I.olhoNao, "Mostre ou esconda produtos do site"]];
    return `<div class="entrada-marca">
    <div class="placa-logo"><img src="/logo/khaus-logo-claro-600.webp" width="600" height="190" alt="Khaus Brindes Corporativos"></div>
    <div class="miolo-marca"><span class="rotulo-marca">Painel da Khaus</span><b>${esc(frase)}</b>
      <ul>${itens.map(([i, t]) => `<li><span class="ic">${i}</span>${t}</li>`).join("")}</ul></div>
    <p class="pe-marca">O site muda na hora em que você salva.<br>Khaus Brindes Corporativos · CNPJ 46.540.014/0001-07</p>
  </div>`;
  }
  function telaEntrada(msg, tipoMsg) {
    document.title = "Entrar · Painel Khaus";
    app.innerHTML = `${DEMO ? '<div class="demo-faixa">Modo demonstração: nada aqui vai para o site. Use qualquer e-mail e senha.</div>' : ""}
<main class="entrada">
  ${ladoMarca("Os produtos da Khaus, sempre com o estoque e o preço certos.")}
  <div class="entrada-miolo">
    <div class="entrada-cartao">
      <img class="logo" src="/logo/khaus-logo-claro-600.webp" width="600" height="190" alt="Khaus Brindes Corporativos">
      <h1>Painel da Khaus</h1>
      <p class="sub">Entre com o e-mail e a senha da sua conta.</p>
      <form id="f-entrar" novalidate>
        ${msg ? `<div class="msg msg-${tipoMsg || "erro"}" role="alert">${esc(msg)}</div>` : ""}
        <div class="campo"><label for="e-email">E-mail</label><input class="ent" id="e-email" type="email" autocomplete="username" inputmode="email" required></div>
        <div class="campo"><label for="e-senha">Senha</label><div class="senha-caixa"><input class="ent" id="e-senha" type="password" autocomplete="current-password" required><button class="ico-btn" type="button" id="ver-senha" aria-label="Mostrar senha" aria-pressed="false">${I.olho}</button></div></div>
        <button class="btn btn-azul" type="submit" id="b-entrar">Entrar</button>
        <div class="linha-fim"><a class="link" href="#" id="esqueci">Esqueci minha senha</a></div>
      </form>
      <p class="entrada-rodape">Khaus Brindes Corporativos · São Martinho/RS</p>
    </div>
  </div>
</main>`;
    const f = $("#f-entrar"), em = $("#e-email"), se = $("#e-senha");
    const ultimo = guarda.get("khaus-painel-email"); if (ultimo) { em.value = ultimo; } (ultimo ? se : em).focus();
    $("#ver-senha").addEventListener("click", e => { const b = e.currentTarget, v = se.type === "password"; se.type = v ? "text" : "password"; b.setAttribute("aria-pressed", v); b.setAttribute("aria-label", v ? "Esconder senha" : "Mostrar senha"); b.innerHTML = v ? I.olhoNao : I.olho; });
    f.addEventListener("submit", async e => {
      e.preventDefault();
      const email = em.value.trim(), senha = se.value;
      if (!/^\S+@\S+\.\S+$/.test(email)) return mensagemEntrada("Digite o seu e-mail completo.", em);
      if (!senha) return mensagemEntrada("Digite a sua senha.", se);
      const b = $("#b-entrar"); b.classList.add("carregando"); b.disabled = true;
      try { await api.entrar(email, senha); guarda.set("khaus-painel-email", email); await iniciaSessao(); }
      catch (er) { b.classList.remove("carregando"); b.disabled = false; mensagemEntrada(er.message, se); }
    });
    $("#esqueci").addEventListener("click", async e => {
      e.preventDefault();
      const r = await dialogo({ titulo: "Criar uma senha nova", texto: "Enviamos um link para o seu e-mail. Pelo link você escolhe a senha nova.", corpo: `<div class="campo"><label for="d-email">E-mail</label><input class="ent" id="d-email" type="email" autocomplete="username" value="${esc(em.value.trim())}"></div>`, botoes: [{ texto: "Cancelar", valor: null }, { texto: "Enviar link", classe: "btn-azul", valor: "ok", antes: async veu => { const v = $("#d-email", veu).value.trim(); if (!/^\S+@\S+\.\S+$/.test(v)) { mostraErroDialogo(veu, "Digite o seu e-mail completo."); return false; } await api.recuperar(v); return true; } }] });
      if (r) telaEntrada("Pronto. Se o e-mail estiver cadastrado, o link chega em alguns minutos (confira também o spam).", "ok");
    });
  }
  function mensagemEntrada(t, campo) {
    let m = $("#f-entrar .msg"); if (!m) { m = document.createElement("div"); m.setAttribute("role", "alert"); $("#f-entrar").prepend(m); }
    m.className = "msg msg-erro"; m.textContent = t; if (campo) campo.focus();
  }
  function telaNovaSenha(tipo) {
    document.title = "Nova senha · Painel Khaus";
    app.innerHTML = `<main class="entrada">${ladoMarca(tipo === "invite" ? "Boas-vindas ao painel da Khaus." : "Vamos criar uma senha nova.")}
  <div class="entrada-miolo"><div class="entrada-cartao">
    <img class="logo" src="/logo/khaus-logo-claro-600.webp" width="600" height="190" alt="Khaus Brindes Corporativos">
    <h1>${tipo === "invite" ? "Crie a sua senha" : "Senha nova"}</h1>
    <p class="sub">${esc(sessao && sessao.email || "")}</p>
    <form id="f-senha" novalidate>
      <div class="campo"><label for="s1">Senha nova</label><input class="ent" id="s1" type="password" autocomplete="new-password" minlength="8" required><span class="dica">Pelo menos 8 caracteres, com letras e números.</span></div>
      <div class="campo"><label for="s2">Repita a senha</label><input class="ent" id="s2" type="password" autocomplete="new-password" required></div>
      <button class="btn btn-azul" type="submit" id="b-senha">Salvar e entrar</button>
    </form></div></div></main>`;
    $("#s1").focus();
    $("#f-senha").addEventListener("submit", async e => {
      e.preventDefault();
      const a = $("#s1").value, b = $("#s2").value, msg = t => { let m = $("#f-senha .msg"); if (!m) { m = document.createElement("div"); m.className = "msg msg-erro"; m.setAttribute("role", "alert"); $("#f-senha").prepend(m); } m.textContent = t; };
      if (!senhaBoa(a)) return msg("A senha precisa ter pelo menos 8 caracteres, com letras e números.");
      if (a !== b) return msg("As duas senhas não estão iguais.");
      const bt = $("#b-senha"); bt.classList.add("carregando"); bt.disabled = true;
      try { await api.novaSenha(a); aviso("Senha salva."); await iniciaSessao(); }
      catch (er) { bt.classList.remove("carregando"); bt.disabled = false; if (er.sessao) return telaEntrada(er.message); msg(er.message); }
    });
  }
  function telaSemAcesso() {
    app.innerHTML = `<main class="entrada" style="grid-template-columns:1fr"><div class="entrada-miolo" style="align-items:center"><div class="entrada-cartao">
      <img class="logo" src="/logo/khaus-logo-claro-600.webp" width="600" height="190" alt="Khaus Brindes Corporativos">
      <h1>Acesso ainda não liberado</h1>
      <p class="sub" style="margin-top:12px">Você entrou como <b>${esc(sessao && sessao.email)}</b>, mas este e-mail ainda não está na equipe do painel. Peça para o responsável pelo site incluir o seu e-mail e entre de novo.</p>
      <form style="margin-top:24px"><button class="btn btn-linha" type="button" id="b-sair">Sair e entrar com outro e-mail</button></form>
    </div></div></main>`;
    $("#b-sair").addEventListener("click", async () => { await api.sair(); telaEntrada(); });
  }

  // =====================================================================
  // casca (topo + abas) e rotas
  // =====================================================================
  function casca(conteudo, aba) {
    const nome = (E.equipe && E.equipe.nome) || (sessao && sessao.email) || "";
    const abas = [["", "Produtos da Khaus", I.lista], ["xbz/produtos", "Produtos da XBZ", I.lista], ["estoque", "Estoque", I.caixa], ["xbz", "XBZ e preços", I.envia], ["ajustes", "Prazos e ajustes", I.ajustes]];
    return `${DEMO ? '<div class="demo-faixa">Modo demonstração: as alterações ficam só neste navegador e não vão para o site.</div>' : ""}
<header class="topo">
  <a class="marca" href="#" data-ir=""><img src="/logo/khaus-logo-claro-600.webp" width="600" height="190" alt="Khaus"><span>Painel</span></a>
  <nav class="abas" aria-label="Seções">${abas.map(([h, t, i]) => `<a href="#${h}" data-ir="${h}"${aba === h ? ' aria-current="page"' : ""}>${i}<span>${t}</span></a>`).join("")}</nav>
  <div class="espaco"></div>
  <a class="btn btn-fantasma ver-site" href="${SITE_PUB}/?fresco=1" target="_blank" rel="noopener">${I.externo}<span>Ver o site</span></a>
  <div class="usuario"><button type="button" id="b-usuario" aria-haspopup="menu" aria-expanded="false"><span class="avatar">${esc(inicial(nome))}</span><span class="nome">${esc(nome)}</span></button></div>
</header>
<main class="pagina" id="pagina">${conteudo}</main>`;
  }
  function ligaCasca() {
    $$("[data-ir]").forEach(a => a.addEventListener("click", e => { e.preventDefault(); vai(a.dataset.ir); }));
    const b = $("#b-usuario");
    b.addEventListener("click", e => {
      e.stopPropagation();
      const aberto = $(".usuario .menu"); if (aberto) { aberto.remove(); b.setAttribute("aria-expanded", "false"); return; }
      const m = document.createElement("div"); m.className = "menu"; m.setAttribute("role", "menu");
      m.innerHTML = `<div class="cab"><b>${esc((E.equipe && E.equipe.nome) || "Conta")}</b>${esc(sessao && sessao.email)}</div><button type="button" role="menuitem" data-a="senha">${I.chave}Trocar minha senha</button><a role="menuitem" href="${SITE_PUB}/?fresco=1" target="_blank" rel="noopener">${I.externo}Abrir o site</a><hr><button type="button" role="menuitem" data-a="sair" class="perigo">${I.sair}Sair</button>`;
      b.parentNode.appendChild(m); b.setAttribute("aria-expanded", "true");
      m.addEventListener("click", async ev => {
        const a = ev.target.closest("[data-a]"); if (!a) return; m.remove(); b.setAttribute("aria-expanded", "false");
        if (a.dataset.a === "sair") { if (sujo() && !(await confirmaDescartar())) return; await api.sair(); E.ed = null; E.aj = null; history.replaceState(null, "", location.pathname + location.search); telaEntrada("Você saiu do painel.", "info"); }
        if (a.dataset.a === "senha") trocaSenha();
      });
    });
  }
  document.addEventListener("click", e => { if (!e.target.closest(".usuario")) { const m = $(".usuario .menu"); if (m) { m.remove(); const b = $("#b-usuario"); if (b) b.setAttribute("aria-expanded", "false"); } } });
  async function trocaSenha() {
    const r = await dialogo({ titulo: "Trocar minha senha", corpo: `<div class="campo"><label for="t1">Senha nova</label><input class="ent" id="t1" type="password" autocomplete="new-password"><span class="dica">Pelo menos 8 caracteres, com letras e números.</span></div><div class="campo"><label for="t2">Repita a senha nova</label><input class="ent" id="t2" type="password" autocomplete="new-password"></div>`, botoes: [{ texto: "Cancelar", valor: null }, { texto: "Salvar senha", classe: "btn-azul", valor: "ok", antes: async veu => { const a = $("#t1", veu).value, b = $("#t2", veu).value; if (!senhaBoa(a)) { mostraErroDialogo(veu, "A senha precisa ter pelo menos 8 caracteres, com letras e números."); return false; } if (a !== b) { mostraErroDialogo(veu, "As duas senhas não estão iguais."); return false; } await api.novaSenha(a); return true; } }] });
    if (r) aviso("Senha trocada.");
  }
  const sujo = () => !!((E.ed && E.ed.sujo) || (E.aj && E.aj.sujo));
  const telaDeEdicao = h => /^(editar\/|novo|ajustes)/.test(h);
  async function vai(h) {
    const atual = location.hash.slice(1);
    if (sujo() && h !== atual) { if (!(await confirmaDescartar())) return; if (E.ed) E.ed.sujo = false; if (E.aj) E.aj.sujo = false; }
    if (atual === h) return rota();
    location.hash = h;
  }
  async function confirmaDescartar() {
    const r = await dialogo({ titulo: "Sair sem salvar?", texto: "As alterações ainda não foram salvas.", botoes: [{ texto: "Continuar editando", valor: null }, { texto: "Descartar alterações", classe: "btn-perigo", valor: "sim" }] });
    if (r && E.ed) descartaEnvio(E.ed);
    return !!r;
  }
  let hashAnterior = location.hash;
  window.addEventListener("hashchange", async () => {
    if (/access_token=|error_description=/.test(location.hash)) return inicio();
    if (sujo() && location.hash !== hashAnterior) {
      const destino = location.hash;
      history.replaceState(null, "", hashAnterior || location.pathname + location.search);
      if (!(await confirmaDescartar())) return;
      if (E.ed) E.ed.sujo = false; if (E.aj) E.aj.sujo = false; history.replaceState(null, "", destino || location.pathname + location.search);
    }
    hashAnterior = location.hash; rota();
  });
  window.addEventListener("beforeunload", e => { if (sujo()) { e.preventDefault(); e.returnValue = ""; } });
  function rota() {
    if (!sessao) return telaEntrada();
    const h = location.hash.slice(1);
    E.ed = null; E.aj = null;
    if (h === "novo") return editor(null);
    if (h === "estoque") return telaEstoque();
    if (h === "ajustes") return telaAjustes();
    if ((h === "xbz" || h.startsWith("xbz/")) && window.KhausXbz) return window.KhausXbz.tela(h);
    const m = /^editar\/([a-z0-9-]+)$/.exec(h);
    if (m) { const x = E.lista.find(y => y.id === m[1]); if (x) return editor(x); aviso("Produto não encontrado.", { erro: true }); history.replaceState(null, "", location.pathname + location.search); }
    telaLista();
  }

  // =====================================================================
  // lista de produtos
  // =====================================================================
  const menorPreco = p => p.faixas.length ? Math.min.apply(null, p.faixas.map(t => t[1])) : null;
  function filtrados() {
    const f = E.filtro, q = sem(f.busca).trim();
    return E.lista.filter(p => (f.vis === "todos" || (f.vis === "ativo" ? p.ativo : !p.ativo)) && (!f.cat || p.cat === f.cat) && (!f.est || situacao(p)[0] === f.est || (f.est === "sempreco" && !p.faixas.length)) && (!q || sem([p.id, p.nome, p.sub, p.descricao, catNome(p.cat)].join(" ")).includes(q)));
  }
  function contagem() {
    const c = { ativo: 0, oculto: 0, todos: E.lista.length, esgotado: 0, baixo: 0, sempreco: 0 };
    E.lista.forEach(p => { c[p.ativo ? "ativo" : "oculto"]++; const s = situacao(p)[0]; if (s === "esgotado") c.esgotado++; if (s === "baixo") c.baixo++; if (!p.faixas.length) c.sempreco++; });
    return c;
  }
  function telaLista() {
    document.title = "Produtos da Khaus · Painel Khaus";
    const c = contagem();
    const demoP = E.cfg.precosDemo !== false;
    app.innerHTML = casca(`
${demoP ? `<div class="faixa-aviso">${I.alerta}<span>Os preços do site estão marcados como <b>valores de demonstração</b>. Quando a tabela oficial estiver lançada, desligue o aviso em <a href="#ajustes" data-ir="ajustes">Prazos e ajustes</a>.</span></div>` : ""}
<div class="cab-lista">
  <div><h1>Produtos da Khaus</h1><p class="sub">Os produtos próprios da Khaus, com fotos e preços dela. Os mais de 3.600 da XBZ ficam em <a href="#xbz/produtos" data-ir="xbz/produtos">Produtos da XBZ</a>.</p><div class="resumo-n"><span><b class="num">${c.ativo}</b> no site</span><span><b class="num">${c.oculto}</b> ocultos</span><span><b class="num">${c.esgotado}</b> sem estoque</span><span><b class="num">${c.baixo}</b> com estoque baixo</span></div></div>
  <a class="btn btn-azul" href="#novo" data-ir="novo">${I.mais}Novo produto</a>
</div>
<div class="barra" role="search">
  <label class="busca"><span class="so-leitor">Buscar produto</span>${I.busca}<input class="ent" id="l-busca" type="search" placeholder="Buscar por nome, código ou categoria" value="${esc(E.filtro.busca)}" autocomplete="off"></label>
  <div class="seg" role="group" aria-label="Visibilidade">${[["ativo", "No site"], ["oculto", "Ocultos"], ["todos", "Todos"]].map(([v, t]) => `<button type="button" data-vis="${v}" aria-pressed="${E.filtro.vis === v}">${t}<span class="n num">${c[v]}</span></button>`).join("")}</div>
  <select class="ent" id="l-cat" aria-label="Categoria"><option value="">Todas as categorias</option>${E.cats.map(([id, n]) => `<option value="${esc(id)}"${E.filtro.cat === id ? " selected" : ""}>${esc(n)}</option>`).join("")}</select>
  <select class="ent" id="l-est" aria-label="Estoque e preço"><option value="">Estoque e preço: tudo</option>${[["esgotado", "Sem estoque"], ["baixo", "Estoque baixo"], ["ok", "Em estoque"], ["livre", "Sem controle de estoque"], ["sempreco", "Sem preço"]].map(([v, t]) => `<option value="${v}"${E.filtro.est === v ? " selected" : ""}>${t}</option>`).join("")}</select>
</div>
<div class="grade" id="grade"></div>`, "");
    ligaCasca(); pintaGrade();
    $("#l-busca").addEventListener("input", e => { E.filtro.busca = e.target.value; guardaFiltro(); pintaGrade(); });
    $$(".barra .seg button").forEach(b => b.addEventListener("click", () => { E.filtro.vis = b.dataset.vis; guardaFiltro(); $$(".barra .seg button").forEach(x => x.setAttribute("aria-pressed", x === b)); pintaGrade(); }));
    $("#l-cat").addEventListener("change", e => { E.filtro.cat = e.target.value; guardaFiltro(); pintaGrade(); });
    $("#l-est").addEventListener("change", e => { E.filtro.est = e.target.value; guardaFiltro(); pintaGrade(); });
    $("#grade").addEventListener("click", cliqueGrade);
  }
  function bolinhas(p) {
    if (!p.cores.length) return "";
    const max = 10, vis = p.cores.slice(0, max);
    return `<div class="cores">${vis.map(k => { const [n, h] = corDe(k); const out = p.esgotadas.includes(k) || p.estoque[k] === 0; return `<i class="${out ? "out" : ""}" style="--c:${esc(h)}" title="${esc(n)}${out ? " (esgotada)" : ""}"></i>`; }).join("")}${p.cores.length > max ? `<small>+${p.cores.length - max}</small>` : ""}</div>`;
  }
  function cartao(p) {
    const s = situacao(p), t = estoqueTotal(p), mp = menorPreco(p);
    return `<article class="cartao${p.ativo ? "" : " esmaecido"}" data-id="${esc(p.id)}">
  <div class="foto" data-editar><img src="${esc(fotoProd(p, "p"))}" alt="" loading="lazy" decoding="async" onerror="this.onerror=null;this.src='/logo/khaus-simbolo-512.png';this.classList.add('sem')"><span class="ref">${esc(catNome(p.cat))}</span></div>
  <div class="corpo">
    <div class="linha1"><span class="etiqueta et-${s[0]}">${s[1]}${t !== null ? " · " + num(t) + " un" : ""}</span>${p.ativo ? "" : '<span class="etiqueta et-oculto">Oculto</span>'}</div>
    <h3 data-editar>${esc(p.nome)}</h3>
    ${bolinhas(p)}
    <div class="preco num">${mp !== null ? `<small>a partir de</small> ${BRL(mp)}` : '<span class="semp">Sem preço · sob consulta</span>'}</div>
    <div class="alterado">Mínimo ${num(p.min)} un${p.alterado_em ? " · alterado em " + dataBR(p.alterado_em) + (p.alterado_por ? " por " + esc(p.alterado_por.split("@")[0]) : "") : ""}</div>
  </div>
  <div class="acoes"><a class="btn btn-linha" href="#editar/${esc(p.id)}" data-editar-link>${I.editar}Editar</a><button type="button" class="btn btn-linha mais" data-vis-toggle aria-label="${p.ativo ? "Ocultar do site" : "Mostrar no site"}" title="${p.ativo ? "Ocultar do site" : "Mostrar no site"}">${p.ativo ? I.olhoNao : I.olho}</button></div>
</article>`;
  }
  function pintaGrade() {
    const g = $("#grade"); if (!g) return;
    const l = filtrados();
    g.innerHTML = l.length ? l.map(cartao).join("") : `<div class="vazio">${I.busca}<h3>Nenhum produto com esses filtros.</h3><p>Tente outra busca ou veja <button type="button" class="link" data-limpa>todos os produtos</button>.</p></div>`;
  }
  async function cliqueGrade(e) {
    if (e.target.closest("[data-limpa]")) { E.filtro = { vis: "todos", cat: "", busca: "", est: "" }; guardaFiltro(); return telaLista(); }
    const c = e.target.closest(".cartao"); if (!c) return;
    const p = E.lista.find(y => y.id === c.dataset.id); if (!p) return;
    if (e.target.closest("[data-editar-link]")) { e.preventDefault(); return vai("editar/" + p.id); }
    if (e.target.closest("[data-vis-toggle]")) return alternaVisivel(p);
    if (e.target.closest("[data-editar]")) return vai("editar/" + p.id);
  }
  async function alternaVisivel(p, semDesfazer) {
    const antes = p.ativo;
    try {
      const novo = await api.alterar(p.id, { ativo: !antes }); Object.assign(p, linha(novo));
      if ($("#grade")) telaLista();
      aviso(antes ? `${p.nome} saiu do site.` : `${p.nome} voltou para o site.`, semDesfazer ? {} : { acao: "Desfazer", fn: () => alternaVisivel(p, true) });
    } catch (er) { trataErro(er); }
  }

  // =====================================================================
  // estoque (planilha rápida, salva sozinho)
  // =====================================================================
  const EF = { busca: "", cat: "" };
  function telaEstoque() {
    document.title = "Estoque · Painel Khaus";
    app.innerHTML = casca(`
<div class="cab-lista"><div><h1>Estoque</h1><p class="sub">Digite a quantidade e saia do campo: salva sozinho. Campo vazio = não controla estoque. Zero = sem estoque (a cor fica esgotada no site).</p></div></div>
<div class="barra" role="search">
  <label class="busca"><span class="so-leitor">Buscar produto</span>${I.busca}<input class="ent" id="s-busca" type="search" placeholder="Buscar produto" value="${esc(EF.busca)}" autocomplete="off"></label>
  <select class="ent" id="s-cat" aria-label="Categoria"><option value="">Todas as categorias</option>${E.cats.map(([id, n]) => `<option value="${esc(id)}"${EF.cat === id ? " selected" : ""}>${esc(n)}</option>`).join("")}</select>
</div>
<div class="tabela-est" id="tab-est" role="table" aria-label="Estoque por produto"></div>`, "estoque");
    ligaCasca(); pintaEstoque();
    $("#s-busca").addEventListener("input", e => { EF.busca = e.target.value; pintaEstoque(); });
    $("#s-cat").addEventListener("change", e => { EF.cat = e.target.value; pintaEstoque(); });
    $("#tab-est").addEventListener("change", salvaCampoEstoque);
    $("#tab-est").addEventListener("keydown", e => { if (e.key === "Enter" && e.target.matches("input[data-est]")) { e.preventDefault(); const l = $$("#tab-est input[data-est]"); const i = l.indexOf(e.target); (l[i + 1] || e.target).focus(); } });
  }
  function pintaEstoque() {
    const q = sem(EF.busca).trim();
    const l = E.lista.filter(p => (!EF.cat || p.cat === EF.cat) && (!q || sem(p.nome + " " + p.id).includes(q)));
    const t = $("#tab-est"); if (!t) return;
    t.innerHTML = l.length ? `<div class="te-cab" role="row"><span role="columnheader">Produto</span><span role="columnheader">Cor</span><span role="columnheader">Em estoque</span><span role="columnheader"></span></div>` + l.map(p => {
      const ch = p.cores.length ? p.cores : ["_"];
      return ch.map((k, i) => { const v = p.estoque[k]; const [n, h] = k === "_" ? ["Todas / sem cor", ""] : corDe(k); return `<div class="te-linha${i === 0 ? " primeira" : ""}${p.ativo ? "" : " oculto"}" role="row"><span class="te-prod" role="cell">${i === 0 ? `<img src="${esc(fotoProd(p, "p"))}" alt="" loading="lazy" onerror="this.style.visibility='hidden'"><a href="#editar/${esc(p.id)}" data-ir="editar/${esc(p.id)}">${esc(p.nome)}</a>` : ""}</span><span class="te-cor" role="cell">${h ? `<i style="--c:${esc(h)}"></i>` : ""}${esc(n)}</span><span role="cell"><input class="ent num" type="number" inputmode="numeric" min="0" step="1" data-est="${esc(p.id)}" data-cor="${esc(k)}" value="${v === undefined || v === null ? "" : v}" placeholder="—" aria-label="Estoque de ${esc(p.nome)}${k === "_" ? "" : ", cor " + esc(n)}"></span><span class="te-st" role="cell" data-st="${esc(p.id)}|${esc(k)}"></span></div>`; }).join("");
    }).join("") : `<div class="vazio">${I.busca}<h3>Nenhum produto encontrado.</h3></div>`;
    $$("#tab-est [data-ir]").forEach(a => a.addEventListener("click", e => { e.preventDefault(); vai(a.dataset.ir); }));
  }
  const filaEst = {};
  async function salvaCampoEstoque(e) {
    const inp = e.target; if (!inp.matches("input[data-est]")) return;
    const p = E.lista.find(y => y.id === inp.dataset.est); if (!p) return;
    const k = inp.dataset.cor, raw = inp.value.trim();
    if (raw !== "" && (!/^\d+$/.test(raw) || +raw > 10000000)) { inp.classList.add("invalido"); return aviso("Use só números inteiros (ou deixe vazio para não controlar).", { erro: true }); }
    inp.classList.remove("invalido");
    const est = Object.assign({}, p.estoque); if (raw === "") delete est[k]; else est[k] = +raw;
    const st = $(`[data-st="${CSS.escape(p.id + "|" + k)}"]`); if (st) { st.className = "te-st salvando"; st.textContent = "Salvando…"; }
    const anterior = filaEst[p.id] || Promise.resolve();
    filaEst[p.id] = anterior.then(async () => {
      try {
        const corpo = { estoque: Object.assign({}, p.estoque, raw === "" ? {} : { [k]: +raw }) }; if (raw === "") delete corpo.estoque[k];
        const novo = await api.alterar(p.id, corpo); Object.assign(p, linha(novo));
        if (st) { st.className = "te-st ok"; st.innerHTML = I.ok + "Salvo"; setTimeout(() => { if (st.isConnected) { st.className = "te-st"; st.textContent = ""; } }, 2500); }
      } catch (er) { if (st) { st.className = "te-st erro"; st.textContent = "Não salvou"; } trataErro(er); }
    });
    void est;
  }

  // =====================================================================
  // prazos e ajustes
  // =====================================================================
  function telaAjustes() {
    document.title = "Prazos e ajustes · Painel Khaus";
    const pz = (Array.isArray(E.cfg.prazos) && E.cfg.prazos.length ? E.cfg.prazos : []).map(z => Object.assign({}, z));
    E.aj = { prazos: pz, prazosDemo: E.cfg.prazosDemo !== false, precosDemo: E.cfg.precosDemo !== false, cores: Object.assign({}, E.cfg.cores || {}), sujo: false };
    desenhaAjustes();
  }
  function desenhaAjustes() {
    const a = E.aj;
    app.innerHTML = casca(`
<div class="cab-lista"><div><h1>Prazos e ajustes</h1><p class="sub">O que você muda aqui vale para todo o site.</p></div></div>
<form id="f-aj" novalidate class="blocos">
  <section class="bloco"><h2>${I.relogio}Prazos de produção</h2><p class="sub">Aparecem na ficha de cada produto. O cliente escolhe e o acréscimo entra no preço. Dias úteis, contados depois da aprovação da arte.</p>
    <div class="conteudo"><div class="pz-tab"><div class="pz-cab"><span>Nome</span><span>De (dias)</span><span>Até (dias)</span><span>Acréscimo %</span><span>Etiqueta</span><span></span></div>
    ${a.prazos.map((z, i) => `<div class="pz-l" data-i="${i}"><input class="ent" data-k="nome" value="${esc(z.nome)}" maxlength="24" aria-label="Nome do prazo"><input class="ent num" data-k="de" type="number" min="1" max="200" value="${z.de}" aria-label="De quantos dias"><input class="ent num" data-k="ate" type="number" min="1" max="200" value="${z.ate}" aria-label="Até quantos dias"><input class="ent num" data-k="extra" type="number" min="0" max="300" value="${z.extra}" aria-label="Acréscimo em porcentagem"><input class="ent" data-k="tag" value="${esc(z.tag || "")}" maxlength="18" placeholder="opcional" aria-label="Etiqueta"><button type="button" class="ico-btn" data-tira="${i}" aria-label="Tirar este prazo"${a.prazos.length <= 1 ? " disabled" : ""}>${I.x}</button></div>`).join("")}</div>
    ${a.prazos.length < 5 ? `<button type="button" class="btn btn-linha" id="aj-novo-pz" style="align-self:flex-start">${I.mais}Incluir prazo</button>` : ""}
    <label class="interruptor"><input type="checkbox" id="aj-pzdemo"${a.prazosDemo ? " checked" : ""}><span>Mostrar no site que os prazos ainda são de demonstração</span></label></div></section>
  <section class="bloco"><h2>${I.etiqueta}Preços</h2>
    <div class="conteudo"><label class="interruptor"><input type="checkbox" id="aj-prdemo"${a.precosDemo ? " checked" : ""}><span>Mostrar no site que os preços são <b>valores de demonstração</b> (vale para todos os produtos, inclusive os da XBZ)</span></label><p class="dica">Desligue quando a tabela oficial da Khaus estiver lançada em todos os produtos.</p></div></section>
  <section class="bloco"><h2>Cores extras</h2><p class="sub">Cores que ainda não existem no catálogo. Depois de incluir, aparecem para escolher em qualquer produto.</p>
    <div class="conteudo"><div class="cores-extra">${Object.keys(a.cores).map(k => `<span class="ficha"><i style="--c:${esc(a.cores[k][1])}"></i>${esc(a.cores[k][0])}<button type="button" data-tira-cor="${esc(k)}" aria-label="Tirar a cor ${esc(a.cores[k][0])}">${I.x}</button></span>`).join("") || '<span class="dica">Nenhuma cor extra.</span>'}</div>
    <div class="nova-cor"><input class="ent" id="aj-cor-nome" placeholder="Nome da cor (ex.: Verde água)" maxlength="30" aria-label="Nome da cor"><input type="color" id="aj-cor-hex" value="#6ad4ae" aria-label="Cor"><button type="button" class="btn btn-linha" id="aj-cor-add">${I.mais}Incluir cor</button></div></div></section>
  <div class="rodape-ed"><div class="estado" id="estado">Tudo salvo.</div><button type="submit" class="btn btn-azul" id="aj-salvar">Salvar ajustes</button></div>
</form>`, "ajustes");
    ligaCasca();
    const f = $("#f-aj");
    const marca = () => { a.sujo = true; const e = $("#estado"); e.className = "estado sujo"; e.textContent = "Alterações não salvas"; };
    f.addEventListener("input", e => { const l = e.target.closest(".pz-l"); if (l) { const z = a.prazos[+l.dataset.i], k = e.target.dataset.k; z[k] = (k === "nome" || k === "tag") ? e.target.value : (e.target.value === "" ? "" : +e.target.value); } marca(); });
    f.addEventListener("change", e => { if (e.target.id === "aj-pzdemo") a.prazosDemo = e.target.checked; if (e.target.id === "aj-prdemo") a.precosDemo = e.target.checked; marca(); });
    f.addEventListener("click", e => {
      const t = e.target.closest("[data-tira]"); if (t) { a.prazos.splice(+t.dataset.tira, 1); marca(); desenhaAjustesMantendo(); return; }
      const tc = e.target.closest("[data-tira-cor]"); if (tc) { const k = tc.dataset.tiraCor; if (E.lista.some(p => p.cores.includes(k))) return aviso("Essa cor está em uso em algum produto. Tire dos produtos antes.", { erro: true }); delete a.cores[k]; marca(); desenhaAjustesMantendo(); return; }
      if (e.target.closest("#aj-novo-pz")) { a.prazos.push({ id: "prazo-" + Date.now().toString(36), nome: "Novo prazo", de: 5, ate: 7, extra: 30, tag: "" }); marca(); desenhaAjustesMantendo(); return; }
      if (e.target.closest("#aj-cor-add")) { const n = $("#aj-cor-nome").value.trim(), h = $("#aj-cor-hex").value; if (n.length < 2) return aviso("Dê um nome para a cor.", { erro: true }); const k = slug(n).replace(/-/g, ""); if (E.cores[k] || a.cores[k]) return aviso("Já existe uma cor com esse nome.", { erro: true }); a.cores[k] = [n, h]; marca(); desenhaAjustesMantendo(); }
    });
    f.addEventListener("submit", async e => {
      e.preventDefault();
      for (const z of a.prazos) {
        if (!String(z.nome || "").trim()) return aviso("Todo prazo precisa de um nome.", { erro: true });
        if (!(+z.de >= 1 && +z.ate >= +z.de)) return aviso(`No prazo "${z.nome}", o "até" precisa ser maior ou igual ao "de".`, { erro: true });
        if (!(+z.extra >= 0)) return aviso(`Acréscimo inválido no prazo "${z.nome}".`, { erro: true });
      }
      const prazos = a.prazos.map(z => ({ id: z.id || slug(z.nome), nome: String(z.nome).trim(), de: +z.de, ate: +z.ate, extra: +z.extra, tag: String(z.tag || "").trim() })).sort((x, y) => y.ate - x.ate);
      const b = $("#aj-salvar"); b.classList.add("carregando"); b.disabled = true;
      try {
        const mudouDemo = E.cfg.precosDemo !== a.precosDemo;
        await api.gravaConfig("prazos", prazos); await api.gravaConfig("prazosDemo", a.prazosDemo); await api.gravaConfig("precosDemo", a.precosDemo); await api.gravaConfig("cores", a.cores);
        if (!DEMO && mudouDemo && window.KhausXbz) await window.KhausXbz.demoGeral(a.precosDemo).catch(() => { });
        Object.assign(E.cfg, { prazos, prazosDemo: a.prazosDemo, precosDemo: a.precosDemo, cores: a.cores }); E.cores = Object.assign({}, E.coresBase, a.cores);
        a.sujo = false; aviso("Ajustes salvos. O site já mostra os prazos novos.", { link: ["Ver no site", SITE_PUB + "/?fresco=1"] }); telaAjustes();
      } catch (er) { b.classList.remove("carregando"); b.disabled = false; trataErro(er); }
    });
  }
  function desenhaAjustesMantendo() { const s = E.aj.sujo; desenhaAjustes(); E.aj.sujo = s; if (s) { const e = $("#estado"); e.className = "estado sujo"; e.textContent = "Alterações não salvas"; } }

  // =====================================================================
  // editor de produto
  // =====================================================================
  function editor(p) {
    const novo = !p;
    const d = novo ? { id: "", cat: E.filtro.cat || (E.cats[0] || [""])[0], nome: "", sub: "", descricao: "", specs: "", cores: [], esgotadas: [], estoque: {}, min: 10, faixas: [[10, 0]], ativo: true, ordem: E.lista.reduce((m, x) => Math.max(m, x.ordem), 0) + 1, foto: null }
      : JSON.parse(JSON.stringify(p));
    E.ed = { novo, orig: p, d, idManual: false, fotoNova: null, enviadas: [], removidas: [], sujo: false };
    desenhaEditor();
  }
  function desenhaEditor() {
    const ed = E.ed, d = ed.d;
    document.title = (ed.novo ? "Novo produto" : d.nome) + " · Painel Khaus";
    const todasCores = coresVisiveis(d);
    app.innerHTML = casca(`
<div class="ed-cab">
  <a class="btn btn-fantasma voltar" href="#" data-ir="">${I.seta}Produtos</a>
  <h1>${ed.novo ? "Novo produto" : esc(d.nome)}</h1>
  <div class="espaco"></div>
  ${!ed.novo && ed.orig.ativo ? `<a class="btn btn-linha ver" href="${esc(linkSite(d.id))}" target="_blank" rel="noopener">${I.externo}Ver no site</a>` : ""}
</div>
<form id="f-ed" novalidate>
<div class="ed-grade">
  <div class="blocos">
    <section class="bloco"><h2><span class="n">1</span>Foto</h2><p class="sub">Use a foto do produto com fundo limpo (de preferência PNG sem fundo). ${ed.novo ? "" : "Sem foto nova, o site continua com a foto atual."}</p>
      <div class="conteudo"><div class="foto-ed"><div class="foto-prev" id="foto-prev"><img src="${esc(ed.fotoNova ? ed.fotoNova.prev : fotoProd(d, "g"))}" alt="" onerror="this.onerror=null;this.src='/logo/khaus-simbolo-512.png';this.classList.add('sem')">${ed.fotoNova && ed.fotoNova.estado === "enviando" ? '<div class="progresso">Enviando…</div>' : ed.fotoNova && ed.fotoNova.estado === "erro" ? '<div class="progresso erro">' + esc(ed.fotoNova.erro) + '</div>' : ""}</div>
        <div class="foto-acoes"><label class="solta" id="solta">${I.envia}<b>${d.foto || ed.fotoNova ? "Trocar a foto" : "Escolher foto"}</b><span>ou arraste o arquivo · JPG, PNG ou WEBP</span><input type="file" id="arq" accept="image/*"></label>${d.foto || ed.fotoNova ? `<button type="button" class="btn btn-fantasma" id="foto-tira">${I.x}Voltar para a foto do site</button>` : ""}</div></div></div>
    </section>
    <section class="bloco"><h2><span class="n">2</span>Produto</h2>
      <div class="conteudo">
        <div class="campo"><label for="c-nome">Nome</label><input class="ent" id="c-nome" value="${esc(d.nome)}" maxlength="120" placeholder="Ex.: Copo térmico 473ml"></div>
        <div class="linha"><div class="campo"><label for="c-cat">Categoria</label><select class="ent" id="c-cat">${E.cats.map(([id, n]) => `<option value="${esc(id)}"${d.cat === id ? " selected" : ""}>${esc(n)}</option>`).join("")}</select><span class="dica">Linha da página inicial (Mais pedidos).</span></div>
          ${E.core ? `<div class="campo"><label for="c-catc">Categoria no catálogo completo</label><select class="ent" id="c-catc"><option value="">Automática: ${esc(E.core.CAT_NOME[E.core.categoria(d.nome || "")] || "")}</option>${Object.keys(E.core.CAT_NOME).map(id => `<option value="${id}"${d.cat_catalogo === id ? " selected" : ""}>${esc(E.core.CAT_NOME[id])}</option>`).join("")}</select><span class="dica">Onde o produto aparece em /catalogo.</span></div>` : ""}</div><div class="linha">
          <div class="campo"><label for="c-id">Código</label><input class="ent" id="c-id" value="${esc(d.id)}" maxlength="60" spellcheck="false"${ed.novo ? "" : " readonly aria-readonly=\"true\""}><span class="dica">${ed.novo ? "Montado sozinho pelo nome. É o endereço do produto no site." : "O código não muda depois de criado."}</span></div></div>
        <div class="campo"><label for="c-sub">Frase curta</label><input class="ent" id="c-sub" value="${esc(d.sub)}" maxlength="160" placeholder="Aparece embaixo do nome no catálogo"></div>
        <div class="campo"><label for="c-desc">Descrição</label><textarea class="ent" id="c-desc" rows="4" maxlength="4000">${esc(d.descricao)}</textarea></div>
        <div class="campo"><label for="c-specs">Especificações</label><input class="ent" id="c-specs" value="${esc(d.specs)}" maxlength="600" placeholder="Ex.: Inox 304 · 473 ml · tampa com vedação"><span class="dica">Separe com " · ". As duas primeiras aparecem na foto da ficha.</span></div>
      </div></section>
    <section class="bloco"><h2><span class="n">3</span>Cores e estoque</h2><p class="sub">Toque nas cores que o produto tem. Para cada cor, informe o estoque (vazio = não controla; zero = esgotada no site).</p>
      <div class="conteudo">
        <div class="sw-todas" id="sw-todas">${todasCores.map(k => { const [n, h] = corDe(k); return `<button type="button" class="sw" data-cor="${esc(k)}" aria-pressed="${d.cores.includes(k)}" title="${esc(n)}"><i style="--c:${esc(h)}"></i><span>${esc(n)}</span></button>`; }).join("")}</div>
        <div id="est-cores">${tabelaCoresEd(d)}</div>
      </div></section>
    <section class="bloco"><h2><span class="n">4</span>Quantidade e preços</h2><p class="sub">Preço por unidade em cada faixa de quantidade. Sem nenhuma faixa, o site mostra "Sob consulta".</p>
      <div class="conteudo">
        <div class="campo" style="max-width:220px"><label for="c-min">Quantidade mínima</label><input class="ent num" id="c-min" type="number" min="1" inputmode="numeric" value="${d.min}"></div>
        <div class="faixas" id="faixas">${d.faixas.map((t, i) => linhaFaixa(t, i)).join("")}</div>
        <button type="button" class="btn btn-linha" id="b-faixa" style="align-self:flex-start">${I.mais}Incluir faixa</button>
      </div></section>
    <section class="bloco"><h2><span class="n">5</span>No site</h2>
      <div class="conteudo">
        <label class="interruptor"><input type="checkbox" id="c-ativo"${d.ativo ? " checked" : ""}><span>Mostrar este produto no site</span></label>
        <div class="campo" style="max-width:220px"><label for="c-ordem">Posição no catálogo</label><input class="ent num" id="c-ordem" type="number" min="0" value="${d.ordem}"><span class="dica">Menor número aparece primeiro.</span></div>
      </div></section>
  </div>
  <aside class="lateral" aria-label="Prévia"><div class="previa" id="previa"></div><div class="lista-ok" id="lista-ok"></div></aside>
</div>
<div class="rodape-ed">
  ${ed.novo ? "" : `<button type="button" class="btn btn-perigo-texto" id="b-excluir">${I.lixo}<span>Excluir</span></button>`}
  <div class="estado" id="estado" aria-live="polite">${ed.novo ? "Preencha e publique." : "Tudo salvo."}</div>
  <a class="btn btn-linha" href="#" data-ir="">Cancelar</a>
  <button type="submit" class="btn btn-azul" id="b-salvar">${ed.novo ? "Publicar produto" : "Salvar alterações"}</button>
</div>
</form>`, "");
    ligaCasca(); ligaEditor(); pintaPrevia(); if (ed.sujo) marcaSujo(true);
    window.scrollTo(0, 0);
  }
  // uma cor por nome: se duas chaves têm o mesmo nome (ex.: "Azul marinho"), mostra a do produto ou a mais usada
  function coresVisiveis(d) {
    const uso = {}; E.lista.forEach(p => p.cores.forEach(k => { uso[k] = (uso[k] || 0) + 1; }));
    const porNome = {}; Object.keys(E.cores).forEach(k => { const n = sem(corDe(k)[0]); const atual = porNome[n]; if (!atual || d.cores.includes(k) && !d.cores.includes(atual) || (!d.cores.includes(atual) && (uso[k] || 0) > (uso[atual] || 0))) porNome[n] = k; });
    const vis = new Set(Object.values(porNome)); d.cores.forEach(k => vis.add(k));
    return Object.keys(E.cores).filter(k => vis.has(k));
  }
  function tabelaCoresEd(d) {
    if (!d.cores.length) {
      const v = d.estoque._;
      return `<div class="est-l sem-cor"><span class="te-cor">Estoque total (sem cores)</span><input class="ent num" type="number" min="0" inputmode="numeric" data-ec="_" value="${v === undefined || v === null ? "" : v}" placeholder="—" aria-label="Estoque total"></div>`;
    }
    return d.cores.map(k => { const [n, h] = corDe(k); const v = d.estoque[k]; const esg = d.esgotadas.includes(k); return `<div class="est-l"><span class="te-cor"><i style="--c:${esc(h)}"></i>${esc(n)}</span><input class="ent num" type="number" min="0" inputmode="numeric" data-ec="${esc(k)}" value="${v === undefined || v === null ? "" : v}" placeholder="—" aria-label="Estoque da cor ${esc(n)}"><label class="mini-check"><input type="checkbox" data-esg="${esc(k)}"${esg ? " checked" : ""}>Esgotada</label></div>`; }).join("");
  }
  function linhaFaixa(t, i) { return `<div class="faixa" data-i="${i}"><span>A partir de</span><input class="ent num" type="number" min="1" inputmode="numeric" data-fq value="${t[0] || ""}" aria-label="Quantidade da faixa ${i + 1}"><span>un</span><span class="pre">R$</span><input class="ent num" inputmode="decimal" data-fp value="${t[1] ? Number(t[1]).toFixed(2).replace(".", ",") : ""}" placeholder="0,00" aria-label="Preço por unidade da faixa ${i + 1}"><span>/un</span><button type="button" class="ico-btn" data-tira-faixa="${i}" aria-label="Tirar a faixa ${i + 1}">${I.x}</button></div>`; }
  function marcaSujo(v) { if (!E.ed) return; if (v !== undefined) E.ed.sujo = v; const e = $("#estado"); if (!e) return; const env = E.ed.fotoNova && E.ed.fotoNova.estado === "enviando"; e.className = "estado" + (E.ed.sujo ? " sujo" : ""); e.textContent = env ? "Enviando a foto…" : E.ed.sujo ? "Alterações não salvas" : (E.ed.novo ? "Preencha e publique." : "Tudo salvo."); }
  const lePreco = s => { const v = String(s || "").replace(/[^\d,.]/g, "").replace(/\.(?=\d{3}(\D|$))/g, "").replace(",", "."); return v ? Math.round(Number(v) * 100) / 100 : 0; };
  function ligaEditor() {
    const ed = E.ed, d = ed.d, f = $("#f-ed");
    const muda = () => { marcaSujo(true); pintaPrevia(); };
    $("#c-nome").addEventListener("input", e => { d.nome = e.target.value; if (ed.novo && !ed.idManual) { d.id = idLivre(slug(d.nome)); $("#c-id").value = d.id; } muda(); });
    $("#c-id").addEventListener("input", e => { if (!ed.novo) return; e.target.value = slug(e.target.value); d.id = e.target.value; ed.idManual = true; muda(); });
    [["c-sub", "sub"], ["c-desc", "descricao"], ["c-specs", "specs"]].forEach(([id, k]) => $("#" + id).addEventListener("input", e => { d[k] = e.target.value; muda(); }));
    $("#c-cat").addEventListener("change", e => { d.cat = e.target.value; muda(); });
    if ($("#c-catc")) $("#c-catc").addEventListener("change", e => { d.cat_catalogo = e.target.value; muda(); });
    $("#c-min").addEventListener("input", e => { d.min = Math.max(1, parseInt(e.target.value, 10) || 1); muda(); });
    $("#c-ordem").addEventListener("input", e => { d.ordem = parseInt(e.target.value, 10) || 0; muda(); });
    $("#c-ativo").addEventListener("change", e => { d.ativo = e.target.checked; muda(); });
    $("#sw-todas").addEventListener("click", e => {
      const b = e.target.closest("[data-cor]"); if (!b) return; const k = b.dataset.cor, i = d.cores.indexOf(k);
      if (i >= 0) { d.cores.splice(i, 1); d.esgotadas = d.esgotadas.filter(x => x !== k); delete d.estoque[k]; } else { d.cores.push(k); delete d.estoque._; }
      b.setAttribute("aria-pressed", i < 0); $("#est-cores").innerHTML = tabelaCoresEd(d); muda();
    });
    $("#est-cores").addEventListener("input", e => {
      const k = e.target.dataset.ec; if (k === undefined) return; const raw = e.target.value.trim();
      if (raw === "") delete d.estoque[k]; else if (/^\d+$/.test(raw)) d.estoque[k] = +raw; else return e.target.classList.add("invalido");
      e.target.classList.remove("invalido"); muda();
    });
    $("#est-cores").addEventListener("change", e => { const k = e.target.dataset.esg; if (k === undefined) return; if (e.target.checked) { if (!d.esgotadas.includes(k)) d.esgotadas.push(k); } else d.esgotadas = d.esgotadas.filter(x => x !== k); muda(); });
    const fx = $("#faixas");
    fx.addEventListener("input", e => { const l = e.target.closest(".faixa"); if (!l) return; const i = +l.dataset.i; if (e.target.matches("[data-fq]")) d.faixas[i][0] = parseInt(e.target.value, 10) || 0; if (e.target.matches("[data-fp]")) d.faixas[i][1] = lePreco(e.target.value); e.target.classList.remove("invalido"); muda(); });
    fx.addEventListener("click", e => { const b = e.target.closest("[data-tira-faixa]"); if (!b) return; d.faixas.splice(+b.dataset.tiraFaixa, 1); fx.innerHTML = d.faixas.map((t, i) => linhaFaixa(t, i)).join(""); muda(); });
    $("#b-faixa").addEventListener("click", () => { const ult = d.faixas[d.faixas.length - 1]; d.faixas.push([ult ? ult[0] * 2 : d.min, ult ? ult[1] : 0]); fx.innerHTML = d.faixas.map((t, i) => linhaFaixa(t, i)).join(""); muda(); const l = $$("#faixas [data-fp]"); if (l.length) l[l.length - 1].focus(); });
    const arq = $("#arq"), solta = $("#solta");
    arq.addEventListener("change", () => { if (arq.files[0]) recebeFoto(arq.files[0]); arq.value = ""; });
    ["dragenter", "dragover"].forEach(t => solta.addEventListener(t, e => { e.preventDefault(); solta.classList.add("sobre"); }));
    ["dragleave", "drop"].forEach(t => solta.addEventListener(t, e => { e.preventDefault(); solta.classList.remove("sobre"); }));
    solta.addEventListener("drop", e => { if (e.dataTransfer && e.dataTransfer.files[0]) recebeFoto(e.dataTransfer.files[0]); });
    const ft = $("#foto-tira"); if (ft) ft.addEventListener("click", () => { if (d.foto) ed.removidas.push(d.foto); if (ed.fotoNova && ed.fotoNova.url) ed.enviadas = ed.enviadas.filter(u => u !== ed.fotoNova.url); d.foto = null; ed.fotoNova = null; marcaSujo(true); desenhaEditor(); });
    const bx = $("#b-excluir"); if (bx) bx.addEventListener("click", () => excluir(ed.orig));
    f.addEventListener("submit", e => { e.preventDefault(); salva(); });
    f.addEventListener("keydown", e => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") { e.preventDefault(); salva(); } });
  }
  function idLivre(base) { if (!base) return ""; let id = base, n = 2; while (E.lista.some(p => p.id === id)) id = base + "-" + n++; return id; }
  function pintaPrevia() {
    const ed = E.ed; if (!ed) return; const d = ed.d, pv = $("#previa"), ok = $("#lista-ok"); if (!pv) return;
    const fx = d.faixas.filter(t => t[0] > 0 && t[1] > 0).sort((a, b) => a[0] - b[0]);
    const src = ed.fotoNova ? ed.fotoNova.prev : fotoProd(d, "p");
    pv.innerHTML = `<div class="rot">Como aparece no site</div><div class="pfoto"><img src="${esc(src)}" alt="" onerror="this.onerror=null;this.src='/logo/khaus-simbolo-512.png';this.classList.add('sem')"><span class="tipo">${esc(catNome(d.cat))}</span></div><div class="pcorpo">${d.cores.length ? `<div class="cores">${d.cores.slice(0, 10).map(k => `<i class="${d.esgotadas.includes(k) || d.estoque[k] === 0 ? "out" : ""}" style="--c:${esc(corDe(k)[1])}"></i>`).join("")}</div>` : ""}<h3>${esc(d.nome || "Nome do produto")}</h3><div class="onde">${esc(d.sub || "Frase curta")}</div><div class="preco num">${fx.length ? BRL(fx[0][1]) + "<small>/un</small>" : '<span class="semp">Sob consulta</span>'}</div><div class="specs"><span>${num(d.min)} un mínimo</span>${fx.length > 1 ? `<span>até ${BRL(fx[fx.length - 1][1])} com ${num(fx[fx.length - 1][0])}</span>` : ""}</div></div>`;
    const itens = [[!!(d.foto || ed.fotoNova || !ed.novo), "Foto"], [d.nome.trim().length >= 2, "Nome"], [d.descricao.trim().length >= 20, "Descrição"], [fx.length > 0, "Preço"], [d.cores.length > 0 || d.estoque._ !== undefined, "Cores ou estoque"]];
    ok.innerHTML = `<h3>Produto completo</h3><ul>${itens.map(([v, t]) => `<li class="${v ? "ok" : ""}"><i></i>${t}</li>`).join("")}</ul>`;
  }

  // ---------- foto: reduz e envia (sem marca d'água) ----------
  async function abreImagem(file) {
    if (window.createImageBitmap) { try { return await createImageBitmap(file, { imageOrientation: "from-image" }); } catch (e) { } }
    return new Promise((ok, falha) => { const u = URL.createObjectURL(file), i = new Image(); i.onload = () => ok(i); i.onerror = () => falha(new Error("formato")); i.src = u; });
  }
  function desenhaFoto(img, lado) {
    const k = Math.min(1, lado / Math.max(img.width, img.height)), w = Math.max(1, Math.round(img.width * k)), h = Math.max(1, Math.round(img.height * k));
    const cv = document.createElement("canvas"); cv.width = w; cv.height = h; const cx = cv.getContext("2d"); cx.imageSmoothingQuality = "high"; cx.drawImage(img, 0, 0, w, h); return cv;
  }
  const paraBlob = (cv, tipo, q) => new Promise(ok => cv.toBlob(ok, tipo, q));
  async function preparaFoto(file) {
    const img = await abreImagem(file); if (!img.width || !img.height) throw new Error("formato");
    let g = await paraBlob(desenhaFoto(img, 1200), "image/webp", 0.86), ext = "webp";
    if (!g || g.type !== "image/webp") { g = await paraBlob(desenhaFoto(img, 1200), "image/jpeg", 0.88); ext = "jpg"; }
    const p = await paraBlob(desenhaFoto(img, 480), ext === "webp" ? "image/webp" : "image/jpeg", 0.8);
    if (img.close) img.close(); return { g, p, ext };
  }
  function recebeFoto(file) {
    const ed = E.ed; if (!ed) return;
    if (!/^image\//.test(file.type) && !/\.(jpe?g|png|webp|heic|heif)$/i.test(file.name)) return aviso("Escolha um arquivo de foto (JPG, PNG ou WEBP).", { erro: true });
    const item = { prev: URL.createObjectURL(file), estado: "enviando", url: null }; ed.fotoNova = item; marcaSujo(true); desenhaEditor();
    (async () => {
      try {
        const { g, p, ext } = await preparaFoto(file);
        const id = ed.d.id || slug(ed.d.nome) || "novo";
        const nome = id + "/" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
        const urlG = await api.enviarFoto(nome + "-g." + ext, g); await api.enviarFoto(nome + "-p." + ext, p);
        item.url = urlG; item.estado = "ok"; ed.enviadas.push(urlG);
      } catch (er) { item.estado = "erro"; item.erro = er.message === "formato" ? (/hei[cf]$/i.test(file.name) ? "HEIC: no iPhone, envie como JPG" : "Arquivo não é uma foto válida") : er.message || "Não subiu"; }
      if (E.ed === ed) desenhaEditor();
    })();
  }
  function descartaEnvio(ed) { if (ed.enviadas.length) api.apagarFotos(ed.enviadas).catch(() => { }); ed.enviadas = []; }

  // ---------- salvar e excluir ----------
  let salvando = false;
  async function salva() {
    const ed = E.ed; if (!ed || salvando) return; const d = ed.d;
    const problema = (id, t) => { const el = $("#" + id); if (el) { el.classList.add("invalido"); el.focus(); el.scrollIntoView({ block: "center", behavior: "smooth" }); } aviso(t, { erro: true }); return false; };
    if (ed.fotoNova && ed.fotoNova.estado === "erro") return aviso("A foto não subiu. Escolha outra ou volte para a foto do site.", { erro: true });
    if (d.nome.trim().length < 2) return problema("c-nome", "Informe o nome do produto.");
    if (ed.novo) { if (!/^[a-z0-9][a-z0-9-]{1,60}$/.test(d.id)) return problema("c-id", "Código inválido: use letras minúsculas, números e hífen."); if (E.lista.some(p => p.id === d.id)) return problema("c-id", "Já existe um produto com esse código."); }
    const fx = d.faixas.filter(t => t[0] || t[1]);
    for (let i = 0; i < fx.length; i++) { if (!(fx[i][0] >= 1)) { const el = $$("#faixas [data-fq]")[i]; if (el) el.classList.add("invalido"); return aviso("Informe a quantidade de cada faixa de preço.", { erro: true }); } if (!(fx[i][1] > 0)) { const el = $$("#faixas [data-fp]")[i]; if (el) el.classList.add("invalido"); return aviso("Informe o preço de cada faixa (ou tire a faixa).", { erro: true }); } }
    const ord = fx.slice().sort((a, b) => a[0] - b[0]);
    for (let i = 1; i < ord.length; i++) if (ord[i][0] === ord[i - 1][0]) return aviso("Duas faixas com a mesma quantidade. Ajuste uma delas.", { erro: true });
    if (ord.length && ord[0][0] !== d.min) { const r = await dialogo({ titulo: "Primeira faixa diferente do mínimo", texto: `A primeira faixa começa em ${num(ord[0][0])} un, mas o mínimo é ${num(d.min)} un. Quer que a primeira faixa comece no mínimo?`, botoes: [{ texto: "Deixar assim", valor: "nao" }, { texto: "Ajustar a faixa", classe: "btn-azul", valor: "sim" }] }); if (r === null) return; if (r === "sim") ord[0][0] = d.min; }
    const b = $("#b-salvar"); salvando = true; b.classList.add("carregando"); b.disabled = true;
    try {
      if (ed.fotoNova && ed.fotoNova.estado === "enviando") { $("#estado").textContent = "Terminando de enviar a foto…"; await new Promise(ok => { const t = setInterval(() => { if (!ed.fotoNova || ed.fotoNova.estado !== "enviando") { clearInterval(t); ok(); } }, 200); }); if (ed.fotoNova && ed.fotoNova.estado === "erro") throw new Error("A foto não subiu. Escolha outra ou volte para a foto do site."); }
      const foto = ed.fotoNova && ed.fotoNova.url ? ed.fotoNova.url : d.foto;
      const est = {}; Object.keys(d.estoque).forEach(k => { if ((d.cores.length ? d.cores.includes(k) : k === "_") && d.estoque[k] !== "" && d.estoque[k] !== null) est[k] = +d.estoque[k]; });
      const reg = { cat: d.cat, cat_catalogo: d.cat_catalogo || null, nome: d.nome.trim(), sub: d.sub.trim(), descricao: d.descricao.trim(), specs: d.specs.trim(), cores: d.cores, esgotadas: d.esgotadas.filter(k => d.cores.includes(k)), estoque: est, min: d.min, faixas: ord, ativo: d.ativo, ordem: d.ordem, foto: foto || null };
      const r = ed.novo ? await api.criar(Object.assign({ id: d.id }, reg)) : await api.alterar(d.id, reg);
      const x = linha(r); const i = E.lista.findIndex(y => y.id === x.id); if (i >= 0) E.lista[i] = x; else E.lista.push(x);
      const sobra = ed.removidas.filter(u => u !== reg.foto); if (ed.orig && ed.orig.foto && ed.orig.foto !== reg.foto) sobra.push(ed.orig.foto); if (sobra.length) api.apagarFotos(sobra).catch(() => { });
      ed.enviadas = ed.enviadas.filter(u => u !== reg.foto); descartaEnvio(ed);
      ed.sujo = false; salvando = false;
      aviso(x.ativo ? `${x.nome} ${ed.novo ? "publicado" : "salvo"}. O site já mostra a versão nova.` : `${x.nome} salvo (oculto do site).`, x.ativo ? { link: ["Ver no site", linkSite(x.id)], tempo: 7000 } : {});
      E.ed = null; vai("");
    } catch (er) {
      salvando = false; if (b) { b.classList.remove("carregando"); b.disabled = false; } marcaSujo();
      if (er.sessao) { aviso(er.message + " As alterações deste produto não foram salvas.", { erro: true }); return telaEntrada(er.message); }
      aviso(er.message, { erro: true, tempo: 9000 });
    }
  }
  async function excluir(p) {
    const r = await dialogo({ titulo: `Excluir ${p.nome}?`, foto: fotoProd(p, "p"), texto: `O produto some do site e do painel. Não dá para desfazer pelo painel.<br><br>Se for só por um tempo, prefira <b>ocultar do site</b>: ele sai do catálogo e continua guardado aqui.`, botoes: [{ texto: "Cancelar", valor: null, esq: true }, ...(p.ativo ? [{ texto: "Ocultar do site", valor: "ocultar" }] : []), { texto: "Excluir de vez", classe: "btn-perigo", valor: "excluir" }] });
    if (r === "ocultar") { if (E.ed) E.ed.sujo = false; await alternaVisivel(p, false); E.ed = null; vai(""); return; }
    if (r !== "excluir") return;
    try {
      await api.excluir(p.id); if (p.foto) api.apagarFotos([p.foto]).catch(() => { });
      E.lista = E.lista.filter(y => y.id !== p.id); aviso(`${p.nome} excluído.`);
      if (E.ed) E.ed.sujo = false; E.ed = null; vai("");
    } catch (er) { trataErro(er); }
  }

  // =====================================================================
  // início
  // =====================================================================
  async function iniciaSessao() {
    app.innerHTML = casca('<div class="carregando-tela" role="status" aria-label="Carregando os produtos"></div>', ""); ligaCasca();
    try {
      const eq = await api.equipe();
      if (!eq || !eq.length) return telaSemAcesso();
      E.equipe = eq[0];
      const [cat, lista, cfg, core] = await Promise.all([catalogo(), api.listar(), api.config(), import("/xbz/core.js").catch(() => null)]);
      E.core = core;
      E.cats = cat.categorias || []; E.coresBase = cat.cores || {};
      E.cfg = {}; (cfg || []).forEach(c => { E.cfg[c.chave] = c.valor; });
      E.cores = Object.assign({}, E.coresBase, E.cfg.cores || {});
      E.lista = (lista || []).map(linha); E.carregou = true;
      rota();
    } catch (er) {
      if (er.sessao || er.status === 401) return telaEntrada(er.sessao ? er.message : "Sua sessão terminou. Entre de novo.");
      app.innerHTML = casca(`<div class="vazio">${I.alerta}<h3>Não foi possível carregar os produtos.</h3><p>${esc(er.message)}</p><p><button class="btn btn-azul" type="button" id="b-tenta">Tentar de novo</button></p></div>`, ""); ligaCasca();
      $("#b-tenta").addEventListener("click", iniciaSessao);
    }
  }
  function inicio() {
    const h = new URLSearchParams(location.hash.slice(1));
    if (h.get("error") || h.get("error_description")) {
      history.replaceState(null, "", location.pathname + location.search);
      return telaEntrada(/expired|invalid/i.test(h.get("error_description") || h.get("error_code") || "") ? "O link expirou ou já foi usado. Peça um novo em \"Esqueci minha senha\"." : "Não foi possível abrir o link do e-mail. Peça um novo em \"Esqueci minha senha\".");
    }
    if (h.get("access_token")) {
      let email = ""; try { email = JSON.parse(atob(h.get("access_token").split(".")[1].replace(/-/g, "+").replace(/_/g, "/"))).email || ""; } catch (e) { }
      salvaSessao({ access_token: h.get("access_token"), refresh_token: h.get("refresh_token"), expires_in: h.get("expires_in"), expires_at: Number(h.get("expires_at")) || 0, user: { email } });
      const tipo = h.get("type"); history.replaceState(null, "", location.pathname + location.search);
      if (tipo === "recovery" || tipo === "invite") return telaNovaSenha(tipo);
      return iniciaSessao();
    }
    if (!sessao) return telaEntrada();
    iniciaSessao();
  }
  window.KhausPainel = { E, api, versao: 2, S, DEMO, SITE_PUB, app, $, $, esc, sem, BRL, num, I, casca, ligaCasca, rest, token, renova, aviso, dialogo, mostraErroDialogo, trataErro, dataBR };
  inicio();
})();
