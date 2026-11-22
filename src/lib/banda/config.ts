// Todos os números e listas da Banda de Garagem. Nada disso mora em componente.
// Textos e nomes inventados ficam em conteudo.ts. Dinheiro do jogo: inteiros, sem centavos, não vale dinheiro real.

import type { AcaoDia, Papel, ParteEquip } from "./tipos";

export const PAPEIS: Papel[] = ["voz", "guitarra", "baixo", "bateria"];
export const PARTES_EQUIP: ParteEquip[] = ["instrumentos", "amplificador", "cabos"];
export const ACOES: AcaoDia[] = ["ensaiar", "compor", "divulgar", "trabalhar", "descansar"];

export const BANDA = {
  versaoSave: 1,
  chaveLocal: "banda-de-garagem:save",
  chaveOpcoes: "banda-de-garagem:opcoes",
  diasDeSemana: 6, // seis dias de ação e o fim de semana com o show
  nomeMax: 30,
  tituloMax: 40,
  dinheiroInicial: 100,
  famaInicial: 0,
  entrosamentoInicial: 20,
  equipamentoInicial: 75,
  candidatosPorPapel: 3,
  historicoShowsLocal: 60,
  limiteGravacoes: { max: 60, janelaSeg: 60 },

  /** Atributos de um candidato novo (0 a 100). */
  candidato: { min: 25, max: 70, humorMin: 55, humorMax: 85 },

  /** Logo: formas e cores simples. As cores são tokens de escolha, não texto. */
  logo: {
    formas: ["circulo", "raio", "estrela", "triangulo", "onda", "chave"],
    cores: ["#1f3a2e", "#dd5d05", "#6b3a24", "#3d2a6e", "#0b2340", "#b8315a", "#e9d8a6", "#f4f1de"],
  },

  silhuetas: 4,
} as const;

export type EfeitoAcao = {
  tecnica: number;
  criatividade: number;
  entrosamento: number;
  humor: number;
  cansaco: number;
  dinheiro: number;
  divulgacao: number;
  fama: number;
  desgaste: Partial<Record<ParteEquip, number>>;
};

/** O que cada ação faz num dia. Valores já são os da ação "pura"; manias e cansaço ajustam em cima. */
export const EFEITOS: Record<AcaoDia, EfeitoAcao> = {
  ensaiar: { tecnica: 3, criatividade: 0, entrosamento: 4, humor: -6, cansaco: 20, dinheiro: 0, divulgacao: 0, fama: 0, desgaste: { instrumentos: 2 } },
  compor: { tecnica: 0, criatividade: 1, entrosamento: 1, humor: -3, cansaco: 8, dinheiro: 0, divulgacao: 0, fama: 0, desgaste: {} },
  divulgar: { tecnica: 0, criatividade: 0, entrosamento: 0, humor: -3, cansaco: 8, dinheiro: -10, divulgacao: 25, fama: 1, desgaste: {} },
  trabalhar: { tecnica: 0, criatividade: 0, entrosamento: -1, humor: -8, cansaco: 22, dinheiro: 60, divulgacao: 0, fama: 0, desgaste: { amplificador: 1 } },
  descansar: { tecnica: 0, criatividade: 0, entrosamento: 1, humor: 14, cansaco: -35, dinheiro: 0, divulgacao: 0, fama: 0, desgaste: {} },
};

/** Trabalho rende de 80% a 120% do valor base, sorteado pela seed. */
export const VARIACAO_TRABALHO = 0.2;

export const HUMOR = {
  /** Cansaço a partir daqui o humor cai mais rápido e a briga passa a ser possível. */
  limiarCansaco: 50,
  /** Humor extra perdido por dia, por ponto de cansaço acima do limiar (dividido por 10). */
  quedaPorCansaco: 0.15,
  /** O aviso aparece quando o humor chega a esse valor ou menos. */
  aviso: 35,
  /** Com humor assim e aviso dado em semana anterior, o integrante pode sair. */
  saida: 15,
  /** Com humor assim ou menos, pode faltar ao show. */
  faltar: 25,
  chanceFaltar: 0.5,
  chanceSair: 0.6,
  min: 0,
  max: 100,
  /** Quanto o humor de quem entra no lugar de quem saiu começa. */
  humorSubstituto: 65,
} as const;

export const BRIGA = {
  /** Chance por dia = base + porIntegranteCansado * (quantos estão acima do limiar). Só conta com ao menos 2 cansados. */
  base: 0.05,
  porIntegranteCansado: 0.12,
  maxChance: 0.7,
  entrosamentoPerde: 8,
  humorPerde: 6,
} as const;

export type Mania = {
  id: string;
  /** Chance extra de atrasar no show (e derrubar a nota). */
  atrasa?: number;
  /** Fator sobre o ganho do ensaio dele. */
  ensaio?: number;
  /** Bônus de público quando está presente (somado, em fração). */
  empolga?: number;
  /** Se a banda ficou duas semanas sem compor, o humor dele cai essa quantidade por semana. */
  querMusicaPropria?: number;
};

export const MANIAS: Mania[] = [
  { id: "sempre-atrasa", atrasa: 0.35 },
  { id: "so-musica-propria", querMusicaPropria: 8 },
  { id: "empolga-o-publico", empolga: 0.08 },
  { id: "perfeccionista", ensaio: 1.5 },
];

export const COMPOR = {
  notaBoa: 60,
  musicasParaDemo: 4,
  humorFatorMin: 0.8,
  humorFatorMax: 1,
  /** Peso de criatividade e técnica no talento de quem compõe (somam 1). */
  pesoCriatividade: 0.6,
  pesoTecnica: 0.4,
  /** O talento entra como 0.4 + 0.6 * talento, então até uma banda fraca tira alguma coisa. */
  talentoPiso: 0.4,
  ruido: 0.08,
  sugestoes: 3,
  maxMusicas: 40,
} as const;

export type EstruturaCfg = { id: string; base: number; secoes: { nome: string; compassos: number }[] };

export const ESTRUTURAS: EstruturaCfg[] = [
  {
    id: "direta",
    base: 80,
    secoes: [{ nome: "intro", compassos: 4 }, { nome: "verso", compassos: 8 }, { nome: "refrao", compassos: 8 }, { nome: "verso", compassos: 8 }, { nome: "refrao", compassos: 8 }],
  },
  {
    id: "classica",
    base: 88,
    secoes: [{ nome: "intro", compassos: 4 }, { nome: "verso", compassos: 8 }, { nome: "refrao", compassos: 8 }, { nome: "verso", compassos: 8 }, { nome: "refrao", compassos: 8 }, { nome: "ponte", compassos: 8 }, { nome: "refrao", compassos: 8 }],
  },
  {
    id: "longa",
    base: 92,
    secoes: [{ nome: "intro", compassos: 8 }, { nome: "verso", compassos: 16 }, { nome: "refrao", compassos: 8 }, { nome: "verso", compassos: 16 }, { nome: "refrao", compassos: 8 }, { nome: "solo", compassos: 16 }, { nome: "ponte", compassos: 8 }, { nome: "refrao", compassos: 16 }],
  },
];

export type ClimaCfg = { id: string; bpm: number };
export const CLIMAS: ClimaCfg[] = [
  { id: "energico", bpm: 20 },
  { id: "melancolico", bpm: -25 },
  { id: "ensolarado", bpm: 5 },
  { id: "sombrio", bpm: -10 },
];

export const TEMAS: string[] = ["bairro", "amizade", "madrugada", "saudade", "estrada", "recomeco"];

export type EstiloCfg = { id: string; bpm: number; afinidade: Record<string, number> };
/** Afinidade do estilo com cada clima: multiplicador da nota da música. */
export const ESTILOS: EstiloCfg[] = [
  { id: "rock-de-garagem", bpm: 135, afinidade: { energico: 1.15, melancolico: 0.85, ensolarado: 1, sombrio: 0.95 } },
  { id: "punk", bpm: 170, afinidade: { energico: 1.2, melancolico: 0.8, ensolarado: 0.9, sombrio: 1 } },
  { id: "indie", bpm: 110, afinidade: { energico: 0.9, melancolico: 1.1, ensolarado: 1.15, sombrio: 0.95 } },
  { id: "metal", bpm: 150, afinidade: { energico: 1.1, melancolico: 0.85, ensolarado: 0.75, sombrio: 1.2 } },
  { id: "emo", bpm: 125, afinidade: { energico: 0.95, melancolico: 1.2, ensolarado: 0.8, sombrio: 1.05 } },
  { id: "pop-alternativo", bpm: 118, afinidade: { energico: 1, melancolico: 0.95, ensolarado: 1.2, sombrio: 0.8 } },
];

export type PalcoCfg = {
  slug: string;
  famaMin: number;
  capacidade: number;
  cacheBase: number;
  /** Quanta fama um show nota 100 rende (nota 50 não rende nada). */
  famaGanho: number;
  exigeDemo: boolean;
  /** Quantas músicas cabem no repertório. */
  musicas: number;
};

export const PALCOS: PalcoCfg[] = [
  { slug: "garagem-do-tuco", famaMin: 0, capacidade: 25, cacheBase: 0, famaGanho: 6, exigeDemo: false, musicas: 3 },
  { slug: "bar-tampinha", famaMin: 15, capacidade: 60, cacheBase: 60, famaGanho: 8, exigeDemo: false, musicas: 4 },
  { slug: "festa-ipe-roxo", famaMin: 30, capacidade: 150, cacheBase: 120, famaGanho: 10, exigeDemo: false, musicas: 4 },
  { slug: "centro-varzea-viva", famaMin: 45, capacidade: 300, cacheBase: 250, famaGanho: 12, exigeDemo: true, musicas: 5 },
  { slug: "festival-quintal-aberto", famaMin: 70, capacidade: 800, cacheBase: 600, famaGanho: 15, exigeDemo: true, musicas: 6 },
];

/** Pesos do show. Cada fator vale 1 quando o valor está em 50 e oscila em torno disso. */
export const SHOW = {
  peso: { entrosamento: 0.5, presenca: 0.5, equipamento: 0.4, divulgacao: 0.3 },
  ruido: 0.1,
  /** Quanto cada integrante ausente derruba o fator de presença e o de entrosamento. */
  faltaPenalidade: 0.15,
  atrasoPenalidade: 0.04,
  /** Demanda do público = piso + fama * pesoFama + divulgacao * pesoDivulgacao (tudo em 0..1). */
  demanda: { piso: 0.1, pesoFama: 0.5, pesoDivulgacao: 0.4 },
  /** Ocupação = demanda * (pivo + nota/100 * escala), limitada a 1. */
  ocupacao: { pivo: 0.5, escala: 0.7 },
  /** Cachê = base * (cacheMin + (1 - cacheMin) * ocupacao) * (0.7 + nota/100 * 0.6). */
  cacheMin: 0.4,
  famaMinDelta: -3,
  /** Desgaste do equipamento por show, por parte (de a até b, sorteado). */
  desgasteShow: [4, 10] as [number, number],
  /** Dá humor a quem tocou: bônus com nota boa, perda com nota ruim. */
  humorShowBom: 6,
  humorShowRuim: -6,
  notaBoa: 70,
  notaRuim: 40,
  /** Show sem tocar (pular): perde fama. */
  pularFama: -2,
  pularHumor: -5,
  /** Mínimo de músicas no repertório. */
  repertorioMin: 1,
  /** O fim de semana descansa um pouco (cansaço que sai de cada integrante). */
  recuperaCansaco: 30,
} as const;

export type MomentoCfg = {
  id: string;
  /** Peso sorteado dentro do que passou nas condições. */
  chance: number;
  /** Condições (todas precisam valer). */
  nota?: { min?: number; max?: number };
  cabosMax?: number;
  equipMax?: number;
  precisaMania?: "empolga" | "atrasa";
  ocupacaoMin?: number;
  ocupacaoMax?: number;
  /** Efeito sobre a nota final. */
  efeitoNota?: number;
  /** Efeito sobre o público (fração). */
  efeitoPublico?: number;
};

/** Momentos narrados do show. Quem entra é sorteado pela seed entre os que passam nas condições. */
export const MOMENTOS: MomentoCfg[] = [
  { id: "cabo-soltou", chance: 0.55, cabosMax: 60, efeitoNota: -4 },
  { id: "amp-chiou", chance: 0.4, equipMax: 50, efeitoNota: -3 },
  { id: "publico-cantou", chance: 0.5, nota: { min: 65 }, efeitoPublico: 0.04 },
  { id: "bis", chance: 0.35, nota: { min: 80 }, efeitoPublico: 0.06 },
  { id: "palco-vazio", chance: 0.5, ocupacaoMax: 0.25, efeitoNota: -2 },
  { id: "casa-cheia", chance: 0.5, ocupacaoMin: 0.85 },
  { id: "baterista-quebrou-baqueta", chance: 0.2, nota: { min: 50 } },
  { id: "dancaram", chance: 0.4, nota: { min: 55 }, efeitoPublico: 0.02 },
  { id: "vaia-educada", chance: 0.4, nota: { max: 40 } },
  { id: "empolgou", chance: 0.7, precisaMania: "empolga" },
  { id: "chegou-atrasado", chance: 1, precisaMania: "atrasa" },
  { id: "show-calmo", chance: 0.2, nota: { min: 40, max: 70 } },
];
export const MOMENTOS_POR_SHOW = 3;

export const DEMO = {
  custo: 300,
  /** Demo gravada rende essa fama de uma vez. */
  famaBonus: 5,
} as const;

export const CONSERTO = {
  /** Cada ponto de estado recuperado custa isso. */
  custoPorPonto: 1,
  /** Quanto recupera por conserto. */
  ganho: 25,
  max: 100,
} as const;
