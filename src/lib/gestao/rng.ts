// RNG com semente compartilhado pelos jogos de gestão: mesma seed + mesmo dia + mesmo rótulo = mesmo número. Sem Math.random.

export function hash(s: string): number {
  let h = 1779033703 ^ s.length;
  for (let i = 0; i < s.length; i++) {
    h = Math.imul(h ^ s.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  return (h ^= h >>> 16) >>> 0;
}

function mulberry32(a: number) {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Um número em [0, 1) para (seed, noite, rótulo). */
export const sortear = (seed: string, noite: number, rotulo: string | number) => mulberry32(hash(`${seed}|${noite}|${rotulo}`))();

/** Escolhe um item pelo peso. */
export function escolherPeso<T>(itens: T[], pesos: number[], r: number): T {
  const total = pesos.reduce((a, b) => a + b, 0);
  let alvo = r * total;
  for (let i = 0; i < itens.length; i++) {
    alvo -= pesos[i];
    if (alvo < 0) return itens[i];
  }
  return itens[itens.length - 1];
}

export function novaSeed(): string {
  const a = new Uint32Array(2);
  crypto.getRandomValues(a);
  return `${a[0].toString(36)}${a[1].toString(36)}`;
}
