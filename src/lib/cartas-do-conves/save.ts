// Save local (partida sem conta). O que fica no navegador é só seed + ofício + ações: o estado se refaz pelo motor.
// Quando o formato mudar, some um `if (v < N)` em migrar(), sem apagar os anteriores.

import { CONFIG } from "./config";
import { schemaSaveLocal, type SaveLocal } from "./schema";
import { acaoBemFormada } from "./simular";
import type { Acao } from "./tipos";

export type SaveLocalTipado = Omit<SaveLocal, "acoes"> & { acoes: Acao[] };

export function migrar(bruto: unknown): SaveLocalTipado | null {
  if (!bruto || typeof bruto !== "object") return null;
  const dado = { ...(bruto as Record<string, unknown>) };
  dado.v = typeof dado.v === "number" ? dado.v : 1;
  // v1 é a primeira versão: nada a converter ainda.
  dado.v = CONFIG.versaoEstado;
  const r = schemaSaveLocal.safeParse(dado);
  if (!r.success || !r.data.acoes.every(acaoBemFormada)) return null;
  return r.data as SaveLocalTipado;
}

export const novoSaveLocal = (seed: string, oficio: string, acoes: Acao[]): SaveLocalTipado => ({ v: CONFIG.versaoEstado, seed, oficio, acoes });
