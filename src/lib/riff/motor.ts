import { RIFF, TRILHAS } from "./config";
import { julgar, pontosDoAcerto, precisao, type Julgamento, type Nota, type Partida } from "./regras";

// Estado da partida, sem DOM nem áudio: recebe tempos da música (ms) e devolve o que aconteceu.

export type Estado = {
  notas: Nota[];
  julgadas: (Julgamento | null)[];
  // Índices das notas de cada trilha, em ordem, e a próxima ainda não julgada.
  porTrilha: number[][];
  ponteiro: number[];
  score: number;
  combo: number;
  maxCombo: number;
  perfect: number;
  good: number;
  miss: number;
  energia: number; // 0 a 1
  energiaAte: number | null; // tempo da música (ms) em que a energia acaba
};

export type Evento =
  | { tipo: "acerto"; julgamento: "perfeito" | "boa"; lane: number; nota: number; delta: number; pontos: number }
  | { tipo: "passou"; lane: number; nota: number }
  | { tipo: "vazio"; lane: number };

export function criarEstado(notas: Nota[]): Estado {
  const porTrilha: number[][] = Array.from({ length: TRILHAS }, () => []);
  notas.forEach((n, i) => porTrilha[n.lane].push(i));
  return {
    notas,
    julgadas: notas.map(() => null),
    porTrilha,
    ponteiro: Array(TRILHAS).fill(0),
    score: 0,
    combo: 0,
    maxCombo: 0,
    perfect: 0,
    good: 0,
    miss: 0,
    energia: 0,
    energiaAte: null,
  };
}

export const energiaAtiva = (e: Estado, agora: number) => e.energiaAte !== null && agora < e.energiaAte;

/** Marca como "passou" as notas que já saíram da janela. Chamar a cada quadro. */
export function avancar(e: Estado, agora: number): Evento[] {
  const eventos: Evento[] = [];
  if (e.energiaAte !== null && agora >= e.energiaAte) e.energiaAte = null;
  for (let lane = 0; lane < TRILHAS; lane++) {
    const lista = e.porTrilha[lane];
    while (e.ponteiro[lane] < lista.length) {
      const i = lista[e.ponteiro[lane]];
      if (e.julgadas[i] !== null) {
        e.ponteiro[lane]++;
        continue;
      }
      if (agora - e.notas[i].t <= RIFF.janelas.boa) break;
      e.julgadas[i] = "passou";
      e.miss++;
      e.combo = 0;
      e.ponteiro[lane]++;
      eventos.push({ tipo: "passou", lane, nota: i });
    }
  }
  return eventos;
}

/** Toque numa trilha no tempo `agora` (ms da música, já com offset). */
export function tocar(e: Estado, lane: number, agora: number): Evento {
  avancar(e, agora);
  const i = e.porTrilha[lane]?.[e.ponteiro[lane]];
  const delta = i === undefined ? Infinity : agora - e.notas[i].t;
  const j = julgar(delta);
  if (i === undefined || !j) {
    // Apertar sem nota zera o combo.
    e.combo = 0;
    return { tipo: "vazio", lane };
  }
  e.julgadas[i] = j;
  e.ponteiro[lane]++;
  e.combo++;
  e.maxCombo = Math.max(e.maxCombo, e.combo);
  if (j === "perfeito") {
    e.perfect++;
    if (!energiaAtiva(e, agora)) e.energia = Math.min(1, e.energia + RIFF.energia.porPerfeito);
  } else e.good++;
  const pontos = pontosDoAcerto(j, e.combo, energiaAtiva(e, agora));
  e.score += pontos;
  return { tipo: "acerto", julgamento: j, lane, nota: i, delta, pontos };
}

/** Liga a energia se a barra estiver cheia. */
export function ativarEnergia(e: Estado, agora: number): boolean {
  if (e.energia < 1 || energiaAtiva(e, agora)) return false;
  e.energia = 0;
  e.energiaAte = agora + RIFF.energia.duracaoMs;
  return true;
}

export const acabou = (e: Estado) => e.julgadas.every((j) => j !== null);

export function resultado(e: Estado): Partida {
  return {
    score: e.score,
    accuracy: precisao(e.perfect, e.good, e.miss),
    maxCombo: e.maxCombo,
    perfect: e.perfect,
    good: e.good,
    miss: e.miss,
  };
}
