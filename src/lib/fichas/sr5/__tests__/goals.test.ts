import { describe, expect, it } from 'vitest';
import fixture from './fixtures/ficha-valida.json';
import { normalizeDraft } from '../character';
import {
  advanceCost,
  currentRating,
  goalCost,
  goalSummary,
  parseGoalTarget,
  parseGoalTitle,
  planGoals,
  type GoalLike,
  type GoalTarget,
} from '../goals';
import { InputError } from '../play';
import { evaluate } from '../rules';

const AUTOMATICS = '788b387b-ee41-4e6a-bf22-481a8cc4cf9f';
// Ficha de exemplo: humana com 4 em todos os atributos (3 pontos + 1 do mínimo), sem perícias.
const result = evaluate(normalizeDraft(fixture.draft));

const goal = (id: string, target: GoalTarget, status: GoalLike['status'] = 'active', position = 0) => ({
  id,
  target,
  status,
  position,
});

describe('advanceCost (SR5: novo nível × multiplicador, passo a passo)', () => {
  it('atributo 4 → 6 custa 5×5 + 6×5 = 55', () => {
    expect(advanceCost(4, 6, 5)).toBe(55);
  });
  it('perícia nova (0 → 1) custa 2; 0 → 3 custa 2+4+6', () => {
    expect(advanceCost(0, 1, 2)).toBe(2);
    expect(advanceCost(0, 3, 2)).toBe(12);
  });
  it('sem subir não custa nada', () => {
    expect(advanceCost(5, 5, 5)).toBe(0);
    expect(advanceCost(6, 4, 5)).toBe(0);
  });
});

describe('goalCost', () => {
  it('atributo parte do valor da ficha', () => {
    expect(result.attributes.AGI.value).toBe(4);
    const c = goalCost({ kind: 'attribute', attr: 'AGI', rating: 6 }, result, []);
    expect(c).toMatchObject({ currency: 'karma', amount: 55, from: 4, to: 6, reached: false });
  });

  it('avisa quando passa do máximo natural', () => {
    const max = result.attributes.AGI.max;
    const c = goalCost({ kind: 'attribute', attr: 'AGI', rating: max + 1 }, result, []);
    expect(c.overMax).toBe(max);
  });

  it('meta concluída do mesmo atributo vira o novo ponto de partida', () => {
    const done = goal('a', { kind: 'attribute', attr: 'AGI', rating: 5 }, 'done');
    const next: GoalTarget = { kind: 'attribute', attr: 'AGI', rating: 6 };
    expect(currentRating(next, result, [done])).toBe(5);
    expect(goalCost(next, result, [done]).amount).toBe(30);
    // meta de outro atributo não interfere
    const other = goal('b', { kind: 'attribute', attr: 'BOD', rating: 6 }, 'done');
    expect(currentRating(next, result, [other])).toBe(4);
  });

  it('já alcançada não custa', () => {
    const c = goalCost({ kind: 'attribute', attr: 'AGI', rating: 3 }, result, []);
    expect(c).toMatchObject({ amount: 0, reached: true });
  });

  it('perícia, grupo, especialização, karma, nuyen e história', () => {
    expect(goalCost({ kind: 'skill', skillId: AUTOMATICS, rating: 2 }, result, []).amount).toBe(6);
    expect(goalCost({ kind: 'skillGroup', groupId: 'firearms', rating: 1 }, result, []).amount).toBe(5);
    expect(goalCost({ kind: 'specialization', skillId: AUTOMATICS, name: 'Rifles' }, result, []).amount).toBe(7);
    expect(goalCost({ kind: 'karma', cost: 13 }, result, [])).toMatchObject({ currency: 'karma', amount: 13 });
    expect(goalCost({ kind: 'nuyen', cost: 9000 }, result, [])).toMatchObject({ currency: 'nuyen', amount: 9000 });
    expect(goalCost({ kind: 'story' }, result, [])).toMatchObject({ currency: null, amount: 0 });
  });

  it('goalSummary descreve a meta em português', () => {
    const t: GoalTarget = { kind: 'attribute', attr: 'AGI', rating: 6 };
    expect(goalSummary(t, goalCost(t, result, []))).toBe('Agilidade 4 → 6');
  });
});

describe('planGoals', () => {
  it('segue a ordem de prioridade e não trava as metas de baixo', () => {
    const goals = [
      goal('cara', { kind: 'attribute', attr: 'AGI', rating: 6 }, 'active', 0), // 55
      goal('barata', { kind: 'specialization', skillId: AUTOMATICS, name: 'Rifles' }, 'active', 1), // 7
      goal('outra', { kind: 'karma', cost: 5 }, 'active', 2), // 5
      goal('compra', { kind: 'nuyen', cost: 3000 }, 'active', 3),
      goal('feita', { kind: 'karma', cost: 100 }, 'done', 4),
    ];
    const plan = planGoals(goals, result, { karma: 10, nuyen: 5000 });
    expect(plan.get('cara')).toMatchObject({ affordable: false, missing: 45 });
    expect(plan.get('barata')).toMatchObject({ affordable: true, missing: 0 });
    // depois da especialização sobram 3 de karma: faltam 2
    expect(plan.get('outra')).toMatchObject({ affordable: false, missing: 2 });
    expect(plan.get('compra')).toMatchObject({ affordable: true });
    expect(plan.has('feita')).toBe(false);
  });
});

describe('validação', () => {
  it('aceita metas válidas', () => {
    expect(parseGoalTarget({ kind: 'attribute', attr: 'AGI', rating: '6' })).toEqual({ kind: 'attribute', attr: 'AGI', rating: 6 });
    expect(parseGoalTarget({ kind: 'specialization', skillId: AUTOMATICS, name: ' Rifles ' })).toEqual({
      kind: 'specialization',
      skillId: AUTOMATICS,
      name: 'Rifles',
    });
    expect(parseGoalTarget({ kind: 'story', extra: 'ignorado' })).toEqual({ kind: 'story' });
    expect(parseGoalTitle('  Virar lenda  ')).toBe('Virar lenda');
  });

  it('recusa metas inválidas', () => {
    const bad = [
      null,
      { kind: 'voar' },
      { kind: 'attribute', attr: 'ESS', rating: 6 },
      { kind: 'attribute', attr: 'AGI', rating: 13 },
      { kind: 'skill', skillId: 'nao-existe', rating: 2 },
      { kind: 'skillGroup', groupId: 'nao-existe', rating: 2 },
      { kind: 'specialization', skillId: AUTOMATICS, name: '' },
      { kind: 'karma', cost: 0 },
      { kind: 'nuyen', cost: 1.5 },
    ];
    for (const raw of bad) expect(() => parseGoalTarget(raw)).toThrow(InputError);
    expect(() => parseGoalTitle('  ')).toThrow(InputError);
  });
});
