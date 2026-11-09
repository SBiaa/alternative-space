/**
 * Integridade dos JSONs gerados por `npm run data:build`.
 * Se um destes falhar depois de regerar os dados, o conversor quebrou alguma referência.
 */
import { describe, expect, it } from 'vitest';
import { sr5Data } from '../data';

const dupes = (ids: string[]) => ids.filter((id, i) => ids.indexOf(id) !== i);

describe('dados SR5', () => {
  const lists = {
    metatypes: sr5Data.metatypes,
    qualities: sr5Data.qualities,
    skills: sr5Data.skills.skills,
    spells: sr5Data.spells,
    powers: sr5Data.powers,
    traditions: sr5Data.traditions,
    gear: sr5Data.gear,
    weapons: sr5Data.weapons,
    armor: sr5Data.armor,
    cyberware: sr5Data.cyberware,
    bioware: sr5Data.bioware,
    lifestyles: sr5Data.lifestyles,
  };

  it.each(Object.entries(lists))('%s: lista não vazia, ids preenchidos e sem repetição', (_, list) => {
    expect(list.length).toBeGreaterThan(0);
    const ids = list.map((x) => x.id);
    expect(ids.every(Boolean)).toBe(true);
    expect(dupes(ids)).toEqual([]);
  });

  it('a tabela de prioridades tem as letras A a E', () => {
    expect(Object.keys(sr5Data.priorities.rows).sort()).toEqual(['A', 'B', 'C', 'D', 'E']);
  });

  it('pontos de atributo e perícia caem de A para E', () => {
    const rows = (['A', 'B', 'C', 'D', 'E'] as const).map((l) => sr5Data.priorities.rows[l]);
    for (let i = 1; i < rows.length; i++) {
      expect(rows[i].attributePoints).toBeLessThan(rows[i - 1].attributePoints);
      expect(rows[i].skillPoints).toBeLessThan(rows[i - 1].skillPoints);
    }
  });

  it('metatipos citados nas prioridades existem', () => {
    const known = new Set(sr5Data.metatypes.map((m) => m.id));
    const missing = Object.values(sr5Data.priorities.rows)
      .flatMap((r) => r.metatypes.map((m) => m.metatypeId))
      .filter((id) => !known.has(id));
    expect(missing).toEqual([]);
  });

  it('qualidades dadas por talento existem', () => {
    const known = new Set(sr5Data.qualities.map((q) => q.id));
    const missing = Object.values(sr5Data.priorities.rows)
      .flatMap((r) => r.talents.map((t) => t.qualityId))
      .filter((id): id is string => !!id && !known.has(id));
    expect(missing).toEqual([]);
  });

  it('qualidades raciais dos metatipos existem', () => {
    const known = new Set(sr5Data.qualities.map((q) => q.id));
    const missing = sr5Data.metatypes.flatMap((m) => m.racialQualityIds).filter((id) => !known.has(id));
    expect(missing).toEqual([]);
  });

  it('grupos de perícia apontam para perícias que existem, e vice-versa', () => {
    const skills = new Set(sr5Data.skills.skills.map((s) => s.id));
    const groups = new Set(sr5Data.skills.groups.map((g) => g.id));
    expect(sr5Data.skills.groups.flatMap((g) => g.skillIds).filter((id) => !skills.has(id))).toEqual([]);
    expect(sr5Data.skills.skills.filter((s) => s.groupId && !groups.has(s.groupId)).map((s) => s.name)).toEqual([]);
  });

  it('o Humano tem os atributos do livro básico', () => {
    const human = sr5Data.metatypes.find((m) => m.name === 'Human')!;
    expect(human.attributes.BOD).toMatchObject({ min: 1, max: 6 });
    expect(human.attributes.EDG).toMatchObject({ min: 2, max: 7 });
  });
});
