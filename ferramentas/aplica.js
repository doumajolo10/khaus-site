// Encaixa as extensões (fonte/khaus-ext.css e fonte/khaus-ext.js) no index.html publicado.
// Pode rodar quantas vezes quiser: troca o que está entre os marcadores. Uso: node ferramentas/aplica.js
const fs = require("fs"), path = require("path");
const R = path.join(__dirname, "..");
let h = fs.readFileSync(path.join(R, "index.html"), "utf8");
const css = fs.readFileSync(path.join(R, "fonte", "khaus-ext.css"), "utf8");
const js = fs.readFileSync(path.join(R, "fonte", "khaus-ext.js"), "utf8");
const CI = "<style id=\"kh-ext\">", CF = "</style><!--/kh-ext-->";
const JI = "/*KH-EXT-INICIO*/", JF = "/*KH-EXT-FIM*/";
// CSS antes do </head>
if (h.includes(CI)) h = h.slice(0, h.indexOf(CI)) + CI + "\n" + css + CF + h.slice(h.indexOf(CF) + CF.length);
else h = h.replace("</head>", () => CI + "\n" + css + CF + "\n</head>");
// JS no fim do script principal (o do DOMContentLoaded, que termina com "});" antes do </script>)
if (h.includes(JI)) h = h.slice(0, h.indexOf(JI)) + JI + "\n" + js + "\n" + JF + h.slice(h.indexOf(JF) + JF.length);
else {
  const marca = 'document.addEventListener("DOMContentLoaded",function(){';
  const ini = h.indexOf(marca); if (ini < 0) throw new Error("script principal não achado");
  const fimScript = h.indexOf("</script>", ini);
  const fecha = h.lastIndexOf("});", fimScript);
  if (fecha < ini) throw new Error("fim do DOMContentLoaded não achado");
  h = h.slice(0, fecha) + JI + "\n" + js + "\n" + JF + "\n" + h.slice(fecha);
}
fs.writeFileSync(path.join(R, "index.html"), h);
console.log("ok", Math.round(h.length / 1024) + " KB");
