/**
 * Casos conhecidos de personagem, conferidos à mão com as regras do livro básico.
 */
import { describe, expect, it } from 'vitest';
import { sr5Data } from '../../data';
import { blockingErrors, evaluate } from '../index';
import { codes, draft, ids, messages, points } from './helpers';

// ---------------------------------------------------------------------------
describe('troll com prioridade A em metatipo', () => {
  const troll = () =>
    draft((d) => {
      d.priorities = { metatype: 'A', attributes: 'B', skills: 'C', resources: 'D', talent: 'E' };
      d.metatypeId = ids.metatype('Troll');
      d.talent = 'mundane';
      points(d, { BOD: 4, AGI: 3, REA: 3, STR: 4, CHA: 1, INT: 2, LOG: 1, WIL: 2 });
      d.special.EDG.points = 4;
    });

  it('recebe 5 pontos especiais e 20 de atributo, todos gastos', () => {
    const r = evaluate(troll());
    expect(r.budgets.special).toEqual({ total: 5, spent: 4, remaining: 1 });
    expect(r.budgets.attributes).toEqual({ total: 20, spent: 20, remaining: 0 });
    expect(r.attributes.BOD).toMatchObject({ min: 5, max: 10, value: 9 });
    expect(r.attributes.EDG.value).toBe(5);
    expect(blockingErrors(r, 'attributes')).toEqual([]);
    expect(blockingErrors(r, 'metatype')).toEqual([]);
  });

  it('calcula limites, monitores e iniciativa', () => {
    const r = evaluate(troll());
    // Físico: (9×2 + 9 + 4) / 3 = 10,33 → 11. Mental: (2×2 + 3 + 3) / 3 → 4. Social: (2×2 + 3 + 6) / 3 → 5.
    expect(r.derived.limits).toEqual({ physical: 11, mental: 4, social: 5 });
    expect(r.derived.monitors).toEqual({ physical: 13, stun: 10, overflow: 10, woundThreshold: 3 });
    expect(r.derived.initiative).toEqual({ base: 7, dice: 1 });
    expect(r.derived.astralInitiative).toBeUndefined();
    expect(r.derived.liftCarry).toBe(18);
  });

  it('avisa (sem bloquear) sobre ponto especial e karma sobrando', () => {
    const r = evaluate(troll());
    expect(codes(r, 'warning')).toContain('special.leftover');
    expect(codes(r, 'warning')).toContain('karma.leftover');
  });

  it('não pode ter dois atributos no máximo natural', () => {
    const d = troll();
    points(d, { BOD: 5, STR: 5, AGI: 2, REA: 2, CHA: 1, INT: 2, LOG: 1, WIL: 2 });
    const r = evaluate(d);
    expect(codes(r, 'error')).toContain('attributes.tooManyAtMax');
    expect(messages(r, 'attributes.tooManyAtMax')[0]).toMatch(/Corpo, Força/);
  });

  it('fica indisponível em C, com o motivo', () => {
    const d = troll();
    d.priorities = { metatype: 'C', attributes: 'B', skills: 'A', resources: 'D', talent: 'E' };
    const r = evaluate(d);
    const a = r.availability.metatypes[ids.metatype('Troll')];
    expect(a.ok).toBe(false);
    expect(a.reason).toBe('Troll exige prioridade A ou B em Metatipo.');
    expect(codes(r, 'error')).toContain('metatype.unavailable');
  });
});

// ---------------------------------------------------------------------------
describe('elfo adepto', () => {
  const elf = () =>
    draft((d) => {
      d.priorities = { metatype: 'D', talent: 'B', attributes: 'A', skills: 'C', resources: 'E' };
      d.metatypeId = ids.metatype('Elf');
      d.talent = 'adept';
      points(d, { BOD: 3, AGI: 4, REA: 4, STR: 3, CHA: 0, INT: 4, LOG: 2, WIL: 4 });
      d.magic.freeSkillIds = [ids.skill('Unarmed Combat')];
      d.skills = [{ id: ids.skill('Unarmed Combat'), points: 0, karma: 1 }];
      d.magic.powers = [
        { id: ids.power('Improved Reflexes'), level: 2 }, // 1×2 + 0,5 = 2,5
        { id: ids.power('Killing Hands'), level: 1 }, // 0,5
        { id: ids.power('Critical Strike'), level: 1 }, // 0,5
        { id: ids.power('Astral Perception'), level: 1 }, // 1
        { id: ids.power('Combat Sense'), level: 2 }, // 1
        { id: ids.power('Mystic Armor'), level: 1 }, // 0,5
      ];
    });

  it('tem Magia 6 e 6 pontos de poder, todos usados', () => {
    const r = evaluate(elf());
    expect(r.attributes.MAG).toMatchObject({ min: 6, value: 6 });
    expect(r.budgets.powerPoints).toEqual({ total: 6, spent: 6, remaining: 0 });
    expect(r.budgets.special.total).toBe(0);
    expect(blockingErrors(r, 'magic')).toEqual([]);
    expect(blockingErrors(r, 'attributes')).toEqual([]);
  });

  it('a perícia gratuita vem no nível 4 e o karma sobe a partir dele', () => {
    const r = evaluate(elf());
    expect(r.skillRatings[ids.skill('Unarmed Combat')]).toBe(5);
    expect(r.karmaBreakdown['perícias']).toBe(10); // 4 → 5 custa 5 × 2
    expect(blockingErrors(r, 'skills')).toEqual([]);
  });

  it('tem iniciativa astral por ter Percepção Astral disponível', () => {
    const r = evaluate(elf());
    expect(r.derived.initiative).toEqual({ base: 10, dice: 1 });
    expect(r.derived.astralInitiative).toEqual({ base: 10, dice: 3 });
  });

  it('não pode escolher perícia mágica como gratuita nem aprender magias', () => {
    const d = elf();
    d.magic.freeSkillIds = [ids.skill('Spellcasting')];
    d.magic.spellIds = [sr5Data.spells[0].id];
    const r = evaluate(d);
    expect(codes(r, 'error')).toEqual(expect.arrayContaining(['freeSkills.invalid', 'spells.notAllowed']));
  });

  it('bloqueia gastar mais pontos de poder do que tem', () => {
    const d = elf();
    d.magic.powers[0].level = 3; // 3,5 em vez de 2,5
    const r = evaluate(d);
    expect(r.budgets.powerPoints.spent).toBe(7);
    expect(codes(r, 'error')).toContain('powerPoints.overspent');
  });

  it('elfo não existe em E e adepto não existe em A', () => {
    const d = elf();
    d.priorities = { metatype: 'E', talent: 'A', attributes: 'B', skills: 'C', resources: 'D' };
    const r = evaluate(d);
    expect(r.availability.metatypes[ids.metatype('Elf')].reason).toBe('Elfo exige prioridade A, B, C ou D em Metatipo.');
    expect(r.availability.talents.adept?.reason).toBe('Adepto exige prioridade B, C ou D em Magia/Ressonância.');
  });
});

// ---------------------------------------------------------------------------
describe('humano mundano focado em recursos', () => {
  const human = () =>
    draft((d) => {
      d.priorities = { resources: 'A', attributes: 'B', skills: 'C', metatype: 'D', talent: 'E' };
      d.metatypeId = ids.metatype('Human');
      d.talent = 'mundane';
      points(d, { BOD: 3, AGI: 4, REA: 3, STR: 2, CHA: 2, INT: 2, LOG: 2, WIL: 2 });
      d.special.EDG.points = 3;
      d.karmaToNuyen = 10;
      d.gear = [{ key: 'g1', kind: 'cyberware', itemId: ids.cyberware('Wired Reflexes'), qty: 1, rating: 2 }];
      d.lifestyles = [{ id: ids.lifestyle('Medium'), months: 1 }];
    });

  it('soma 450.000¥ com 10 de karma convertido', () => {
    const r = evaluate(human());
    // 450.000 + 10 × 2.000; gastos: Reflexos Cabeados 2 (149.000) + Médio 1 mês (5.000)
    expect(r.budgets.nuyen).toEqual({ total: 470000, spent: 154000, remaining: 316000 });
    expect(r.budgets.karma).toEqual({ total: 25, spent: 10, remaining: 15 });
    expect(codes(r, 'warning')).toEqual(expect.arrayContaining(['nuyen.leftover', 'karma.leftover']));
    expect(blockingErrors(r, 'resources')).toEqual([]);
  });

  it('perde Essência com o implante e isso pesa no limite social', () => {
    const r = evaluate(human());
    expect(r.derived.essence).toBe(3);
    expect(r.attributes.ESS.value).toBe(3);
    // Social: (3×2 + 3 + 3) / 3 = 4
    expect(r.derived.limits.social).toBe(4);
  });

  it('bloqueia disponibilidade acima de 12', () => {
    const d = human();
    d.gear[0].rating = 3; // 20R
    const r = evaluate(d);
    expect(codes(r, 'error')).toContain('gear.availability');
  });

  it('alfa reduz Essência, encarece e sobe a disponibilidade', () => {
    const d = human();
    d.gear[0].grade = 'alpha';
    const r = evaluate(d);
    expect(r.derived.essence).toBe(3.6); // 3 × 0,8 = 2,4
    expect(r.budgets.nuyen.spent).toBe(178800 + 5000);
    expect(codes(r, 'error')).toContain('gear.availability'); // 12 + 2
  });

  it('bloqueia gastar mais nuyen do que tem', () => {
    const d = human();
    d.karmaToNuyen = 0;
    d.priorities = { resources: 'D', attributes: 'B', skills: 'C', metatype: 'A', talent: 'E' };
    const r = evaluate(d);
    expect(codes(r, 'error')).toContain('nuyen.overspent');
  });
});
