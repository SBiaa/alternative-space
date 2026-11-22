// RNG com semente. Vem do mesmo gerador dos outros jogos (lib/gestao/rng): mesma seed + mesmo rótulo + mesmo contador = mesmo número.
import { escolherPeso, novaSeed, sortear } from "../gestao/rng";

export { escolherPeso, novaSeed, sortear };

/** Sorteador independente do estado da partida (o mapa usa este: só depende da seed). */
export function sorteador(seed: string, rotulo: string): () => number {
  let n = 0;
  return () => sortear(seed, n++, rotulo);
}

/** Embaralha uma cópia (Fisher-Yates). */
export function embaralhar<T>(itens: T[], r: () => number): T[] {
  const a = itens.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Inteiro em [min, max], os dois incluídos. */
export const inteiroEntre = (r: () => number, min: number, max: number) => min + Math.floor(r() * (max - min + 1));
