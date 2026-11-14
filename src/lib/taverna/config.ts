// Todos os números e textos da Taverna do Dragão Cansado. Nada disso mora em componente.

import type { Papel } from "./tipos";

export const TAVERNA = {
  versaoSave: 1,
  chaveLocal: "taverna-do-dragao:save",
  cidadeInicial: "Vale do Carvalho Torto",
  ouroInicial: 60,
  reputacaoInicial: 2,
  /** Melhorias que a taverna já nasce com (nível). */
  inicial: { "mesa-2": 1, "mesa-4": 1, cadeiras: 1, cerveja: 1, ensopado: 1 } as Record<string, number>,
  /** Mesas que já nascem na grade: tipo, coluna, linha. */
  layoutInicial: [
    { tipo: "mesa-2", x: 0, y: 0 },
    { tipo: "mesa-4", x: 2, y: 0 },
  ],
  grade: { colunas: 4, linhas: 3 },

  noite: {
    duracaoSeg: 240, // cerca de 4 minutos
    gracaFechamentoSeg: 40, // depois de fechar, quem está dentro ainda pode pagar
    passoSeg: 0.25,
    primeiraChegadaSeg: 6,
    chegadasAteFracao: 0.8, // ninguém chega depois de 80% da noite
    comerSeg: 9,
    ladinoToleranciaSeg: 7,
    tempoMinPorClienteSeg: 14, // base do teto de ouro: nenhum cliente é atendido mais rápido que isso por lugar
  },
  /** Segundos que cada ação ocupa quem a faz (o tripulante ou um funcionário, dividido pela velocidade). */
  tempoAcao: { acomodar: 1, anotar: 1.5, buscar: 1, servir: 1.5, cobrar: 1, limpar: 2 } as Record<string, number>,

  chegadas: {
    gruposBase: 5,
    gruposPorNivel: 2,
    gruposPorReputacao: 1.4,
    /** Peso de cada tamanho de grupo (1 a 4). */
    pesoTamanho: [0.4, 0.35, 0.18, 0.07],
    /** Maior grupo possível em cada nível da taverna (índice 0 = nível 1). */
    grupoMaxPorNivel: [3, 3, 4, 4, 4],
    chanceMesmoArquetipo: 0.45,
  },

  paciencia: {
    tranquilaMult: 0.6,
    bardoClienteMult: 0.8,
    bardoCasaMult: [0.93, 0.89, 0.85],
    segurancaBarbaroMult: 0.6,
  },

  satisfacao: {
    pesos: { rapidez: 0.35, qualidade: 0.25, conforto: 0.2, manias: 0.2 },
    gorjetaMinSat: 0.4,
    /** Satisfação abaixo/acima desse ponto tira/dá reputação. */
    pontoNeutro: 0.5,
    reputacaoPorCliente: 0.09,
    reputacaoPorFuga: 0.14,
    reputacaoNoiteMax: 0.6,
  },

  combo: { porPedidoIgual: 1, porGrupoSeguido: 1, max: 8, bonusPorPonto: 0.1 },

  custoReparoCadeira: 18,

  economia: {
    gorjetaMaxSobreVendas: 0.9, // teto de gorjeta sobre o valor vendido, validado no servidor
    multGastoMax: 1.6,
  },

  /** Taxa da guilda: a cada `dias` noites. */
  guilda: { dias: 7, base: 70, porNivel: 45, reputacaoSeNaoPagar: 0.4 },

  /** Nível da taverna por reputação e noites abertas. Índice 0 = nível 2. */
  niveis: [
    { reputacao: 2.6, noites: 4 },
    { reputacao: 3.2, noites: 10 },
    { reputacao: 3.8, noites: 20 },
    { reputacao: 4.4, noites: 35 },
  ],
  nivelMax: 5,

  humor: { ronca: 3.5, umOlho: 2 },

  limiteGravacoes: { max: 12, janelaSeg: 60 },

  /** Vagas de funcionário por nível da taverna (índice 0 = nível 1). */
  vagasEquipe: [1, 2, 3, 4, 6],

  filial: { reputacao: 4.5, nivel: 5 },

  recibo: {
    contagemMs: 900,
    /** Uma frase de cena por noite, em rodízio. */
    cenas: [
      "Um bardo cantou até tarde e ninguém quis ir embora.",
      "O dragão roncou sobre o salão e as canecas tremeram.",
      "Uma caravana chegou com fome e sede de estrada.",
      "Alguém jurou ter visto um mago pagando a conta sem reclamar.",
      "A chuva bateu nas telhas e a lareira fez o resto.",
    ],
  },
  textos: {
    titulo: "Taverna do Dragão Cansado",
    chamada: "Cuide de uma taverna de fantasia, sirva aventureiros e melhore o salão com o ouro das noites.",
    continuar: "Continuar",
    novaTaverna: "Nova taverna",
    avisoOuro: "O ouro da taverna só vale dentro do jogo: não é dinheiro e não compra nada na loja.",
    contaGuardar: "Crie sua conta pra guardar sua taverna em qualquer aparelho",
    filialTitulo: "Abrir uma filial em outra cidade",
    filialAviso: "Em breve",
  },
} as const;

export type DadosEquipe = {
  nome: string;
  descricao: string;
  /** Preço de contratar (nível 1) e de cada melhoria de nível. */
  precos: number[];
  /** Salário por noite em cada nível. */
  salario: number[];
  /** Quão rápido faz as etapas em cada nível. */
  velocidade: number[];
  nivelTaverna: number;
  icone: string;
};

export const EQUIPE: Record<Papel, DadosEquipe> = {
  atendente: { nome: "Atendente", descricao: "Acomoda os grupos e anota os pedidos sozinho.", precos: [90, 140, 220], salario: [14, 20, 28], velocidade: [1, 1.4, 1.9], nivelTaverna: 1, icone: "📋" },
  garcom: { nome: "Garçom", descricao: "Busca os pedidos prontos e leva até a mesa.", precos: [110, 170, 260], salario: [16, 23, 32], velocidade: [1, 1.4, 1.9], nivelTaverna: 2, icone: "🍽️" },
  cozinheiro: { nome: "Cozinheiro", descricao: "Prepara os pratos mais rápido.", precos: [130, 200, 300], salario: [18, 26, 36], velocidade: [1.25, 1.7, 2.3], nivelTaverna: 2, icone: "🍲" },
  ajudante: { nome: "Ajudante", descricao: "Limpa as mesas depois que os clientes saem.", precos: [70, 110, 170], salario: [10, 15, 21], velocidade: [1, 1.4, 1.9], nivelTaverna: 1, icone: "🧹" },
  seguranca: { nome: "Segurança", descricao: "Impede o ladino de sair sem pagar e acalma o bárbaro.", precos: [150, 230, 340], salario: [20, 28, 38], velocidade: [1, 1, 1], nivelTaverna: 3, icone: "🛡️" },
  bardo: { nome: "Bardo da casa", descricao: "Toca a noite toda: a paciência de todos cai mais devagar.", precos: [170, 260, 380], salario: [22, 31, 42], velocidade: [1, 1, 1], nivelTaverna: 3, icone: "🎻" },
};

export const PAPEIS = Object.keys(EQUIPE) as Papel[];
export const ordemPapeis: Papel[] = ["atendente", "ajudante", "garcom", "cozinheiro", "seguranca", "bardo"];

export const TEXTOS_ERRO = {
  semConta: "Entre na sua conta pra guardar a taverna.",
  saldo: "Falta ouro pra isso.",
  nivelMax: "Já está no nível máximo.",
  nivelTaverna: "A taverna ainda não tem o nível pra isso.",
  semVaga: "Sem vagas de funcionário neste nível da taverna.",
  jaContratado: "Essa pessoa já trabalha na taverna.",
  invalido: "Não deu pra conferir essa noite. Ela não foi guardada.",
  limite: "Muitas gravações seguidas. Tenta de novo daqui a pouco.",
  generico: "Não deu pra guardar agora. Tenta de novo em instantes.",
  layout: "Essa disposição de mesas não cabe no salão.",
} as const;
