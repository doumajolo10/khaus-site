// Ajusta o CSS do painel (copiado do painel da Kiesel) para a marca da Khaus e acrescenta os elementos novos.
// Uso: node ferramentas/tema-painel.js  (roda uma vez depois de copiar; é seguro rodar de novo)
const fs = require("fs"), path = require("path");
const F = path.join(__dirname, "..", "painel", "painel.css");
let c = fs.readFileSync(F, "utf8");
if (c.includes("/* KHAUS */")) { console.log("já aplicado"); process.exit(0); }
c = c.replace("/* Kiesel · Painel de imóveis. Mesma família visual do site: branco, cinza-azulado, azul da marca só em ação. */",
  "/* Khaus · Painel de produtos e estoque. Base visual do painel da Kiesel com as cores e fontes da Khaus. */");
const tokens = `/* KHAUS */
@font-face{font-family:'Outfit';font-style:normal;font-weight:400 700;font-display:swap;src:url(/fonts/Outfit-latin-8.woff2) format('woff2');unicode-range:U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD}
@font-face{font-family:'Outfit';font-style:normal;font-weight:400 700;font-display:swap;src:url(/fonts/Outfit-latin-ext-7.woff2) format('woff2');unicode-range:U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF}
@font-face{font-family:'Archivo';font-style:normal;font-weight:500 900;font-stretch:100% 125%;font-display:swap;src:url(/fonts/Archivo-latin-2.woff2) format('woff2');unicode-range:U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD}
@font-face{font-family:'Chivo Mono';font-style:normal;font-weight:400 500;font-display:swap;src:url(/fonts/ChivoMono-latin-4.woff2) format('woff2')}
:root{
  --fundo:#F4F5F8; --fundo-2:#ECEEF3; --borda:#E2E3EC; --borda-2:#CDD0DC;
  --tinta:#0F1117; --tinta-2:#464A5E; --tinta-3:#626677;
  --azul:#0F1117; --azul-2:#000000; --azul-3:#E5F6EF; --marinho:#0F1117;
  --menta:#6AD4AE; --menta-d:#0B7A57;
  --sans:'Outfit',system-ui,'Helvetica Neue',Arial,sans-serif; --titulo:'Archivo','Outfit',system-ui,sans-serif; --mono:'Chivo Mono',ui-monospace,monospace;
}
h1,h2{font-family:var(--titulo);font-stretch:112%;letter-spacing:-.01em}
:focus-visible{outline-color:var(--menta-d)}
::selection{background:var(--menta);color:#0F1117}
a{color:var(--menta-d)}
.ent:focus{border-color:var(--menta-d);box-shadow:0 0 0 3px rgba(106,212,174,.32)}
.passo:focus-within{border-color:var(--menta-d);box-shadow:0 0 0 3px rgba(106,212,174,.32)}
.ficha[aria-pressed="true"]{background:var(--azul-3);border-color:var(--menta-d);color:var(--menta-d)}
.entrada-marca{background:#0F1117}
.entrada-marca .rotulo-marca{color:var(--menta)}
.entrada-marca li .ic{color:var(--menta)}
.entrada-marca .placa-logo img{width:170px}
.entrada-cartao .logo{width:190px}
.entrada-cartao .link{color:var(--menta-d)}
.topo .marca img{width:104px}
.topo .marca span{font-family:var(--mono);font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:var(--tinta-3)}
.avatar{background:#0F1117;color:var(--menta)}
.aviso svg{color:var(--menta)}
.aviso a{color:var(--menta)}
.solta:hover,.solta.sobre{border-color:var(--menta-d);background:var(--azul-3)}
.solta svg{color:var(--menta-d)}
.lista-ok li.ok i{background:var(--menta-d);border-color:var(--menta-d)}
.etiqueta.et-ok{background:var(--verde-3);color:var(--verde)}
.etiqueta.et-baixo{background:var(--ambar-3);color:var(--ambar)}
.etiqueta.et-esgotado{background:var(--vermelho-3);color:var(--vermelho)}
.etiqueta.et-livre{background:var(--fundo-2);color:var(--tinta-2)}
.etiqueta.et-livre::before{opacity:.5}
/* abas do topo */
.abas{display:flex;gap:4px;margin-left:8px}
.abas a{display:inline-flex;align-items:center;gap:8px;min-height:40px;padding:0 12px;border-radius:9px;color:var(--tinta-2);text-decoration:none;font-weight:600;font-size:14px}
.abas a:hover{background:var(--fundo-2);color:var(--tinta)}
.abas a[aria-current="page"]{background:#0F1117;color:#fff}
.abas a[aria-current="page"] svg{color:var(--menta)}
.abas svg{width:18px;height:18px}
/* faixa de aviso */
.faixa-aviso{display:flex;gap:10px;align-items:flex-start;margin-bottom:18px;padding:12px 14px;border-radius:12px;background:var(--ambar-3);color:#6b4100;font-size:14px}
.faixa-aviso svg{width:18px;height:18px;flex:none;margin-top:2px}
.faixa-aviso a{color:#6b4100;font-weight:600}
/* cartões de produto */
.cartao .foto{background:#fff;aspect-ratio:1/1}
.cartao .foto img{object-fit:contain;padding:14px}
.cartao .foto img.sem{opacity:.25;padding:30%}
.cartao .ref{background:rgba(15,17,23,.82)}
.cartao .preco small{font-size:12px;font-weight:500;color:var(--tinta-3)}
.cartao .semp,.previa .semp{font-size:14px;font-weight:600;color:var(--tinta-3)}
.cores{display:flex;flex-wrap:wrap;gap:5px;margin-top:6px;align-items:center}
.cores i{width:14px;height:14px;border-radius:50%;background:var(--c);box-shadow:inset 0 0 0 1px rgba(0,0,0,.14)}
.cores i.out{position:relative;opacity:.4}
.cores i.out::after{content:"";position:absolute;left:-2px;right:-2px;top:50%;height:1.5px;background:#B42318;transform:rotate(-45deg)}
.cores small{font-size:12px;color:var(--tinta-3)}
.link{background:none;border:0;padding:0;color:var(--menta-d);font-weight:600;cursor:pointer;text-decoration:underline}
/* tabela de estoque */
.tabela-est{background:#fff;border:1px solid var(--borda);border-radius:14px;overflow:hidden}
.te-cab,.te-linha{display:grid;grid-template-columns:minmax(0,2.2fr) minmax(0,1.2fr) 150px 110px;gap:12px;align-items:center;padding:8px 16px}
.te-cab{background:var(--fundo);font-size:12px;font-weight:600;color:var(--tinta-3);text-transform:uppercase;letter-spacing:.06em}
.te-linha{border-top:1px solid var(--borda)}
.te-linha:not(.primeira){border-top-color:transparent;padding-top:2px}
.te-linha.oculto .te-prod a{color:var(--tinta-3)}
.te-prod{display:flex;align-items:center;gap:10px;min-width:0}
.te-prod img{width:40px;height:40px;object-fit:contain;border-radius:8px;background:var(--fundo);flex:none}
.te-prod a{color:var(--tinta);font-weight:600;text-decoration:none;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.te-prod a:hover{color:var(--menta-d);text-decoration:underline}
.te-cor{display:flex;align-items:center;gap:8px;font-size:14px;color:var(--tinta-2);min-width:0}
.te-cor i{width:16px;height:16px;border-radius:50%;background:var(--c);flex:none;box-shadow:inset 0 0 0 1px rgba(0,0,0,.14)}
.te-linha .ent{min-height:38px;padding:6px 10px;text-align:right}
.te-st{display:inline-flex;align-items:center;gap:5px;font-size:12.5px;color:var(--tinta-3)}
.te-st svg{width:15px;height:15px}
.te-st.ok{color:var(--verde)}
.te-st.erro{color:var(--vermelho)}
/* editor */
.foto-ed{display:grid;grid-template-columns:220px minmax(0,1fr);gap:16px;align-items:stretch}
.foto-prev{position:relative;aspect-ratio:1/1;border-radius:14px;border:1px solid var(--borda);background:#fff;overflow:hidden}
.foto-prev img{width:100%;height:100%;object-fit:contain;padding:12px}
.foto-prev img.sem{opacity:.25;padding:30%}
.foto-prev .progresso{position:absolute;inset:0;display:grid;place-items:center;background:rgba(15,17,23,.55);color:#fff;font-weight:600;font-size:13px;text-align:center;padding:10px}
.foto-prev .progresso.erro{background:rgba(180,35,24,.82)}
.foto-acoes{display:flex;flex-direction:column;gap:10px}
.foto-acoes .solta{flex:1}
.sw-todas{display:flex;flex-wrap:wrap;gap:8px}
.sw{display:inline-flex;align-items:center;gap:8px;min-height:38px;padding:0 12px 0 8px;border:1px solid var(--borda-2);border-radius:999px;background:#fff;font-size:13.5px;font-weight:500;color:var(--tinta-2);cursor:pointer}
.sw i{width:20px;height:20px;border-radius:50%;background:var(--c);box-shadow:inset 0 0 0 1px rgba(0,0,0,.16)}
.sw[aria-pressed="true"]{border-color:var(--menta-d);background:var(--azul-3);color:var(--tinta);box-shadow:0 0 0 1px var(--menta-d) inset}
#est-cores{display:grid;gap:8px}
.est-l{display:grid;grid-template-columns:minmax(0,1fr) 140px auto;gap:12px;align-items:center;padding:8px 12px;border:1px solid var(--borda);border-radius:12px;background:var(--fundo)}
.est-l.sem-cor{grid-template-columns:minmax(0,1fr) 160px}
.est-l .ent{min-height:38px;padding:6px 10px;text-align:right;background:#fff}
.mini-check{display:inline-flex;align-items:center;gap:6px;font-size:13px;color:var(--tinta-2);cursor:pointer}
.mini-check input,.interruptor input{width:18px;height:18px;accent-color:var(--menta-d)}
.interruptor{display:flex;align-items:center;gap:10px;font-size:14.5px;color:var(--tinta);cursor:pointer}
.faixas{display:grid;gap:8px}
.faixa{display:grid;grid-template-columns:auto 110px auto auto 130px auto 40px;gap:8px;align-items:center;font-size:14px;color:var(--tinta-2)}
.faixa .pre{text-align:right;color:var(--tinta-3)}
.faixa .ent{min-height:40px;padding:6px 10px;text-align:right}
.previa .pfoto{background:#fff;aspect-ratio:1/1}
.previa .pfoto img{object-fit:contain;padding:14px}
.previa .pfoto img.sem{opacity:.25;padding:30%}
.previa .pcorpo .cores{margin:0 0 6px}
.previa .tipo{left:10px;right:auto;background:rgba(15,17,23,.82);color:#fff}
/* ajustes */
.pz-tab{display:grid;gap:8px}
.pz-cab,.pz-l{display:grid;grid-template-columns:minmax(0,1.4fr) 92px 92px 110px minmax(0,1fr) 40px;gap:8px;align-items:center}
.pz-cab{font-size:12px;font-weight:600;color:var(--tinta-3);text-transform:uppercase;letter-spacing:.06em}
.pz-l .ent{min-height:40px;padding:6px 10px}
.cores-extra{display:flex;flex-wrap:wrap;gap:8px}
.cores-extra .ficha i{width:14px;height:14px;border-radius:50%;background:var(--c)}
.cores-extra .ficha button{display:grid;place-items:center;width:22px;height:22px;border-radius:50%;margin-left:2px;color:var(--tinta-3)}
.cores-extra .ficha button svg{width:14px;height:14px}
.nova-cor{display:flex;gap:8px;align-items:center;flex-wrap:wrap;max-width:560px}
.nova-cor .ent{flex:1 1 220px}
.nova-cor input[type=color]{width:46px;height:44px;border:1px solid var(--borda-2);border-radius:8px;background:#fff;padding:3px;cursor:pointer}
.bloco>h2 svg{width:20px;height:20px;color:var(--menta-d)}
@media (max-width:900px){
  .abas{position:fixed;left:0;right:0;bottom:0;z-index:40;margin:0;justify-content:space-around;padding:6px 8px calc(6px + env(safe-area-inset-bottom));background:rgba(255,255,255,.96);border-top:1px solid var(--borda);backdrop-filter:blur(8px)}
  .abas a{flex:1;flex-direction:column;gap:2px;font-size:11.5px;min-height:48px;padding:4px;justify-content:center}
  .pagina{padding-bottom:110px}
  .rodape-ed{bottom:72px}
}
@media (max-width:720px){
  .te-cab{display:none}
  .te-linha{grid-template-columns:minmax(0,1fr) 110px;grid-template-areas:"p p" "c i" "s s";gap:6px 10px;padding:10px 12px}
  .te-linha:not(.primeira){grid-template-areas:"c i" "s s"}
  .te-prod{grid-area:p}.te-cor{grid-area:c}.te-linha>span:nth-child(3){grid-area:i}.te-st{grid-area:s}
  .te-linha:not(.primeira) .te-prod{display:none}
  .foto-ed{grid-template-columns:1fr}
  .foto-prev{max-width:240px}
  .est-l{grid-template-columns:minmax(0,1fr) 110px;}
  .est-l .mini-check{grid-column:1/-1}
  .faixa{grid-template-columns:auto minmax(0,1fr) auto;row-gap:6px}
  .faixa .pre{text-align:left}
  .pz-cab{display:none}
  .pz-l{grid-template-columns:1fr 1fr;padding:10px;border:1px solid var(--borda);border-radius:12px}
  .pz-l .ent[data-k="nome"],.pz-l .ent[data-k="tag"]{grid-column:1/-1}
}
`;
c = c + "\n" + tokens;
fs.writeFileSync(F, c);
console.log("ok", Math.round(c.length / 1024) + " KB");
