/**
 * Carreira: o que o personagem ganha depois da criação (evolução, iniciação,
 * metamagias, ecos e espíritos/sprites). Funções puras, usadas no servidor
 * (validação) e na tela.
 */
import type { Career, CharacterDraft, Companion, Improvement } from './character';
import { emptyCareer } from './character';
import { sr5Data } from './data';
import type { GoalCost, GoalTarget } from './goals';
import { InputError } from './play';
import { evalExpr, type RulesResult } from './rules';

export const MAX_COMPANIONS = 30;
export const MAX_FORCE = 12;
export const MAX_GRADE = 20;
export const MAX_COMPANION_NAME = 60;

/** Melhoria registrada a partir de uma meta concluída (null quando a meta não muda a ficha). */
export function improvementFromGoal(
  goalId: string,
  title: string,
  target: GoalTarget,
  cost: GoalCost,
  paid: number,
  at: Date,
): Improvement | null {
  const base = { key: goalId, label: title, karma: paid, at: at.toISOString() };
  switch (target.kind) {
    case 'attribute':
      return { ...base, kind: 'attribute', ref: target.attr, from: cost.from, to: target.rating };
    case 'skill':
      return { ...base, kind: 'skill', ref: target.skillId, from: cost.from, to: target.rating };
    case 'skillGroup':
      return { ...base, kind: 'skillGroup', ref: target.groupId, from: cost.from, to: target.rating };
    case 'specialization':
      return { ...base, kind: 'specialization', ref: target.skillId, label: `${title} (${target.name})` };
    default:
      return null;
  }
}

/** Karma para o próximo grau de iniciação ou submersão: fixo + por grau × novo grau. */
export function gradeCost(newGrade: number): number {
  const { flat, perGrade } = sr5Data.settings.initiation;
  return flat + perGrade * newGrade;
}

export type GradeKind = 'initiation' | 'submersion';

export interface GradePlan {
  kind: GradeKind;
  grade: number;
  cost: number;
}

/** Valida que o personagem pode subir de grau e devolve o custo. */
export function planGrade(kind: unknown, draft: CharacterDraft, result: RulesResult): GradePlan {
  if (kind !== 'initiation' && kind !== 'submersion') throw new InputError('Escolha iniciação ou submersão.');
  const career = { ...emptyCareer(), ...draft.career };
  if (kind === 'initiation') {
    if ((result.attributes.MAG?.value ?? 0) <= 0) throw new InputError('Só quem tem Magia pode se iniciar.');
    if (career.initiationGrade >= MAX_GRADE) throw new InputError('Grau máximo.');
    const grade = career.initiationGrade + 1;
    return { kind, grade, cost: gradeCost(grade) };
  }
  if ((result.attributes.RES?.value ?? 0) <= 0) throw new InputError('Só quem tem Ressonância pode submergir.');
  if (career.submersionGrade >= MAX_GRADE) throw new InputError('Grau máximo.');
  const grade = career.submersionGrade + 1;
  return { kind, grade, cost: gradeCost(grade) };
}

function pickIds(v: unknown, what: string, known: Set<string>, max: number): string[] {
  if (!Array.isArray(v)) throw new InputError(`Lista de ${what} inválida.`);
  const out = [...new Set(v.filter((x): x is string => typeof x === 'string'))];
  if (out.some((id) => !known.has(id))) throw new InputError(`Lista de ${what}: item desconhecido.`);
  if (out.length > max) throw new InputError(`Com o grau atual você só pode ter ${max} ${what}.`);
  return out;
}

export interface CareerChoices {
  metamagicIds: string[];
  echoIds: string[];
  companions: Companion[];
}

/** Valida o que o jogador escolhe livremente: metamagias, ecos e companheiros. */
export function parseCareerChoices(raw: unknown, career: Career): CareerChoices {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const metamagicIds = pickIds(r.metamagicIds ?? [], 'metamagias', new Set(sr5Data.metamagics.map((m) => m.id)), career.initiationGrade);
  const echoIds = pickIds(r.echoIds ?? [], 'ecos', new Set(sr5Data.echoes.map((m) => m.id)), career.submersionGrade);

  const list = Array.isArray(r.companions) ? r.companions : [];
  if (list.length > MAX_COMPANIONS) throw new InputError(`No máximo ${MAX_COMPANIONS} espíritos e sprites.`);
  const spirits = new Set(sr5Data.spirits.map((s) => s.id));
  const int = (n: unknown, min: number, max: number, what: string) => {
    const v = typeof n === 'number' ? n : Number(n);
    if (!Number.isInteger(v) || v < min || v > max) throw new InputError(`${what} entre ${min} e ${max}.`);
    return v;
  };
  const companions = list.map((c): Companion => {
    const x = (c && typeof c === 'object' ? c : {}) as Record<string, unknown>;
    if (typeof x.key !== 'string' || !x.key || x.key.length > 64) throw new InputError('Companheiro inválido.');
    if (typeof x.spiritId !== 'string' || !spirits.has(x.spiritId)) throw new InputError('Espírito ou sprite desconhecido.');
    const name = typeof x.name === 'string' ? x.name.trim().slice(0, MAX_COMPANION_NAME) : '';
    return {
      key: x.key,
      spiritId: x.spiritId,
      force: int(x.force, 1, MAX_FORCE, 'Força/Nível'),
      services: int(x.services ?? 0, 0, 99, 'Serviços'),
      bound: x.bound === true,
      ...(name ? { name } : {}),
    };
  });
  return { metamagicIds, echoIds, companions };
}

/** Valor de um atributo de espírito/sprite (expressão em F) para a Força/Nível dada. */
export function spiritAttr(expr: string | undefined, force: number): number | null {
  if (!expr) return null;
  const v = evalExpr(expr.replace(/F/g, String(force)));
  return v === null ? null : Math.max(0, Math.round(v));
}
