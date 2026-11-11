import { sql } from "@/lib/db";
import { apagarDiario, exportarDiario } from "@/lib/diario/dados";
import { getQuiz, getResult, quizzes, resultTheme } from "@/lib/quiz";
import type { SavedResult } from "@/lib/tripulante";

export type Perfil = { apelido: string | null; cor: string };
export type Avatar = { src: string; label: string };

export const CORES = Object.keys(resultTheme);
export const corValida = (v: unknown): v is string => typeof v === "string" && CORES.includes(v);

// "@Bia.Lua" vira "bia.lua". Vazio = sem apelido. null = inválido.
export function normalizaApelido(v: unknown): string | null | "" {
  const s = String(v ?? "").trim().replace(/^@/, "").toLowerCase();
  if (!s) return "";
  return /^[a-z0-9_.]{3,20}$/.test(s) ? s : null;
}

// Avatares desbloqueados: as artes dos resultados que a pessoa já tirou (na party, cada integrante escolhido).
export function avataresDe(saved: SavedResult[]): Avatar[] {
  const out = new Map<string, Avatar>();
  for (const s of saved) {
    const q = getQuiz(s.quiz);
    const r = q && getResult(q, s.result);
    if (!r) continue;
    if (r.image) out.set(r.image, { src: r.image, label: r.name });
    for (const m of r.members ?? []) if (m.image) out.set(m.image, { src: m.image, label: m.name });
  }
  return [...out.values()];
}

// Só aceita imagem que esteja entre as desbloqueadas.
export const avatarPermitido = (src: string, saved: SavedResult[]) => avataresDe(saved).some((a) => a.src === src);

export const totalQuizzes = Object.keys(quizzes).length;

export async function getPerfil(userId: string): Promise<Perfil> {
  const [p] = await sql`select apelido, cor from perfis where user_id = ${userId}`;
  return { apelido: (p?.apelido as string) ?? null, cor: corValida(p?.cor) ? p.cor : "azul" };
}

// false = apelido já é de outra pessoa.
export async function salvarPerfil(userId: string, p: Perfil): Promise<boolean> {
  if (p.apelido) {
    const [dono] = await sql`select user_id from perfis where apelido = ${p.apelido} and user_id <> ${userId}`;
    if (dono) return false;
  }
  try {
    await sql`
      insert into perfis (user_id, apelido, cor) values (${userId}, ${p.apelido}, ${p.cor})
      on conflict (user_id) do update set apelido = excluded.apelido, cor = excluded.cor, updated_at = now()`;
  } catch (e) {
    // Duas pessoas pegando o mesmo apelido ao mesmo tempo.
    if (String((e as { code?: string })?.code) === "23505") return false;
    throw e;
  }
  return true;
}

// Todos os resultados, do mais novo pro mais antigo (o registro de bordo mostra o atual e os anteriores).
export async function historico(userId: string): Promise<SavedResult[]> {
  return (await sql`
    select quiz, result, created_at from quiz_results
    where user_id = ${userId} order by created_at desc limit 200`) as SavedResult[];
}

// Resultados anteriores de cada quiz, sem repetir o atual nem resultados seguidos iguais.
export function anteriores(hist: SavedResult[]): Map<string, string[]> {
  const out = new Map<string, string[]>();
  for (const h of hist) {
    const lista = out.get(h.quiz) ?? [];
    if (lista[lista.length - 1] !== h.result) lista.push(h.result);
    out.set(h.quiz, lista);
  }
  for (const [k, v] of out) out.set(k, v.slice(1));
  return out;
}

export async function apagarDados(userId: string) {
  await sql`delete from quiz_results where user_id = ${userId}`;
  await sql`delete from interests where user_id = ${userId}`;
  await sql`delete from recordes where user_id = ${userId}`;
  await sql`delete from dilema_votos where user_id = ${userId}`;
  await apagarDiario(userId);
  await sql`delete from perfis where user_id = ${userId}`;
}

/** Tudo o que guardamos do usuário, para o "baixar meus dados" (LGPD). */
export async function exportarDados(userId: string) {
  const [perfil, quizzes, interesses, recordes, votos, diario] = await Promise.all([
    sql`select apelido, cor, updated_at from perfis where user_id = ${userId}`,
    sql`select quiz, result, scores, chosen_on_tie, created_at from quiz_results where user_id = ${userId} order by created_at`,
    sql`select tag, origem, created_at from interests where user_id = ${userId} order by created_at`,
    sql`select * from recordes where user_id = ${userId}`,
    sql`select * from dilema_votos where user_id = ${userId}`,
    exportarDiario(userId),
  ]);
  return { perfil: perfil[0] ?? null, quizzes, interesses, recordes, votos_em_dilemas: votos, diario_de_bordo: diario };
}
