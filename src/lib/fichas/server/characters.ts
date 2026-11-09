/**
 * Fichas no banco. Toda função confere o dono: ninguém lê nem altera ficha de outra pessoa.
 * Só roda no servidor; os componentes chamam pelas Server Actions em `app/fichas/actions.ts`.
 */
import 'server-only';
import { cache } from 'react';
import { redirect } from 'next/navigation';
import { getUser } from '@/lib/auth/server';
import { and, desc, eq, sql } from 'drizzle-orm';
import { db } from '@/lib/fichas/db';
import { characters } from '@/lib/fichas/db/schema';
import {
  characterDisplayName,
  createEmptyDraft,
  DRAFT_SCHEMA_VERSION,
  normalizeDraft,
  type CharacterDraft,
} from '@/lib/fichas/sr5/character';

/** Limite de tamanho da ficha salva (uma ficha real tem poucos KB). */
const MAX_DRAFT_BYTES = 256 * 1024;
const MAX_STEP = 50;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class NotFoundError extends Error {
  constructor() {
    super('Ficha não encontrada.');
  }
}

/**
 * Id do tripulante logado (Neon Auth). Sem login, manda para a tela de entrar
 * e volta para `next` depois.
 */
export const requireUserId = cache(async (next: string = '/fichas'): Promise<string> => {
  const user = await getUser();
  if (!user) redirect(`/entrar?next=${encodeURIComponent(next)}`);
  return user.id;
});

/** Valida o que veio do navegador antes de gravar. */
export function parseDraft(raw: unknown): CharacterDraft {
  if (!raw || typeof raw !== 'object') throw new Error('Ficha inválida.');
  const draft = normalizeDraft(raw);
  if (JSON.stringify(draft).length > MAX_DRAFT_BYTES) throw new Error('Ficha grande demais.');
  return draft;
}

function parseStep(step: unknown): number {
  return typeof step === 'number' && Number.isInteger(step) ? Math.min(Math.max(step, 0), MAX_STEP) : 0;
}

export interface CharacterSummary {
  id: string;
  name: string;
  role: string;
  status: 'draft' | 'active' | 'retired';
  updatedAt: Date;
}

export async function listCharacters(): Promise<CharacterSummary[]> {
  const userId = await requireUserId();
  return db()
    .select({
      id: characters.id,
      name: characters.name,
      role: sql<string>`coalesce(${characters.draft}->'concept'->>'role', '')`,
      status: characters.status,
      updatedAt: characters.updatedAt,
    })
    .from(characters)
    .where(eq(characters.ownerId, userId))
    .orderBy(desc(characters.updatedAt));
}

export async function getCharacter(id: string, next?: string) {
  if (!UUID.test(id)) throw new NotFoundError();
  const userId = await requireUserId(next);
  const [row] = await db()
    .select()
    .from(characters)
    .where(and(eq(characters.id, id), eq(characters.ownerId, userId)));
  if (!row) throw new NotFoundError();
  return { ...row, draft: normalizeDraft(row.draft) };
}

export async function createCharacter(draft: CharacterDraft = createEmptyDraft()): Promise<string> {
  const userId = await requireUserId();
  const [row] = await db()
    .insert(characters)
    .values({
      ownerId: userId,
      name: characterDisplayName(draft),
      draft,
      schemaVersion: DRAFT_SCHEMA_VERSION,
    })
    .returning({ id: characters.id });
  return row.id;
}

export async function saveCharacter(id: string, rawDraft: unknown, rawStep: unknown): Promise<Date> {
  if (!UUID.test(id)) throw new NotFoundError();
  const userId = await requireUserId();
  const draft = parseDraft(rawDraft);
  const [row] = await db()
    .update(characters)
    .set({
      draft,
      name: characterDisplayName(draft),
      step: parseStep(rawStep),
      schemaVersion: DRAFT_SCHEMA_VERSION,
      updatedAt: new Date(),
    })
    .where(and(eq(characters.id, id), eq(characters.ownerId, userId), eq(characters.status, 'draft')))
    .returning({ updatedAt: characters.updatedAt });
  if (!row) throw new NotFoundError();
  return row.updatedAt;
}

export async function duplicateCharacter(id: string): Promise<string> {
  const original = await getCharacter(id);
  const draft = structuredClone(original.draft);
  const base = characterDisplayName(draft);
  if (draft.concept.alias?.trim()) draft.concept.alias = `${base} (cópia)`;
  else draft.concept.name = `${base} (cópia)`;
  return createCharacter(draft);
}

export async function deleteCharacter(id: string): Promise<void> {
  if (!UUID.test(id)) throw new NotFoundError();
  const userId = await requireUserId();
  const deleted = await db()
    .delete(characters)
    .where(and(eq(characters.id, id), eq(characters.ownerId, userId)))
    .returning({ id: characters.id });
  if (deleted.length === 0) throw new NotFoundError();
}
