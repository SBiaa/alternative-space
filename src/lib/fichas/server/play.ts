/**
 * Ficha em jogo: finalizar a criação, nuyen/karma, dano, anotações, inventário, missões e metas.
 * Toda função confere que a ficha é do usuário logado.
 */
import 'server-only';
import { and, asc, desc, eq, max } from 'drizzle-orm';
import type { BatchItem } from 'drizzle-orm/batch';
import { db } from '@/lib/fichas/db';
import { characters, goals, inventory, inventorySeeded, ledger, missions } from '@/lib/fichas/db/schema';
import { characterDisplayName, type Career, type CharacterDraft, emptyCareer, type Improvement } from '@/lib/fichas/sr5/character';
import { improvementFromGoal, parseCareerChoices, planGrade } from '@/lib/fichas/sr5/career';
import {
  inventoryDelta,
  inventoryFromDraft,
  ledgerReason,
  MAX_ITEM_QTY,
  parseItemNotes,
  parseNewItem,
  parsePrice,
  parseQty,
  type NewItemInput,
} from '@/lib/fichas/sr5/inventory';
import { goalCost, type GoalTarget, parseGoalTarget, parseGoalTitle } from '@/lib/fichas/sr5/goals';
import { evaluate, isComplete } from '@/lib/fichas/sr5/rules';
import {
  clampDamage,
  conditionLimits,
  InputError,
  ledgerTotals,
  MAX_NOTES_LENGTH,
  MAX_TITLE_LENGTH,
  parseLedgerInput,
  startingBalances,
} from '@/lib/fichas/sr5/play';
import { getCharacter, NotFoundError, parseDraft } from './characters';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CARRYOVER_REASON = 'Sobra da criação';
const DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Ficha do usuário, já em jogo. */
async function getActive(id: string) {
  const c = await getCharacter(id);
  if (c.status !== 'active') throw new InputError('Finalize a criação antes de usar a ficha em jogo.');
  return c;
}

export async function getPlayData(id: string) {
  const character = await getActive(id);
  await seedInventory(id, character.draft);
  const [entries, missionList, goalList, items] = await Promise.all([
    db().select().from(ledger).where(eq(ledger.characterId, id)).orderBy(desc(ledger.createdAt)),
    db().select().from(missions).where(eq(missions.characterId, id)).orderBy(desc(missions.createdAt)),
    db().select().from(goals).where(eq(goals.characterId, id)).orderBy(asc(goals.position), asc(goals.createdAt)),
    db().select().from(inventory).where(eq(inventory.characterId, id)).orderBy(asc(inventory.createdAt)),
  ]);
  const draft = await syncCareerFromGoals(id, character.draft, goalList);
  return { character: draft === character.draft ? character : { ...character, draft }, entries, missions: missionList, goals: goalList, inventory: items };
}

/**
 * Edita uma ficha que já está em jogo (autosave do assistente em modo de edição).
 * A carreira fica como está no banco. Só a diferença de equipamento vai para o
 * inventário, e a "Sobra da criação" acompanha o novo saldo.
 */
export async function saveCharacterEdit(id: string, rawDraft: unknown): Promise<Date> {
  const c = await getActive(id);
  await seedInventory(id, c.draft);
  const draft: CharacterDraft = { ...parseDraft(rawDraft), career: c.draft.career };
  const now = new Date();

  const writes: BatchItem<'pg'>[] = [];

  const changes = inventoryDelta(c.draft, draft);
  if (changes.length) {
    const rows = await db().select().from(inventory).where(eq(inventory.characterId, id)).orderBy(asc(inventory.createdAt));
    for (const change of changes) {
      const same = rows.filter((r) => r.kind === change.kind && r.itemId === change.itemId && (r.rating ?? null) === change.rating);
      if (change.qty > 0) {
        if (same[0]) {
          const qty = Math.min(same[0].qty + change.qty, MAX_ITEM_QTY);
          writes.push(db().update(inventory).set({ qty }).where(eq(inventory.id, same[0].id)));
        } else {
          writes.push(db().insert(inventory).values({ characterId: id, ...change, equipped: false, notes: '' }));
        }
        continue;
      }
      let left = -change.qty;
      for (const row of same) {
        if (left <= 0) break;
        const take = Math.min(left, row.qty);
        left -= take;
        writes.push(
          take === row.qty
            ? db().delete(inventory).where(eq(inventory.id, row.id))
            : db().update(inventory).set({ qty: row.qty - take }).where(eq(inventory.id, row.id)),
        );
      }
    }
  }

  const before = startingBalances(evaluate(c.draft));
  const after = startingBalances(evaluate(draft));
  for (const kind of ['nuyen', 'karma'] as const) {
    if (before[kind] === after[kind]) continue;
    const [entry] = await db()
      .select({ id: ledger.id })
      .from(ledger)
      .where(and(eq(ledger.characterId, id), eq(ledger.kind, kind), eq(ledger.reason, CARRYOVER_REASON)));
    if (!entry) {
      if (after[kind] > 0) writes.push(db().insert(ledger).values({ characterId: id, kind, amount: after[kind], reason: CARRYOVER_REASON }));
    } else if (after[kind] > 0) {
      writes.push(db().update(ledger).set({ amount: after[kind] }).where(eq(ledger.id, entry.id)));
    } else {
      writes.push(db().delete(ledger).where(eq(ledger.id, entry.id)));
    }
  }

  // Tudo junto (batch = transação): ficha, inventário e saldo não ficam pela metade.
  await db().batch([
    db()
      .update(characters)
      .set({ draft, name: characterDisplayName(draft), updatedAt: now })
      .where(and(eq(characters.id, id), eq(characters.ownerId, c.ownerId), eq(characters.status, 'active'))),
    ...writes,
  ]);
  return now;
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
    start.nuyen > 0 && { characterId: id, kind: 'nuyen' as const, amount: start.nuyen, reason: CARRYOVER_REASON },
    start.karma > 0 && { characterId: id, kind: 'karma' as const, amount: start.karma, reason: CARRYOVER_REASON },
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

  // Meta de atributo/perícia concluída: a ficha passa a refletir o novo nível.
  const imp = improvementFromGoal(g.id, g.title, g.target, cost, charge?.amount ?? 0, new Date());
  if (imp) await updateCareer(id, c.draft, (career) => addImprovement(career, imp));
}

function addImprovement(career: Career, imp: Improvement): Career {
  if (career.improvements.some((i) => i.key === imp.key)) return career;
  return { ...career, improvements: [...career.improvements, imp] };
}

/** Lê-modifica-grava a carreira dentro da ficha (campo `draft.career`). */
async function updateCareer(id: string, draft: CharacterDraft, fn: (c: Career) => Career): Promise<CharacterDraft> {
  const career = { ...emptyCareer(), ...draft.career };
  const next: CharacterDraft = { ...draft, career: fn(career) };
  await db().update(characters).set({ draft: next, updatedAt: new Date() }).where(eq(characters.id, id));
  return next;
}

/** Metas concluídas antes de a carreira existir entram uma vez na lista de melhorias. */
async function syncCareerFromGoals(id: string, draft: CharacterDraft, goalList: { id: string; title: string; target: GoalTarget; status: string; paid: number | null; completedAt: Date | null }[]): Promise<CharacterDraft> {
  const result = evaluate(draft);
  const have = new Set((draft.career?.improvements ?? []).map((i) => i.key));
  const missing = goalList
    .filter((g) => g.status === 'done' && !have.has(g.id))
    .map((g) => improvementFromGoal(g.id, g.title, g.target, goalCost(g.target, result, goalList.map((x) => ({ ...x, target: x.target, status: x.status as 'done' | 'active' | 'dropped' }))), g.paid ?? 0, g.completedAt ?? new Date()))
    .filter((i): i is Improvement => i !== null);
  if (!missing.length) return draft;
  return updateCareer(id, draft, (career) => missing.reduce(addImprovement, career));
}

/** Sobe um grau de iniciação (Magia) ou submersão (Ressonância), pagando em karma. */
export async function advanceGrade(id: string, kind: unknown): Promise<void> {
  const c = await getActive(id);
  const plan = planGrade(kind, c.draft, evaluate(c.draft));
  const entries = await db().select().from(ledger).where(eq(ledger.characterId, id));
  if (ledgerTotals(entries).karma < plan.cost) throw new InputError(`Faltam ${plan.cost - ledgerTotals(entries).karma} de karma.`);
  const word = plan.kind === 'initiation' ? 'Iniciação' : 'Submersão';
  await db().insert(ledger).values({ characterId: id, kind: 'karma', amount: -plan.cost, reason: `${word} grau ${plan.grade}` });
  await updateCareer(id, c.draft, (career) => ({
    ...career,
    [plan.kind === 'initiation' ? 'initiationGrade' : 'submersionGrade']: plan.grade,
    improvements: [
      ...career.improvements,
      { key: `${plan.kind}-${plan.grade}`, kind: plan.kind, label: `${word} grau ${plan.grade}`, from: plan.grade - 1, to: plan.grade, karma: plan.cost, at: new Date().toISOString() },
    ],
  }));
}

/** Metamagias, ecos, espíritos e sprites: o jogador edita à vontade (sem karma). */
export async function saveCareerChoices(id: string, raw: unknown): Promise<void> {
  const c = await getActive(id);
  const choices = parseCareerChoices(raw, { ...emptyCareer(), ...c.draft.career });
  await updateCareer(id, c.draft, (career) => ({ ...career, ...choices }));
}

export async function deleteGoal(id: string, goalId: string): Promise<void> {
  await getActive(id);
  await getGoalOf(id, goalId);
  // Gastos já lançados ficam no histórico.
  await db().delete(goals).where(eq(goals.id, goalId));
}

// ---------------------------------------------------------------------------
// Inventário

/**
 * Copia o equipamento da criação para o inventário, uma vez por ficha.
 * Vale também para fichas que já estavam em jogo antes de existir o inventário.
 * A marca e os itens entram juntos (batch = transação): se outra chamada
 * chegou antes, a marca repetida derruba o batch inteiro e nada é duplicado.
 */
async function seedInventory(id: string, draft: CharacterDraft): Promise<void> {
  const [done] = await db()
    .select({ id: inventorySeeded.characterId })
    .from(inventorySeeded)
    .where(eq(inventorySeeded.characterId, id));
  if (done) return;
  const rows = inventoryFromDraft(draft).map((i) => ({ characterId: id, ...i }));
  try {
    const mark = db().insert(inventorySeeded).values({ characterId: id });
    if (rows.length) await db().batch([mark, db().insert(inventory).values(rows)]);
    else await mark;
  } catch (e) {
    if (!isUniqueViolation(e)) throw e;
  }
}

function isUniqueViolation(e: unknown): boolean {
  for (let cur: unknown = e; cur && typeof cur === 'object'; cur = (cur as { cause?: unknown }).cause) {
    if ((cur as { code?: unknown }).code === '23505') return true;
  }
  return false;
}

async function getItemOf(characterId: string, itemId: string) {
  if (!UUID.test(itemId)) throw new NotFoundError();
  const [it] = await db()
    .select()
    .from(inventory)
    .where(and(eq(inventory.id, itemId), eq(inventory.characterId, characterId)));
  if (!it) throw new NotFoundError();
  return it;
}

/** Guarda um item novo. Com preço, desconta do nuyen como "Compra: <item>". */
export async function addInventoryItem(id: string, input: NewItemInput): Promise<void> {
  await getActive(id);
  const { price, ...item } = parseNewItem(input);
  const insertItem = db().insert(inventory).values({ characterId: id, ...item });
  if (price > 0) {
    const charge = db()
      .insert(ledger)
      .values({ characterId: id, kind: 'nuyen', amount: -price, reason: ledgerReason('Compra', item.name, item.qty) });
    await db().batch([insertItem, charge]);
  } else {
    await insertItem;
  }
}

export async function updateInventoryItem(
  id: string,
  itemId: string,
  input: { qty?: unknown; equipped?: unknown; notes?: unknown },
): Promise<void> {
  await getActive(id);
  const it = await getItemOf(id, itemId);
  const set: Partial<typeof inventory.$inferInsert> = {};
  if (input.qty !== undefined) set.qty = parseQty(input.qty);
  if (input.notes !== undefined) set.notes = parseItemNotes(input.notes);
  if (input.equipped !== undefined) {
    if (it.kind !== 'weapon' && it.kind !== 'armor') throw new InputError('Só armas e armaduras ficam "em uso".');
    set.equipped = input.equipped === true;
  }
  if (Object.keys(set).length) await db().update(inventory).set(set).where(eq(inventory.id, itemId));
}

/**
 * Tira o item do inventário (usou, perdeu, vendeu). Com `qty`, tira só essa
 * quantidade; com preço de venda, lança a entrada de nuyen como "Venda: <item>".
 * A troca só vale se a quantidade não mudou no meio do caminho.
 */
export async function removeInventoryItem(
  id: string,
  itemId: string,
  input: { qty?: unknown; salePrice?: unknown } = {},
): Promise<void> {
  await getActive(id);
  const it = await getItemOf(id, itemId);
  const qty = input.qty === undefined ? it.qty : parseQty(input.qty);
  if (qty > it.qty) throw new InputError(`Você só tem ${it.qty}.`);
  const salePrice = parsePrice(input.salePrice);

  const same = and(eq(inventory.id, itemId), eq(inventory.qty, it.qty));
  const change =
    qty === it.qty
      ? db().delete(inventory).where(same).returning({ id: inventory.id })
      : db().update(inventory).set({ qty: it.qty - qty }).where(same).returning({ id: inventory.id });
  if (salePrice > 0) {
    const sale = db()
      .insert(ledger)
      .values({ characterId: id, kind: 'nuyen', amount: salePrice, reason: ledgerReason('Venda', it.name, qty) });
    const [changed] = await db().batch([change, sale]);
    if (!changed.length) throw new InputError('O item mudou enquanto isso. Confira e tente de novo.');
  } else {
    const changed = await change;
    if (!changed.length) throw new InputError('O item mudou enquanto isso. Confira e tente de novo.');
  }
}
