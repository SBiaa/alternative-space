// Das melhorias e da equipe para os atributos que a simulação lê. A simulação nunca olha o catálogo direto:
// toda melhoria passa por aqui, então um efeito novo é só uma linha nova.

import { EQUIPE, TAVERNA } from "./config";
import type { Catalogo, ItemCatalogo, MesaLayout, Papel, Progresso } from "./tipos";

export type Receita = { slug: string; nome: string; nivel: number; preco: number; ingrediente: number; satisfacao: number; prep: number; bebida: boolean };
export type Funcionario = { nivel: number; velocidade: number; salario: number };

export type Atributos = {
  grade: { colunas: number; linhas: number };
  mesas: { id: string; tipo: string; lugares: number; x: number; y: number; conforto: number }[];
  lugares: number;
  pacienciaMult: number;
  nivelCadeira: number;
  conforto: number;
  satisfacaoBonus: number;
  reputacaoBonus: number;
  receitas: Record<string, Receita>;
  equipe: Partial<Record<Papel, Funcionario>>;
  bardoCasaMult: number;
  seguranca: boolean;
};

export const nivelDe = (p: Pick<Progresso, "melhorias">, slug: string) => p.melhorias[slug] ?? 0;

export const itemDe = (cat: Catalogo, slug: string): ItemCatalogo | undefined => cat.itens.find((i) => i.slug === slug);

/** Efeito do nível atual de um item (vazio se não comprou). */
export function efeitoDe(p: Pick<Progresso, "melhorias">, cat: Catalogo, slug: string): Record<string, number> {
  const nivel = nivelDe(p, slug);
  const item = itemDe(cat, slug);
  return item && nivel > 0 ? (item.effects[Math.min(nivel, item.effects.length) - 1] ?? {}) : {};
}

export function gradeDe(p: Pick<Progresso, "melhorias">, cat: Catalogo): { colunas: number; linhas: number } {
  const sal = efeitoDe(p, cat, "salao");
  const andar = efeitoDe(p, cat, "segundo-andar");
  return { colunas: sal.colunas ?? TAVERNA.grade.colunas, linhas: (sal.linhas ?? TAVERNA.grade.linhas) + (andar.linhasExtra ?? 0) };
}

const tiposMesa = (cat: Catalogo) => cat.itens.filter((i) => i.kind === "mobilia" && i.effects[0]?.lugares);

/** Quantas mesas de cada tipo a taverna já comprou. */
export function mesasCompradas(p: Pick<Progresso, "melhorias">, cat: Catalogo): Record<string, number> {
  return Object.fromEntries(tiposMesa(cat).map((t) => [t.slug, nivelDe(p, t.slug)]));
}

/** A disposição cabe no salão: dentro da grade, sem duas mesas na mesma casa e sem passar do que foi comprado. */
export function layoutValido(layout: MesaLayout[], p: Pick<Progresso, "melhorias">, cat: Catalogo): boolean {
  const g = gradeDe(p, cat);
  const comprado = mesasCompradas(p, cat);
  const usadas = new Set<string>();
  const ids = new Set<string>();
  const porTipo: Record<string, number> = {};
  for (const m of layout) {
    if (!Number.isInteger(m.x) || !Number.isInteger(m.y) || m.x < 0 || m.y < 0 || m.x >= g.colunas || m.y >= g.linhas) return false;
    const c = `${m.x},${m.y}`;
    if (usadas.has(c) || ids.has(m.id) || !(m.tipo in comprado)) return false;
    usadas.add(c);
    ids.add(m.id);
    porTipo[m.tipo] = (porTipo[m.tipo] ?? 0) + 1;
    if (porTipo[m.tipo] > comprado[m.tipo]) return false;
  }
  return true;
}

/** Primeira casa livre da grade, lendo linha por linha. */
export function casaLivre(layout: MesaLayout[], g: { colunas: number; linhas: number }): { x: number; y: number } | null {
  for (let y = 0; y < g.linhas; y++) for (let x = 0; x < g.colunas; x++) if (!layout.some((m) => m.x === x && m.y === y)) return { x, y };
  return null;
}

export function layoutInicial(): MesaLayout[] {
  return TAVERNA.layoutInicial.map((m, i) => ({ id: `m${i + 1}`, ...m }));
}

/** Põe numa casa livre cada mesa comprada que ainda não está no salão (depois de uma compra de mesa). */
export function completarLayout(layout: MesaLayout[], p: Pick<Progresso, "melhorias">, cat: Catalogo): MesaLayout[] {
  const g = gradeDe(p, cat);
  const out = layout.filter((m) => m.x < g.colunas && m.y < g.linhas);
  const comprado = mesasCompradas(p, cat);
  let n = out.reduce((mx, m) => Math.max(mx, Number(m.id.slice(1)) || 0), 0);
  for (const tipo of Object.keys(comprado)) {
    let faltam = comprado[tipo] - out.filter((m) => m.tipo === tipo).length;
    while (faltam-- > 0) {
      const c = casaLivre(out, g);
      if (!c) return out;
      out.push({ id: `m${++n}`, tipo, ...c });
    }
  }
  return out;
}

export function atributos(p: Progresso, cat: Catalogo): Atributos {
  const g = gradeDe(p, cat);
  const mesas: Atributos["mesas"] = [];
  const contagem: Record<string, number> = {};
  const comprado = mesasCompradas(p, cat);
  for (const m of p.layout) {
    const ef = efeitoDe(p, cat, m.tipo);
    contagem[m.tipo] = (contagem[m.tipo] ?? 0) + 1;
    if (!ef.lugares || contagem[m.tipo] > (comprado[m.tipo] ?? 0) || m.x >= g.colunas || m.y >= g.linhas) continue;
    mesas.push({ id: m.id, tipo: m.tipo, lugares: ef.lugares, x: m.x, y: m.y, conforto: ef.conforto ?? 0 });
  }

  const cad = efeitoDe(p, cat, "cadeiras");
  const ambientes = cat.itens.filter((i) => i.kind === "ambiente").map((i) => efeitoDe(p, cat, i.slug));
  const receitas: Record<string, Receita> = {};
  for (const item of cat.itens.filter((i) => i.kind === "receita")) {
    const nivel = nivelDe(p, item.slug);
    if (nivel <= 0) continue;
    const e = efeitoDe(p, cat, item.slug);
    receitas[item.slug] = { slug: item.slug, nome: item.name, nivel, preco: e.preco ?? 0, ingrediente: e.ingrediente ?? 0, satisfacao: e.satisfacao ?? 0, prep: e.prep ?? 0, bebida: e.bebida === 1 };
  }

  const equipe: Atributos["equipe"] = {};
  for (const m of p.equipe) {
    const d = EQUIPE[m.papel];
    if (!d) continue;
    const i = Math.min(Math.max(m.nivel, 1), d.salario.length) - 1;
    equipe[m.papel] = { nivel: m.nivel, velocidade: d.velocidade[i], salario: d.salario[i] };
  }
  const bardo = equipe.bardo;

  return {
    grade: g,
    mesas,
    lugares: mesas.reduce((a, m) => a + m.lugares, 0),
    pacienciaMult: cad.paciencia ?? 1,
    nivelCadeira: nivelDe(p, "cadeiras"),
    conforto: cad.conforto ?? 0,
    satisfacaoBonus: ambientes.reduce((a, e) => a + (e.satisfacao ?? 0), 0),
    reputacaoBonus: ambientes.reduce((a, e) => a + (e.reputacao ?? 0), 0),
    receitas,
    equipe,
    bardoCasaMult: bardo ? TAVERNA.paciencia.bardoCasaMult[Math.min(bardo.nivel, 3) - 1] : 1,
    seguranca: Boolean(equipe.seguranca),
  };
}

export const salariosDaNoite = (p: Pick<Progresso, "equipe">) =>
  p.equipe.reduce((a, m) => a + (EQUIPE[m.papel]?.salario[Math.min(Math.max(m.nivel, 1), 3) - 1] ?? 0), 0);

/** Humor do dragão pelo termômetro da reputação. */
export type Humor = "ronca" | "dorme" | "umOlho";
export const humorDoDragao = (reputacao: number): Humor =>
  reputacao >= TAVERNA.humor.ronca ? "ronca" : reputacao < TAVERNA.humor.umOlho ? "umOlho" : "dorme";
