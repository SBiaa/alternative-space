/**
 * Metas do personagem e custo de evolução (SR5: novo nível × multiplicador, passo a passo).
 * Funções puras, usadas no servidor (validação) e na tela (planejamento).
 */
import type { CoreAttr, SpecialAttr } from './character';
import { label, sr5Data } from './data';
import { InputError, MAX_TITLE_LENGTH } from './play';
import { ATTR_LABEL, fmtNuyen, type RulesResult } from './rules';
import { stepCost } from './rules/attributes';

export type GoalAttr = CoreAttr | SpecialAttr;

export const GOAL_ATTRS: readonly GoalAttr[] = [
  'BOD', 'AGI', 'REA', 'STR', 'CHA', 'INT', 'LOG', 'WIL', 'EDG', 'MAG', 'RES',
];

export type GoalTarget =
  | { kind: 'attribute'; attr: GoalAttr; rating: number }
  | { kind: 'skill'; skillId: string; rating: number }
  | { kind: 'skillGroup'; groupId: string; rating: number }
  | { kind: 'specialization'; skillId: string; name: string }
  | { kind: 'karma'; cost: number }
  | { kind: 'nuyen'; cost: number }
  | { kind: 'story' };

export type GoalKind = GoalTarget['kind'];

export const GOAL_KIND_LABEL: Record<GoalKind, string> = {
  attribute: 'Subir atributo',
  skill: 'Subir perícia',
  skillGroup: 'Subir grupo de perícias',
  specialization: 'Especialização',
  karma: 'Outro gasto de karma',
  nuyen: 'Comprar algo (nuyen)',
  story: 'Objetivo de história',
};

export type GoalStatus = 'active' | 'done' | 'dropped';

export interface GoalLike {
  id: string;
  target: GoalTarget;
  status: GoalStatus;
}

const MAX_RATING = 12;
const MAX_COST = 10_000_000;
const MAX_SPEC = 60;

const costs = () => sr5Data.settings.karmaCosts;
const skillById = (id: string) => sr5Data.skills.skills.find((s) => s.id === id);
const groupById = (id: string) => sr5Data.skills.groups.find((g) => g.id === id);

/** Karma para subir de `from` até `to` (mesma conta da criação). */
export const advanceCost = stepCost;

function rating(v: unknown): number {
  const n = typeof v === 'number' ? v : Number(v);
  if (!Number.isInteger(n) || n < 1 || n > MAX_RATING) throw new InputError(`Nível entre 1 e ${MAX_RATING}.`);
  return n;
}

function cost(v: unknown): number {
  const n = typeof v === 'number' ? v : Number(v);
  if (!Number.isInteger(n) || n < 1 || n > MAX_COST) throw new InputError('Informe um custo inteiro maior que zero.');
  return n;
}

/** Valida a meta vinda do navegador. Lança InputError com mensagem pronta. */
export function parseGoalTarget(raw: unknown): GoalTarget {
  const t = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  switch (t.kind) {
    case 'attribute':
      if (!GOAL_ATTRS.includes(t.attr as GoalAttr)) throw new InputError('Escolha um atributo.');
      return { kind: 'attribute', attr: t.attr as GoalAttr, rating: rating(t.rating) };
    case 'skill':
      if (typeof t.skillId !== 'string' || !skillById(t.skillId)) throw new InputError('Escolha uma perícia.');
      return { kind: 'skill', skillId: t.skillId, rating: rating(t.rating) };
    case 'skillGroup':
      if (typeof t.groupId !== 'string' || !groupById(t.groupId)) throw new InputError('Escolha um grupo de perícias.');
      return { kind: 'skillGroup', groupId: t.groupId, rating: rating(t.rating) };
    case 'specialization': {
      if (typeof t.skillId !== 'string' || !skillById(t.skillId)) throw new InputError('Escolha uma perícia.');
      const name = typeof t.name === 'string' ? t.name.trim() : '';
      if (!name || name.length > MAX_SPEC) throw new InputError('Diga qual especialização.');
      return { kind: 'specialization', skillId: t.skillId, name };
    }
    case 'karma':
      return { kind: 'karma', cost: cost(t.cost) };
    case 'nuyen':
      return { kind: 'nuyen', cost: cost(t.cost) };
    case 'story':
      return { kind: 'story' };
    default:
      throw new InputError('Escolha o tipo de meta.');
  }
}

export function parseGoalTitle(raw: unknown): string {
  const t = typeof raw === 'string' ? raw.trim() : '';
  if (!t) throw new InputError('Dê um nome para a meta.');
  if (t.length > MAX_TITLE_LENGTH) throw new InputError(`Nome com no máximo ${MAX_TITLE_LENGTH} letras.`);
  return t;
}

/** Chave do que a meta melhora (para encadear metas do mesmo atributo/perícia). */
function subjectKey(t: GoalTarget): string | null {
  if (t.kind === 'attribute') return `attr:${t.attr}`;
  if (t.kind === 'skill') return `skill:${t.skillId}`;
  if (t.kind === 'skillGroup') return `group:${t.groupId}`;
  return null;
}

/**
 * Nível atual: o da criação ou o mais alto já alcançado por metas concluídas.
 * (Metas concluídas ainda não alteram a ficha; isto é o que encadeia "4→5" e "5→6".)
 */
export function currentRating(t: GoalTarget, result: RulesResult, goals: GoalLike[]): number {
  let base = 0;
  if (t.kind === 'attribute') base = result.attributes[t.attr]?.value ?? 0;
  else if (t.kind === 'skill') base = result.skillRatings[t.skillId] ?? 0;
  else if (t.kind === 'skillGroup') base = result.groupRatings[t.groupId] ?? 0;
  else return 0;
  const key = subjectKey(t);
  for (const g of goals) {
    if (g.status !== 'done' || subjectKey(g.target) !== key) continue;
    if ('rating' in g.target) base = Math.max(base, g.target.rating);
  }
  return base;
}

export interface GoalCost {
  currency: 'karma' | 'nuyen' | null;
  amount: number;
  from?: number;
  to?: number;
  /** Já está nesse nível (ou acima). */
  reached?: boolean;
  /** Passa do máximo natural do atributo. */
  overMax?: number;
}

export function goalCost(t: GoalTarget, result: RulesResult, goals: GoalLike[]): GoalCost {
  const c = costs();
  switch (t.kind) {
    case 'attribute': {
      const from = currentRating(t, result, goals);
      const max = result.attributes[t.attr]?.max ?? 0;
      return {
        currency: 'karma',
        amount: advanceCost(from, t.rating, c.attribute),
        from,
        to: t.rating,
        reached: from >= t.rating,
        overMax: max > 0 && t.rating > max ? max : undefined,
      };
    }
    case 'skill': {
      const from = currentRating(t, result, goals);
      return { currency: 'karma', amount: advanceCost(from, t.rating, c.improveActiveSkill), from, to: t.rating, reached: from >= t.rating };
    }
    case 'skillGroup': {
      const from = currentRating(t, result, goals);
      return { currency: 'karma', amount: advanceCost(from, t.rating, c.improveSkillGroup), from, to: t.rating, reached: from >= t.rating };
    }
    case 'specialization':
      return { currency: 'karma', amount: c.specialization };
    case 'karma':
      return { currency: 'karma', amount: t.cost };
    case 'nuyen':
      return { currency: 'nuyen', amount: t.cost };
    case 'story':
      return { currency: null, amount: 0 };
  }
}

/** Texto curto do que a meta pede, ex.: "Agilidade 4 → 6". */
export function goalSummary(t: GoalTarget, cost: GoalCost): string {
  const arrow = cost.from !== undefined ? ` ${cost.from} → ${cost.to}` : '';
  switch (t.kind) {
    case 'attribute':
      return `${ATTR_LABEL[t.attr]}${arrow}`;
    case 'skill': {
      const s = skillById(t.skillId);
      return `${s ? label(s) : 'Perícia'}${arrow}`;
    }
    case 'skillGroup': {
      const g = groupById(t.groupId);
      return `Grupo ${g ? label(g) : ''}${arrow}`;
    }
    case 'specialization': {
      const s = skillById(t.skillId);
      return `${s ? label(s) : 'Perícia'} (${t.name})`;
    }
    case 'karma':
      return `${t.cost} de karma`;
    case 'nuyen':
      return fmtNuyen(t.cost);
    case 'story':
      return 'Objetivo de história';
  }
}

export interface PlannedGoal {
  id: string;
  cost: GoalCost;
  /** Dá para pagar agora, seguindo a ordem das metas ativas. */
  affordable: boolean;
  /** Quanto falta (na moeda da meta), contando as metas anteriores na ordem. */
  missing: number;
}

/**
 * Percorre as metas ativas na ordem de prioridade e vê até onde o saldo dá.
 * Uma meta que não cabe não "trava" as de baixo: elas ainda podem caber.
 */
export function planGoals(
  goals: (GoalLike & { position: number })[],
  result: RulesResult,
  balances: { karma: number; nuyen: number },
): Map<string, PlannedGoal> {
  const left = { karma: balances.karma, nuyen: balances.nuyen };
  const plan = new Map<string, PlannedGoal>();
  const active = goals.filter((g) => g.status === 'active').sort((a, b) => a.position - b.position);
  for (const g of active) {
    const c = goalCost(g.target, result, goals);
    if (!c.currency || c.reached || c.amount === 0) {
      plan.set(g.id, { id: g.id, cost: c, affordable: true, missing: 0 });
      continue;
    }
    const have = left[c.currency];
    const affordable = have >= c.amount;
    if (affordable) left[c.currency] -= c.amount;
    plan.set(g.id, { id: g.id, cost: c, affordable, missing: affordable ? 0 : c.amount - Math.max(have, 0) });
  }
  return plan;
}
