// Regras da investigação: coletar sinais, perguntar, conferir a resposta. TypeScript puro.
// As funções de coleta rodam no navegador (sem conta) e no servidor (com conta); `conferir` só no servidor.

import { VILA, type LugarId } from "./config";
import type { Caso, Publico } from "./schema";

export type EstadoCaso = {
  sinais: string[];
  // Ids das falas já perguntadas.
  depoimentos: string[];
  tentativas: number;
};

export type Resposta = { criatura: string; motivo: string; escolha: string };

export const estadoVazio = (): EstadoCaso => ({ sinais: [], depoimentos: [], tentativas: 0 });

type Erro = { ok: false; erro: string };
type Ok<T> = { ok: true; estado: EstadoCaso } & T;

const tem = (xs: string[], x: string) => xs.includes(x);
const juntar = (xs: string[], novos: string[]) => [...xs, ...novos.filter((n) => !tem(xs, n))];

/** Olha em volta num lugar: coleta os sinais dali que já dá pra perceber. */
export function olharLugar(p: Publico, e: EstadoCaso, lugar: LugarId): Ok<{ novos: string[] }> | Erro {
  const doLugar = p.sinais.filter((s) => s.lugar === lugar);
  if (doLugar.length === 0 && !p.moradores.some((m) => m.lugar === lugar) && p.lugarPrincipal !== lugar) return { ok: false, erro: "lugar" };
  const novos = doLugar.filter((s) => !tem(e.sinais, s.id) && s.requer.every((r) => tem(e.sinais, r))).map((s) => s.id);
  return { ok: true, estado: { ...e, sinais: juntar(e.sinais, novos) }, novos };
}

/** Faz uma pergunta a um morador. Só vale se a fala já está liberada. */
export function perguntar(p: Publico, e: EstadoCaso, moradorId: string, falaId: string): Ok<{ novos: string[]; jaFeita: boolean }> | Erro {
  const m = p.moradores.find((x) => x.id === moradorId);
  const f = m?.falas.find((x) => x.id === falaId);
  if (!m || !f) return { ok: false, erro: "fala" };
  if (!f.requer.every((r) => tem(e.sinais, r))) return { ok: false, erro: "travada" };
  if (f.depoisDe && !tem(e.depoimentos, f.depoisDe)) return { ok: false, erro: "travada" };
  if (tem(e.depoimentos, f.id)) return { ok: true, estado: e, novos: [], jaFeita: true };
  const novos = f.sinais.filter((s) => !tem(e.sinais, s));
  return {
    ok: true,
    estado: { ...e, depoimentos: [...e.depoimentos, f.id], sinais: juntar(e.sinais, f.sinais) },
    novos,
    jaFeita: false,
  };
}

export const faltamSinais = (p: Publico, e: EstadoCaso) => Math.max(0, p.minSinais - e.sinais.length);
export const podeDecidir = (p: Publico, e: EstadoCaso) => faltamSinais(p, e) === 0;

/** Tira do estado o que não existe no caso (id velho, adulterado) e repete o que já vale. */
export function sanear(p: Publico, bruto: EstadoCaso): EstadoCaso {
  const sinais = new Set(p.sinais.map((s) => s.id));
  const falas = new Set(p.moradores.flatMap((m) => m.falas.map((f) => f.id)));
  const uniq = (xs: string[]) => [...new Set(xs)];
  return {
    sinais: uniq(bruto.sinais).filter((s) => sinais.has(s)).slice(0, VILA.maxSinaisPorCaso),
    depoimentos: uniq(bruto.depoimentos).filter((f) => falas.has(f)).slice(0, VILA.maxDepoimentosPorCaso),
    tentativas: Math.min(Math.max(0, Math.trunc(bruto.tentativas) || 0), VILA.maxTentativas),
  };
}

export type Conferencia =
  | { ok: true; desfecho: string[]; origem: Caso["gabarito"]["origem"]; resumoBestiario: string; criatura: string }
  | { ok: false; dica: string };

/**
 * Confere a resposta. Só aqui o gabarito é lido. Quem erra recebe uma dica (nunca o gabarito),
 * mais direta a cada tentativa. A dica fala da primeira parte errada: criatura, motivo, depois escolha.
 */
export function conferir(c: Caso, r: Resposta, tentativasAntes: number): Conferencia {
  const g = c.gabarito;
  const tier = (xs: string[]) => xs[Math.min(Math.max(0, tentativasAntes), xs.length - 1)];
  if (r.criatura !== g.criatura) return { ok: false, dica: tier(g.dicas.criatura) };
  if (r.motivo !== g.motivo) return { ok: false, dica: tier(g.dicas.motivo) };
  if (r.escolha !== g.escolha) return { ok: false, dica: tier(g.dicas.escolha) };
  return { ok: true, desfecho: g.desfecho, origem: g.origem, resumoBestiario: g.bestiario.resumo, criatura: g.criatura };
}

/** A resposta usa só opções que existem no caso? (Senão nem conta como tentativa.) */
export function respostaValida(p: Publico, r: unknown): r is Resposta {
  if (!r || typeof r !== "object") return false;
  const o = r as Record<string, unknown>;
  return (
    typeof o.criatura === "string" &&
    typeof o.motivo === "string" &&
    typeof o.escolha === "string" &&
    p.criaturas.some((x) => x.slug === o.criatura) &&
    p.motivos.some((x) => x.id === o.motivo) &&
    p.encontro.opcoes.some((x) => x.id === o.escolha)
  );
}
