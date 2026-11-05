import { sql } from "@/lib/db";
import { getQuiz, getResult } from "@/lib/quiz";

export type SavedResult = { quiz: string; result: string; created_at: string };

export const isValidResult = (quiz: string, result: string) => {
  const q = getQuiz(quiz);
  return Boolean(q && getResult(q, result));
};

// Guarda o resultado. Refazer o quiz e cair no mesmo resultado em menos de 10 min não duplica a linha.
export async function saveResult(userId: string, quiz: string, result: string) {
  if (!isValidResult(quiz, result)) return false;
  await sql`
    insert into quiz_results (user_id, quiz, result)
    select ${userId}, ${quiz}, ${result}
    where not exists (
      select 1 from quiz_results
      where user_id = ${userId} and quiz = ${quiz} and result = ${result} and created_at > now() - interval '10 minutes'
    )`;
  return true;
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
  typeof v === "string" && v.startsWith("/") && !v.startsWith("//") ? v : "/conta";
