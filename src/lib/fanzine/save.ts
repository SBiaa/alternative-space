// Save da Fanzine: schema (zod), migração de versão, saneamento contra o conteúdo e união local + conta.

import { z } from "zod";
import { FANZINE } from "./config";
import type { Capitulo, Progresso } from "./tipos";

const ids = z.array(z.string().min(1).max(48)).max(FANZINE.maxItens);

export const schemaProgresso = z.object({
  v: z.number().int().min(1),
  clues: ids,
  deductions: ids,
  hints: z.number().int().min(0).max(FANZINE.maxDicas),
  solved: z.boolean(),
});

export const progressoVazio = (): Progresso => ({ v: FANZINE.versaoSave, clues: [], deductions: [], hints: 0, solved: false });

/**
 * Leva um save de qualquer versão até a atual. Devolve null se não for um save válido.
 * Quando o formato mudar: some um `if (v < N)` aqui, sem apagar os anteriores, e suba FANZINE.versaoSave.
 */
export function migrar(bruto: unknown): Progresso | null {
  if (!bruto || typeof bruto !== "object") return null;
  const dado = { ...(bruto as Record<string, unknown>) };
  const v = typeof dado.v === "number" ? dado.v : 1;
  if (v > FANZINE.versaoSave) return null;
  // v1 é a primeira versão: nada a converter ainda.
  dado.v = FANZINE.versaoSave;
  const r = schemaProgresso.safeParse(dado);
  return r.success ? r.data : null;
}

const unicos = (l: string[]) => [...new Set(l)];

/**
 * Só fica o que existe no capítulo: pistas conhecidas e deduções cujas duas pistas o jogador tem.
 * `confiarResolvido` é falso pra save vindo do aparelho: o selo só sai de uma resposta conferida no servidor.
 */
export function sanear(cap: Capitulo, prog: Progresso, confiarResolvido: boolean): Progresso {
  const existentes = new Set(cap.pistas.map((p) => p.id));
  const clues = unicos(prog.clues).filter((c) => existentes.has(c));
  const tem = new Set(clues);
  const validas = new Map(cap.ligacoes.map((l) => [l.id, l]));
  const deductions = unicos(prog.deductions).filter((d) => {
    const l = validas.get(d);
    return Boolean(l) && l!.pistas.every((p) => tem.has(p));
  });
  return { v: FANZINE.versaoSave, clues, deductions, hints: Math.min(Math.max(prog.hints, 0), FANZINE.maxDicas), solved: confiarResolvido && prog.solved };
}

/** Une dois progressos do mesmo capítulo: nada que o jogador já ganhou se perde. */
export function unir(a: Progresso | null, b: Progresso | null): Progresso {
  if (!a && !b) return progressoVazio();
  if (!a || !b) return (a ?? b)!;
  return {
    v: FANZINE.versaoSave,
    clues: unicos([...a.clues, ...b.clues]),
    deductions: unicos([...a.deductions, ...b.deductions]),
    hints: Math.max(a.hints, b.hints),
    solved: a.solved || b.solved,
  };
}

/**
 * Migração do progresso local pra conta: sanea o save do aparelho contra o conteúdo (sem confiar no "resolvido")
 * e une com o que a conta já tem.
 */
export function migrarLocalParaConta(cap: Capitulo, local: unknown, daConta: Progresso | null): Progresso {
  const migrado = migrar(local);
  const doAparelho = migrado ? sanear(cap, migrado, false) : null;
  return unir(doAparelho, daConta ? sanear(cap, daConta, true) : null);
}
