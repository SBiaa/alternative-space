// Todos os números do Muro Livre. Nada disso mora em componente. Textos e nomes ficam em conteudo.ts e catalogo.ts.
// Dinheiro do jogo: inteiros, sem centavos. Não vale dinheiro real.

import type { Camada, CorId, Tamanho } from "./tipos";

export const CAMADAS: Camada[] = ["fundo", "contorno", "preenchimento", "detalhe"];
export const CORES: CorId[] = ["laranja", "azul", "creme", "tijolo", "preto"];

export type ConfigTamanho = {
  nome: string;
  larguraM: number;
  alturaM: number;
  grade: [number, number]; // colunas, linhas
  pagamento: [number, number];
  pagamentoComunitario: [number, number];
  tinta: number; // % de lata gasta no mural todo (somando as cores)
  spray: number; // latas gastas no mural todo
  rolinho: number; // % de desgaste do rolinho no mural todo
  artistasMin: number;
  nivelMin: number;
  jogavel: boolean;
  prazo: [number, number]; // dias
  montagemMin: number; // minutos pra montar andaime, se precisar
};

export const TAMANHOS: Record<Tamanho, ConfigTamanho> = {
  porta: { nome: "Porta", larguraM: 1.2, alturaM: 2.4, grade: [12, 24], pagamento: [120, 200], pagamentoComunitario: [70, 110], tinta: 70, spray: 1.2, rolinho: 18, artistasMin: 0, nivelMin: 1, jogavel: true, prazo: [3, 5], montagemMin: 0 },
  fachada: { nome: "Fachada", larguraM: 6, alturaM: 3.4, grade: [28, 16], pagamento: [320, 480], pagamentoComunitario: [190, 280], tinta: 170, spray: 2.8, rolinho: 40, artistasMin: 1, nivelMin: 2, jogavel: true, prazo: [4, 6], montagemMin: 40 },
  quadra: { nome: "Muro de quadra", larguraM: 12, alturaM: 4.5, grade: [36, 13], pagamento: [420, 620], pagamentoComunitario: [240, 360], tinta: 240, spray: 3.6, rolinho: 55, artistasMin: 2, nivelMin: 3, jogavel: true, prazo: [5, 7], montagemMin: 60 },
  longo: { nome: "Muro longo", larguraM: 24, alturaM: 5, grade: [48, 10], pagamento: [800, 1100], pagamentoComunitario: [480, 700], tinta: 400, spray: 6, rolinho: 80, artistasMin: 3, nivelMin: 4, jogavel: true, prazo: [6, 8], montagemMin: 90 },
  empena: { nome: "Empena de prédio", larguraM: 14, alturaM: 12, grade: [28, 24], pagamento: [0, 0], pagamentoComunitario: [0, 0], tinta: 0, spray: 0, rolinho: 0, artistasMin: 0, nivelMin: 5, jogavel: false, prazo: [8, 10], montagemMin: 120 },
};

/** Altura (m) que a crew alcança por nível de andaime. Índice 0 = sem andaime. */
export const ALCANCE_M = [2.5, 3.5, 4.5, 5.5, 8];

export const MURO = {
  versaoSave: 1,
  chaveLocal: "muro-livre:save",
  chaveOpcoes: "muro-livre:opcoes",
  bairroInicial: "Vila Rebocada",
  dinheiroInicial: 320,
  reputacaoInicial: { quebrada: 1.5, clientes: 1.5 },
  nivelMax: 5,

  dia: {
    minutos: 600, // das 8h às 18h
    inicioHora: 8,
    duracaoSeg: 240, // cerca de 4 minutos de verdade
    velocidades: [1, 2, 4] as number[],
    sabado: 5, // (dia - 1) % 7
    nomesDias: ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"],
    noiteMin: 840, // da hora em que a crew volta até o dia seguinte
  },

  /** Quanto cada nível exige (entregues e reputação média). Índice 0 = nível 1. */
  niveis: [
    { entregues: 0, rep: 0 },
    { entregues: 3, rep: 1.5 },
    { entregues: 8, rep: 2.2 },
    { entregues: 15, rep: 3 },
    { entregues: 25, rep: 3.5 },
  ],
  vagasPorNivel: [1, 2, 3, 4, 5],

  /** Camadas: peso na média final, mínimo da anterior pra destravar. */
  pesos: { fundo: 0.2, contorno: 0.3, preenchimento: 0.25, detalhe: 0.25 } as Record<Camada, number>,
  minimoAnterior: 60, // % de progresso da camada anterior pra liberar a seguinte
  /** Parte do gasto do mural que cada camada consome. */
  partilha: { fundo: 0.55, contorno: 0.5, preenchimento: 0.45, detalhe: 0.5 } as Record<Camada, number>,
  /** Qual das 3 cores do briefing cada camada usa. */
  coresDaCamada: { fundo: 0, preenchimento: 1, contorno: 2, detalhe: 2 } as Record<Camada, number>,

  jogador: { habilidade: 3, minPorCelula: 0.5 },
  traco: {
    maxCelulasPorTraco: 40,
    raioRolinho: 1.6, // em células
    raioSpray: 0.8,
    toleranciaBase: 1, // multiplicador da tolerância do template
  },
  assistida: { qualidade: 72, teto: 88, trechos: 5, minPorCelula: 0.7 },

  qualidade: {
    base: 62,
    porHabilidade: 5, // + por ponto de habilidade
    tetoPorTamanho: { porta: 100, fachada: 98, quadra: 96, longo: 94, empena: 90 } as Record<Tamanho, number>,
    tolerancia: 1.5, // folga em pontos acima do teto na checagem do servidor
    foraDaEspecialidade: -8,
    naEspecialidade: 8,
    bonusTranquilo: 6,
  },

  artista: {
    taxaCelulasPorMin: 1,
    porVelocidade: 0.1, // + 10% por ponto acima de 3
    especialidadeVel: 1.35,
    cansacoPorMin: 0.09, // reduzido pela resistência
    resistenciaAlivio: 0.12,
    cansacoLimiar: 60, // acima disso, perde qualidade e velocidade
    cansacoMaxPenalidade: 0.5,
    recuperaNoite: 30,
    recuperaFolga: 30,
  },

  /** Secagem em minutos de jogo e dano da chuva. */
  secagem: { base: 90 },
  chuva: {
    perdaProgressoPorMin: 0.006, // fração do progresso por minuto de chuva forte
    perdaQualidadePorMin: 0.35, // pontos por minuto
    chanceDia: 0.4,
    chanceDiaTranquilo: 0.18,
    duracao: [40, 140] as [number, number],
    intensidade: [0.35, 1] as [number, number],
    intensidadeTranquila: [0.25, 0.65] as [number, number],
    fatorTranquilo: 0.6, // dano da chuva no dia tranquilo
    lonaMin: 20,
    descobrirMin: 10,
    lonaBase: 6, // m² cobertos sem melhoria
  },

  material: {
    capacidadeTinta: 100,
    capacidadeSpray: 6,
    capacidadeReserva: 4,
    capacidadeLonas: 4,
    tintaPorCompra: 50, // % que um refil dá
    precoTinta: 14,
    precoSpray: 16,
    precoRolinho: 22,
    precoBico: 8,
    precoLona: 28,
    rolinhoSaudeMin: 15, // abaixo disso o fundo cobre pior
    bicoLataMin: 0.15, // lata abaixo disso (fração) entope mais
    entopeBase: 8, // % de saúde do bico por lata gasta
    entopeLataBaixa: 3,
    bicoQualidadeMin: 30,
    estoqueInicial: { tinta: 60, spray: 2, rolinho: 100, bico: 100, lonas: 1 },
    reservaInicial: { rolinho: 1, bico: 1 },
    tintaGasto: [1, 0.88, 0.75],
    semTintaPerdeQualidade: 25,
  },

  contas: { aluguel: 150, transporte: 55, luz: 35, porNivel: 20, atrasoReputacao: 0.12 },

  reputacao: {
    max: 5,
    ganhoEntregaClientes: 0.22,
    ganhoEntregaQuebrada: 0.28,
    ganhoTagDestaque: 0.1,
    qualidadeMinGanho: 55,
    fidelidadeMinima: 60,
    perdaForaDoCombinado: 0.12,
    perdaEstragado: 0.08,
    perdaAtrasoClientes: 0.12,
    perdaAtrasoQuebrada: 0.18,
    perdaPerdida: 0.3,
    decrescente: 0.6, // quanto o ganho encolhe perto do 5
  },

  prazo: { penalidadePorDia: 0.1, penalidadeMax: 0.5, diasAteDesistir: 3, extraTranquilo: 2 },
  pagamento: { piso: 0.55, porQualidade: 0.45, bonusTag: 0.15 },

  quadro: { tamanho: 5, comerciais: 3, comunitarios: 2 },
  negociacao: {
    ruido: 0.35,
    mudancaPagamento: 0.9,
    revisaoMin: 40,
    revisaoMinMesa: 20,
    pesoQuebrada: 0.5,
    pesoCroqui: 2.5,
    dificuldadePorTamanho: { porta: 0, fachada: 0.3, quadra: 0.6, longo: 1.2, empena: 2 } as Record<Tamanho, number>,
  },
  croqui: { base: 0.45, comTag: 0.2, porNivel: 0.02 },

  encontro: {
    taxa: 25,
    tempoMin: 90, // gasto pra se inscrever e montar
    duracaoMin: 300, // tempo curto pra pintar
    tamanho: "porta" as Tamanho,
    participantes: 5,
    notaBase: [38, 78] as [number, number],
    notaPorNivel: 3,
    podio: 3,
    mencaoMinimo: 55,
    premios: {
      podio: { dinheiro: 140, quebrada: 0.4 },
      mencao: { dinheiro: 50, quebrada: 0.15 },
      nada: { dinheiro: 0, quebrada: 0 },
    },
    pesos: { tecnica: 0.5, tema: 0.25, assinatura: 0.25 },
  },

  limiteGravacoes: { max: 60, janelaSeg: 600 },

  /** Card "em breve": requisitos exibidos, sem jogo. */
  empena: { nivel: 5, repQuebrada: 3.5, repClientes: 3.5 },

  tagPadrao: { viewBox: [60, 28] as [number, number], paths: ["M4 22 L12 6 L20 22 L28 6 L36 22", "M42 8 Q56 8 50 15 Q44 21 56 22"] },
};

export const MIN_DIA = MURO.dia.minutos;
/** Minuto absoluto (só cresce): a noite entre um dia e outro seca a tinta. */
export const minutoAbsoluto = (dia: number, minuto: number) => dia * (MIN_DIA + MURO.dia.noiteMin) + minuto;
export const semanaDe = (dia: number) => Math.ceil(dia / 7);
export const diaDaSemana = (dia: number) => (dia - 1) % 7;
export const ehSabado = (dia: number) => diaDaSemana(dia) === MURO.dia.sabado;
export const fimDeSemana = (dia: number) => dia % 7 === 0;
export const horaDe = (minuto: number) => {
  const m = MURO.dia.inicioHora * 60 + Math.floor(minuto);
  return `${String(Math.floor(m / 60)).padStart(2, "0")}h${String(m % 60).padStart(2, "0")}`;
};
export const limitar = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
