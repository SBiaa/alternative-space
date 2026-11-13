import { FISICA, MANOBRAS, PISTA, PONTUACAO, type Manobra } from "./config";
import type { Pista } from "./pista";

// Regras de pontuação justa: rodam no servidor antes de gravar uma corrida.

export type Entrada = { t: number; a: string }; // passo da simulação + ação (tecla/gesto)

export type Corrida = {
  score: number;
  trickPoints: number;
  durationMs: number;
  tricks: Partial<Record<Manobra, number>>;
  maxCombo: number;
  finished: boolean;
  inputs: Entrada[];
};

export const bonusDeTempo = (timeLimitS: number, durationMs: number) =>
  Math.max(0, Math.floor((timeLimitS * 1000 - durationMs) / 1000)) * PONTUACAO.bonusPorSegundoRestante;

export const pontuacaoFinal = (trickPoints: number, timeLimitS: number, durationMs: number, finished: boolean) =>
  trickPoints + (finished ? bonusDeTempo(timeLimitS, durationMs) : 0);

// Teto de pontos de manobra pra uma corrida desse tamanho.
export const tetoDePontos = (durationMs: number) => Math.floor((durationMs / 1000) * PONTUACAO.maxPontosPorSegundo);

// Nem na velocidade máxima o skatista atravessa a pista mais rápido que isso.
export function duracaoMinimaMs(pista: Pista): number {
  const px = pista.width * PISTA.celula;
  const passos = px / (FISICA.velocidadeRemando * 1.6);
  return Math.floor(passos * FISICA.passoMs * PONTUACAO.folgaDuracao);
}

export type MotivoCorrida = "formato" | "duracao" | "rapidaDemais" | "teto" | "soma" | "combo";

export function validarCorrida(c: Corrida, pista: Pista): MotivoCorrida | null {
  const int = (n: unknown) => typeof n === "number" && Number.isInteger(n) && n >= 0;
  if (!c || !int(c.score) || !int(c.trickPoints) || !int(c.durationMs) || !int(c.maxCombo) || typeof c.finished !== "boolean") return "formato";
  if (!c.tricks || typeof c.tricks !== "object" || Object.entries(c.tricks).some(([k, v]) => !MANOBRAS.includes(k as Manobra) || !int(v))) return "formato";
  if (!Array.isArray(c.inputs)) return "formato";
  if (c.durationMs > pista.timeLimit * 1000 + 1000) return "duracao";
  if (c.finished && c.durationMs < duracaoMinimaMs(pista)) return "rapidaDemais";
  if (c.trickPoints > tetoDePontos(c.durationMs)) return "teto";
  if (c.score !== pontuacaoFinal(c.trickPoints, pista.timeLimit, c.durationMs, c.finished)) return "soma";
  const total = Object.values(c.tricks).reduce((a, b) => a + (b ?? 0), 0);
  if (c.maxCombo > total) return "combo";
  return null;
}

// Publicar só depois que o próprio criador terminou essa mesma pista.
export type CorridaDeVerificacao = { userId: string; parkId: string; finished: boolean; layoutHash: string };
export type PicoParaPublicar = { id: string; userId: string; status: "draft" | "published" | "hidden"; layoutHash: string };

export function podePublicar(pico: PicoParaPublicar, corrida: CorridaDeVerificacao | null, quem: string): boolean {
  if (pico.userId !== quem || pico.status !== "draft") return false;
  if (!corrida) return false;
  return corrida.finished && corrida.userId === quem && corrida.parkId === pico.id && corrida.layoutHash === pico.layoutHash;
}

// Impressão digital estável da pista (peças em ordem) pra saber se a corrida foi nesta versão.
export function hashDaPista(p: Pista): string {
  const pecas = [...p.pieces].sort((a, b) => a.x - b.x || a.y - b.y || a.type.localeCompare(b.type)).map((q) => `${q.type}:${q.x}:${q.y}:${q.flip ? 1 : 0}`);
  const texto = `${p.version}|${p.width}|${p.height}|${p.timeLimit}|${pecas.join(",")}`;
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  for (let i = 0; i < texto.length; i++) {
    const ch = texto.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 16777619) >>> 0;
    h2 = Math.imul(h2 + ch, 2246822519) >>> 0;
  }
  return h1.toString(16).padStart(8, "0") + h2.toString(16).padStart(8, "0");
}
