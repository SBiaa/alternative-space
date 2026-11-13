// Seed de desenvolvimento do Riff Estelar: a faixa de exemplo (sintetizada no navegador) e seus 3 mapas.
//   npm run seed:riff
// Antes: node --env-file=.env.local scripts/aplicar-sql.mjs db/riff-estelar.sql
import { neon } from "@neondatabase/serverless";
import { DIFICULDADES } from "../src/lib/riff/config";
import { duracaoExemplo, EXEMPLO, mapaExemplo } from "../src/lib/riff/faixaExemplo";

if (process.env.NODE_ENV !== "development" || process.env.VERCEL_ENV === "production") {
  console.error("Seed do Riff Estelar só roda com NODE_ENV=development.");
  process.exit(1);
}
if (!process.env.DATABASE_URL) {
  console.error("Defina DATABASE_URL (.env.local).");
  process.exit(1);
}

const sql = neon(process.env.DATABASE_URL);

async function main() {

// Faixa composta para este projeto e gerada por código (src/lib/riff/faixaExemplo.ts). Rascunho só para desenvolvimento.
const [musica] = await sql`
  insert into songs (slug, title, artist, bpm, duration_ms, audio_url, credits, license, published)
  values (${EXEMPLO.slug}, 'Faixa de exemplo', 'Sintetizador da cabine', ${EXEMPLO.bpm}, ${duracaoExemplo},
          ${`synth:${EXEMPLO.slug}`}, 'Composta e sintetizada em código pelo Alternative Space (só desenvolvimento).',
          'Original do projeto, uso livre no site.', true)
  on conflict (slug) do update set bpm = excluded.bpm, duration_ms = excluded.duration_ms, audio_url = excluded.audio_url
  returning id`;

for (const d of DIFICULDADES) {
  const notas = mapaExemplo(d);
  await sql`
    insert into song_charts (song_id, difficulty, notes) values (${musica.id}, ${d}, ${JSON.stringify(notas)}::jsonb)
    on conflict (song_id, difficulty) do update set notes = excluded.notes`;
  console.log(`${d}: ${notas.length} notas`);
}
console.log("Faixa de exemplo pronta em /jogos/riff-estelar.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
