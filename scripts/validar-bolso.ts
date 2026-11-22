// Valida as aventuras da Mesa de Bolso (content/mesa-de-bolso/*.json): schema, cenas alcançáveis,
// saídas que existem e todo caminho chegando a um final. Sai com erro se algo estiver quebrado.
// Roda no build (prebuild) e com `npm run validar:bolso`.
import fs from "node:fs";
import path from "node:path";
import { validarAventura } from "../src/lib/bolso/conteudo";

const pasta = path.join(process.cwd(), "content", "mesa-de-bolso");
const arquivos = fs.existsSync(pasta) ? fs.readdirSync(pasta).filter((f) => f.endsWith(".json")) : [];
let erros = 0;

for (const f of arquivos) {
  const { problemas, aventura } = validarAventura(JSON.parse(fs.readFileSync(path.join(pasta, f), "utf8")));
  if (aventura && aventura.slug !== f.replace(/\.json$/, "")) problemas.push(`o slug (${aventura.slug}) tem que ser o nome do arquivo`);
  if (problemas.length) {
    erros += problemas.length;
    console.error(`✗ ${f}\n${problemas.map((p) => `  - ${p}`).join("\n")}`);
  } else {
    console.log(`✓ ${f}: ${aventura!.cenas.length} cenas`);
  }
}

if (erros) process.exit(1);
