/**
 * Fichas de Pathfinder 2e no banco: mesma tabela `fichas`, com `sistema = 'pf2e'`.
 * O `draft` guarda a `Ficha` de src/lib/pathfinder.ts. Por enquanto a ficha fica sempre editável
 * (status 'draft'); modo de jogo e times são só do Shadowrun.
 */
import 'server-only';
import { and, eq } from 'drizzle-orm';
import { db } from '@/lib/fichas/db';
import { characters } from '@/lib/fichas/db/schema';
import { FICHA_VAZIA, normalizarFicha, type Ficha } from '@/lib/pathfinder';
import { NotFoundError, requireUserId } from './characters';

export const PF2E = 'pf2e';
const VERSAO = 1;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const nomeDaFicha = (f: Ficha) => f.nome.trim() || 'Sem nome';

/** Valida o que veio do navegador antes de gravar. */
export function parseFicha(raw: unknown): Ficha {
  const f = normalizarFicha(raw);
  if (!f) throw new Error('Ficha inválida.');
  return f;
}

/** Sistema da ficha do usuário logado, ou null se não for dele / não existir. */
export async function sistemaDaFicha(id: string, next?: string): Promise<string | null> {
  if (!UUID.test(id)) return null;
  const userId = await requireUserId(next);
  const [row] = await db()
    .select({ system: characters.system })
    .from(characters)
    .where(and(eq(characters.id, id), eq(characters.ownerId, userId)));
  return row?.system ?? null;
}

export async function getPf2e(id: string, next?: string) {
  if (!UUID.test(id)) throw new NotFoundError();
  const userId = await requireUserId(next);
  const [row] = await db()
    .select({ id: characters.id, draft: characters.draft, updatedAt: characters.updatedAt })
    .from(characters)
    .where(and(eq(characters.id, id), eq(characters.ownerId, userId), eq(characters.system, PF2E)));
  if (!row) throw new NotFoundError();
  return { id: row.id, ficha: normalizarFicha(row.draft) ?? FICHA_VAZIA, updatedAt: row.updatedAt };
}

export async function createPf2e(ficha: Ficha = FICHA_VAZIA): Promise<string> {
  const userId = await requireUserId();
  const [row] = await db()
    .insert(characters)
    .values({
      ownerId: userId,
      system: PF2E,
      name: nomeDaFicha(ficha),
      // A coluna é tipada pro Shadowrun; o formato depende de `sistema`.
      draft: ficha as never,
      schemaVersion: VERSAO,
    })
    .returning({ id: characters.id });
  return row.id;
}

export async function savePf2e(id: string, raw: unknown): Promise<Date> {
  if (!UUID.test(id)) throw new NotFoundError();
  const userId = await requireUserId();
  const ficha = parseFicha(raw);
  const [row] = await db()
    .update(characters)
    .set({ draft: ficha as never, name: nomeDaFicha(ficha), schemaVersion: VERSAO, updatedAt: new Date() })
    .where(and(eq(characters.id, id), eq(characters.ownerId, userId), eq(characters.system, PF2E)))
    .returning({ updatedAt: characters.updatedAt });
  if (!row) throw new NotFoundError();
  return row.updatedAt;
}

export async function duplicatePf2e(id: string): Promise<string> {
  const { ficha } = await getPf2e(id);
  return createPf2e({ ...ficha, nome: `${nomeDaFicha(ficha)} (cópia)`.slice(0, 60) });
}
