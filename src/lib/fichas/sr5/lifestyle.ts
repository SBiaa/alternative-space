import type { CharacterDraft, DraftLifestyle } from './character';
import { sr5Data, type Sr5Data } from './data';
import type { Lifestyle, LifestyleQuality } from './types';

/** Meses que tornam o estilo de vida permanente (SR5 p.369). */
export const PERMANENT_MONTHS = 100;
export const MAX_ROOMMATES = 20;

/** Parte igual para cada morador, usada como padrão ao dividir os custos. */
export function equalShare(roommates: number): number {
  return Math.round((100 / (Math.max(0, roommates) + 1)) * 100) / 100;
}

export function paidPercentage(l: DraftLifestyle): number {
  if (!l.splitCost) return 100;
  const p = l.percentage ?? equalShare(l.roommates ?? 0);
  return Number.isFinite(p) ? Math.min(100, Math.max(0, p)) : 100;
}

export function lifestyleQualities(l: DraftLifestyle, data: Sr5Data = sr5Data): LifestyleQuality[] {
  return (l.qualities ?? []).flatMap((q) => data.lifestyleQualities.find((x) => x.id === q.id) ?? []);
}

const factor = (percents: number[]) => percents.reduce((n, p) => n * (1 + p / 100), 1);
const sum = (values: number[]) => values.reduce((n, v) => n + v, 0);

/**
 * Custo mensal na ordem do Chummer (HT p.139):
 * qualidades só sobre a base → demais qualidades → +10% por colega → sua parte →
 * ajustes do personagem (qualidades como Dependentes e o metatipo) → contratos.
 * Sem arredondar: contratos anuais dão fração de ¥ por mês.
 */
export function lifestyleMonthly(
  base: Lifestyle,
  l: DraftLifestyle,
  adjust: { metatypePct?: number; characterPct?: number } = {},
  data: Sr5Data = sr5Data,
): number {
  const all = lifestyleQualities(l, data);
  const regular = all.filter((q) => q.category === 'positive' || q.category === 'negative');
  let cost = base.cost * factor(all.map((q) => q.baseMultiplier));
  cost = cost * factor(regular.map((q) => q.multiplier)) + sum(regular.map((q) => q.cost));
  cost *= 1 + 0.1 * Math.max(0, l.roommates ?? 0);
  cost = Math.max(0, cost) * (paidPercentage(l) / 100);
  cost *= factor([adjust.characterPct ?? 0, adjust.metatypePct ?? 0]);
  return cost + sum(all.filter((q) => q.category === 'contract').map((q) => q.cost));
}

/** Ajustes do personagem sobre o custo: metatipo e qualidades como Dependentes. */
export function lifestyleAdjust(
  draft: Pick<CharacterDraft, 'metatypeId' | 'qualities'>,
  data: Sr5Data = sr5Data,
): { metatypePct: number; characterPct: number } {
  return {
    metatypePct: data.metatypes.find((m) => m.id === draft.metatypeId)?.bonus.lifestyleCostPct ?? 0,
    characterPct: sum(draft.qualities.flatMap((chosen) =>
      (data.qualities.find((x) => x.id === chosen.id)?.effects ?? [])
        .map((e) => (e.type === 'lifestyleCostPct' ? e.delta : 0)))),
  };
}

export function lifestyleTotal(monthly: number, months: number): number {
  return Math.round(monthly * Math.max(1, months));
}

/** Dinheiro inicial: vale a rolagem do melhor estilo de vida do personagem. */
export function startingNuyenRoll(list: DraftLifestyle[], data: Sr5Data = sr5Data): { dice: number; multiplier: number } | null {
  const average = (x: Lifestyle) => x.dice * 3.5 * x.multiplier;
  const best = list
    .flatMap((l) => data.lifestyles.find((x) => x.id === l.id) ?? [])
    .sort((a, b) => average(b) - average(a))[0];
  return best && best.dice > 0 ? { dice: best.dice, multiplier: best.multiplier } : null;
}

/** Nome do nível seguido do apelido, quando houver: Médio (“Lar”). */
export function lifestyleTitle(levelLabel: string, l: DraftLifestyle): string {
  const name = l.name?.trim();
  return name ? `${levelLabel} (“${name}”)` : levelLabel;
}

export function lifestylePlace(l: DraftLifestyle): string {
  return [l.borough, l.district, l.city].filter(Boolean).join(', ');
}

/** Colegas, divisão, qualidades e endereço em uma linha, para ficha e consulta. */
export function lifestyleDetails(l: DraftLifestyle, label: (q: LifestyleQuality) => string, data: Sr5Data = sr5Data): string {
  const mates = l.roommates ?? 0;
  const qualities = (l.qualities ?? []).flatMap((q) => {
    const x = data.lifestyleQualities.find((y) => y.id === q.id);
    if (!x) return [];
    return [q.extra?.trim() ? `${label(x)} (${q.extra.trim()})` : label(x)];
  });
  return [
    mates ? `${mates} ${mates === 1 ? 'colega' : 'colegas'}` : '',
    l.splitCost ? `paga ${paidPercentage(l).toLocaleString('pt-BR')}%` : '',
    qualities.join(', '),
    lifestylePlace(l),
  ].filter(Boolean).join(' · ');
}
