/**
 * Ficha em jogo: finalizar a criação, nuyen/karma, dano, anotações, missões e metas.
 * Toda função confere que a ficha é do usuário logado.
 */
import 'server-only';
import { and, asc, desc, eq, max } from 'drizzle-orm';
import { db } from '@/lib/fichas/db';
import { characters, goals, ledger, missions } from '@/lib/fichas/db/schema';
import { goalCost, parseGoalTarget, parseGoalTitle } from '@/lib/fichas/sr5/goals';
import { evaluate, isComplete } from '@/lib/fichas/sr5/rules';
import {
  clampDamage,
  conditionLimits,
  InputError,
  MAX_NOTES_LENGTH,
  MAX_TITLE_LENGTH,
  parseLedgerInput,
  startingBalances,
} from '@/lib/fichas/sr5/play';
import { getCharacter, NotFoundError } from './characters';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Ficha do usuário, já em jogo. */
async function getActive(id: string) {
  const c = await getCharacter(id);
  if (c.status !== 'active') throw new InputError('Finalize a criação antes de usar a ficha em jogo.');
  return c;
}

export async function getPlayData(id: string) {
  const character = await getActive(id);
  const [entries, missionList, goalList] = await Promise.all([
    db().select().from(ledger).where(eq(ledger.characterId, id)).orderBy(desc(ledger.createdAt)),
    db().select().from(missions).where(eq(missions.characterId, id)).orderBy(desc(missions.createdAt)),
    db().select().from(goals).where(eq(goals.characterId, id)).orderBy(asc(goals.position), asc(goals.createdAt)),
  ]);
  return { character, entries, missions: missionList, goals: goalList };
}

/**
 * Trava a criação e lança o nuyen e o karma que sobraram (até 5.000¥ e 7 de karma).
 * Só uma chamada vence: o update exige status 'draft'.
 */
export async function finalizeCharacter(id: string): Promise<void> {
  const c = await getCharacter(id);
  if (c.status !== 'draft') throw new InputError('Essa ficha já foi finalizada.');
  const result = evaluate(c.draft);
  if (!isComplete(result)) throw new InputError('Ainda há erros na ficha. Corrija na Revisão antes de finalizar.');

  const [updated] = await db()
    .update(characters)
    .set({ status: 'active', activatedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(characters.id, id), eq(characters.ownerId, c.ownerId), eq(characters.status, 'draft')))
    .returning({ id: characters.id });
  if (!updated) throw new InputError('Essa ficha já foi finalizada.');

  const start = startingBalances(result);
  const rows = [
    start.nuyen > 0 && { characterId: id, kind: 'nuyen' as const, amount: start.nuyen, reason: 'Sobra da criação' },
    start.karma > 0 && { characterId: id, kind: 'karma' as const, amount: start.karma, reason: 'Sobra da criação' },
  ].filter((r) => r !== false);
  if (rows.length) await db().insert(ledger).values(rows);
}

export async function addLedgerEntry(
  id: string,
  input: { kind: unknown; amount: unknown; reason: unknown; missionId?: unknown },
): Promise<void> {
  await getActive(id);
  const entry = parseLedgerInput(input);
  const missionId = typeof input.missionId === 'string' && UUID.test(input.missionId) ? input.missionId : null;
  if (missionId) await getMissionOf(id, missionId);
  await db().insert(ledger).values({ characterId: id, ...entry, missionId });
}

/** Desfaz um lançamento (para corrigir erro de digitação). */
export async function deleteLedgerEntry(id: string, entryId: string): Promise<void> {
  if (!UUID.test(entryId)) throw new NotFoundError();
  await getActive(id);
  const deleted = await db()
    .delete(ledger)
    .where(and(eq(ledger.id, entryId), eq(ledger.characterId, id)))
    .returning({ id: ledger.id });
  if (!deleted.length) throw new NotFoundError();
}

export async function setDamage(id: string, physical: unknown, stun: unknown): Promise<void> {
  const c = await getActive(id);
  const limits = conditionLimits(evaluate(c.draft));
  await db()
    .update(characters)
    .set({
      physicalDamage: clampDamage(physical, 'physical', limits),
      stunDamage: clampDamage(stun, 'stun', limits),
      updatedAt: new Date(),
    })
    .where(eq(characters.id, id));
}

export async function setPlayNotes(id: string, notes: unknown): Promise<void> {
  await getActive(id);
  const text = typeof notes === 'string' ? notes : '';
  if (text.length > MAX_NOTES_LENGTH) throw new InputError('Anotações grandes demais.');
  await db().update(characters).set({ playNotes: text, updatedAt: new Date() }).where(eq(characters.id, id));
}

// ---------------------------------------------------------------------------
// Missões

async function getMissionOf(characterId: string, missionId: string) {
  if (!UUID.test(missionId)) throw new NotFoundError();
  const [m] = await db()
    .select({ id: missions.id })
    .from(missions)
    .where(and(eq(missions.id, missionId), eq(missions.characterId, characterId)));
  if (!m) throw new NotFoundError();
  return m;
}

function parseTitle(title: unknown): string {
  const t = typeof title === 'string' ? title.trim() : '';
  if (!t) throw new InputError('Dê um nome para a missão.');
  if (t.length > MAX_TITLE_LENGTH) throw new InputError(`Nome com no máximo ${MAX_TITLE_LENGTH} letras.`);
  return t;
}

function parseDate(value: unknown): string | null {
  return typeof value === 'string' && DATE.test(value) ? value : null;
}

export async function createMission(id: string, input: { title: unknown; playedOn?: unknown }): Promise<string> {
  await getActive(id);
  const [m] = await db()
    .insert(missions)
    .values({ characterId: id, title: parseTitle(input.title), playedOn: parseDate(input.playedOn) })
    .returning({ id: missions.id });
  return m.id;
}

export async function updateMission(
  id: string,
  missionId: string,
  input: { title?: unknown; status?: unknown; notes?: unknown; playedOn?: unknown },
): Promise<void> {
  await getActive(id);
  await getMissionOf(id, missionId);
  const set: Partial<typeof missions.$inferInsert> = { updatedAt: new Date() };
  if (input.title !== undefined) set.title = parseTitle(input.title);
  if (input.status === 'planned' || input.status === 'active' || input.status === 'done') set.status = input.status;
  if (input.notes !== undefined) {
    const notes = typeof input.notes === 'string' ? input.notes : '';
    if (notes.length > MAX_NOTES_LENGTH) throw new InputError('Anotações grandes demais.');
    set.notes = notes;
  }
  if (input.playedOn !== undefined) set.playedOn = parseDate(input.playedOn);
  await db().update(missions).set(set).where(eq(missions.id, missionId));
}

export async function deleteMission(id: string, missionId: string): Promise<void> {
  await getActive(id);
  await getMissionOf(id, missionId);
  // Os lançamentos ligados à missão ficam (o saldo não muda); só perdem o vínculo.
  await db().delete(missions).where(eq(missions.id, missionId));
}


// ---------------------------------------------------------------------------
// Metas

async function getGoalOf(characterId: string, goalId: string) {
  if (!UUID.test(goalId)) throw new NotFoundError();
  const [g] = await db()
    .select()
    .from(goals)
    .where(and(eq(goals.id, goalId), eq(goals.characterId, characterId)));
  if (!g) throw new NotFoundError();
  return g;
}

function parseNotes(notes: unknown): string {
  const text = typeof notes === 'string' ? notes : '';
  if (text.length > MAX_NOTES_LENGTH) throw new InputError('Anotações grandes demais.');
  return text;
}

export async function createGoal(
  id: string,
  input: { title: unknown; target: unknown; notes?: unknown },
): Promise<string> {
  await getActive(id);
  const title = parseGoalTitle(input.title);
  const target = parseGoalTarget(input.target);
  const [{ last }] = await db()
    .select({ last: max(goals.position) })
    .from(goals)
    .where(eq(goals.characterId, id));
  const [g] = await db()
    .insert(goals)
    .values({ characterId: id, title, target, notes: parseNotes(input.notes), position: (last ?? -1) + 1 })
    .returning({ id: goals.id });
  return g.id;
}

export async function updateGoal(
  id: string,
  goalId: string,
  input: { title?: unknown; notes?: unknown; status?: unknown },
): Promise<void> {
  await getActive(id);
  const g = await getGoalOf(id, goalId);
  const set: Partial<typeof goals.$inferInsert> = {};
  if (input.title !== undefined) set.title = parseGoalTitle(input.title);
  if (input.notes !== undefined) set.notes = parseNotes(input.notes);
  // Concluir passa por completeGoal; aqui só desistir ou voltar a perseguir.
  if (input.status === 'active' || input.status === 'dropped') {
    if (g.status === 'done') throw new InputError('Meta já concluída.');
    set.status = input.status;
  }
  if (Object.keys(set).length) await db().update(goals).set(set).where(eq(goals.id, goalId));
}

/** Troca a meta de lugar com a vizinha de cima (-1) ou de baixo (+1) entre as ativas. */
export async function moveGoal(id: string, goalId: string, direction: unknown): Promise<void> {
  if (direction !== -1 && direction !== 1) throw new InputError('Direção inválida.');
  await getActive(id);
  await getGoalOf(id, goalId);
  const active = await db()
    .select({ id: goals.id, position: goals.position })
    .from(goals)
    .where(and(eq(goals.characterId, id), eq(goals.status, 'active')))
    .orderBy(asc(goals.position), asc(goals.createdAt));
  const i = active.findIndex((g) => g.id === goalId);
  const j = i + direction;
  if (i < 0 || j < 0 || j >= active.length) return;
  // Renumera tudo na ordem nova (evita empates de posição).
  [active[i], active[j]] = [active[j], active[i]];
  await Promise.all(
    active.map((g, position) => db().update(goals).set({ position }).where(eq(goals.id, g.id))),
  );
}

/**
 * Conclui a meta. Com `pay`, lança o custo no histórico (karma ou nuyen) como
 * "Meta: <nome>". Só uma chamada vence: o update exige status 'active'.
 */
export async function completeGoal(id: string, goalId: string, pay: unknown): Promise<void> {
  const c = await getActive(id);
  const g = await getGoalOf(id, goalId);
  if (g.status !== 'active') throw new InputError('Essa meta não está ativa.');
  const all = await db().select().from(goals).where(eq(goals.characterId, id));
  const cost = goalCost(g.target, evaluate(c.draft), all);
  const charge = pay === true && cost.currency && cost.amount > 0 ? cost : null;

  const [done] = await db()
    .update(goals)
    .set({ status: 'done', completedAt: new Date(), paid: charge ? charge.amount : null })
    .where(and(eq(goals.id, goalId), eq(goals.status, 'active')))
    .returning({ id: goals.id });
  if (!done) throw new InputError('Essa meta não está ativa.');

  if (charge?.currency) {
    await db()
      .insert(ledger)
      .values({ characterId: id, kind: charge.currency, amount: -charge.amount, reason: `Meta: ${g.title}` });
  }
}

export async function deleteGoal(id: string, goalId: string): Promise<void> {
  await getActive(id);
  await getGoalOf(id, goalId);
  // Gastos já lançados ficam no histórico.
  await db().delete(goals).where(eq(goals.id, goalId));
}
