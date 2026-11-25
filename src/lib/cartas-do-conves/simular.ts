// Re-simulação: o servidor (e a migração do save local) refazem a partida inteira a partir da seed e da lista de ações.
// Se qualquer ação for impossível, a partida é recusada. O cliente nunca diz "venci": o servidor é quem conclui.

import { CONFIG } from "./config";
import { CONTEUDO } from "./conteudo";
import { aplicar, novaPartida, resumir } from "./motor";
import type { Acao, Conteudo, ErroAcao, Estado, Resumo } from "./tipos";

export type EntradaSim = { seed: string; oficio: string; colecao: string[]; acoes: unknown[] };
export type SaidaSim = { ok: true; estado: Estado; resumo: Resumo } | { ok: false; erro: ErroAcao | "entrada_invalida"; indice: number };

const isInt = (n: unknown) => Number.isInteger(n);

/** Confere o formato de uma ação vinda do cliente (o motor ainda confere as regras). */
export function acaoBemFormada(x: unknown): x is Acao {
  if (!x || typeof x !== "object") return false;
  const a = x as Record<string, unknown>;
  switch (a.t) {
    case "no":
      return typeof a.id === "string" && a.id.length <= 12;
    case "jogar":
      return isInt(a.c) && (a.a === undefined || isInt(a.a));
    case "escolher":
      return a.i === null || isInt(a.i);
    case "evento":
    case "comprar":
      return isInt(a.i);
    case "remover":
      return isInt(a.c);
    case "fim":
    case "curar":
    case "sair":
    case "abrir":
      return true;
    default:
      return false;
  }
}

export function simular(entrada: EntradaSim, C: Conteudo = CONTEUDO): SaidaSim {
  if (!Array.isArray(entrada.acoes) || entrada.acoes.length > CONFIG.maxAcoes) return { ok: false, erro: "limite_de_acoes", indice: 0 };
  let estado = novaPartida(entrada.seed, entrada.oficio, entrada.colecao, C);
  if (!estado) return { ok: false, erro: "entrada_invalida", indice: -1 };
  for (let i = 0; i < entrada.acoes.length; i++) {
    const a = entrada.acoes[i];
    if (!acaoBemFormada(a)) return { ok: false, erro: "acao_desconhecida", indice: i };
    const r = aplicar(estado, a, C);
    if (!r.ok) return { ok: false, erro: r.erro, indice: i };
    estado = r.estado;
  }
  return { ok: true, estado, resumo: resumir(estado) };
}

/**
 * Cartas que esta partida libera (sem as já liberadas, quem chama filtra). Só conta partida terminada pra vitória,
 * mas "derrotar" e "trecho" valem mesmo numa derrota: jogar é o que libera, não só ganhar.
 */
export function liberacoes(resumo: Resumo, C: Conteudo = CONTEUDO): string[] {
  if (resumo.resultado === "andamento") return [];
  const out: string[] = [];
  for (const c of C.listaCartas) {
    const l = c.liberacao;
    if (l.tipo === "derrotar" && resumo.derrotados.includes(l.inimigo)) out.push(c.slug);
    else if (l.tipo === "trecho" && resumo.trecho >= l.trecho) out.push(c.slug);
    else if (l.tipo === "vitoria_com" && resumo.resultado === "vitoria" && resumo.oficio === l.oficio) out.push(c.slug);
  }
  return out;
}

/** Carta favorita: a mais jogada somando várias partidas (empate: a de menor slug, pra ser estável). */
export function favoritaDe(jogadas: Record<string, number>[]): string | null {
  const total: Record<string, number> = {};
  for (const j of jogadas) for (const [k, v] of Object.entries(j)) total[k] = (total[k] ?? 0) + v;
  const ordem = Object.entries(total).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  return ordem[0]?.[0] ?? null;
}
