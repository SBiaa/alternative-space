import { RIFF, TRILHAS } from "./config";

// Regras puras do Riff Estelar: valem no navegador (partida) e no servidor (validação).

export type Nota = { t: number; lane: number };
export type Julgamento = "perfeito" | "boa" | "passou";

type Janelas = { perfeito: number; boa: number };

/** Julga um toque pela distância (ms) até a nota. Fora da janela "boa", não conta como acerto. */
export function julgar(deltaMs: number, janelas: Janelas = RIFF.janelas): "perfeito" | "boa" | null {
  const d = Math.abs(deltaMs);
  if (d <= janelas.perfeito) return "perfeito";
  if (d <= janelas.boa) return "boa";
  return null;
}

/** Multiplicador do combo. `combo` é o número de acertos seguidos, contando o atual. */
export function multiplicador(combo: number): number {
  for (const faixa of RIFF.combo) if (combo >= faixa.de) return faixa.x;
  return 1;
}

/** Pontos de um acerto. */
export function pontosDoAcerto(j: "perfeito" | "boa", combo: number, energiaAtiva: boolean): number {
  return RIFF.pontos[j] * multiplicador(combo) * (energiaAtiva ? RIFF.energia.multiplicador : 1);
}

/**
 * Tempo da música (ms) a partir do relógio do áudio.
 * Offset positivo = o tripulante ouve/toca atrasado, então o jogo "atrasa" a música pra ele.
 */
export function tempoDaMusica(agoraS: number, inicioS: number, offsetMs: number): number {
  return (agoraS - inicioS) * 1000 - offsetMs;
}

/** Precisão ponderada (Perfeito vale 1, Boa vale meio), em %, com 2 casas. */
export function precisao(perfect: number, good: number, miss: number): number {
  const total = perfect + good + miss;
  if (total === 0) return 0;
  return Math.round(((perfect + good * 0.5) / total) * 10000) / 100;
}

export function estrelas(prec: number): number {
  for (const e of RIFF.estrelas) if (prec >= e.min) return e.n;
  return 1;
}

/**
 * Maior pontuação possível com `perfect` Perfeitos e `good` Boas:
 * todos os acertos seguidos, as Boas no começo (onde o multiplicador é menor) e a energia ligada o tempo todo.
 * É um teto: nenhuma partida real passa disso.
 */
export function maxPossivel(perfect: number, good: number): number {
  const x = RIFF.energia.multiplicador;
  let total = 0;
  for (let i = 1; i <= good; i++) total += RIFF.pontos.boa * multiplicador(i) * x;
  for (let i = good + 1; i <= good + perfect; i++) total += RIFF.pontos.perfeito * multiplicador(i) * x;
  return total;
}

/** Teto absoluto do mapa: todas as notas em Perfeito. */
export const maxTeorico = (totalNotas: number) => maxPossivel(totalNotas, 0);

export type Partida = {
  score: number;
  accuracy: number;
  maxCombo: number;
  perfect: number;
  good: number;
  miss: number;
};

const inteiro = (v: unknown): v is number => Number.isInteger(v) && (v as number) >= 0;

/** Confere se a partida enviada é possível para um mapa com `totalNotas` notas. Devolve o motivo do erro ou null. */
export function validarPartida(p: Partida, totalNotas: number): string | null {
  const { score, accuracy, maxCombo, perfect, good, miss } = p;
  if (![score, maxCombo, perfect, good, miss].every(inteiro)) return "números inválidos";
  if (perfect + good + miss !== totalNotas) return "contagem não bate com o mapa";
  if (maxCombo > perfect + good) return "combo maior que os acertos";
  if (perfect + good > 0 && maxCombo < 1) return "combo zerado com acertos";
  if (score % RIFF.pontos.boa !== 0) return "pontuação impossível";
  if (score > maxPossivel(perfect, good)) return "pontuação acima do máximo";
  if (typeof accuracy !== "number" || Math.abs(accuracy - precisao(perfect, good, miss)) > 0.01) return "precisão não bate";
  return null;
}

/** Offset (ms) a partir das diferenças entre toques e batidas: descarta os toques fora da curva e tira a média. */
export function calcularOffset(diferencasMs: number[]): number | null {
  const { descartarAcimaMs, minimoToques } = RIFF.calibracao;
  if (diferencasMs.length === 0) return null;
  const ord = [...diferencasMs].sort((a, b) => a - b);
  const mediana = ord[Math.floor(ord.length / 2)];
  const bons = ord.filter((d) => Math.abs(d - mediana) <= descartarAcimaMs);
  if (bons.length < minimoToques) return null;
  const media = Math.round(bons.reduce((s, d) => s + d, 0) / bons.length);
  return Math.max(-RIFF.offsetLimiteMs, Math.min(RIFF.offsetLimiteMs, media));
}

/** Diferença (ms) entre um toque e a batida mais próxima. */
export function diferencaParaBatida(toqueMs: number, batidasMs: number[]): number {
  let melhor = Infinity;
  for (const b of batidasMs) if (Math.abs(toqueMs - b) < Math.abs(melhor)) melhor = toqueMs - b;
  return melhor;
}

/** Encaixa um tempo na grade do BPM (subdivisão 4 = semicolcheia). */
export function quantizar(t: number, bpm: number, subdivisao: number): number {
  const passo = 60000 / bpm / subdivisao;
  return Math.round(Math.round(t / passo) * passo);
}

/** Confere e ordena um mapa. Devolve null se algo estiver errado. */
export function normalizarMapa(v: unknown, duracaoMs: number): Nota[] | null {
  if (!Array.isArray(v) || v.length > 5000) return null;
  const notas: Nota[] = [];
  for (const n of v) {
    const t = Math.round(Number(n?.t));
    const lane = Number(n?.lane);
    if (!Number.isFinite(t) || t < 0 || t > duracaoMs) return null;
    if (!Number.isInteger(lane) || lane < 0 || lane >= TRILHAS) return null;
    notas.push({ t, lane });
  }
  notas.sort((a, b) => a.t - b.t || a.lane - b.lane);
  // Duas notas iguais na mesma trilha viram uma.
  return notas.filter((n, i) => i === 0 || n.t !== notas[i - 1].t || n.lane !== notas[i - 1].lane);
}
