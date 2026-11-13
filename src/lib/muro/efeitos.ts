// Atributos que vêm das melhorias e da equipe, e o clima de cada dia.

import { sortear } from "../gestao/rng";
import { MURO, MIN_DIA, limitar } from "./config";
import type { Catalogo, Clima, Progresso } from "./tipos";

export type Attr = {
  gastoTinta: number;
  secagem: number;
  qTinta: number;
  precoTinta: number;
  tintaNivel: number;
  entope: number;
  qContorno: number;
  desgasteRolinho: number;
  velFundo: number;
  alcanceNivel: number;
  montagem: number;
  lonaM2: number;
  secagemTenda: number;
  desperdicio: number;
  estoqueExtra: number;
  croqui: number;
  negociacao: number;
  precisaoGuia: number;
  treino: number;
  vagasExtra: number;
};

export const nivelDe = (p: Pick<Progresso, "melhorias">, slug: string) => p.melhorias[slug] ?? 0;

export function atributos(p: Pick<Progresso, "melhorias" | "equipe">, cat: Pick<Catalogo, "itens" | "arquetipos">): Attr {
  const a: Attr = {
    gastoTinta: 1, secagem: 1, qTinta: 0, precoTinta: 1, tintaNivel: 0, entope: 1, qContorno: 0, desgasteRolinho: 1, velFundo: 1, alcanceNivel: 0,
    montagem: 1, lonaM2: MURO.chuva.lonaBase, secagemTenda: 1, desperdicio: 1, estoqueExtra: 0, croqui: 0, negociacao: 0, precisaoGuia: 0, treino: 0, vagasExtra: 0,
  };
  for (const it of cat.itens) {
    const n = nivelDe(p, it.slug);
    const e = n > 0 ? it.effects[Math.min(n, it.effects.length) - 1] : undefined;
    if (!e) continue;
    a.gastoTinta *= e.gastoTinta ?? 1;
    a.secagem *= e.secagem ?? 1;
    a.qTinta += e.qualidade ?? 0;
    a.precoTinta *= e.precoTinta ?? 1;
    a.tintaNivel = Math.max(a.tintaNivel, e.tinta ?? 0);
    a.entope *= e.entope ?? 1;
    a.qContorno += e.qualidadeContorno ?? 0;
    a.desgasteRolinho *= e.desgasteRolinho ?? 1;
    a.velFundo *= e.velFundo ?? 1;
    a.alcanceNivel = Math.max(a.alcanceNivel, e.alcance ?? 0);
    a.montagem *= e.montagem ?? 1;
    a.lonaM2 = Math.max(a.lonaM2, e.lonaM2 ?? 0);
    a.secagemTenda *= e.secagemTenda ?? 1;
    a.desperdicio *= e.desperdicio ?? 1;
    a.estoqueExtra += e.estoqueExtra ?? 0;
    a.croqui += e.croqui ?? 0;
    a.negociacao += e.negociacao ?? 0;
    a.precisaoGuia += e.precisaoGuia ?? 0;
    a.treino += e.treino ?? 0;
    a.vagasExtra += e.vagas ?? 0;
  }
  for (const art of p.equipe) {
    const arq = cat.arquetipos.find((x) => x.slug === art.arquetipo);
    if (arq) {
      a.desperdicio *= arq.desperdicio;
      a.negociacao = Math.max(a.negociacao, arq.negociacao);
    }
  }
  return a;
}

export const vagasDe = (nivel: number, attr: Attr) => MURO.vagasPorNivel[Math.min(Math.max(nivel, 1), MURO.nivelMax) - 1] + attr.vagasExtra;
export const salariosDoDia = (p: Pick<Progresso, "equipe">, cat: Pick<Catalogo, "arquetipos">) =>
  p.equipe.reduce((s, a) => s + (cat.arquetipos.find((x) => x.slug === a.arquetipo)?.salario ?? 0), 0);

export const habilidadeMax = (p: Pick<Progresso, "equipe">, attr: Attr) =>
  Math.max(MURO.jogador.habilidade, ...p.equipe.map((a) => a.hab.tecnica)) + attr.treino;

/** Chuva do dia, determinística pela seed. Dia tranquilo: mais rara e mais fraca. */
export function climaDoDia(seed: string, dia: number, tranquilo: boolean): Clima {
  const c = MURO.chuva;
  if (sortear(seed, dia, "chove") >= (tranquilo ? c.chanceDiaTranquilo : c.chanceDia)) return { chuvas: [] };
  const [dMin, dMax] = c.duracao;
  const [iMin, iMax] = tranquilo ? c.intensidadeTranquila : c.intensidade;
  const dur = Math.round(dMin + sortear(seed, dia, "dur") * (dMax - dMin));
  const ini = Math.round(60 + sortear(seed, dia, "ini") * (MIN_DIA - dur - 120));
  const intensidade = Math.round((iMin + sortear(seed, dia, "int") * (iMax - iMin)) * 100) / 100;
  return { chuvas: [{ ini, fim: ini + dur, intensidade }] };
}
export const chuvaEm = (clima: Clima, minuto: number) => clima.chuvas.find((c) => minuto >= c.ini && minuto < c.fim) ?? null;
export const proximaChuva = (clima: Clima, minuto: number) => clima.chuvas.find((c) => c.fim > minuto) ?? null;
export { limitar };
