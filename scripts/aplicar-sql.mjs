// Roda um arquivo .sql de db/ no banco do .env.local, um comando por vez.
//   node --env-file=.env.local scripts/aplicar-sql.mjs db/diario.sql
import { readFileSync } from "node:fs";
import { neon } from "@neondatabase/serverless";

const arquivo = process.argv[2];
if (!arquivo || !process.env.DATABASE_URL) {
  console.error("Uso: node --env-file=.env.local scripts/aplicar-sql.mjs db/arquivo.sql");
  process.exit(1);
}
const sql = neon(process.env.DATABASE_URL);
const comandos = readFileSync(arquivo, "utf8")
  .replace(/--.*$/gm, "")
  .split(";")
  .map((c) => c.trim())
  .filter(Boolean);
for (const c of comandos) await sql.query(c);
console.log(`${arquivo}: ${comandos.length} comandos aplicados.`);
