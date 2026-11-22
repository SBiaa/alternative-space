import { sql } from "@/lib/db";
import { JOGO, LIMITES, PARTIDA, TEMAS_LISTA, type Tema } from "./config";
import { somarDias } from "./dia";
import type { Partida } from "./jogo";
import { calcularSequencia, SEM_SEQUENCIA, type Sequencia } from "./sequencia";

// Consultas da Constelação do Dia. Toda gravação recebe o user_id da sessão, nunca do navegador.
// `Puzzle` carrega a resposta: só use no servidor e nunca devolva o objeto inteiro pro navegador.

export type Puzzle = { id: string; date: string; answer: string; length: number; theme: Tema; hint: string };

const paraPuzzle = (r: Record<string, unknown>): Puzzle => ({
  id: String(r.id),
  date: String(r.date),
  answer: String(r.answer),
  length: Number(r.length),
  theme: String(r.theme) as Tema,
  hint: String(r.hint ?? ""),
});

export async function puzzleDoDia(dia: string): Promise<Puzzle | null> {
  const [r] = await sql`
    select id, to_char(date, 'YYYY-MM-DD') as date, answer, length, theme, hint
    from daily_puzzles where date = ${dia}::date`;
  return r ? paraPuzzle(r) : null;
}

export async function puzzlesDasDatas(dias: string[]): Promise<Map<string, Puzzle>> {
  if (dias.length === 0) return new Map();
  const rows = await sql`
    select id, to_char(date, 'YYYY-MM-DD') as date, answer, length, theme, hint
    from daily_puzzles where date = any(${dias}::date[])`;
  return new Map(rows.map((r) => [String(r.date), paraPuzzle(r)]));
}

/** Palpites do usuário nesse puzzle (ainda sem conferir; quem confere é jogo.ts). */
export async function palpitesDe(userId: string, puzzleId: string): Promise<{ palpites: string[]; finalizada: boolean }> {
  const [r] = await sql`select guesses, finished_at from daily_plays where user_id = ${userId} and puzzle_id = ${puzzleId}`;
  if (!r) return { palpites: [], finalizada: false };
  const g = Array.isArray(r.guesses) ? (r.guesses as unknown[]).filter((x): x is string => typeof x === "string") : [];
  return { palpites: g, finalizada: r.finished_at !== null };
}

/**
 * Grava a partida já conferida. Partida terminada não muda mais, e só avança (mais palpites que o gravado),
 * então duas requisições ao mesmo tempo não desfazem uma à outra.
 * Devolve true se esta chamada foi a que terminou a partida (pra gravar o evento uma vez só).
 */
export async function gravarPartida(userId: string, puzzleId: string, dia: string, p: Partida): Promise<boolean> {
  const [r] = await sql`
    insert into daily_plays (user_id, puzzle_id, guesses, solved, attempts, finished_at)
    values (${userId}, ${puzzleId}, ${JSON.stringify(p.palpites)}::jsonb, ${p.solved}, ${p.palpites.length}, ${p.finalizada ? new Date().toISOString() : null})
    on conflict (user_id, puzzle_id) do update
      set guesses = excluded.guesses, solved = excluded.solved, attempts = excluded.attempts, finished_at = excluded.finished_at
      where daily_plays.finished_at is null and jsonb_array_length(daily_plays.guesses) < jsonb_array_length(excluded.guesses)
    returning finished_at`;
  const terminou = Boolean(r && r.finished_at !== null && p.finalizada);
  if (terminou) {
    await sql`
      insert into events (user_id, kind, payload)
      values (${userId}, 'game_played', ${JSON.stringify({ jogo: JOGO, dia, solved: p.solved, tentativas: p.palpites.length })}::jsonb)`;
    await recalcularSequencia(userId);
  }
  return terminou;
}

/** A sequência é sempre refeita das partidas terminadas, então migrar ou repetir nunca duplica nada. */
export async function recalcularSequencia(userId: string): Promise<Sequencia> {
  const rows = await sql`
    select to_char(pz.date, 'YYYY-MM-DD') as dia, p.solved
    from daily_plays p join daily_puzzles pz on pz.id = p.puzzle_id
    where p.user_id = ${userId} and p.finished_at is not null`;
  const s = calcularSequencia(rows.map((r) => ({ dia: String(r.dia), solved: Boolean(r.solved) })));
  await sql`
    insert into daily_streaks (user_id, current, best, last_date)
    values (${userId}, ${s.current}, ${s.best}, ${s.lastDate}::date)
    on conflict (user_id) do update set current = excluded.current, best = excluded.best, last_date = excluded.last_date`;
  return s;
}

export async function sequenciaDe(userId: string): Promise<Sequencia> {
  const [r] = await sql`select current, best, to_char(last_date, 'YYYY-MM-DD') as last_date from daily_streaks where user_id = ${userId}`;
  return r ? { current: Number(r.current), best: Number(r.best), lastDate: r.last_date ? String(r.last_date) : null } : SEM_SEQUENCIA;
}

export type Distribuicao = { porTentativa: number[]; falhas: number; total: number };

/** Como todo mundo foi no puzzle. Sem partidas suficientes, null (o bloco não aparece). */
export async function distribuicaoDe(puzzleId: string): Promise<Distribuicao | null> {
  const rows = await sql`
    select solved, attempts, count(*)::int as n from daily_plays
    where puzzle_id = ${puzzleId} and finished_at is not null group by solved, attempts`;
  const porTentativa = Array.from({ length: PARTIDA.tentativas }, () => 0);
  let falhas = 0;
  let total = 0;
  for (const r of rows) {
    const n = Number(r.n);
    total += n;
    if (r.solved && Number(r.attempts) >= 1 && Number(r.attempts) <= PARTIDA.tentativas) porTentativa[Number(r.attempts) - 1] += n;
    else falhas += n;
  }
  return total >= LIMITES.minimoParaDistribuicao ? { porTentativa, falhas, total } : null;
}

// ---- Cabine ----

export type SeloConstelacao = { atual: number; melhor: number };

/** Sequência pro selo da cabine. Quem nunca jogou não ganha o bloco. */
export async function seloDe(userId: string, hoje: string): Promise<SeloConstelacao | null> {
  const [r] = await sql`select current, best, to_char(last_date, 'YYYY-MM-DD') as last_date from daily_streaks where user_id = ${userId}`;
  if (!r || Number(r.best) === 0) return null;
  const vivo = r.last_date === hoje || r.last_date === somarDias(hoje, -1);
  return { atual: vivo ? Number(r.current) : 0, melhor: Number(r.best) };
}

// ---- Admin ----

export type Agendado = Puzzle & { createdAt: string };

export async function agenda(de: string, ate: string): Promise<Agendado[]> {
  const rows = await sql`
    select id, to_char(date, 'YYYY-MM-DD') as date, answer, length, theme, hint, created_at
    from daily_puzzles where date between ${de}::date and ${ate}::date order by date`;
  return rows.map((r) => ({ ...paraPuzzle(r), createdAt: new Date(r.created_at).toISOString() }));
}

export async function datasAgendadas(de: string, ate: string): Promise<Set<string>> {
  const rows = await sql`select to_char(date, 'YYYY-MM-DD') as date from daily_puzzles where date between ${de}::date and ${ate}::date`;
  return new Set(rows.map((r) => String(r.date)));
}

/** Cria ou troca a palavra de um dia que ainda não chegou. */
export async function agendar(p: { date: string; answer: string; theme: Tema; hint: string }): Promise<void> {
  if (!TEMAS_LISTA.includes(p.theme)) throw new Error("tema inválido");
  await sql`
    insert into daily_puzzles (date, answer, length, theme, hint)
    values (${p.date}::date, ${p.answer}, ${p.answer.length}, ${p.theme}, ${p.hint})
    on conflict (date) do update set answer = excluded.answer, length = excluded.length, theme = excluded.theme, hint = excluded.hint`;
}

export async function desagendar(dia: string): Promise<void> {
  await sql`delete from daily_puzzles where date = ${dia}::date`;
}

// ---- LGPD ----

export async function exportarConstelacao(userId: string) {
  const [partidas, sequencia] = await Promise.all([
    sql`select to_char(pz.date, 'YYYY-MM-DD') as dia, p.guesses, p.solved, p.attempts, p.finished_at
        from daily_plays p join daily_puzzles pz on pz.id = p.puzzle_id where p.user_id = ${userId} order by pz.date`,
    sql`select current, best, last_date from daily_streaks where user_id = ${userId}`,
  ]);
  return { partidas, sequencia: sequencia[0] ?? null };
}

export async function apagarConstelacao(userId: string) {
  await sql`delete from daily_plays where user_id = ${userId}`;
  await sql`delete from daily_streaks where user_id = ${userId}`;
}
