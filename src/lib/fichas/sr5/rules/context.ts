import type { CharacterDraft } from '../character';
import { label, type Sr5Data } from '../data';
import type {
  AttrKey,
  CreationSettings,
  Metatype,
  PriorityCategory,
  PriorityLetter,
  PriorityMetatypeOption,
  PriorityRow,
  Quality,
  QualityEffect,
  Skill,
  SkillGroup,
  TalentKey,
  TalentOption,
} from '../types';
import type { AttributeState, Budget, BudgetKey, Issue, Severity, StepKey } from './result';

export interface ActiveEffect {
  effect: QualityEffect;
  qualityId: string;
  rating: number;
  choice?: string;
}

/** Estado compartilhado entre os módulos de regra durante uma avaliação. */
export interface Ctx {
  draft: CharacterDraft;
  data: Sr5Data;
  s: CreationSettings;
  rows: Partial<Record<PriorityCategory, PriorityRow>>;
  metatype?: Metatype;
  metatypeOption?: PriorityMetatypeOption;
  talent?: TalentOption;
  /** Qualidades que o personagem tem: raciais + do talento + escolhidas. */
  ownedQualityIds: Set<string>;
  effects: ActiveEffect[];
  attrs: Record<AttrKey, AttributeState>;
  essence: number;
  issues: Issue[];
  karma: Record<string, number>;
  budgets: Partial<Record<BudgetKey, Budget>>;
  skillRatings: Record<string, number>;
  groupRatings: Record<string, number>;
  idx: {
    skills: Map<string, Skill>;
    groups: Map<string, SkillGroup>;
    qualities: Map<string, Quality>;
  };
}

export function createCtx(draft: CharacterDraft, data: Sr5Data): Ctx {
  const rows: Ctx['rows'] = {};
  for (const [cat, letter] of Object.entries(draft.priorities) as [PriorityCategory, PriorityLetter][]) {
    if (letter && data.priorities.rows[letter]) rows[cat] = data.priorities.rows[letter];
  }
  const metatype = data.metatypes.find((m) => m.id === draft.metatypeId);
  const metatypeOption = rows.metatype?.metatypes.find((m) => m.metatypeId === draft.metatypeId);
  const talent = draft.talent ? rows.talent?.talents.find((t) => t.key === draft.talent) : undefined;

  const emptyAttr = (): AttributeState => ({ min: 0, max: 0, base: 0, value: 0, karma: 0, atMax: false });
  const attrs = {} as Record<AttrKey, AttributeState>;
  for (const k of ['BOD', 'AGI', 'REA', 'STR', 'CHA', 'INT', 'LOG', 'WIL', 'EDG', 'MAG', 'RES', 'ESS'] as AttrKey[]) {
    attrs[k] = emptyAttr();
  }

  return {
    draft,
    data,
    s: data.settings,
    rows,
    metatype,
    metatypeOption,
    talent,
    ownedQualityIds: new Set(),
    effects: [],
    attrs,
    essence: 6,
    issues: [],
    karma: {},
    budgets: {},
    skillRatings: {},
    groupRatings: {},
    idx: {
      skills: new Map(data.skills.skills.map((x) => [x.id, x])),
      groups: new Map(data.skills.groups.map((x) => [x.id, x])),
      qualities: new Map(data.qualities.map((x) => [x.id, x])),
    },
  };
}

export function issue(
  ctx: Ctx,
  severity: Severity,
  step: StepKey,
  code: string,
  message: string,
  path?: string,
): void {
  ctx.issues.push(path ? { severity, step, code, message, path } : { severity, step, code, message });
}

export function addKarma(ctx: Ctx, key: string, amount: number): void {
  if (amount === 0) return;
  ctx.karma[key] = (ctx.karma[key] ?? 0) + amount;
}

export function budget(total: number, spent: number): Budget {
  return { total, spent: round2(spent), remaining: round2(total - spent) };
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** "A", "A ou B", "B, C ou D". */
export function joinLetters(letters: string[]): string {
  if (letters.length <= 1) return letters.join('');
  return `${letters.slice(0, -1).join(', ')} ou ${letters[letters.length - 1]}`;
}

/** "Falta 1 magia" / "Faltam 2 magias". */
export function missing(n: number, one: string, many: string): string {
  return `${n === 1 ? 'Falta' : 'Faltam'} ${pluralize(n, one, many)}`;
}

export function pluralize(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

// ---------------------------------------------------------------------------
// Perguntas frequentes sobre o talento

export const talentKey = (ctx: Ctx): TalentKey | undefined => ctx.talent?.key;

/** Usa magias (Mago, Adepto Místico, Mago de Aspecto com Feitiçaria). */
export function castsSpells(ctx: Ctx): boolean {
  const k = talentKey(ctx);
  if (k === 'magician' || k === 'mysticAdept') return true;
  return k === 'aspectedMagician' && ctx.draft.magic.freeSkillGroupId === 'sorcery';
}

export function hasPowers(ctx: Ctx): boolean {
  const k = talentKey(ctx);
  return k === 'adept' || k === 'mysticAdept';
}

export function needsTradition(ctx: Ctx): boolean {
  const k = talentKey(ctx);
  return k === 'magician' || k === 'mysticAdept' || k === 'aspectedMagician';
}

export function isAwakened(ctx: Ctx): boolean {
  return (ctx.talent?.magic ?? 0) > 0;
}

export function isEmerged(ctx: Ctx): boolean {
  return (ctx.talent?.resonance ?? 0) > 0;
}

export function talentLabel(ctx: Ctx): string {
  return ctx.talent ? label(ctx.talent).replace(/\s*-.*$/, '') : 'seu talento';
}
