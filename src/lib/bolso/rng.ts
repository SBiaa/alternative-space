// RNG com semente. Cada rolagem é função pura de (seed da partida, número da rolagem, rótulo do dado).
// Sem Math.random no motor: o servidor refaz a conta e chega no mesmo número.

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

export function mulberry32(a: number) {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Face de 1 a `faces` para (seed, número da rolagem, índice do dado). */
export function dado(seed: string, rolagem: number, indice: number, faces: number): number {
  return 1 + Math.floor(mulberry32(hash(`${seed}|${rolagem}|${indice}`))() * faces);
}

export function novaSeed(): string {
  const a = new Uint32Array(2);
  crypto.getRandomValues(a);
  return `${a[0].toString(36)}${a[1].toString(36)}`;
}
