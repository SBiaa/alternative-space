import { describe, expect, it } from 'vitest';
import fixture from './fixtures/ficha-valida.json';
import { normalizeDraft, type CharacterDraft } from '../character';
import { sr5Data } from '../data';
import { evaluate, type RulesResult } from '../rules';
import { memberProfile, teamComposition, type MemberProfile } from '../team';

const base = normalizeDraft(fixture.draft);
const baseResult = evaluate(base);
const id = (name: string) => sr5Data.skills.skills.find((s) => s.name === name)!.id;

/** Ficha de exemplo com perícias/atributos trocados à mão. */
function profile(opts: {
  talent?: CharacterDraft['talent'];
  skills?: Record<string, number>;
  bod?: number;
  physical?: number;
  essence?: number;
}): MemberProfile {
  const draft = { ...base, talent: opts.talent ?? base.talent };
  const result: RulesResult = {
    ...baseResult,
    skillRatings: Object.fromEntries(Object.entries(opts.skills ?? {}).map(([n, r]) => [id(n), r])),
    attributes: { ...baseResult.attributes, BOD: { ...baseResult.attributes.BOD, value: opts.bod ?? 3 } },
    derived: {
      ...baseResult.derived,
      essence: opts.essence ?? 6,
      monitors: { ...baseResult.derived.monitors, physical: opts.physical ?? 10 },
    },
  };
  return memberProfile(draft, result);
}

describe('memberProfile', () => {
  it('samurai: combate e tanque', () => {
    const p = profile({ skills: { Automatics: 5, Perception: 3 }, bod: 6 });
    expect(p.roles).toEqual(['combat', 'tank']);
    expect(p.perception).toBe(3);
  });

  it('decker e tecnomante cobrem a Matriz', () => {
    expect(profile({ skills: { Hacking: 4 } }).roles).toContain('matrix');
    expect(profile({ talent: 'technomancer' }).roles).toContain('matrix');
    expect(profile({ skills: { Hacking: 2 } }).roles).not.toContain('matrix');
  });

  it('talentos mágicos', () => {
    expect(profile({ talent: 'magician' }).roles).toEqual(['mage']);
    expect(profile({ talent: 'adept' }).roles).toEqual(['adept']);
    expect(profile({ talent: 'mysticAdept' }).roles).toEqual(['mage', 'adept']);
  });

  it('face, rigger, médico e infiltração', () => {
    const p = profile({ skills: { Etiquette: 3, 'Pilot Ground Craft': 4, 'First Aid': 3, Sneaking: 4 } });
    expect(p.roles).toEqual(['face', 'rigger', 'medic', 'infiltrator']);
  });

  it('a ficha de exemplo real (sem perícias) não cobre nada', () => {
    expect(memberProfile(base, baseResult).roles).toEqual([]);
  });
});

describe('teamComposition', () => {
  it('lista quem cobre cada papel e o que falta', () => {
    const team = [
      { name: 'Agulha', ...profile({ skills: { Automatics: 5, Perception: 5 }, bod: 6 }) },
      { name: 'Faísca', ...profile({ talent: 'magician', skills: { 'First Aid': 3 } }) },
    ];
    const c = teamComposition(team);
    expect(c.covered.combat).toEqual(['Agulha']);
    expect(c.covered.mage).toEqual(['Faísca']);
    expect(c.missing).toEqual(['face', 'matrix', 'rigger', 'infiltrator']);
    expect(c.alerts).toEqual([]);
  });

  it('avisa sobre Essência baixa, plano astral, cura e Percepção', () => {
    const c = teamComposition([{ name: 'Cromado', ...profile({ essence: 1.2, skills: { Perception: 2 } }) }]);
    expect(c.alerts).toHaveLength(4);
    expect(c.alerts[0]).toContain('Cromado está com Essência 1,20: muito ciborgue');
    expect(c.alerts.join(' ')).toContain('plano astral');
    expect(c.alerts.join(' ')).toContain('ferimentos');
    expect(c.alerts.join(' ')).toContain('Percepção do time é baixa (a melhor é 2)');
  });

  it('time vazio não reclama de nada', () => {
    expect(teamComposition([])).toMatchObject({ missing: [], alerts: [] });
  });
});
