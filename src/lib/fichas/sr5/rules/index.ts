/**
 * Motor de regras de criação (prioridades, SR5).
 * Função pura: recebe o rascunho da ficha e devolve orçamentos, valores
 * derivados, problemas encontrados e o que está disponível para escolher.
 * Não depende de React; roda igual no navegador e nos testes.
 */
import type { CharacterDraft } from '../character';
import { sr5Data, type Sr5Data } from '../data';
import { applyEssence, computeAttributes } from './attributes';
import { checkContacts } from './contacts';
import { addKarma, budget, createCtx, issue } from './context';
import { computeDerived } from './derived';
import { checkMagic } from './magic';
import { checkPriorities, metatypeAvailability, talentAvailability } from './priorities';
import { checkQualities, collectQualities, qualityAvailability } from './qualities';
import { checkResources } from './resources';
import type { Budget, BudgetKey, Issue, RulesResult, StepKey } from './result';
import { STEP_ORDER } from './result';
import { checkSkills, skillAvailability } from './skills';

export * from './result';
export { ATTR_LABEL } from './attributes';
export { PRIORITY_LABEL } from './priorities';
export { WARE_GRADES, NUYEN_CARRYOVER, fmtNuyen } from './resources';
export { evalExpr } from './expr';

const BUDGET_KEYS: BudgetKey[] = [
  'attributes', 'special', 'skills', 'skillGroups', 'knowledge', 'contacts', 'karma', 'nuyen',
  'powerPoints', 'freeSpells', 'freeComplexForms', 'freeSkills', 'positiveQualities', 'negativeQualities',
];

export function evaluate(draft: CharacterDraft, data: Sr5Data = sr5Data): RulesResult {
  const ctx = createCtx(draft, data);

  checkPriorities(ctx);
  collectQualities(ctx);
  checkQualities(ctx);
  checkResources(ctx);
  computeAttributes(ctx);
  const essenceLoss = applyEssence(ctx);
  checkSkills(ctx);
  checkMagic(ctx);
  checkContacts(ctx);

  // Karma: começa com o inicial, ganha com qualidades negativas, gasta com o resto.
  addKarma(ctx, 'metatipo', ctx.metatypeOption?.karmaCost ?? 0);
  const gained = Object.values(ctx.karma).filter((n) => n < 0).reduce((a, b) => a - b, 0);
  const spent = Object.values(ctx.karma).filter((n) => n > 0).reduce((a, b) => a + b, 0);
  const karma = budget(ctx.s.startingKarma + gained, spent);
  ctx.budgets.karma = karma;
  if (karma.remaining < 0) {
    issue(ctx, 'error', 'review', 'karma.overspent',
      `O karma ficou negativo (${karma.remaining}). Tire algo comprado com karma ou pegue uma qualidade negativa.`);
  } else if (karma.remaining > ctx.s.karmaCosts.carryover) {
    issue(ctx, 'warning', 'review', 'karma.leftover',
      `Sobraram ${karma.remaining} de karma. Só ${ctx.s.karmaCosts.carryover} passam para o jogo; o resto é perdido.`);
  }

  const derived = computeDerived(ctx, essenceLoss);

  const budgets = {} as Record<BudgetKey, Budget>;
  for (const k of BUDGET_KEYS) budgets[k] = ctx.budgets[k] ?? budget(0, 0);

  return {
    budgets,
    attributes: ctx.attrs,
    derived,
    karmaBreakdown: ctx.karma,
    skillRatings: ctx.skillRatings,
    groupRatings: ctx.groupRatings,
    issues: ctx.issues,
    availability: {
      metatypes: metatypeAvailability(ctx),
      talents: talentAvailability(ctx),
      qualities: qualityAvailability(ctx),
      skills: skillAvailability(ctx),
    },
  };
}

export function issuesForStep(result: RulesResult, step: StepKey): Issue[] {
  return result.issues.filter((i) => i.step === step);
}

/** Erros que impedem sair deste passo. Avisos nunca bloqueiam. */
export function blockingErrors(result: RulesResult, step: StepKey): Issue[] {
  return result.issues.filter((i) => i.step === step && i.severity === 'error');
}

/** Primeiro passo que ainda tem erro (para o botão "corrigir"), ou undefined se a ficha está válida. */
export function firstStepWithErrors(result: RulesResult): StepKey | undefined {
  return STEP_ORDER.find((s) => blockingErrors(result, s).length > 0);
}

export function isComplete(result: RulesResult): boolean {
  return !result.issues.some((i) => i.severity === 'error');
}
