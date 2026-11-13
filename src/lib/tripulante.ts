import { sql } from "@/lib/db";
import { getQuiz, getResult, parseMix } from "@/lib/quiz";

export type SavedResult = { quiz: string; result: string; created_at: string };

export const isValidResult = (quiz: string, result: string) => {
  const q = getQuiz(quiz);
  return Boolean(q && getResult(q, result));
};

export type Extra = { scores?: number[]; tie?: boolean };

// Guarda o resultado. Refazer o quiz e cair no mesmo resultado em menos de 10 min não duplica a linha.
// Quiz com mistura: guarda os pontos (só se baterem com o resultado), as tags em interests e o evento quiz_completed.
export async function saveResult(userId: string, quiz: string, result: string, extra: Extra = {}) {
  const q = getQuiz(quiz);
  const r = q && getResult(q, result);
  if (!q || !r) return false;
  const scores = extra.scores ? parseMix(q, result, extra.scores.join(".")) : null;
  const tie = Boolean(scores && extra.tie);
  const rows = await sql`
    insert into quiz_results (user_id, quiz, result, scores, chosen_on_tie)
    select ${userId}, ${quiz}, ${result}, ${scores ? JSON.stringify(scores) : null}::jsonb, ${tie}
    where not exists (
      select 1 from quiz_results
      where user_id = ${userId} and quiz = ${quiz} and result = ${result} and created_at > now() - interval '10 minutes'
    )
    returning 1`;
  if (rows.length === 0) return true;
  for (const tag of r.tags ?? [])
    await sql`insert into interests (user_id, tag, origem) values (${userId}, ${tag}, 'quiz') on conflict do nothing`;
  await sql`insert into events (user_id, kind, payload) values (${userId}, 'quiz_completed', ${JSON.stringify({ quiz, result })}::jsonb)`;
  return true;
}

// "salvar" que vai pelo cadastro: "quiz/resultado" ou "quiz/resultado/6.3.2.1/1" (mistura e empate).
export function lerSalvar(v: unknown): { quiz: string; result: string; extra: Extra } | null {
  const [quiz, result, m, e] = String(v ?? "").split("/");
  if (!quiz || !result) return null;
  const scores = m && /^\d+(\.\d+)*$/.test(m) ? m.split(".").map(Number) : undefined;
  return { quiz, result, extra: scores ? { scores, tie: e === "1" } : {} };
}

// Casa (ou outro resultado com mistura) mais recente, pro selo do perfil.
export async function latestWithScores(userId: string, quiz: string) {
  const [row] = await sql`
    select result, scores, chosen_on_tie, created_at from quiz_results
    where user_id = ${userId} and quiz = ${quiz} order by created_at desc limit 1`;
  return row ? { result: row.result as string, scores: (row.scores as number[] | null) ?? null, tie: Boolean(row.chosen_on_tie) } : null;
}

// Último resultado de cada quiz (é o que aparece no perfil).
export async function latestResults(userId: string): Promise<SavedResult[]> {
  return (await sql`
    select distinct on (quiz) quiz, result, created_at
    from quiz_results where user_id = ${userId}
    order by quiz, created_at desc`) as SavedResult[];
}

export async function latestResultFor(userId: string, quiz: string): Promise<string | null> {
  const rows = await sql`select result from quiz_results where user_id = ${userId} and quiz = ${quiz} order by created_at desc limit 1`;
  return (rows[0]?.result as string) ?? null;
}

// Só aceita caminhos internos depois do login.
export const safeNext = (v: FormDataEntryValue | string | null | undefined) =>
  typeof v === "string" && v.startsWith("/") && !v.startsWith("//") && !v.startsWith("/\\") ? v : "/conta";

// Cadastro esperando o código do e-mail (cookie httpOnly, 30 min).
export const PENDENTE = "tripulante_pendente";
// Cookie com o e-mail de quem pediu pra redefinir a senha.
export const SENHA = "tripulante_senha";
export type Pendente = { email: string; next: string; salvar: string };

export function lerPendente(v: string | undefined): Pendente | null {
  if (!v) return null;
  try {
    const p = JSON.parse(v);
    if (typeof p?.email !== "string" || !p.email.includes("@")) return null;
    return { email: p.email, next: safeNext(p.next), salvar: typeof p.salvar === "string" ? p.salvar : "" };
  } catch {
    return null;
  }
}

// "bia@gmail.com" vira "b**@gmail.com" na tela de código.
export const mascararEmail = (email: string) => {
  const [nome, dominio] = email.split("@");
  return `${nome.slice(0, 1)}${"*".repeat(Math.max(nome.length - 1, 2))}@${dominio}`;
};
