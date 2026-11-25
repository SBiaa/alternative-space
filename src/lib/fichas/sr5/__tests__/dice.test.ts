import { describe, expect, it } from 'vitest';
import { rollInitiative, rollPool } from '../dice';

/** Gerador que devolve os valores de d6 pedidos, na ordem. */
const seq = (...faces: number[]) => {
  let i = 0;
  return () => (faces[i++ % faces.length] - 1) / 6 + 0.01;
};

describe('rollPool', () => {
  it('conta 5 e 6 como acertos', () => {
    const r = rollPool(4, { rng: seq(5, 6, 4, 2) });
    expect(r.hits).toBe(2);
    expect(r.glitch).toBe(false);
  });

  it('o limite corta os acertos', () => {
    const r = rollPool(4, { limit: 2, rng: seq(6, 6, 5, 5) });
    expect(r.hits).toBe(4);
    expect(r.hitsLimited).toBe(2);
    expect(r.limited).toBe(true);
  });

  it('falha quando mais da metade dá 1, e é crítica sem acertos', () => {
    expect(rollPool(4, { rng: seq(1, 1, 1, 3) }).glitch).toBe(true);
    expect(rollPool(4, { rng: seq(1, 1, 5, 3) }).glitch).toBe(false);
    expect(rollPool(4, { rng: seq(1, 1, 1, 3) }).criticalGlitch).toBe(true);
    expect(rollPool(4, { rng: seq(1, 1, 1, 5) }).criticalGlitch).toBe(false);
  });

  it('Regra do Seis rola de novo o 6 e soma acertos', () => {
    const r = rollPool(1, { edge: true, rng: seq(6, 6, 5, 2) });
    expect(r.dice).toEqual([6, 6, 5]);
    expect(r.hits).toBe(3);
  });

  it('a Regra do Seis não trava com sorte absurda', () => {
    const r = rollPool(1, { edge: true, rng: () => 0.99 });
    expect(r.dice.length).toBeLessThanOrEqual(52);
  });

  it('reserva zero não falha', () => {
    const r = rollPool(0);
    expect(r).toMatchObject({ hits: 0, glitch: false, criticalGlitch: false });
  });
});

describe('rollInitiative', () => {
  it('soma o valor base aos dados', () => {
    const r = rollInitiative(10, 2, seq(3, 4));
    expect(r.total).toBe(17);
  });

  it('limita a 1–5 dados', () => {
    expect(rollInitiative(0, 9, seq(1)).dice).toHaveLength(5);
    expect(rollInitiative(0, 0, seq(1)).dice).toHaveLength(1);
  });
});
