// Seed de desenvolvimento do Rolê Noturno: os 3 picos de exemplo (fácil, médio, difícil),
// montados com as mesmas funções do editor (src/lib/role/exemplos.ts).
//   npm run seed:role
// Antes: node --env-file=.env.local scripts/aplicar-sql.mjs db/role-noturno.sql
// Dono: SEED_ROLE_USER_ID (o id de uma conta sua de teste); sem ele, fica num dono "seed:role-noturno".
// Os picos entram publicados mas SEM recorde: nenhuma pontuação inventada. O primeiro recorde é de quem jogar.
import { neon } from "@neondatabase/serverless";
import { EXEMPLOS } from "../src/lib/role/exemplos";
import { validarPista } from "../src/lib/role/pista";
import { hashDaPista } from "../src/lib/role/pontuacao";

if (process.env.NODE_ENV !== "development" || process.env.VERCEL_ENV === "production") {
  console.error("Seed do Rolê Noturno só roda com NODE_ENV=development.");
  process.exit(1);
}
if (!process.env.DATABASE_URL) {
  console.error("Defina DATABASE_URL (.env.local).");
  process.exit(1);
}

const sql = neon(process.env.DATABASE_URL);
const dono = process.env.SEED_ROLE_USER_ID || "seed:role-noturno";

async function main() {
  for (const e of EXEMPLOS) {
    const v = validarPista(e.pista);
    if (!v.ok) throw new Error(`${e.slug}: ${v.texto}`);
    await sql`
      insert into skate_parks (user_id, slug, title, description, layout, layout_version, layout_hash, status, published_at)
      values (${dono}, ${e.slug}, ${e.titulo}, ${e.descricao}, ${JSON.stringify(v.pista)}::jsonb, ${v.pista.version}, ${hashDaPista(v.pista)}, 'published', now())
      on conflict (slug) do update set title = excluded.title, description = excluded.description, layout = excluded.layout,
        layout_hash = excluded.layout_hash`;
    console.log(`${e.slug}: pronto`);
  }
  console.log("Picos de exemplo em /jogos/role-noturno.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
