// Catálogo de melhorias e os 8 arquétipos da Lan House 2005. Pode rodar de novo: atualiza o que já existe.
//   npm run seed:lan
// Antes: node --env-file=.env.local scripts/aplicar-sql.mjs db/lan-house.sql
import { neon } from "@neondatabase/serverless";
import { CATALOGO_ARQUETIPOS, CATALOGO_ITENS } from "../src/lib/lan/catalogo";

if (!process.env.DATABASE_URL) {
  console.error("Defina DATABASE_URL (.env.local).");
  process.exit(1);
}
const sql = neon(process.env.DATABASE_URL);

async function main() {
for (const it of CATALOGO_ITENS) {
  if (it.prices.length !== it.effects.length || it.prices.length !== it.maxLevel) throw new Error(`${it.slug}: preços, efeitos e nível máximo com tamanhos diferentes`);
  await sql`
    insert into lan_catalog (kind, slug, name, description, max_level, prices, effects, min_lan_level, position)
    values (${it.kind}, ${it.slug}, ${it.name}, ${it.description}, ${it.maxLevel}, ${JSON.stringify(it.prices)}::jsonb, ${JSON.stringify(it.effects)}::jsonb, ${it.minLanLevel}, ${it.position})
    on conflict (slug) do update set kind = excluded.kind, name = excluded.name, description = excluded.description, max_level = excluded.max_level,
      prices = excluded.prices, effects = excluded.effects, min_lan_level = excluded.min_lan_level, position = excluded.position`;
}

for (const a of CATALOGO_ARQUETIPOS) {
  const quirk = { ...a.quirk, icone: a.icone };
  await sql`
    insert into lan_archetypes (slug, name, wants, patience, spend, tip, noise_tolerance, makes_noise, quirk, unlock)
    values (${a.slug}, ${a.name}, ${JSON.stringify(a.wants)}::jsonb, ${a.patience}, ${a.spend}, ${a.tip}, ${a.noiseTolerance}, ${a.makesNoise}, ${JSON.stringify(quirk)}::jsonb, ${JSON.stringify(a.unlock)}::jsonb)
    on conflict (slug) do update set name = excluded.name, wants = excluded.wants, patience = excluded.patience, spend = excluded.spend, tip = excluded.tip,
      noise_tolerance = excluded.noise_tolerance, makes_noise = excluded.makes_noise, quirk = excluded.quirk, unlock = excluded.unlock`;
}
  console.log(`${CATALOGO_ITENS.length} itens e ${CATALOGO_ARQUETIPOS.length} arquétipos no catálogo da lan.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
