/**
 * Rolagem de dados de Shadowrun 5ª: d6, acerto em 5 ou 6, falha crítica
 * quando mais da metade dos dados dá 1. Funções puras (o gerador de números
 * é injetável para os testes).
 */
export type Rng = () => number;

export const MAX_POOL = 60;

export interface PoolRoll {
  /** Todos os dados rolados, na ordem (inclui os da Regra do Seis). */
  dice: number[];
  hits: number;
  /** Acertos depois do limite (igual a `hits` quando não há limite). */
  hitsLimited: number;
  ones: number;
  glitch: boolean;
  criticalGlitch: boolean;
  limited: boolean;
}

const d6 = (rng: Rng) => Math.floor(rng() * 6) + 1;

/**
 * Rola `pool` dados. Com `edge`, 6 explode: rola de novo e soma ao resultado.
 * Falha: mais da metade dos dados originais deu 1 (a Regra do Seis não conta).
 */
export function rollPool(pool: number, opts: { limit?: number; edge?: boolean; rng?: Rng } = {}): PoolRoll {
  const rng = opts.rng ?? Math.random;
  const n = Math.max(0, Math.min(MAX_POOL, Math.trunc(pool)));
  const dice: number[] = [];
  let hits = 0;
  let ones = 0;
  for (let i = 0; i < n; i++) {
    let v = d6(rng);
    dice.push(v);
    if (v === 1) ones++;
    if (v >= 5) hits++;
    // Regra do Seis: no máximo 50 explosões por dado, para nunca travar.
    for (let guard = 0; opts.edge && v === 6 && guard < 50; guard++) {
      v = d6(rng);
      dice.push(v);
      if (v >= 5) hits++;
    }
  }
  const limited = opts.limit !== undefined && opts.limit > 0 && hits > opts.limit;
  const glitch = n > 0 && ones * 2 > n;
  return {
    dice,
    hits,
    hitsLimited: limited ? (opts.limit as number) : hits,
    ones,
    glitch,
    criticalGlitch: glitch && hits === 0,
    limited,
  };
}

export interface InitiativeRoll {
  dice: number[];
  total: number;
}

/** Iniciativa: valor base + soma de `dice` d6 (1 a 5 dados). */
export function rollInitiative(base: number, dice: number, rng: Rng = Math.random): InitiativeRoll {
  const n = Math.max(1, Math.min(5, Math.trunc(dice)));
  const rolled = Array.from({ length: n }, () => d6(rng));
  return { dice: rolled, total: base + rolled.reduce((a, b) => a + b, 0) };
}
