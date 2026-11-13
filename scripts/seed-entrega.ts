// Catálogo de implantes do Entrega na Chuva. Pode rodar de novo: atualiza nome, descrição, preços e efeitos.
//   npm run seed:entrega
// Antes: node --env-file=.env.local scripts/aplicar-sql.mjs db/entrega-na-chuva.sql
import { neon } from "@neondatabase/serverless";
import { CATALOGO } from "../src/lib/entrega/catalogo";

if (!process.env.DATABASE_URL) {
  console.error("Defina DATABASE_URL (.env.local).");
  process.exit(1);
}
const sql = neon(process.env.DATABASE_URL);

async function main() {
for (const [i, im] of CATALOGO.entries()) {
  if (im.prices.length !== im.effects.length) throw new Error(`${im.slug}: preços e efeitos com tamanhos diferentes`);
  await sql`
    insert into implants (slug, name, description, max_level, prices, effects, position)
    values (${im.slug}, ${im.name}, ${im.description}, ${im.prices.length}, ${JSON.stringify(im.prices)}::jsonb, ${JSON.stringify(im.effects)}::jsonb, ${i})
    on conflict (slug) do update set name = excluded.name, description = excluded.description, max_level = excluded.max_level,
      prices = excluded.prices, effects = excluded.effects, position = excluded.position`;
}
console.log(`${CATALOGO.length} implantes no catálogo.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
