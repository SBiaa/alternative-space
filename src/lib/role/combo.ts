import { COMBO, MANOBRA, type Manobra } from "./config";

// Combo: manobras encadeadas sem parar no chão somam e multiplicam.
// Aterrissar limpo e ficar parado no chão fecha o combo (os pontos entram).
// Aterrissar torto ou cair zera o combo (os pontos se perdem).

export type Combo = { manobras: Manobra[]; soma: number };

export const comboVazio = (): Combo => ({ manobras: [], soma: 0 });

export function somarManobra(c: Combo, m: Manobra): Combo {
  return { manobras: [...c.manobras, m], soma: c.soma + MANOBRA[m].pontos };
}

export const multiplicador = (c: Combo) => Math.max(1, Math.min(COMBO.multiplicadorMax, c.manobras.length));

export const valorDoCombo = (c: Combo) => (c.manobras.length === 0 ? 0 : c.soma * multiplicador(c));

export type Placar = { pontos: number; maiorCombo: number; contagem: Partial<Record<Manobra, number>> };

export const placarVazio = (): Placar => ({ pontos: 0, maiorCombo: 0, contagem: {} });

// Fecha o combo: soma no placar e devolve o combo vazio.
export function fecharCombo(p: Placar, c: Combo): { placar: Placar; combo: Combo; ganho: number } {
  if (c.manobras.length === 0) return { placar: p, combo: c, ganho: 0 };
  const ganho = valorDoCombo(c);
  const contagem = { ...p.contagem };
  for (const m of c.manobras) contagem[m] = (contagem[m] ?? 0) + 1;
  return {
    placar: { pontos: p.pontos + ganho, maiorCombo: Math.max(p.maiorCombo, c.manobras.length), contagem },
    combo: comboVazio(),
    ganho,
  };
}

// Torto ou tombo: o combo some sem pontuar.
export const perderCombo = (): Combo => comboVazio();
