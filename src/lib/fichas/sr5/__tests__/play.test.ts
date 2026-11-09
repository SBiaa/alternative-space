import { describe, expect, it } from 'vitest';
import fixture from './fixtures/ficha-valida.json';
import { normalizeDraft } from '../character';
import {
  clampDamage,
  conditionLimits,
  conditionState,
  InputError,
  ledgerTotals,
  parseLedgerInput,
  startingBalances,
  woundModifier,
  type ConditionLimits,
} from '../play';
import { evaluate, NUYEN_CARRYOVER } from '../rules';

const limits: ConditionLimits = { physical: 10, stun: 10, overflow: 4, woundThreshold: 3 };

describe('startingBalances', () => {
  it('passa no máximo 5.000¥ e 7 de karma, nunca negativo', () => {
    const result = evaluate(normalizeDraft(fixture.draft));
    const s = startingBalances(result);
    expect(s.nuyen).toBe(Math.max(0, Math.min(result.budgets.nuyen.remaining, NUYEN_CARRYOVER)));
    expect(s.karma).toBeLessThanOrEqual(7);
    expect(s.karma).toBeGreaterThanOrEqual(0);

    const rich = { ...result, budgets: { ...result.budgets, nuyen: { total: 0, spent: 0, remaining: 90_000 }, karma: { total: 0, spent: 0, remaining: 20 } } };
    expect(startingBalances(rich)).toEqual({ nuyen: 5000, karma: 7 });
    const broke = { ...result, budgets: { ...result.budgets, nuyen: { total: 0, spent: 0, remaining: -10 }, karma: { total: 0, spent: 0, remaining: -2 } } };
    expect(startingBalances(broke)).toEqual({ nuyen: 0, karma: 0 });
  });
});

describe('ledgerTotals', () => {
  it('soma saldos e conta só karma ganho como karma de carreira', () => {
    expect(
      ledgerTotals([
        { kind: 'nuyen', amount: 5000 },
        { kind: 'nuyen', amount: -1200 },
        { kind: 'karma', amount: 7 },
        { kind: 'karma', amount: 5 },
        { kind: 'karma', amount: -10 },
      ]),
    ).toEqual({ nuyen: 3800, karma: 2, karmaEarned: 12 });
  });
});

describe('monitor de condição', () => {
  it('conditionLimits vem do motor de regras', () => {
    const result = evaluate(normalizeDraft(fixture.draft));
    const l = conditionLimits(result);
    expect(l.physical).toBe(result.derived.monitors.physical);
    expect(l.stun).toBe(result.derived.monitors.stun);
  });

  it('clampDamage: físico até monitor + transbordamento, atordoamento até o monitor', () => {
    expect(clampDamage(99, 'physical', limits)).toBe(14);
    expect(clampDamage(99, 'stun', limits)).toBe(10);
    expect(clampDamage(-3, 'stun', limits)).toBe(0);
    expect(clampDamage('7', 'physical', limits)).toBe(0);
    expect(clampDamage(4.9, 'physical', limits)).toBe(4);
  });

  it('woundModifier: −1 a cada 3 caixas, somando os dois monitores', () => {
    expect(woundModifier(0, 0, limits)).toBe(-0);
    expect(woundModifier(2, 2, limits)).toBe(-0);
    expect(woundModifier(3, 0, limits)).toBe(-1);
    expect(woundModifier(6, 4, limits)).toBe(-3);
    // transbordamento não piora a penalidade
    expect(woundModifier(13, 0, limits)).toBe(-3);
  });

  it('conditionState', () => {
    expect(conditionState(0, 0, limits)).toBe('ok');
    expect(conditionState(0, 10, limits)).toBe('unconscious');
    expect(conditionState(10, 0, limits)).toBe('unconscious');
    expect(conditionState(11, 0, limits)).toBe('dying');
    expect(conditionState(14, 0, limits)).toBe('dead');
  });
});

describe('parseLedgerInput', () => {
  it('aceita lançamento válido e limpa o motivo', () => {
    expect(parseLedgerInput({ kind: 'nuyen', amount: -300, reason: '  Munição ' })).toEqual({
      kind: 'nuyen',
      amount: -300,
      reason: 'Munição',
    });
  });

  it('recusa entradas inválidas com mensagem para o jogador', () => {
    const bad = [
      { kind: 'ouro', amount: 1, reason: 'x' },
      { kind: 'karma', amount: 0, reason: 'x' },
      { kind: 'karma', amount: 1.5, reason: 'x' },
      { kind: 'karma', amount: 99_999_999, reason: 'x' },
      { kind: 'karma', amount: 1, reason: '   ' },
      { kind: 'karma', amount: 1, reason: 'x'.repeat(201) },
    ];
    for (const input of bad) expect(() => parseLedgerInput(input)).toThrow(InputError);
  });
});
