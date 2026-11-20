// Acesso ao banco da Fanzine. Só roda no servidor.

import { sql } from "@/lib/db";
import { FANZINE } from "./config";
import { migrar } from "./save";
import type { Progresso } from "./tipos";

const json = (v: unknown) => JSON.stringify(v);

export async function lerProgresso(userId: string, capitulo: string): Promise<Progresso | null> {
  const [r] = await sql`select state_version, clues, deductions, hints_used, solved from fanzine_progress where user_id = ${userId} and chapter_slug = ${capitulo}`;
  if (!r) return null;
  return migrar({ v: Number(r.state_version), clues: r.clues, deductions: r.deductions, hints: Number(r.hints_used), solved: Boolean(r.solved) });
}

/** Grava o progresso (já conferido). Dicas e "resolvido" nunca andam pra trás, mesmo com duas abas gravando. */
export async function gravarProgresso(userId: string, capitulo: string, p: Progresso): Promise<void> {
  await sql`
    insert into fanzine_progress (user_id, chapter_slug, state_version, clues, deductions, hints_used, solved, solved_at)
    values (${userId}, ${capitulo}, ${FANZINE.versaoSave}, ${json(p.clues)}::jsonb, ${json(p.deductions)}::jsonb, ${p.hints}, ${p.solved}, ${p.solved ? new Date().toISOString() : null})
    on conflict (user_id, chapter_slug) do update set
      state_version = excluded.state_version,
      clues = excluded.clues,
      deductions = excluded.deductions,
      hints_used = greatest(fanzine_progress.hints_used, excluded.hints_used),
      solved = fanzine_progress.solved or excluded.solved,
      solved_at = coalesce(fanzine_progress.solved_at, excluded.solved_at),
      updated_at = now()`;
}

export async function registrarEvento(userId: string, kind: string, payload: Record<string, unknown>): Promise<void> {
  try {
    await sql`insert into events (user_id, kind, payload) values (${userId}, ${kind}, ${json({ jogo: FANZINE.slug, ...payload })}::jsonb)`;
  } catch (e) {
    console.error("Evento da fanzine não gravado:", e);
  }
}

/** Capítulos resolvidos (slug e quando), pro selo da cabine. */
export async function resolvidosDe(userId: string): Promise<{ slug: string; resolvidoEm: string }[]> {
  const linhas = await sql`select chapter_slug, solved_at from fanzine_progress where user_id = ${userId} and solved order by solved_at`;
  return linhas.map((l) => ({ slug: String(l.chapter_slug), resolvidoEm: new Date(String(l.solved_at)).toISOString() }));
}

/** Progresso de todos os capítulos, pra capa mostrar quanto já foi. */
export async function progressoDeTodos(userId: string): Promise<Record<string, { pistas: number; resolvido: boolean }>> {
  const linhas = await sql`select chapter_slug, clues, solved from fanzine_progress where user_id = ${userId}`;
  return Object.fromEntries(linhas.map((l) => [String(l.chapter_slug), { pistas: Array.isArray(l.clues) ? l.clues.length : 0, resolvido: Boolean(l.solved) }]));
}

/** "Baixar meus dados" (LGPD): tudo o que a Fanzine guarda do tripulante. */
export async function exportarFanzine(userId: string) {
  return sql`select chapter_slug, state_version, clues, deductions, hints_used, solved, solved_at, created_at, updated_at from fanzine_progress where user_id = ${userId} order by chapter_slug`;
}

/** "Excluir conta" (LGPD). Os eventos (events) são apagados junto com os do resto do site, por quem apaga a conta. */
export async function apagarFanzine(userId: string) {
  await sql`delete from fanzine_progress where user_id = ${userId}`;
}
