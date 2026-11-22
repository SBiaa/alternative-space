// A mesa: grade, expositor vertical, o que cada posição enxerga e a validação do layout.

import { BANCA, MELHORIAS, produtoDe, temaDe } from "./config";
import type { Atributos, ItemKey, Layout, ProdutoSlug, Progresso } from "./tipos";

export const chaveItem = (produto: string, tema: string): ItemKey => `${produto}:${tema}`;

export function lerItem(item: string): { produto: ProdutoSlug; tema: string } | null {
  const [produto, tema, resto] = item.split(":");
  if (resto !== undefined || !produto || !tema) return null;
  if (!produtoDe(produto) || !temaDe(tema)) return null;
  return { produto: produto as ProdutoSlug, tema };
}

export const itemValido = (item: unknown): item is ItemKey => typeof item === "string" && lerItem(item) !== null;

/** Soma os efeitos das melhorias compradas (o nível mais alto de cada uma vale). */
export function atributos(melhorias: Record<string, number>): Atributos {
  const a: Atributos = {
    colunas: BANCA.mesaInicial.colunas, linhas: BANCA.mesaInicial.linhas, expositor: 0, maquininha: false,
    visBonus: 0, atencao: 0, diasAtelie: BANCA.diasAtelieBase, reposMult: 1,
  };
  for (const m of MELHORIAS) {
    const nivel = Math.min(melhorias[m.slug] ?? 0, m.niveis.length);
    if (nivel < 1) continue;
    const e = m.niveis[nivel - 1].efeito;
    if (e.colunas) a.colunas = e.colunas;
    if (e.linhas) a.linhas = e.linhas;
    if (e.expositor) a.expositor = e.expositor;
    if (e.maquininha) a.maquininha = true;
    if (e.visBonus) a.visBonus += e.visBonus;
    if (e.atencao) a.atencao += e.atencao;
    if (e.diasAtelie) a.diasAtelie = BANCA.diasAtelieBase + e.diasAtelie;
    if (e.reposMult) a.reposMult = Math.min(a.reposMult, e.reposMult);
  }
  a.visBonus = Math.min(a.visBonus, BANCA.visBonusMax);
  return a;
}

export const celulasDaMesa = (a: Atributos) => a.colunas * a.linhas;
export const totalCelulas = (a: Atributos) => celulasDaMesa(a) + a.expositor;
export const ehExpositor = (idx: number, a: Atributos) => idx >= celulasDaMesa(a);
/** Linha da mesa (0 = frente); o expositor devolve -1. */
export const linhaDe = (idx: number, a: Atributos) => (ehExpositor(idx, a) ? -1 : Math.floor(idx / a.colunas));

/**
 * O quanto o visitante enxerga cada espaço: a frente da mesa e o expositor (na altura do olho) primeiro, o fundo por último.
 * A toalha dá um bônus em tudo.
 */
export function visibilidade(idx: number, a: Atributos): number {
  const base = ehExpositor(idx, a)
    ? BANCA.visExpositor
    : a.linhas <= 1
      ? 1
      : 1 - (1 - BANCA.visFundoMin) * (linhaDe(idx, a) / (a.linhas - 1));
  return base * (1 + a.visBonus);
}

/** Espaços na ordem em que o visitante os vê (mais visíveis primeiro; empate: o de menor índice). */
export function ordemDeVisao(a: Atributos): number[] {
  return Array.from({ length: totalCelulas(a) }, (_, i) => i).sort((x, y) => visibilidade(y, a) - visibilidade(x, a) || x - y);
}

export function layoutVazio(a: Atributos): Layout {
  return { celulas: Array.from({ length: totalCelulas(a) }, () => null), precos: {} };
}

/**
 * Quando a mesa ou o expositor crescem (melhoria), leva cada item pro mesmo lugar (linha e coluna) na grade nova
 * e completa com espaços vazios. Nunca perde o que já está posto.
 */
export function ajustarLayout(l: Layout, antes: Atributos, depois: Atributos): Layout {
  const celulas: (ItemKey | null)[] = Array.from({ length: totalCelulas(depois) }, () => null);
  const mesaAntes = celulasDaMesa(antes);
  l.celulas.forEach((item, i) => {
    if (!item) return;
    if (i < mesaAntes) celulas[Math.floor(i / antes.colunas) * depois.colunas + (i % antes.colunas)] = item;
    else celulas[celulasDaMesa(depois) + (i - mesaAntes)] = item;
  });
  return { ...l, celulas };
}

export function precoDe(l: Layout, produto: ProdutoSlug): number {
  return l.precos[produto] ?? produtoDe(produto)!.precoSugerido;
}

/** Layout válido: tamanho certo, só itens que existem no estoque, sem repetir item, preços dentro da faixa. */
export function layoutValido(l: unknown, p: Pick<Progresso, "melhorias" | "estoque">): l is Layout {
  if (!l || typeof l !== "object") return false;
  const { celulas, precos } = l as Layout;
  const a = atributos(p.melhorias);
  if (!Array.isArray(celulas) || celulas.length !== totalCelulas(a)) return false;
  const vistos = new Set<string>();
  for (const c of celulas) {
    if (c === null) continue;
    if (!itemValido(c) || vistos.has(c) || (p.estoque.itens[c] ?? 0) < 1) return false;
    vistos.add(c);
  }
  if (!precos || typeof precos !== "object") return false;
  for (const [slug, v] of Object.entries(precos)) {
    const pr = produtoDe(slug);
    if (!pr || !Number.isInteger(v) || (v as number) < pr.precoMin || (v as number) > pr.precoMax) return false;
  }
  return true;
}
