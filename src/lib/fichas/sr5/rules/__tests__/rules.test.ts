import { describe, expect, it } from 'vitest';
import { createEmptyDraft } from '../../character';
import { sr5Data } from '../../data';
import { evalExpr } from '../expr';
import { blockingErrors, evaluate, firstStepWithErrors } from '../index';
import { codes, draft, ids, messages, points } from './helpers';

/** Humano mundano básico e válido, para variar um detalhe por teste. */
const base = () =>
  draft((d) => {
    d.priorities = { metatype: 'D', talent: 'E', attributes: 'A', skills: 'B', resources: 'C' };
    d.metatypeId = ids.metatype('Human');
    d.talent = 'mundane';
    points(d, { BOD: 3, AGI: 3, REA: 3, STR: 3, CHA: 3, INT: 3, LOG: 3, WIL: 3 });
    d.special.EDG.points = 3;
  });

const awakened = (talent: 'magician' | 'mysticAdept' | 'technomancer') =>
  draft((d) => {
    d.priorities = { talent: 'A', attributes: 'B', skills: 'C', metatype: 'D', resources: 'E' };
    d.metatypeId = ids.metatype('Human');
    d.talent = talent;
  });

describe('prioridades', () => {
  it('rascunho vazio: falta tudo, e o primeiro passo com erro é Prioridades', () => {
    const r = evaluate(createEmptyDraft());
    expect(codes(r, 'error').filter((c) => c === 'priorities.missing')).toHaveLength(5);
    expect(codes(r, 'error')).toContain('metatype.missing');
    expect(firstStepWithErrors(r)).toBe('priorities');
  });

  it('não deixa repetir letra', () => {
    const d = base();
    d.priorities.skills = 'A';
    const r = evaluate(d);
    expect(messages(r, 'priorities.duplicate')[0]).toBe(
      'A prioridade A foi usada em Atributos e Perícias. Cada letra só pode ser usada uma vez.',
    );
  });

  it('avisos não bloqueiam; só erros', () => {
    const r = evaluate(base());
    expect(blockingErrors(r, 'priorities')).toEqual([]);
    expect(blockingErrors(r, 'attributes')).toEqual([]);
  });
});

describe('atributos', () => {
  it('karma em atributo custa novo nível × 5', () => {
    const d = base();
    d.attributes.AGI.karma = 2; // 4 → 5 → 6: 25 + 30
    const r = evaluate(d);
    expect(r.attributes.AGI.value).toBe(6);
    expect(r.karmaBreakdown['atributos']).toBe(55);
  });

  it('bloqueia pontos além do disponível', () => {
    const d = base();
    d.attributes.BOD.points = 5;
    const r = evaluate(d);
    expect(r.budgets.attributes).toEqual({ total: 24, spent: 26, remaining: -2 });
    expect(codes(r, 'error')).toContain('attributes.overspent');
  });

  it('mundano não pode ter Magia', () => {
    const d = base();
    d.special.MAG.points = 1;
    expect(codes(evaluate(d), 'error')).toContain('attributes.noMagic');
  });
});

describe('qualidades', () => {
  it('Sortudo sobe o máximo de Trunfo do humano para 8', () => {
    const d = base();
    d.qualities = [{ id: ids.quality('Lucky'), rating: 1 }];
    expect(evaluate(d).attributes.EDG.max).toBe(8);
  });

  it('Atributo Excepcional exige escolher o atributo e não combina com Sortudo', () => {
    const d = base();
    d.qualities = [
      { id: ids.quality('Lucky'), rating: 1 },
      { id: ids.quality('Exceptional Attribute'), rating: 1 },
    ];
    const r = evaluate(d);
    expect(codes(r, 'error')).toEqual(expect.arrayContaining(['quality.requirement', 'quality.choice']));
  });

  it('Atributo Excepcional na Agilidade sobe o máximo para 7', () => {
    const d = base();
    d.qualities = [{ id: ids.quality('Exceptional Attribute'), rating: 1, choice: 'AGI' }];
    expect(evaluate(d).attributes.AGI.max).toBe(7);
  });

  it('qualidade negativa dá karma; positiva gasta', () => {
    const d = base();
    d.qualities = [
      { id: ids.quality('Bad Luck'), rating: 1 },
      { id: ids.quality('Toughness'), rating: 1 },
    ];
    const r = evaluate(d);
    expect(r.budgets.karma).toEqual({ total: 37, spent: 9, remaining: 28 });
  });

  it('bloqueia mais de 25 de karma em qualidades positivas', () => {
    const d = base();
    d.qualities = [
      { id: ids.quality('Guts'), rating: 1 }, // 10
      { id: ids.quality('Toughness'), rating: 1 }, // 9
      { id: ids.quality('Catlike'), rating: 1 }, // 7
    ];
    const r = evaluate(d);
    expect(r.budgets.positiveQualities.spent).toBe(26);
    expect(codes(r, 'error')).toContain('qualities.positiveLimit');
  });

  it('qualidade de talento não pode ser comprada direto', () => {
    const d = base();
    d.qualities = [{ id: ids.quality('Magician'), rating: 1 }];
    expect(codes(evaluate(d), 'error')).toContain('quality.priorityOnly');
  });

  it('mostra por que Espírito Mentor está indisponível para mundano', () => {
    const r = evaluate(base());
    const a = r.availability.qualities[ids.quality('Mentor Spirit')];
    expect(a.ok).toBe(false);
    expect(a.reason).toMatch(/^Exige .*Mago/);
  });
});

describe('perícias', () => {
  it('perícia nova com karma: 2 × nível', () => {
    const d = base();
    d.skills = [{ id: ids.skill('Pistols'), points: 0, karma: 2 }];
    expect(evaluate(d).karmaBreakdown['perícias']).toBe(6);
  });

  it('com o grupo comprado, a perícia do grupo não recebe pontos individuais', () => {
    const d = base();
    d.skillGroups = [{ id: 'firearms', points: 2, karma: 0 }];
    d.skills = [{ id: ids.skill('Pistols'), points: 1, karma: 0 }];
    const r = evaluate(d);
    expect(codes(r, 'error')).toContain('skill.groupPoints');
    expect(r.skillRatings[ids.skill('Automatics')]).toBe(2);
  });

  it('com o grupo comprado, dá para subir uma perícia só com karma', () => {
    const d = base();
    d.skillGroups = [{ id: 'firearms', points: 2, karma: 0 }];
    d.skills = [{ id: ids.skill('Pistols'), points: 0, karma: 1 }];
    const r = evaluate(d);
    expect(r.skillRatings[ids.skill('Pistols')]).toBe(3);
    expect(r.karmaBreakdown['perícias']).toBe(6);
    expect(blockingErrors(r, 'skills')).toEqual([]);
  });

  it('especializar perícia de grupo comprado desfaz o grupo', () => {
    const d = base();
    d.skillGroups = [{ id: 'firearms', points: 2, karma: 0 }];
    d.skills = [{ id: ids.skill('Pistols'), points: 0, karma: 0, specialization: { name: 'Revólveres', paidWith: 'points' } }];
    expect(codes(evaluate(d), 'error')).toContain('skill.groupSpec');
  });

  it('nível 7 só com Aptidão', () => {
    const d = base();
    d.skills = [{ id: ids.skill('Pistols'), points: 6, karma: 1 }];
    expect(codes(evaluate(d), 'error')).toContain('skill.overMax');
    d.qualities = [{ id: ids.quality('Aptitude'), rating: 1, choice: ids.skill('Pistols') }];
    expect(codes(evaluate(d), 'error')).not.toContain('skill.overMax');
  });

  it('pontos de conhecimento = (Intuição + Lógica) × 2; idioma nativo é de graça', () => {
    const d = base();
    d.knowledge = [
      { key: 'k1', name: 'Português', category: 'Language', native: true, points: 0, karma: 0 },
      { key: 'k2', name: 'Gangues de Seattle', category: 'Street', points: 4, karma: 0 },
    ];
    const r = evaluate(d);
    expect(r.budgets.knowledge).toEqual({ total: 16, spent: 4, remaining: 12 });
    expect(codes(r)).not.toContain('knowledge.noNative');
  });

  it('especialização custa 1 ponto de perícia ou 7 de karma', () => {
    const d = base();
    d.skills = [
      { id: ids.skill('Pistols'), points: 3, karma: 0, specialization: { name: 'Revólveres', paidWith: 'points' } },
      { id: ids.skill('Sneaking'), points: 2, karma: 0, specialization: { name: 'Urbano', paidWith: 'karma' } },
    ];
    const r = evaluate(d);
    expect(r.budgets.skills.spent).toBe(6);
    expect(r.karmaBreakdown['especializações']).toBe(7);
  });

  it('mundano não pode ter perícia mágica', () => {
    const d = base();
    d.skills = [{ id: ids.skill('Spellcasting'), points: 1, karma: 0 }];
    const r = evaluate(d);
    expect(codes(r, 'error')).toContain('skill.blocked');
    expect(r.availability.skills[ids.skill('Spellcasting')].ok).toBe(false);
  });
});

describe('magia e ressonância', () => {
  it('mago A: 10 magias grátis, limite Magia × 2, excedente custa 5 karma', () => {
    const d = awakened('magician');
    d.magic.traditionId = ids.tradition('Hermetic');
    d.magic.spellIds = sr5Data.spells.slice(0, 13).map((s) => s.id);
    const r = evaluate(d);
    expect(r.budgets.freeSpells).toEqual({ total: 10, spent: 10, remaining: 0 });
    expect(r.karmaBreakdown['magias']).toBe(15);
    expect(codes(r, 'error')).toContain('spells.limit'); // 13 > 12
  });

  it('mago sem tradição não avança', () => {
    const r = evaluate(awakened('magician'));
    expect(blockingErrors(r, 'magic').map((i) => i.code)).toContain('tradition.missing');
  });

  it('resistência a dreno vem da tradição', () => {
    const d = awakened('magician');
    d.magic.traditionId = ids.tradition('Hermetic');
    points(d, { WIL: 3, LOG: 4 });
    expect(evaluate(d).derived.drainResist).toBe(4 + 5); // Vontade + Lógica
  });

  it('adepto místico compra pontos de poder a 5 karma, até a Magia', () => {
    const d = awakened('mysticAdept');
    d.magic.traditionId = ids.tradition('Shamanic');
    d.magic.powerPointsBought = 7;
    const r = evaluate(d);
    expect(r.karmaBreakdown['pontos de poder']).toBe(35);
    expect(codes(r, 'error')).toContain('powerPoints.overMagic');
  });

  it('tecnomante A: 7 formas grátis, limite Ressonância × 2, excedente custa 4 karma', () => {
    const d = awakened('technomancer');
    d.magic.streamId = ids.stream('Default');
    d.magic.complexFormIds = sr5Data.complexForms.slice(0, 13).map((c) => c.id);
    const r = evaluate(d);
    expect(r.karmaBreakdown['formas complexas']).toBe(24);
    expect(codes(r, 'error')).toContain('complexForms.limit'); // 13 > 12
    expect(r.derived.matrixInitiative?.hotSim.dice).toBe(4);
  });

  it('mentor exige a qualidade Espírito Mentor', () => {
    const d = awakened('magician');
    d.magic.traditionId = ids.tradition('Shamanic');
    d.magic.mentorId = ids.mentor('Bear');
    expect(codes(evaluate(d), 'error')).toContain('mentor.noQuality');
    d.qualities = [{ id: ids.quality('Mentor Spirit'), rating: 1 }];
    expect(codes(evaluate(d), 'error')).not.toContain('mentor.noQuality');
  });
});

describe('contatos e karma', () => {
  it('pontos de contato = Carisma × 3; o que passar sai do karma', () => {
    const d = base(); // Carisma 4 → 12 pontos
    d.contacts = [
      { key: 'c1', name: 'Fixer', connection: 4, loyalty: 4 },
      { key: 'c2', name: 'Médico de rua', connection: 3, loyalty: 3 },
    ];
    const r = evaluate(d);
    expect(r.budgets.contacts).toEqual({ total: 12, spent: 12, remaining: 0 });
    expect(r.karmaBreakdown['contatos']).toBe(2);
    expect(codes(r, 'warning')).toContain('contact.strong'); // 4 + 4 = 8
  });

  it('karma negativo bloqueia a revisão', () => {
    const d = base();
    d.attributes.LOG.karma = 3; // 25 + 30 + 35
    const r = evaluate(d);
    expect(r.budgets.karma.remaining).toBe(-65);
    expect(blockingErrors(r, 'review').map((i) => i.code)).toContain('karma.overspent');
  });
});

describe('fórmulas do Chummer', () => {
  it.each([
    ['Rating * 2000', 3, 6000],
    ['FixedValues(39000,149000,217000)', 2, 149000],
    ['FixedValues(8R,12R,20R)', 3, 20],
    ['(Rating * 0.1) + 0.1', 2, 0.30000000000000004],
    ['4000 * Rating - 2000 * number(Rating > 1)', 1, 4000],
    ['4000 * Rating - 2000 * number(Rating > 1)', 3, 10000],
    ['3000 + 500 * ((Rating - 1) * (Rating + 1) + number(Rating > 2))', 3, 7500],
    ['+Rating', 4, 4],
  ])('%s com nível %i = %d', (raw, rating, expected) => {
    expect(evalExpr(raw, { rating })).toBe(expected);
  });

  it('custo variável não é calculável', () => {
    expect(evalExpr('Variable(20-100000)')).toBeNull();
  });
});
