import { z } from "zod";
import { ESTADO_VERSAO, PARTIDA } from "./config";
import { DIA_RE } from "./dia";
import { avaliarPartida, type Partida } from "./jogo";
import { calcularSequencia, type Sequencia } from "./sequencia";

// Save de quem joga sem conta: só os palpites de cada dia. Quem confere é sempre o servidor.

export const CHAVE_SAVE = "constelacao:save";

export const SaveLocal = z.object({
  versao: z.literal(ESTADO_VERSAO),
  dias: z.record(z.string().regex(DIA_RE), z.array(z.string().regex(/^[A-Z]{5,7}$/)).max(PARTIDA.tentativas)),
});
export type SaveLocal = z.infer<typeof SaveLocal>;

export const saveVazio = (): SaveLocal => ({ versao: ESTADO_VERSAO, dias: {} });

/** Lê o que veio do navegador e sobe versões antigas. Devolve null se não for um save válido. */
export function migrarSave(bruto: unknown): SaveLocal | null {
  if (!bruto || typeof bruto !== "object") return null;
  const o = bruto as Record<string, unknown>;
  // Sem versão = formato anterior ao schema: só { dias }.
  const candidato = o.versao === undefined ? { ...o, versao: ESTADO_VERSAO } : o;
  const r = SaveLocal.safeParse(candidato);
  if (!r.success) return null;
  // Guarda só os dias mais recentes.
  const dias = Object.keys(r.data.dias).sort().slice(-PARTIDA.diasNoNavegador);
  return { versao: ESTADO_VERSAO, dias: Object.fromEntries(dias.map((d) => [d, r.data.dias[d]])) };
}

export type PuzzleSecreto = { answer: string };
export type DiaResolvido = { dia: string; partida: Partida };

/**
 * Confere, no servidor, cada dia do save contra a palavra daquele dia. Dias futuros ou sem palavra
 * são ignorados; palpites fora da lista cortam a partida naquele ponto.
 */
export function resolverSave(save: SaveLocal, puzzles: ReadonlyMap<string, PuzzleSecreto>, hoje: string, validas: ReadonlySet<string>): DiaResolvido[] {
  const out: DiaResolvido[] = [];
  for (const dia of Object.keys(save.dias).sort()) {
    const puzzle = puzzles.get(dia);
    if (!puzzle || dia > hoje) continue;
    const partida = avaliarPartida(puzzle.answer, save.dias[dia], validas);
    if (partida.palpites.length > 0) out.push({ dia, partida });
  }
  return out;
}

/** Sequência de quem joga sem conta, só com as partidas terminadas. */
export function sequenciaDoSave(dias: DiaResolvido[]): Sequencia {
  return calcularSequencia(dias.filter((d) => d.partida.finalizada).map((d) => ({ dia: d.dia, solved: d.partida.solved })));
}
