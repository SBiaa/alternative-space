// Catálogo de melhorias e arquétipos da Taverna do Dragão Cansado. Pode rodar de novo: atualiza o que já existe.
//   npm run seed:taverna
// Antes: node --env-file=.env.local scripts/aplicar-sql.mjs db/taverna.sql
import { neon } from "@neondatabase/serverless";
import { CATALOGO_ARQUETIPOS, CATALOGO_ITENS } from "../src/lib/taverna/catalogo";

if (!process.env.DATABASE_URL) {
  console.error("Defina DATABASE_URL (.env.local).");
  process.exit(1);
}
const sql = neon(process.env.DATABASE_URL);

async function main() {
  for (const it of CATALOGO_ITENS) {
    if (it.prices.length !== it.effects.length || it.prices.length !== it.maxLevel) throw new Error(`${it.slug}: preços, efeitos e nível máximo com tamanhos diferentes`);
    await sql`
      insert into tavern_catalog (kind, slug, name, description, max_level, prices, effects, min_tavern_level, position)
      values (${it.kind}, ${it.slug}, ${it.name}, ${it.description}, ${it.maxLevel}, ${JSON.stringify(it.prices)}::jsonb, ${JSON.stringify(it.effects)}::jsonb, ${it.minTavernLevel}, ${it.position})
      on conflict (slug) do update set kind = excluded.kind, name = excluded.name, description = excluded.description, max_level = excluded.max_level,
        prices = excluded.prices, effects = excluded.effects, min_tavern_level = excluded.min_tavern_level, position = excluded.position`;
  }

  for (const a of CATALOGO_ARQUETIPOS) {
    await sql`
      insert into archetypes (slug, name, icon, orders, patience, spend, tip, quirk, unlock)
      values (${a.slug}, ${a.name}, ${a.icone}, ${JSON.stringify(a.orders)}::jsonb, ${a.patience}, ${a.spend}, ${a.tip}, ${JSON.stringify(a.quirk)}::jsonb, ${JSON.stringify(a.unlock)}::jsonb)
      on conflict (slug) do update set name = excluded.name, icon = excluded.icon, orders = excluded.orders, patience = excluded.patience,
        spend = excluded.spend, tip = excluded.tip, quirk = excluded.quirk, unlock = excluded.unlock`;
  }
  console.log(`${CATALOGO_ITENS.length} itens e ${CATALOGO_ARQUETIPOS.length} arquétipos no catálogo.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
