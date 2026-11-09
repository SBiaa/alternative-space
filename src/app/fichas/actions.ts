'use server';

import { refresh } from 'next/cache';
import { redirect } from 'next/navigation';
import type { SaveResult } from '@/lib/fichas/cloudPersistence';
import {
  createCharacter,
  deleteCharacter,
  duplicateCharacter,
  NotFoundError,
  parseDraft,
  saveCharacter,
} from '@/lib/fichas/server/characters';

/** Autosave do assistente. Não lança: devolve o erro para a tela mostrar. */
export async function saveCharacterAction(id: string, draft: unknown, step: unknown): Promise<SaveResult> {
  try {
    const savedAt = await saveCharacter(id, draft, step);
    return { ok: true, savedAt: savedAt.toISOString() };
  } catch (e) {
    if (e instanceof NotFoundError) return { ok: false, error: e.message };
    if (e instanceof Error && /inválida|grande demais|Versão/.test(e.message)) return { ok: false, error: e.message };
    console.error('Falha ao salvar ficha', e);
    return { ok: false, error: 'Não deu para salvar agora. Tentando de novo…' };
  }
}

export async function createCharacterAction(): Promise<void> {
  const id = await createCharacter();
  redirect(`/fichas/${id}`);
}

/** Salva na conta a ficha que estava no navegador. Devolve o id da ficha nova. */
export async function importLocalDraftAction(raw: unknown): Promise<string> {
  return createCharacter(parseDraft(raw));
}

export async function duplicateCharacterAction(id: string): Promise<void> {
  await duplicateCharacter(id);
  refresh();
}

export async function deleteCharacterAction(id: string): Promise<void> {
  await deleteCharacter(id);
  refresh();
}
