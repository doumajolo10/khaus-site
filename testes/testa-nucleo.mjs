// Testa o núcleo da integração (xbz/core.js) com o retrato real da XBZ em dados/enxuto.json.
// Uso: node testes/testa-nucleo.mjs
import fs from "fs";
import * as C from "../xbz/core.js";
let falhas = 0; const ok = (c, m) => { if (c) console.log("  ok  " + m); else { falhas++; console.log("  FALHA " + m); } };
const en = JSON.parse(fs.readFileSync(new URL("../dados/enxuto.json", import.meta.url), "utf8"));
const base = C.montaCatalogo(en, {}, {});
const copo = base.catalogo.p.find(x => x.i === "19114");
ok(copo && copo.p === C.precoVenda(36.5, C.regrasDe({}, "copos")), "preço pela regra geral: " + (copo && copo.p));
const r = C.montaCatalogo(en, { categorias: { canetas: { minimo: 50 } } }, { "19114": { preco: 59.9 }, "09453": { oculto: true } });
ok(r.catalogo.p.find(x => x.i === "19114").p === 59.9, "preço manual de um produto vale no catálogo");
ok(!r.catalogo.p.some(x => x.i === "09453"), "produto oculto sai do catálogo");
ok(r.catalogo.p.filter(x => x.c === "canetas").every(x => x.m === 50), "quantidade mínima da categoria vale em todas as canetas");
ok(r.catalogo.p.filter(x => x.c === "copos").every(x => x.m === 10), "as outras categorias continuam com o mínimo geral");
const r2 = C.montaCatalogo(en, { categorias: { canetas: { minimo: 50 } } }, { "09453": { minimo: 200 } });
ok(r2.catalogo.p.find(x => x.i === "09453").m === 200, "mínimo próprio do produto vence o da categoria");
ok(r.resumo.emEstoque === r.catalogo.p.filter(x => x.e > 0).length && r.resumo.emEstoque < r.resumo.total, "resumo traz quantos têm estoque (" + r.resumo.emEstoque + ")");
console.log(falhas ? "\n" + falhas + " FALHA(S)" : "\nTudo certo."); process.exit(falhas ? 1 : 0);
