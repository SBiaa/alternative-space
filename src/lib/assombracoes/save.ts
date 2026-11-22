// Progresso salvo no navegador (sem conta): schema, migração de versão e escolha ao criar a conta.
// O navegador nunca diz "resolvido" sozinho: guarda a resposta que o servidor aceitou, e o servidor confere de novo ao migrar.

import { z } from "zod";
import { VILA } from "./config";
import type { EstadoCaso, Resposta } from "./investigacao";

const id = z.string().min(1).max(48);

const casoLocal = z.object({
  sinais: z.array(id).max(VILA.maxSinaisPorCaso),
  depoimentos: z.array(id).max(VILA.maxDepoimentosPorCaso),
  tentativas: z.number().int().min(0).max(VILA.maxTentativas),
  // Resposta que o servidor já aceitou (ou null).
  resolvida: z.object({ criatura: id, motivo: id, escolha: id }).nullable(),
});

export const schemaProgresso = z.object({
  versao: z.literal(VILA.versaoSave),
  casos: z.record(id, casoLocal),
});

export type CasoLocal = z.infer<typeof casoLocal>;
export type ProgressoLocal = z.infer<typeof schemaProgresso>;

export const progressoVazio = (): ProgressoLocal => ({ versao: VILA.versaoSave, casos: {} });

// Uma função por salto de versão. Quando o formato mudar: suba VILA.versaoSave e acrescente aqui.
const MIGRACOES: Record<number, (s: Record<string, unknown>) => Record<string, unknown>> = {};

/** Leva qualquer progresso antigo até a versão atual. null se não der. */
export function migrar(bruto: unknown): ProgressoLocal | null {
  if (!bruto || typeof bruto !== "object") return null;
  let s = bruto as Record<string, unknown>;
  let v = typeof s.versao === "number" ? s.versao : 0;
  while (v < VILA.versaoSave) {
    const passo = MIGRACOES[v];
    if (!passo) return null;
    s = passo(s);
    v = typeof s.versao === "number" ? s.versao : v + 1;
  }
  const r = schemaProgresso.safeParse(s);
  return r.success ? r.data : null;
}

export const estadoDe = (c: CasoLocal): EstadoCaso => ({ sinais: c.sinais, depoimentos: c.depoimentos, tentativas: c.tentativas });

/** Junta dois estados do mesmo caso sem perder nada (união dos sinais e das falas, mais tentativas). */
export function juntarEstados(a: EstadoCaso, b: EstadoCaso): EstadoCaso {
  const u = (x: string[], y: string[]) => [...new Set([...x, ...y])];
  return { sinais: u(a.sinais, b.sinais), depoimentos: u(a.depoimentos, b.depoimentos), tentativas: Math.max(a.tentativas, b.tentativas) };
}

export type Resolucao = { caso: string; resposta: Resposta };

/** As respostas que o navegador diz ter acertado, pro servidor conferir de novo. */
export const resolucoesLocais = (p: ProgressoLocal): Resolucao[] =>
  Object.entries(p.casos).flatMap(([caso, c]) => (c.resolvida ? [{ caso, resposta: c.resolvida }] : []));
