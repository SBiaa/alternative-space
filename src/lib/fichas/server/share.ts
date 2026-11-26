/**
 * Link público da ficha. Só o dono liga, troca ou desliga. Quem tem o link vê,
 * sem login e sem editar, o que `publicDraft` deixa passar.
 */
import 'server-only';
import { randomBytes } from 'node:crypto';
import { and, asc, eq } from 'drizzle-orm';
import { db } from '@/lib/fichas/db';
import { characters, inventory, sheetLinks } from '@/lib/fichas/db/schema';
import { normalizeDraft } from '@/lib/fichas/sr5/character';
import { InputError } from '@/lib/fichas/sr5/play';
import { publicDraft, publicInventory } from '@/lib/fichas/sr5/share';
import { getCharacter, NotFoundError } from './characters';

const CODE = /^[A-Za-z0-9_-]{16}$/;
const newCode = () => randomBytes(12).toString('base64url'); // 16 caracteres

/** A ficha é do usuário logado, de Shadowrun e já está em jogo. */
async function requireShareable(id: string) {
  const c = await getCharacter(id);
  if (c.system !== 'sr5' || c.status !== 'active') throw new InputError('Só uma ficha de Shadowrun em jogo pode ser compartilhada.');
  return c;
}

/**
 * Código do link ligado; null se a ficha não está compartilhada.
 * undefined se não deu para consultar (ex.: db/ficha-links.sql ainda não aplicado):
 * a ficha continua abrindo, só sem o botão de compartilhar.
 */
export async function getShareCode(id: string): Promise<string | null | undefined> {
  await requireShareable(id);
  try {
    const [row] = await db().select({ code: sheetLinks.code }).from(sheetLinks).where(eq(sheetLinks.characterId, id));
    return row?.code ?? null;
  } catch (e) {
    console.error('Falha ao ler o link público da ficha', e);
    return undefined;
  }
}

export async function enableShare(id: string): Promise<void> {
  await requireShareable(id);
  await db().insert(sheetLinks).values({ characterId: id, code: newCode() }).onConflictDoNothing();
}

/** Gera um código novo: o link antigo para de funcionar. */
export async function renewShare(id: string): Promise<void> {
  await requireShareable(id);
  await db().update(sheetLinks).set({ code: newCode(), createdAt: new Date() }).where(eq(sheetLinks.characterId, id));
}

export async function disableShare(id: string): Promise<void> {
  await requireShareable(id);
  await db().delete(sheetLinks).where(eq(sheetLinks.characterId, id));
}

/** Leitura pública: não confere login. O código é a única chave. */
export async function getPublicSheet(code: string) {
  if (!CODE.test(code)) throw new NotFoundError();
  const [row] = await db()
    .select({
      id: characters.id,
      name: characters.name,
      draft: characters.draft,
      physical: characters.physicalDamage,
      stun: characters.stunDamage,
    })
    .from(sheetLinks)
    .innerJoin(characters, eq(characters.id, sheetLinks.characterId))
    .where(and(eq(sheetLinks.code, code), eq(characters.system, 'sr5'), eq(characters.status, 'active')));
  if (!row) throw new NotFoundError();
  const items = await db().select().from(inventory).where(eq(inventory.characterId, row.id)).orderBy(asc(inventory.createdAt));
  return {
    name: row.name,
    draft: publicDraft(normalizeDraft(row.draft)),
    inventory: publicInventory(items),
    physical: row.physical,
    stun: row.stun,
  };
}
