// Regras do jogo: marcar pista, ligar, conferir a resposta e dar dica. TypeScript puro, sem banco nem tela.
// Recebe o capítulo completo (só existe no servidor) e devolve sempre um progresso novo.

import { FANZINE } from "./config";
import { deducoesExigidas } from "./conteudo";
import type { Capitulo, DeducaoFeita, Progresso } from "./tipos";

export type ResAchar = { ok: true; prog: Progresso; nova: boolean } | { ok: false; erro: "pista" };

export function acharPista(cap: Capitulo, prog: Progresso, pistaId: string): ResAchar {
  if (!cap.pistas.some((p) => p.id === pistaId)) return { ok: false, erro: "pista" };
  if (prog.clues.includes(pistaId)) return { ok: true, prog, nova: false };
  return { ok: true, prog: { ...prog, clues: [...prog.clues, pistaId] }, nova: true };
}

export type ResLigar =
  | { ok: true; resultado: "certa"; prog: Progresso; deducao: DeducaoFeita; jaTinha: boolean }
  | { ok: true; resultado: "nao_fecha" }
  | { ok: false; erro: "iguais" | "pista" | "sem_pista" };

/** Liga duas pistas. A ordem não importa. Ligação que não existe no conteúdo não custa nada. */
export function ligar(cap: Capitulo, prog: Progresso, a: string, b: string): ResLigar {
  if (a === b) return { ok: false, erro: "iguais" };
  const existentes = new Set(cap.pistas.map((p) => p.id));
  if (!existentes.has(a) || !existentes.has(b)) return { ok: false, erro: "pista" };
  if (!prog.clues.includes(a) || !prog.clues.includes(b)) return { ok: false, erro: "sem_pista" };
  const lig = cap.ligacoes.find((l) => (l.pistas[0] === a && l.pistas[1] === b) || (l.pistas[0] === b && l.pistas[1] === a));
  if (!lig) return { ok: true, resultado: "nao_fecha" };
  const jaTinha = prog.deductions.includes(lig.id);
  const novo = jaTinha ? prog : { ...prog, deductions: [...prog.deductions, lig.id] };
  return { ok: true, resultado: "certa", prog: novo, jaTinha, deducao: { id: lig.id, texto: lig.texto, pistas: lig.pistas } };
}

/** Deduções que o jogador já fez, com texto e pistas (pro quadro desenhar as linhas). */
export function deducoesFeitas(cap: Capitulo, prog: Progresso): DeducaoFeita[] {
  return cap.ligacoes.filter((l) => prog.deductions.includes(l.id)).map((l) => ({ id: l.id, texto: l.texto, pistas: l.pistas }));
}

export type ResResponder = { resolvida: true; prog: Progresso } | { resolvida: false; faltou: string[] };

/**
 * Confere a resposta. Só resolve se TODAS as partes estão certas E o jogador tem as deduções que sustentam cada uma
 * (chute certo sem investigar não vale). Quando não resolve, devolve só o que faltou, sem dizer o que está certo.
 */
export function conferir(cap: Capitulo, prog: Progresso, respostas: Record<string, string>): ResResponder {
  const faltou: string[] = [];
  let tudoCerto = true;
  for (const parte of cap.pergunta.partes) {
    const acertou = respostas[parte.id] === parte.certa;
    const semDeducao = parte.exige.filter((d) => !prog.deductions.includes(d));
    if (!acertou) tudoCerto = false;
    if (semDeducao.length > 0) {
      tudoCerto = false;
      for (const d of semDeducao) {
        const f = cap.ligacoes.find((l) => l.id === d)?.faltou;
        if (f && !faltou.includes(f)) faltou.push(f);
      }
    }
  }
  if (!tudoCerto) return { resolvida: false, faltou };
  return { resolvida: true, prog: { ...prog, solved: true } };
}

/** Quantas deduções ainda faltam pro capítulo poder ser resolvido. */
export const faltamDeducoes = (cap: Capitulo, prog: Progresso) => deducoesExigidas(cap).filter((d) => !prog.deductions.includes(d)).length;

export type ResDica = { ok: true; prog: Progresso; nivel: number; texto: string } | { ok: false; erro: "acabaram" };

/** Próxima dica (1 a 3). Dica não tira nada de ninguém: só soma ao contador. */
export function pedirDica(cap: Capitulo, prog: Progresso): ResDica {
  if (prog.hints >= FANZINE.maxDicas) return { ok: false, erro: "acabaram" };
  const nivel = prog.hints + 1;
  return { ok: true, prog: { ...prog, hints: nivel }, nivel, texto: cap.dicas[nivel - 1] };
}

/** Dicas já liberadas, em ordem. */
export const dicasLiberadas = (cap: Capitulo, prog: Progresso) => cap.dicas.slice(0, prog.hints);
