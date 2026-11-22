// Regras do teste: 2d6 + atributo (+1 de talento) contra uma dificuldade. TypeScript puro, sem tela.
import { ATRIBUTOS, FAIXAS, REGRAS, type AtributoId, type FaixaId } from "./config";
import { dado } from "./rng";

export type EntradaTeste = {
  atributo: AtributoId;
  valorAtributo: number;
  /** A personagem tem um talento que ajuda neste teste? Quem decide é o motor, não a tela. */
  talento: boolean;
  /** Nome do talento que ajudou, só pro texto. */
  talentoNome?: string;
  dificuldade: number;
};

export type Rolagem = {
  n: number;
  dados: number[];
  soma: number;
  atributo: AtributoId;
  valorAtributo: number;
  bonusTalento: number;
  talentoNome?: string;
  total: number;
  dificuldade: number;
  faixa: FaixaId;
  /** A conta explicada, por exemplo: "2d6 = 7 (3 + 4), + Mente 2 = 9, contra 8: sucesso". */
  texto: string;
};

export function faixaDe(total: number, dificuldade: number): FaixaId {
  if (total >= dificuldade) return "sucesso";
  if (total >= dificuldade - REGRAS.margemCusto) return "custo";
  return "falha";
}

export function rolarDados(seed: string, n: number): number[] {
  return Array.from({ length: REGRAS.dados }, (_, i) => dado(seed, n, i, REGRAS.faces));
}

export function textoDaConta(r: Omit<Rolagem, "texto">): string {
  const nome = ATRIBUTOS.find((a) => a.id === r.atributo)?.nome ?? r.atributo;
  const partes = [`${REGRAS.dados}d${REGRAS.faces} = ${r.soma} (${r.dados.join(" + ")})`];
  let corrente = r.soma;
  corrente += r.valorAtributo;
  partes.push(`+ ${nome} ${r.valorAtributo} = ${corrente}`);
  if (r.bonusTalento) {
    corrente += r.bonusTalento;
    partes.push(`+ talento${r.talentoNome ? ` ${r.talentoNome}` : ""} ${r.bonusTalento} = ${corrente}`);
  }
  partes.push(`contra ${r.dificuldade}: ${FAIXAS[r.faixa].curto}`);
  return partes.join(", ");
}

/** Resolve o teste número `n` da partida com essa seed. Mesma entrada, mesmo resultado. */
export function resolverTeste(seed: string, n: number, e: EntradaTeste): Rolagem {
  const dados = rolarDados(seed, n);
  const soma = dados.reduce((a, b) => a + b, 0);
  const bonusTalento = e.talento ? REGRAS.bonusTalento : 0;
  const total = soma + e.valorAtributo + bonusTalento;
  const base = {
    n,
    dados,
    soma,
    atributo: e.atributo,
    valorAtributo: e.valorAtributo,
    bonusTalento,
    talentoNome: e.talento ? e.talentoNome : undefined,
    total,
    dificuldade: e.dificuldade,
    faixa: faixaDe(total, e.dificuldade),
  };
  return { ...base, texto: textoDaConta(base) };
}

/** Atributos na criação: de min a max cada um, somando exatamente o orçamento. */
export function atributosValidos(a: Record<AtributoId, number>): boolean {
  const v = ATRIBUTOS.map((x) => a[x.id]);
  return v.every((n) => Number.isInteger(n) && n >= REGRAS.atributoMin && n <= REGRAS.atributoMax) && v.reduce((s, n) => s + n, 0) === REGRAS.atributoPontos;
}
