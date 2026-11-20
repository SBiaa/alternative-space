// Laje Verde: tudo o que é número ou lista do jogo mora aqui. Componentes e motor só leem daqui.

import type { Fase } from "./tipos";

export const JOGO = "laje-verde";

export const LAJE = {
  versaoSave: 1,
  vasos: 12,
  aguaMax: 100,
  aguaAoPlantar: 60,
  // Água igual ou abaixo disso: a planta murcha (cresce mais devagar, nunca morre).
  limiarMurcha: 20,
  ritmoMurcha: 0.4,
  moedasIniciais: 30,
  sementesIniciais: { cebolinha: 3, manjericao: 3, alface: 2 } as Record<string, number>,
  // Tempo do jogo corre no fuso de Brasília (sem horário de verão desde 2019).
  fusoHoras: -3,
  // Quanto tempo atrás o servidor aceita recalcular; além disso a planta já está pronta de qualquer jeito.
  limiteRecalculoDias: 14,
  // Pra validar save local ao criar a conta.
  tetoMoedas: 3000,
  tetoMoedasPorDia: 400,
  limiteGravacoes: { max: 60, janelaSeg: 60 },
  // Chance de a planta aparecer com seu fator de sede em cada clima.
  clima: {
    pesos: { sol: 40, nublado: 25, chuva: 20, solForte: 15 },
    // Multiplicador da sede (água perdida por hora) em cada tipo de dia.
    sede: { sol: 1, nublado: 0.7, chuva: 0.8, solForte: 1.7 },
    chuva: { horaMin: 6, horaMax: 20, duracaoMin: 90 },
  },
  pombo: {
    chance: 0.5,
    chanceComEspantalho: 0.15,
    horaMin: 8,
    horaMax: 18,
    janelaMin: 10,
    perda: 0.4,
  },
  fases: { broto: 0.15, crescendo: 0.45 }, // fração do tempo total em que cada fase começa; 1 = pronta
  vaso: {
    // Índice = nível - 1.
    rendimento: [1, 1.25, 1.5],
    preco: [0, 120, 300],
  },
} as const;

export type Clima = keyof typeof LAJE.clima.pesos;
export const CLIMAS = Object.keys(LAJE.clima.pesos) as Clima[];
export const FASES: Fase[] = ["semente", "broto", "crescendo", "pronta"];

export type PlantaConfig = {
  slug: string;
  nome: string;
  // Tempo pra ficar pronta, com água em dia.
  crescimentoMin: number;
  // Pontos de água perdidos por hora num dia de sol normal.
  sedePorHora: number;
  rendimento: number;
  precoSemente: number;
  precoVenda: number;
  cor: string;
  corFlor?: string;
};

export const PLANTAS: PlantaConfig[] = [
  { slug: "cebolinha", nome: "Cebolinha", crescimentoMin: 6 * 60, sedePorHora: 6, rendimento: 4, precoSemente: 4, precoVenda: 3, cor: "#4f9a3f" },
  { slug: "manjericao", nome: "Manjericão", crescimentoMin: 8 * 60, sedePorHora: 7, rendimento: 4, precoSemente: 5, precoVenda: 4, cor: "#2f8a4a" },
  { slug: "alface", nome: "Alface", crescimentoMin: 10 * 60, sedePorHora: 8, rendimento: 3, precoSemente: 6, precoVenda: 6, cor: "#7fbf4a" },
  { slug: "hortela", nome: "Hortelã", crescimentoMin: 12 * 60, sedePorHora: 7, rendimento: 5, precoSemente: 8, precoVenda: 5, cor: "#3aa07a" },
  { slug: "pimenta", nome: "Pimenta", crescimentoMin: 18 * 60, sedePorHora: 5, rendimento: 4, precoSemente: 12, precoVenda: 9, cor: "#5b8a2e", corFlor: "#d63a1f" },
  { slug: "tomate-cereja", nome: "Tomate-cereja", crescimentoMin: 20 * 60, sedePorHora: 6, rendimento: 6, precoSemente: 14, precoVenda: 8, cor: "#4a8a35", corFlor: "#e0432c" },
  { slug: "girassol", nome: "Girassol", crescimentoMin: 24 * 60, sedePorHora: 5, rendimento: 2, precoSemente: 18, precoVenda: 22, cor: "#5a9a3a", corFlor: "#f2b705" },
  { slug: "morango", nome: "Morango", crescimentoMin: 30 * 60, sedePorHora: 6, rendimento: 5, precoSemente: 22, precoVenda: 12, cor: "#5a9a45", corFlor: "#d9304f" },
];

export type DecoracaoConfig = { slug: string; nome: string; preco: number; encaixes: string[]; efeito?: "espantalho" };

// Posições fixas (sem arrastar livre): funciona no toque e no teclado.
export const ENCAIXES = [
  { id: "canto-esq", nome: "Canto esquerdo" },
  { id: "canto-dir", nome: "Canto direito" },
  { id: "varal", nome: "Perto do varal" },
  { id: "mureta", nome: "Na mureta" },
  { id: "chao-1", nome: "Chão, perto da caixa d'água" },
  { id: "chao-2", nome: "Chão, perto da escada" },
] as const;

export const DECORACOES: DecoracaoConfig[] = [
  { slug: "banquinho", nome: "Banquinho", preco: 40, encaixes: ["canto-esq", "canto-dir", "chao-1", "chao-2"] },
  { slug: "vaso-lata", nome: "Vaso de lata pintado", preco: 50, encaixes: ["canto-esq", "canto-dir", "mureta", "chao-1", "chao-2"] },
  { slug: "luzinhas", nome: "Luzinhas", preco: 60, encaixes: ["varal", "mureta"] },
  { slug: "rede", nome: "Rede", preco: 80, encaixes: ["canto-esq", "canto-dir"] },
  { slug: "espantalho", nome: "Espantalho", preco: 90, encaixes: ["canto-esq", "canto-dir", "chao-1", "chao-2"], efeito: "espantalho" },
];

export type TrocaConfig = {
  id: string;
  pede: { colheita: string; qtd: number };
  da: { tipo: "semente"; slug: string; qtd: number } | { tipo: "moedas"; qtd: number };
};

export const TROCAS: TrocaConfig[] = [
  { id: "tomate-por-morango", pede: { colheita: "tomate-cereja", qtd: 3 }, da: { tipo: "semente", slug: "morango", qtd: 1 } },
  { id: "cebolinha-por-pimenta", pede: { colheita: "cebolinha", qtd: 4 }, da: { tipo: "semente", slug: "pimenta", qtd: 1 } },
  { id: "manjericao-por-moedas", pede: { colheita: "manjericao", qtd: 3 }, da: { tipo: "moedas", qtd: 18 } },
  { id: "alface-por-hortela", pede: { colheita: "alface", qtd: 2 }, da: { tipo: "semente", slug: "hortela", qtd: 2 } },
  { id: "hortela-por-girassol", pede: { colheita: "hortela", qtd: 4 }, da: { tipo: "semente", slug: "girassol", qtd: 1 } },
  { id: "morango-por-moedas", pede: { colheita: "morango", qtd: 2 }, da: { tipo: "moedas", qtd: 30 } },
];

export const planta = (slug: string) => PLANTAS.find((p) => p.slug === slug);
export const decoracao = (slug: string) => DECORACOES.find((d) => d.slug === slug);
export const troca = (id: string) => TROCAS.find((t) => t.id === id);
