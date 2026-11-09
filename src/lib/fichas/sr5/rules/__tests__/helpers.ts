import { createEmptyDraft, type CharacterDraft, type CoreAttr } from '../../character';
import { sr5Data } from '../../data';
import type { RulesResult, Severity } from '../result';

const find = <T extends { name: string }>(list: T[], name: string, what: string): T => {
  const x = list.find((i) => i.name === name);
  if (!x) throw new Error(`${what} não encontrado: ${name}`);
  return x;
};

export const ids = {
  metatype: (n: string) => find(sr5Data.metatypes, n, 'metatipo').id,
  skill: (n: string) => find(sr5Data.skills.skills, n, 'perícia').id,
  quality: (n: string) => find(sr5Data.qualities, n, 'qualidade').id,
  power: (n: string) => find(sr5Data.powers, n, 'poder').id,
  tradition: (n: string) => find(sr5Data.traditions, n, 'tradição').id,
  stream: (n: string) => find(sr5Data.streams, n, 'corrente').id,
  cyberware: (n: string) => find(sr5Data.cyberware, n, 'ciberware').id,
  lifestyle: (n: string) => find(sr5Data.lifestyles, n, 'estilo de vida').id,
  mentor: (n: string) => find(sr5Data.mentors, n, 'mentor').id,
};

export function draft(build: (d: CharacterDraft) => void): CharacterDraft {
  const d = createEmptyDraft();
  build(d);
  return d;
}

/** Distribui pontos de atributo (acima do mínimo do metatipo). */
export function points(d: CharacterDraft, alloc: Partial<Record<CoreAttr, number>>): void {
  for (const [k, v] of Object.entries(alloc) as [CoreAttr, number][]) d.attributes[k].points = v;
}

export function codes(r: RulesResult, severity?: Severity): string[] {
  return r.issues.filter((i) => !severity || i.severity === severity).map((i) => i.code);
}

export function messages(r: RulesResult, code: string): string[] {
  return r.issues.filter((i) => i.code === code).map((i) => i.message);
}
