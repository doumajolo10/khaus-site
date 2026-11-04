// Núcleo da integração com a XBZ: transforma a lista da API (uma linha por cor)
// no catálogo público do site, sem o custo. Roda igual no Node (testes) e no Deno (função do Supabase).

export const CDN = "https://cdn.xbzbrindes.com.br/img/produtos/";

// Regras de preço padrão. A Khaus troca tudo isso no painel.
export const REGRAS_PADRAO = {
  multiplicador: 1.8,      // preço = custo × multiplicador + acréscimo
  acrescimo: 3,            // R$ por unidade (gravação, embalagem…)
  minimo: 10,              // quantidade mínima padrão
  faixas: [[10, 0], [50, 4], [100, 8], [250, 12], [500, 16]], // [a partir de X un., % de desconto]
  final90: true,           // acima de R$ 10, termina em ,90
  categorias: {},          // { idCategoria: { multiplicador, acrescimo, minimo } }
  demo: true,              // mostra "valores de demonstração" até a Khaus confirmar
  esconderSemEstoque: false
};

// Categorias do site. A ordem importa: a primeira regra que bate decide.
export const CATEGORIAS = [
  ["termicas", "Bolsas e caixas térmicas", /\b(bolsa|caixa|sacola|mochila|lancheira|bag)\b.*\btermic|\bcooler\b|\blancheira\b/],
  ["chimarrao", "Chimarrão e tererê", /\bcuia\b|chimarr|terere|bomba (de )?chimarr/],
  ["guarda-chuva", "Guarda-chuvas", /guarda[- ]?chuva|sombrinha|capa de chuva|guarda[- ]?sol|^kit chuva/],
  ["canetas", "Canetas e lápis", /^(kit |conjunto |estojo |pacote )?(de |com )?(\d+ )?(pcs |pecas )?(caneta|canetinha|lapis|lapiseira|marca[- ]texto|giz)|^caneta|^lapis|^lapiseira|^pacote.*caneta/],
  ["chaveiros", "Chaveiros", /^chaveiro|^kit chaveiro/],
  ["canecas", "Canecas e xícaras", /^(kit |jogo |conjunto )?(de )?(\d+ )?(caneca|xicara)/],
  ["copos", "Copos e taças", /^(kit |jogo |conjunto )?(de )?(\d+ )?(copo|taca|tacas|copos)\b|^copo/],
  ["garrafas", "Garrafas e squeezes", /^(kit )?(\d+ )?(garrafa|squeeze|garrafinha|frasco|coqueteleira|galao|cantil)|^capa (para |de )?garrafa/],
  ["churrasco", "Churrasco e tábuas", /churras|^(kit |jogo )?(de )?tabua|petisqueir|espeto|faca|queijo|trinchante|porta[- ]pratos|chaira/],
  ["bar", "Bar e vinho", /vinho|saca[- ]?rolha|abridor|cerveja|whisky|drink|\bbar\b|porta[- ]?(copo|lata|long|garrafa)|balde|gelo|bebida|chopp|dosador|decanter|aerador/],
  ["cozinha", "Cozinha e marmitas", /marmita|\bpote|chaleira|cafeteir|moedor|tigela|bandeja|cozinha|avental|lanche|descanso|jogo americano|ralador|espatula|utensil|pegador|porta[- ]tempero|potes|prato|talher|garfo|colher|tampa|escorredor|leiteira|panela|cuscuz|pipoca|french press|filtro de cafe|jarra|misturador|processador|mixer|liquidific|^kit cafe/],
  ["pet", "Linha pet", /\bpet\b|pet'?s|cachorro|gato|comedouro|coleira/],
  ["necessaires", "Nécessaires e beleza", /necessaire|frasqueira|porta[- ]?(joias|joia|comprimido|maquiagem|escova|relogio|relogios|batom|perfume)|manicure|espelho|escova|pente|maquiagem|maquagem|cosmetic|higiene|massageador|cuidado|lixa|pinca|kit banho|toalha de rosto|sabonete|hidratante|protetor (labial|solar)|organizadora de cosm|cortar cabelo|barbeador|secador|^kit costura/],
  ["bolsas", "Mochilas, bolsas e sacolas", /mochila|bolsa|sacola|sacochila|\bmala\b|pochete|ecobag|\bbag\b|maleta|porta[- ]?tenis|carteira|\btote\b|saco de|mala de|shoulder|tiracolo|porta[- ]?documento|porta[- ]?passaporte|necessario|bagagem/],
  ["tecnologia", "Tecnologia", /pen ?drive|memoria|carcaca|\bfone|headset|caixa de som|caixinha de som|som bluetooth|power ?bank|carregador|\bcabo\b|adaptador|smartwatch|suporte.*(celular|notebook|tablet)|porta celular|ventosa para celular|carregamento|microfone|\bhub\b|mouse(?! ?pad)|teclado|bluetooth|usb|webcam|ring light|iluminador|camera de celular|pop socket|carga|bateria|controle|relogio (de pulso|smart)|tripe|selfie|capa (de |para )?celular/],
  ["escritorio", "Escritório e cadernos", /caderno|caderneta|agenda|bloco|planner|pasta|porta[- ]?(caneta|lapis|cartao|cracha|clips|objeto|retrato|papel)|mouse ?pad|desk ?pad|calendario|regua|calculadora|organizador|cracha|cordao|risque|lousa|marcador|marca[- ]?pagina|ampulheta|post[- ]?it|clips|livro|papel|fichario|prancheta|grampeador|apontador|borracha|tesoura|estojo|kit escritorio|kit executivo|conjunto executivo|porta[- ]?retrato|adesivo|sticky|bloquinho|anotac/],
  ["vestuario", "Bonés e vestuário", /^bone\b|^chapeu|^camiseta|^viseira|^bandana|^gorro|^touca|^cachecol|^meia\b|^jaqueta|^colete/],
  ["brinquedos", "Brinquedos e diversão", /miniatura|pelucia|anti[- ]?e?stress|antiestresse|squishy|brinquedo|\bespada\b|globo de neve|ioio|peteca|baralho|domino|quebra[- ]cabeca|cata[- ]?vento|massinha|pintar|colorir|lancador|boneco|\bjogo de (cartas|dardos|tabuleiro)|fusca|helicoptero|\barma\b|bolinha|^kit (de )?canetinha/],
  ["casa", "Casa e bem-estar", /umidificador|difusor|luminaria|abajur|\bled\b|pisca|cascata|fio de fada|home spray|cesto|vela|almofada|toalha|manta|relogio|enfeite|tapete|aromatiz|climatizador|ventilador|cobertor|travesseiro|porta[- ]?vela|vaso|plaquinha|placa|decora|quadro|porta[- ]?chaves|cabide|balanca|termometro|esteira/],
  ["ferramentas", "Ferramentas e canivetes", /canivete|trena|ferrament|mosquet|lanterna|alicate|fita metrica|chave (de )?teste|jardinagem|multiuso|chave (philips|fenda)|kit reparo|martelo|estilete|nivel|elastico extensor/],
  ["carro", "Acessórios para carro", /carro|veicular|automotiv|para-sol|parasol|lixocar|aspirador/],
  ["esporte", "Esporte e lazer", /\bbola\b|frisbee|\bjogo\b|munhequeira|bracadeira|toalha esport|corda|esporte|yoga|academia|praia|cadeira|mesa portatil|guarda[- ]?volume|boia|leque|pulseira|bracelete|oculos|apito|bicicleta|camping/],
  ["embalagens", "Embalagens e presentes", /embalagem|caixa (para presente|presente|kraft|papelao|de papel|mdf|madeira)|saquinho|sacolinha|\btag\b|fita|laco|papel de presente|envelope|caixinha|lata|^case\b/],
  ["kits", "Kits e presentes", /^kit|^conjunto|^jogo|^box/]
];

export const CAT_NOME = Object.fromEntries(CATEGORIAS.map(c => [c[0], c[1]]));
CAT_NOME.outros = "Outros";

export function semAcento(s) {
  return String(s || "").normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}

export function categoria(nome) {
  const n = semAcento(nome).replace(/\s+/g, " ").trim();
  for (const [id, , re] of CATEGORIAS) if (re.test(n)) return id;
  return "outros";
}

// Palavras que ficam em minúsculas no meio do nome
const MINUSC = new Set(["de", "da", "do", "das", "dos", "e", "em", "com", "sem", "para", "a", "o", "as", "os", "no", "na", "nos", "nas", "por", "ou", "x"]);
// Siglas e unidades que mantêm a grafia
const SIGLAS = { usb: "USB", pu: "PU", pp: "PP", pvc: "PVC", eva: "EVA", led: "LED", rpet: "rPET", tws: "TWS", pet: "PET", abs: "ABS", mdf: "MDF", a4: "A4", a5: "A5", a6: "A6", tnt: "TNT", rgb: "RGB", gb: "GB", ml: "ml", l: "L", cm: "cm", mm: "mm", kg: "kg", g: "g", v: "V", w: "W", mah: "mAh", epi: "EPI", tipo: "tipo" };

export function nomeBonito(nome) {
  let s = String(nome || "").replace(/\s+/g, " ").trim();
  // abreviações da XBZ
  s = s.replace(/\bC\/\s*/gi, "com ").replace(/\bS\/\s*/gi, "sem ").replace(/\bP\/\s*/gi, "para ")
       .replace(/\bDET\.\s*/gi, "detalhe ").replace(/\bPET`S\b/gi, "pets").replace(/\s+-\s+/g, " - ").replace(/\s{2,}/g, " ").trim();
  const partes = s.toLowerCase().split(" ");
  return partes.map((p, i) => {
    const m = p.match(/^(\d+(?:[.,]\d+)?)([a-z]+)$/i); // 700ml, 4gb, 26l
    if (m) return m[1] + (SIGLAS[m[2]] || m[2]);
    if (SIGLAS[p] && p !== "tipo" && !(p === "l" || p === "g" || p === "x")) return SIGLAS[p];
    if (i > 0 && MINUSC.has(p)) return p;
    if (/^\d/.test(p)) return p;
    return p.replace(/^(\p{L})/u, c => c.toUpperCase()).replace(/-(\p{L})/gu, (a, c) => "-" + c.toUpperCase());
  }).join(" ").replace(/\bPorta-(\p{L})/gu, (a, c) => "Porta-" + c.toLowerCase());
}

export function corBonita(c) {
  const s = String(c || "").trim().toLowerCase();
  if (!s) return "Única";
  return s.replace(/(^|\s)(\p{L})/gu, (a, b, d) => b + d.toUpperCase());
}

// Guarda só o final da URL quando a foto está no CDN padrão (economiza ~40% do arquivo)
export function imagem(link) {
  if (!link) return "";
  const m = String(link).match(/^https?:\/\/(?:cdn|www)\.xbzbrindes\.com\.br\/img\/produtos\/\d\/(.+\.(?:jpe?g|png|webp|gif))$/i);
  if (m) return m[1];
  return /\.(jpe?g|png|webp|gif)$/i.test(link) ? String(link) : "";
}

function tipoDoCodigo(cod) {
  if (/^P[@$]/i.test(cod)) return "P"; // ponta de estoque
  if (/^E[@_-]/i.test(cod)) return "E"; // edição limitada
  if (/^O[@]/i.test(cod)) return "O";   // outlet
  return "";
}

export function regrasDe(regras, cat) {
  const r = Object.assign({}, REGRAS_PADRAO, regras || {});
  const c = (r.categorias || {})[cat] || {};
  return {
    multiplicador: num(c.multiplicador, r.multiplicador),
    acrescimo: num(c.acrescimo, r.acrescimo),
    minimo: Math.max(1, Math.round(num(c.minimo, r.minimo))),
    final90: !!r.final90
  };
}

function num(v, padrao) { const n = Number(v); return v === "" || v == null || !isFinite(n) ? padrao : n; }

export function precoVenda(custo, regra) {
  let v = custo * regra.multiplicador + regra.acrescimo;
  if (!(v > 0)) return 0;
  if (regra.final90 && v >= 10) v = Math.floor(v) + 0.9 >= v ? Math.floor(v) + 0.9 : Math.floor(v) + 1.9;
  else v = Math.ceil(v * 100 - 1e-6) / 100;
  return Math.round(v * 100) / 100;
}

// Agrupa as linhas da API por produto (CodigoAmigavel)
export function agrupa(linhas) {
  const g = new Map();
  for (const l of linhas || []) {
    const k = String(l.CodigoAmigavel || "").trim();
    if (!k) continue;
    if (!g.has(k)) g.set(k, []);
    g.get(k).push(l);
  }
  return g;
}

// Versão enxuta e privada (com custo), guardada para o painel e para recalcular preços sem gastar consulta
export function enxuga(linhas) {
  const out = [];
  for (const [cod, ls] of agrupa(linhas)) {
    const base = ls[0];
    out.push({
      cod,
      nome: String(base.Nome || "").trim(),
      desc: String((ls.find(l => l.Descricao) || base).Descricao || "").trim(),
      ncm: base.Ncm || "",
      med: [base.Altura || 0, base.Largura || 0, base.Profundidade || 0, base.Peso || 0],
      ponta: ls.some(l => l.PontaDeEstoque) || /PONTA/i.test(base.WebTipo || ""),
      v: ls.map(l => ({
        sku: l.CodigoXbz, comp: l.CodigoComposto, cor: String(l.CorWebPrincipal || "").trim(),
        cor2: String(l.CorWebSecundaria || "").trim(), img: imagem(l.ImageLink),
        custo: Number(l.PrecoVenda) || 0, est: Math.max(0, Number(l.QuantidadeDisponivel) || 0),
        rep: String(l.ReposicaoDataPrevista || "").startsWith("0001") ? "" : String(l.ReposicaoDataPrevista || "").slice(0, 10)
      }))
    });
  }
  return out;
}


// Produto que representa cada categoria (capa): o mais vendável pelo nome, com mais estoque.
const CAPA = {
  termicas: /bolsa termica|caixa termica|cooler/, chimarrao: /cuia/, "guarda-chuva": /guarda[- ]chuva automatico|guarda[- ]chuva/,
  canetas: /caneta metal/, chaveiros: /chaveiro (de )?metal|abridor/, canecas: /caneca (termica|inox|ceramica)/, copos: /copo termico/,
  garrafas: /garrafa termica/, churrasco: /kit churrasco|tabua/, bar: /kit vinho|kit caipirinha|kit bar/, cozinha: /marmita|kit cafe/,
  pet: /comedouro|tigela pet|pet/, necessaires: /necessaire/, bolsas: /mochila/, tecnologia: /caixa de som|power ?bank|fone/,
  escritorio: /caderno/, vestuario: /bone/, brinquedos: /pelucia|jogo|squishy/, casa: /luminaria|umidificador|difusor/,
  ferramentas: /canivete|kit ferramenta/, carro: /suporte|carro/, esporte: /bola|garrafa|toalha/, embalagens: /caixa/, kits: /^kit/
};
export function capaDe(produtos, cat) {
  const re = CAPA[cat];
  let melhor = null, quase = null;
  for (const x of produtos) {
    if (x.c !== cat || !(x.e > 0) || x.t) continue;
    if (!quase || x.e > quase.e) quase = x;
    if (re && re.test(semAcento(x.n)) && (!melhor || x.e > melhor.e)) melhor = x;
  }
  return melhor || quase;
}

// Catálogo público (sem custo). ajustes = { cod: {categoria, oculto, destaque, nome, multiplicador, acrescimo, minimo} }
export function montaCatalogo(enxuto, regras, ajustes, quando) {
  const R = Object.assign({}, REGRAS_PADRAO, regras || {});
  const aj = ajustes || {};
  const p = [], desc = {}, contagem = {};
  for (const it of enxuto) {
    const a = aj[it.cod] || {};
    if (a.oculto) continue;
    const vars = it.v.filter(v => v.custo > 0);
    if (!vars.length) continue;
    // cor sem foto usa a foto de outra cor do mesmo produto
    const fotoQualquer = (vars.find(v => v.img) || {}).img || "";
    if (!fotoQualquer) continue;
    const nome = a.nome || nomeBonito(it.nome);
    const cat = a.categoria && (CAT_NOME[a.categoria]) ? a.categoria : categoria(it.nome);
    const regra = regrasDe(R, cat);
    if (a.multiplicador != null && a.multiplicador !== "") regra.multiplicador = Number(a.multiplicador);
    if (a.acrescimo != null && a.acrescimo !== "") regra.acrescimo = Number(a.acrescimo);
    if (a.minimo) regra.minimo = Math.max(1, Math.round(Number(a.minimo)));
    const custo = Math.min(...vars.map(v => v.custo));
    const preco = precoVenda(custo, regra);
    const estoque = vars.reduce((s, v) => s + v.est, 0);
    if (R.esconderSemEstoque && !estoque && !vars.some(v => v.rep)) continue;
    // cores repetidas (mesmo nome) viram uma só, somando estoque
    const cores = [];
    const porCor = new Map();
    for (const v of vars) {
      const nomeCor = corBonita(v.cor === "COLORIDO" && v.cor2 && v.cor2 !== v.cor ? v.cor2 : v.cor);
      const ja = porCor.get(nomeCor);
      if (ja) { ja[2] += v.est; if (!ja[1] && v.img) ja[1] = v.img; if (!ja[3] || (v.rep && v.rep < ja[3])) ja[3] = ja[3] || v.rep; continue; }
      const linha = [nomeCor, v.img || fotoQualquer, v.est, v.est > 0 ? "" : v.rep, v.comp || v.sku];
      porCor.set(nomeCor, linha); cores.push(linha);
    }
    cores.sort((x, y) => (y[2] > 0) - (x[2] > 0));
    const prod = {
      i: it.cod, n: nome, c: cat, p: preco, m: regra.minimo, e: estoque,
      k: cores, t: tipoDoCodigo(it.cod) || (it.ponta ? "P" : ""),
      d: it.med.some(x => x > 0) ? it.med : 0
    };
    if (a.destaque) prod.h = 1;
    p.push(prod);
    if (it.desc) desc[it.cod] = it.desc;
    contagem[cat] = (contagem[cat] || 0) + 1;
  }
  // produtos com estoque primeiro, depois destaque, depois nome
  p.sort((x, y) => (y.h || 0) - (x.h || 0) || ((y.e > 0) - (x.e > 0)) || x.n.localeCompare(y.n, "pt-BR"));
  const cats = CATEGORIAS.map(c => c[0]).concat("outros").filter(id => contagem[id]).map(id => [id, CAT_NOME[id], contagem[id]]);
  const capa = {};
  for (const [id] of cats) { const x = capaDe(p, id); if (x) capa[id] = x; }
  const v = quando || new Date().toISOString();
  return {
    catalogo: { v, cdn: CDN, faixas: R.faixas, demo: !!R.demo, cats, p },
    descricoes: desc,
    resumo: { v, total: p.length, cats: cats.map(([id, nome, n]) => [id, nome, n, capa[id] ? (capa[id].k.find(k => k[2] > 0) || capa[id].k[0])[1] : ""]) }
  };
}
