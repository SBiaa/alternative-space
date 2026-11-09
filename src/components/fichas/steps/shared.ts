import { label, sr5Data } from '@/lib/fichas/sr5/data';
import type { PriorityCategory, PriorityLetter, TalentKey, TalentOption } from '@/lib/fichas/sr5/types';

export const LETTERS: PriorityLetter[] = ['A', 'B', 'C', 'D', 'E'];

/** Um talento de cada tipo (a versão da prioridade mais alta), para listar opções. */
export function talentKinds(): { key: TalentKey; name: string }[] {
  const seen = new Map<TalentKey, string>();
  for (const l of LETTERS) {
    for (const t of sr5Data.priorities.rows[l].talents) {
      if (!seen.has(t.key)) seen.set(t.key, shortTalent(t));
    }
  }
  return [...seen].map(([key, name]) => ({ key, name }));
}

export function shortTalent(t: TalentOption): string {
  return label(t).replace(/\s*-.*$/, '');
}

export function talentAt(letter: PriorityLetter | undefined, key: TalentKey | undefined): TalentOption | undefined {
  if (!letter || !key) return undefined;
  return sr5Data.priorities.rows[letter].talents.find((t) => t.key === key);
}

/** Atribui uma letra a uma categoria trocando com quem já tinha essa letra. */
export function assignPriority(
  current: Partial<Record<PriorityCategory, PriorityLetter>>,
  cat: PriorityCategory,
  letter: PriorityLetter,
): Partial<Record<PriorityCategory, PriorityLetter>> {
  const next = { ...current };
  const holder = (Object.keys(next) as PriorityCategory[]).find((c) => next[c] === letter && c !== cat);
  const old = next[cat];
  next[cat] = letter;
  if (holder) {
    if (old) next[holder] = old;
    else delete next[holder];
  }
  return next;
}

export const nf = (n: number) => n.toLocaleString('pt-BR');
export const fmtEss = (n: number) => n.toFixed(2).replace('.', ',');
