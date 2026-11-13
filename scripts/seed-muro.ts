// Catálogo de melhorias, arquétipos de artista, modelos de mural (>= 2 por tamanho) e diálogos do Muro Livre.
// Pode rodar de novo: atualiza o que já existe.
//   npm run seed:muro
// Antes: node --env-file=.env.local scripts/aplicar-sql.mjs db/muro-livre.sql
import { neon } from "@neondatabase/serverless";
import { ARQUETIPOS, DIALOGOS, ITENS } from "../src/lib/muro/catalogo";
import { TEMPLATES } from "../src/lib/muro/templates";

if (!process.env.DATABASE_URL) {
  console.error("Defina DATABASE_URL (.env.local).");
  process.exit(1);
}
const sql = neon(process.env.DATABASE_URL);
const j = (v: unknown) => JSON.stringify(v);

async function main() {
  for (const it of ITENS) {
    if (it.prices.length !== it.effects.length || it.prices.length !== it.maxLevel) throw new Error(`${it.slug}: preços, efeitos e nível máximo com tamanhos diferentes`);
    await sql`
      insert into mural_catalog (kind, slug, name, description, max_level, prices, effects, min_crew_level, position)
      values (${it.kind}, ${it.slug}, ${it.name}, ${it.description}, ${it.maxLevel}, ${j(it.prices)}::jsonb, ${j(it.effects)}::jsonb, ${it.minCrewLevel}, ${it.position})
      on conflict (slug) do update set kind = excluded.kind, name = excluded.name, description = excluded.description, max_level = excluded.max_level,
        prices = excluded.prices, effects = excluded.effects, min_crew_level = excluded.min_crew_level, position = excluded.position`;
  }
  for (const a of ARQUETIPOS) {
    await sql`
      insert into mural_archetypes (slug, name, description, specialty, skills, salary, hire_fee, min_crew_level, negotiation, waste)
      values (${a.slug}, ${a.nome}, ${a.descricao}, ${a.especialidade}, ${j(a.hab)}::jsonb, ${a.salario}, ${a.contratacao}, ${a.nivelMin}, ${a.negociacao}, ${a.desperdicio})
      on conflict (slug) do update set name = excluded.name, description = excluded.description, specialty = excluded.specialty, skills = excluded.skills,
        salary = excluded.salary, hire_fee = excluded.hire_fee, min_crew_level = excluded.min_crew_level, negotiation = excluded.negotiation, waste = excluded.waste`;
  }
  const porTamanho = new Map<string, number>();
  for (const t of TEMPLATES) {
    porTamanho.set(t.size, (porTamanho.get(t.size) ?? 0) + 1);
    await sql`
      insert into mural_templates (slug, name, size, layers, slots, tolerance)
      values (${t.slug}, ${t.nome}, ${t.size}, ${j(t.layers)}::jsonb, ${j(t.slots)}::jsonb, ${t.tolerance})
      on conflict (slug) do update set name = excluded.name, size = excluded.size, layers = excluded.layers, slots = excluded.slots, tolerance = excluded.tolerance`;
  }
  for (const [tam, n] of porTamanho) if (n < 2) throw new Error(`Só ${n} modelo(s) pra ${tam}: o MVP pede pelo menos 2 por tamanho.`);
  for (const d of DIALOGOS) {
    await sql`
      insert into mural_dialogues (slug, kind, steps, requirements) values (${d.slug}, ${d.kind}, ${j(d.steps)}::jsonb, ${j(d.requirements)}::jsonb)
      on conflict (slug) do update set kind = excluded.kind, steps = excluded.steps, requirements = excluded.requirements`;
  }
  console.log(`${ITENS.length} melhorias, ${ARQUETIPOS.length} arquétipos, ${TEMPLATES.length} modelos de mural e ${DIALOGOS.length} diálogos no catálogo do Muro Livre.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
