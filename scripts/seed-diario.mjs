// Seed de exemplo do Diário de Bordo. Só roda em desenvolvimento e só para o usuário informado.
//   SEED_USER_ID=<id do seu usuário de teste> npm run seed:diario
// As datas saem do calendário (primeira segunda de 2027), nada fixo.
import { neon } from "@neondatabase/serverless";

if (process.env.NODE_ENV !== "development") {
  console.error("Seed do diário só roda com NODE_ENV=development.");
  process.exit(1);
}
const userId = process.env.SEED_USER_ID;
if (!userId || !process.env.DATABASE_URL) {
  console.error("Defina SEED_USER_ID e DATABASE_URL.");
  process.exit(1);
}

const sql = neon(process.env.DATABASE_URL);
const ANO = 2027;
const DIA = 86_400_000;
const iso = (d) => d.toISOString().slice(0, 10);
const jan1 = new Date(Date.UTC(ANO, 0, 1));
const segunda = new Date(jan1.getTime() + ((7 - ((jan1.getUTCDay() + 6) % 7)) % 7) * DIA);
const dia = (n) => iso(new Date(segunda.getTime() + n * DIA)); // dia(0) = segunda da semana 01

const quests = [
  [dia(0), "Arrumar a mesa de estudos", "done"],
  [dia(0), "Ler 20 páginas", "open"],
  [dia(1), "Treino de 30 min", "urgent"],
  [dia(2), "Mandar e-mail pro grupo", "moved"],
  [dia(9), "Mandar e-mail pro grupo", "open"],
  [dia(3), "Maratonar 2 episódios", "dropped"],
];

await sql.transaction([
  sql`delete from quests where user_id = ${userId}`,
  sql`delete from week_notes where user_id = ${userId}`,
  sql`delete from habits where user_id = ${userId}`,
  sql`delete from mood_legend where user_id = ${userId}`,
  sql`delete from mood_logs where user_id = ${userId}`,
  sql`delete from inventory_items where user_id = ${userId}`,
  sql`delete from month_xp where user_id = ${userId}`,
  sql`delete from events where user_id = ${userId}`,
  ...quests.map(([d, t, s], i) => sql`insert into quests (user_id, scope, date, text, status, position) values (${userId}, 'day', ${d}, ${t}, ${s}, ${i})`),
  sql`insert into quests (user_id, scope, year, month, text, status, position) values
      (${userId}, 'month', ${ANO}, 1, 'Terminar o curso de desenho', 'open', 0),
      (${userId}, 'month', ${ANO}, 1, 'Organizar as finanças', 'done', 1)`,
  sql`insert into month_xp (user_id, year, month, points) values (${userId}, ${ANO}, 1, 2)`,
  sql`insert into week_notes (user_id, year, week, buff, debuff) values (${userId}, ${ANO}, 1, 'Dormir antes da meia-noite', 'Rolar o feed na cama')`,
  sql`insert into habits (user_id, year, month, name, position) values (${userId}, ${ANO}, 1, 'Beber água', 0), (${userId}, ${ANO}, 1, 'Ler', 1)`,
  sql`insert into habit_logs (habit_id, date, done) select id, ${dia(0)}, true from habits where user_id = ${userId} and year = ${ANO} and month = 1`,
  sql`insert into mood_legend (user_id, year, month, slot, color, label) values
      (${userId}, ${ANO}, 1, 1, '#7fc97f', 'animada'), (${userId}, ${ANO}, 1, 2, '#fdd06b', 'tranquila'),
      (${userId}, ${ANO}, 1, 3, '#8fb4e3', 'cansada'), (${userId}, ${ANO}, 1, 4, '#e88a7a', 'brava')`,
  sql`insert into mood_logs (user_id, date, slot) values (${userId}, ${dia(0)}, 1), (${userId}, ${dia(1)}, 3)`,
  sql`insert into inventory_items (user_id, year, month, type, title, rating, status) values
      (${userId}, ${ANO}, 1, 'anime', 'Frieren', 5, 'fazendo'), (${userId}, ${ANO}, 1, 'livro', 'O Hobbit', null, 'quero')`,
]);

console.log(`Diário de exemplo criado para ${userId}.`);
