import type { Dificuldade } from "./config";
import type { Nota } from "./regras";

// Faixa de exemplo (só para desenvolvimento): uma partitura original, tocada pelo sintetizador
// e usada também pra gerar os 3 mapas. Assim notas e música nascem da mesma fonte.

export const EXEMPLO = { slug: "faixa-exemplo", bpm: 120, compassos: 18, caudaMs: 1500 };

const BATIDA = 60000 / EXEMPLO.bpm; // 500ms
const COMPASSO = BATIDA * 4;
const SEMI = BATIDA / 4; // semicolcheia
export const duracaoExemplo = EXEMPLO.compassos * COMPASSO + EXEMPLO.caudaMs;

// Acordes (MIDI), um por compasso, em ciclo: Lá menor, Fá, Dó, Sol. Cada um com 4 vozes = 4 trilhas.
const ACORDES = [
  [57, 60, 64, 69],
  [53, 57, 60, 65],
  [60, 64, 67, 72],
  [55, 59, 62, 67],
];
const BAIXO = [45, 41, 48, 43];

// Desenho do arpejo por seção (índice da voz em cada colcheia).
const ARPEJO_A = [0, 1, 2, 3, 2, 1, 0, 1];
const ARPEJO_B = [0, 2, 1, 3, 2, 0, 3, 1];

export type NotaMelodia = { t: number; lane: number; midi: number; dur: number; forte: boolean };

const secao = (c: number) => (c < 2 ? "intro" : c < 10 ? "A" : c < 16 ? "B" : "fim");

/** Melodia em ordem: cada nota já sabe a trilha (a voz do acorde). */
export function melodia(): NotaMelodia[] {
  const notas: NotaMelodia[] = [];
  for (let c = 2; c < EXEMPLO.compassos; c++) {
    const s = secao(c);
    const acorde = ACORDES[c % 4];
    const desenho = s === "B" ? ARPEJO_B : ARPEJO_A;
    const colcheias = s === "fim" ? (c === EXEMPLO.compassos - 1 ? 1 : 8) : 8;
    for (let k = 0; k < colcheias; k++) {
      const lane = desenho[k];
      notas.push({ t: c * COMPASSO + k * 2 * SEMI, lane, midi: acorde[lane], dur: SEMI * 1.8, forte: k % 2 === 0 });
    }
    // Na seção B, o último tempo ganha duas semicolcheias de enfeite.
    if (s === "B") {
      for (const [k, lane] of [[13, 3], [15, 2]] as const)
        notas.push({ t: c * COMPASSO + k * SEMI, lane, midi: acorde[lane] + 12, dur: SEMI * 0.9, forte: false });
    }
  }
  return notas.sort((a, b) => a.t - b.t);
}

/** Mapa de uma dificuldade, tirado da melodia. */
export function mapaExemplo(d: Dificuldade): Nota[] {
  return melodia()
    .filter((n) => {
      const pos = Math.round((n.t % COMPASSO) / SEMI); // 0..15
      if (d === "facil") return pos % 8 === 0; // tempos 1 e 3
      if (d === "medio") return pos % 4 === 0; // todos os tempos
      return true;
    })
    .map(({ t, lane }) => ({ t, lane }));
}

export type Percussao = { t: number; tipo: "bumbo" | "caixa" | "chimbal" };

export function percussao(): Percussao[] {
  const p: Percussao[] = [];
  for (let c = 0; c < EXEMPLO.compassos; c++) {
    const s = secao(c);
    for (let b = 0; b < 4; b++) {
      const t = c * COMPASSO + b * BATIDA;
      if (b % 2 === 0 || s === "B") p.push({ t, tipo: "bumbo" });
      if (b % 2 === 1 && s !== "intro") p.push({ t, tipo: "caixa" });
      p.push({ t, tipo: "chimbal" }, { t: t + BATIDA / 2, tipo: "chimbal" });
    }
  }
  return p;
}

export function baixo(): { t: number; midi: number; dur: number }[] {
  const b: { t: number; midi: number; dur: number }[] = [];
  for (let c = 2; c < EXEMPLO.compassos; c++)
    for (let k = 0; k < 8; k++) b.push({ t: c * COMPASSO + k * 2 * SEMI, midi: BAIXO[c % 4] + (k % 4 === 3 ? 12 : 0), dur: SEMI * 1.6 });
  return b;
}
