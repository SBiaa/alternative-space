// Das melhorias e da equipe para os atributos que a simulação lê. A simulação nunca olha o catálogo direto:
// toda melhoria passa por aqui, então um efeito novo é só uma linha nova.

import { EQUIPE, LAN } from "./config";
import type { Catalogo, ItemCatalogo, Layout, MaquinaSalva, Papel, Produto, Progresso, TipoPc } from "./tipos";

export type Funcionario = { nivel: number; velocidade: number; salario: number };
export type Lanche = { slug: Produto; preco: number; custo: number; capacidade: number; satisfacao: number };
export type MaquinaAttr = { id: string; tipo: TipoPc; x: number; y: number };

export type Atributos = {
  grade: { colunas: number; linhas: number };
  maquinas: MaquinaAttr[];
  divisoria: number | null;
  telaFina: boolean;
  mouseOptico: boolean;
  fone: boolean;
  plano: number;
  online: boolean;
  quedaNetMult: number;
  contaInternet: number;
  nobreakSeg: number;
  virusMult: number;
  antivirusRapido: boolean;
  congelar: boolean;
  jogoBonus: number;
  impressora: number;
  gravador: boolean;
  scanner: boolean;
  xerox: boolean;
  lanches: Partial<Record<Produto, Lanche>>;
  conforto: number;
  pacienciaMult: number;
  luzExtra: number;
  satisfacaoBonus: number;
  reputacaoBonus: number;
  barulhoMult: number;
  salaGamer: boolean;
  corujao: boolean;
  equipe: Partial<Record<Papel, Funcionario>>;
};

export const nivelDe = (p: Pick<Progresso, "melhorias">, slug: string) => p.melhorias[slug] ?? 0;
export const itemDe = (cat: Catalogo, slug: string): ItemCatalogo | undefined => cat.itens.find((i) => i.slug === slug);

/** Efeito do nível atual de um item (vazio se não comprou). */
export function efeitoDe(p: Pick<Progresso, "melhorias">, cat: Catalogo, slug: string): Record<string, number> {
  const nivel = nivelDe(p, slug);
  const it = itemDe(cat, slug);
  return it && nivel > 0 ? (it.effects[Math.min(nivel, it.effects.length) - 1] ?? {}) : {};
}

export function gradeDe(p: Pick<Progresso, "melhorias">, cat: Catalogo): { colunas: number; linhas: number } {
  const e = efeitoDe(p, cat, "espaco");
  return { colunas: e.colunas ?? LAN.grade.colunas, linhas: e.linhas ?? LAN.grade.linhas };
}

const TIPO_DO_SLUG: Record<string, TipoPc> = { "pc-basica": "basica", "pc-media": "media", "pc-gamer": "gamer" };
export const slugDoTipo = (t: TipoPc) => `pc-${t}`;

/** Quantas máquinas de cada tipo a lan já comprou. */
export function maquinasCompradas(p: Pick<Progresso, "melhorias">): Record<TipoPc, number> {
  const r: Record<TipoPc, number> = { basica: 0, media: 0, gamer: 0 };
  for (const [slug, tipo] of Object.entries(TIPO_DO_SLUG)) r[tipo] = nivelDe(p, slug);
  return r;
}

export function casaLivre(layout: Layout, g: { colunas: number; linhas: number }): { x: number; y: number } | null {
  for (let y = 0; y < g.linhas; y++) for (let x = 0; x < g.colunas; x++) if (!layout.pcs.some((m) => m.x === x && m.y === y)) return { x, y };
  return null;
}

/**
 * Põe numa casa livre cada máquina comprada que ainda não está no salão (depois de uma compra),
 * e cria o estado (saúde, sujeira) das máquinas novas. Devolve null se não couber.
 */
export function completarMaquinas(p: Pick<Progresso, "melhorias" | "layout" | "maquinas">, cat: Catalogo): { layout: Layout; maquinas: MaquinaSalva[] } | null {
  const g = gradeDe(p, cat);
  const layout: Layout = { pcs: [...p.layout.pcs], divisoria: p.layout.divisoria };
  const maquinas = [...p.maquinas];
  let n = maquinas.reduce((mx, m) => Math.max(mx, Number(m.id.slice(2)) || 0), 0);
  const comprado = maquinasCompradas(p);
  for (const tipo of ["basica", "media", "gamer"] as TipoPc[]) {
    let faltam = comprado[tipo] - maquinas.filter((m) => m.tipo === tipo).length;
    while (faltam-- > 0) {
      const c = casaLivre(layout, g);
      if (!c) return null;
      const id = `pc${++n}`;
      maquinas.push({ id, tipo, saude: LAN.maquinas.saudeInicial, sujeira: 0 });
      layout.pcs.push({ id, ...c });
    }
  }
  return { layout, maquinas };
}

/** A disposição cabe no salão: dentro da grade, uma máquina por casa, cada máquina com sua posição. */
export function layoutValido(layout: Layout, p: Pick<Progresso, "melhorias" | "maquinas">, cat: Catalogo): boolean {
  if (!layout || !Array.isArray(layout.pcs)) return false;
  const g = gradeDe(p, cat);
  const usadas = new Set<string>();
  const ids = new Set(p.maquinas.map((m) => m.id));
  if (layout.pcs.length !== ids.size) return false;
  for (const m of layout.pcs) {
    if (!Number.isInteger(m.x) || !Number.isInteger(m.y) || m.x < 0 || m.y < 0 || m.x >= g.colunas || m.y >= g.linhas) return false;
    const c = `${m.x},${m.y}`;
    if (usadas.has(c) || !ids.has(m.id)) return false;
    usadas.add(c);
    ids.delete(m.id);
  }
  if (layout.divisoria !== null) {
    if (nivelDe(p, "divisoria") < 1) return false;
    if (!Number.isInteger(layout.divisoria) || layout.divisoria < 1 || layout.divisoria >= g.colunas) return false;
  }
  return true;
}

export function atributos(p: Progresso, cat: Catalogo): Atributos {
  const ef = (slug: string) => efeitoDe(p, cat, slug);
  const g = gradeDe(p, cat);
  const pos = new Map(p.layout.pcs.map((c) => [c.id, c]));
  const maquinas: MaquinaAttr[] = [];
  for (const m of p.maquinas) {
    const c = pos.get(m.id);
    if (!c || c.x >= g.colunas || c.y >= g.linhas) continue;
    maquinas.push({ id: m.id, tipo: m.tipo, x: c.x, y: c.y });
  }

  const net = ef("internet");
  const cad = ef("cadeira");
  const vent = ef("ventilacao");
  const monitor = ef("monitor-fino");
  const fone = ef("fone");
  const lanches: Atributos["lanches"] = {};
  for (const slug of LAN.produtos) {
    const e = ef(slug);
    if (e.capacidade) lanches[slug] = { slug, preco: e.preco ?? 0, custo: e.custo ?? 0, capacidade: e.capacidade, satisfacao: e.satisfacao ?? 0.5 };
  }
  const ambientes = cat.itens.filter((i) => i.kind === "ambiente").map((i) => ef(i.slug));

  const equipe: Atributos["equipe"] = {};
  for (const m of p.equipe) {
    const d = EQUIPE[m.papel];
    if (!d) continue;
    const i = Math.min(Math.max(m.nivel, 1), d.salario.length) - 1;
    equipe[m.papel] = { nivel: m.nivel, velocidade: d.velocidade[i], salario: d.salario[i] };
  }

  return {
    grade: g,
    maquinas,
    divisoria: ef("divisoria").divisoria ? p.layout.divisoria : null,
    telaFina: Boolean(monitor.telaFina),
    mouseOptico: Boolean(ef("mouse-optico").mouseOptico),
    fone: Boolean(fone.fone),
    plano: net.plano ?? 0,
    online: Boolean(net.online),
    quedaNetMult: net.quedaMult ?? 1,
    contaInternet: net.conta ?? 20,
    nobreakSeg: ef("nobreak").nobreakSeg ?? 0,
    virusMult: ef("antivirus").virusMult ?? 1,
    antivirusRapido: Boolean(ef("antivirus").antivirusRapido),
    congelar: Boolean(ef("congelar").congelar),
    jogoBonus: ef("atualizacao").jogoBonus ?? 0,
    impressora: ef("impressora").impressora ?? 0,
    gravador: Boolean(ef("gravador").gravador),
    scanner: Boolean(ef("scanner").scanner),
    xerox: Boolean(ef("xerox").xerox),
    lanches,
    conforto: Math.min(1, (cad.conforto ?? 0) + (vent.conforto ?? 0) + (monitor.conforto ?? 0)),
    pacienciaMult: cad.pacienciaMult ?? 1,
    luzExtra: vent.luz ?? 0,
    satisfacaoBonus: ambientes.reduce((a, e) => a + (e.satisfacao ?? 0), 0) + (fone.satisfacao ?? 0),
    reputacaoBonus: ambientes.reduce((a, e) => a + (e.reputacao ?? 0), 0),
    barulhoMult: (ef("placa").barulhoMult ?? 1) * (fone.barulhoMult ?? 1),
    salaGamer: Boolean(ef("sala-gamer").salaGamer),
    corujao: Boolean(ef("corujao").corujao),
    equipe,
  };
}

export const salariosDoDia = (p: Pick<Progresso, "equipe">) =>
  p.equipe.reduce((a, m) => a + (EQUIPE[m.papel]?.salario[Math.min(Math.max(m.nivel, 1), 3) - 1] ?? 0), 0);

/** Duração do dia em segundos reais (com o corujão, a lan fica aberta até 4h). */
export const duracaoDoDia = (a: Pick<Atributos, "corujao">) => LAN.dia.duracaoSeg + (a.corujao ? LAN.dia.corujaoSeg : 0);

/** Horas que a lan fica aberta no dia. */
export const horasAbertas = (a: Pick<Atributos, "corujao">) =>
  LAN.dia.fechaHora - LAN.dia.abreHora + (a.corujao ? 24 - LAN.dia.fechaHora + LAN.dia.fechaCorujaoHora : 0);
