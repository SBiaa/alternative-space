// Todos os números da Lan House 2005. Nada disso mora em componente. Textos e nomes inventados ficam em conteudo.ts.
// Dinheiro do jogo: inteiros, sem centavos. Não vale dinheiro real.

import type { Papel, Periodo, Produto, Servico, TipoPc } from "./tipos";

export const LAN = {
  versaoSave: 1,
  chaveLocal: "lan-house-2005:save",
  chaveDia: "lan-house-2005:dia",
  chaveOpcoes: "lan-house-2005:opcoes",
  localInicial: "Vila Esperança",
  dinheiroInicial: 80,
  reputacaoInicial: 2,
  /** Melhorias com que a lan já nasce (nível). pc-basica 3 = três máquinas básicas. */
  inicial: { "pc-basica": 3, internet: 1, cadeira: 1, refri: 1, espaco: 1 } as Record<string, number>,
  /** Onde as máquinas iniciais ficam na grade. */
  layoutInicial: [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: 2, y: 0 },
  ],
  grade: { colunas: 4, linhas: 3 },

  dia: {
    duracaoSeg: 240, // cerca de 4 minutos do relógio de verdade, das 8h às 22h
    corujaoSeg: 100, // o corujão abre das 22h às 4h
    abreHora: 8,
    fechaHora: 22,
    fechaCorujaoHora: 4,
    gracaFechamentoSeg: 25, // depois de fechar, dá pra cobrar quem ainda está dentro
    passoSeg: 0.25,
    primeiraChegadaSeg: 4,
    chegadasAteFracao: 0.92,
    velocidades: [1, 2] as number[],
    /** Dia da semana: o dia 1 é uma segunda. Índice = (dia - 1) % 7. */
    nomesDias: ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"],
    sabado: 5,
  },

  /** Horas de cada período. */
  periodos: { manha: [8, 12], tarde: [12, 18], noite: [18, 22], madrugada: [22, 28] } as Record<Periodo, [number, number]>,

  chegadas: {
    gruposBase: 9,
    gruposPorNivel: 2,
    gruposPorReputacao: 1.5,
    gruposCorujao: 4,
    sabadoMult: 1.3,
    /** Movimento por hora, das 8h às 21h (14 valores). */
    curva: [0.5, 0.8, 0.9, 0.7, 0.8, 0.9, 1, 1.1, 1.2, 1.2, 1.3, 1.4, 1.2, 0.8],
    curvaSabado: [0.4, 0.6, 0.9, 1.1, 1.3, 1.5, 1.6, 1.6, 1.6, 1.5, 1.4, 1.3, 1.1, 0.7],
    curvaCorujao: [1, 0.9, 0.8, 0.6, 0.4, 0.2],
    /** Peso extra dos grupos grandes (galera do tiro) no sábado de campeonato. */
    sabadoGrupoMult: 2.2,
    /** Cada cliente frequente de um arquétipo aumenta o peso dele nas chegadas. */
    frequenteMult: 0.08,
    frequenteMax: 10,
  },

  /** Tempo de jogo: minutos do relógio da lan por segundo real. */
  minutosPorSeg: (22 - 8) * 60 / 240,

  maquinas: {
    precoHora: { basica: 2, media: 3, gamer: 4 } as Record<TipoPc, number>,
    tier: { basica: 0, media: 1, gamer: 2 } as Record<TipoPc, number>,
    /** Desgaste da saúde do sistema por segundo de uso. */
    desgasteSeg: 0.05,
    desgasteCorujaoMult: 1.6,
    sujeiraSeg: 0.12,
    formatarRecupera: 100,
    reiniciarRecupera: 4,
    limparRecupera: 100,
    saudeInicial: 90,
  },

  pacotes: [
    { id: "30m", rotulo: "30 min", minutos: 30, mult: 0.6 },
    { id: "1h", rotulo: "1 hora", minutos: 60, mult: 1 },
    { id: "2h", rotulo: "2 horas", minutos: 120, mult: 1.9 },
    { id: "pacote", rotulo: "Pacote 3h", minutos: 180, mult: 2.5 },
  ],

  servicos: {
    precos: { pesquisa: 0, impressao: 2, curriculo: 3, cd: 6, xerox: 1, scanner: 2 } as Record<Servico, number>,
    impressaoColoridaExtra: 2,
    /** Minutos de máquina que cada serviço ocupa. */
    minutos: { pesquisa: 60, impressao: 20, curriculo: 40, cd: 40, xerox: 10, scanner: 15 } as Record<Servico, number>,
    /** Equipamento (efeito da melhoria) que cada serviço precisa. */
    precisa: { pesquisa: null, impressao: "impressora", curriculo: "impressora", cd: "gravador", xerox: "xerox", scanner: "scanner" } as Record<Servico, string | null>,
  },

  produtos: ["refri", "salgadinho", "bala", "misto"] as Produto[],

  problemas: {
    /** Chance por segundo de uso, numa máquina nova e limpa. */
    base: { travou: 0.0035, mouse: 0.0025, virus: 0.0012, erro: 0.0018 },
    /** Quanto a saúde baixa e a sujeira aumentam a chance. */
    pesoSaude: 1.8,
    pesoSujeira: 2.5,
    tierMult: { basica: 1.25, media: 1, gamer: 0.8 } as Record<TipoPc, number>,
    fucadorVirusMult: 4,
    /** A tela de erro que volta depois de reiniciar só sai formatando. */
    erroRepeteChance: 0.4,
    internetPorSeg: 0.004,
    internetDuracaoSeg: 12,
    energiaPorSeg: 0.0008,
    energiaDuracaoSeg: 8,
    tranquiloMult: 0.6,
    virusSaude: 25,
  },

  /** Segundos que cada ação ocupa quem a faz (tripulante ou funcionário, dividido pela velocidade). */
  tempoAcao: { atender: 1.2, cobrar: 1, reiniciar: 1.2, limpar: 1.5, antivirus: 4, formatar: 1.5, ajudar: 3, lanche: 1 } as Record<string, number>,
  /** Segundos que a máquina fica parada depois de cada conserto. */
  paradaSeg: { reiniciar: 3, limpar: 0, antivirus: 5, formatar: 22 } as Record<string, number>,
  custoFormatar: 3,

  paciencia: {
    fila: 0.7,
    travada: 1.6,
    semInternet: 1.1,
    onlineSemInternetMult: 2,
    chamado: 0.7,
    barulho: 1.2,
    recupera: 0.25,
    tranquiloMult: 0.6,
    /** Paciência que todo mundo perde quando a energia cai sem nobreak. */
    quedaEnergia: 8,
    monitorBarulhoMult: [0.6, 0.45, 0.3],
  },

  barulho: { raio: 2, placaMult: 0.6, salaGamerMult: 0.35 },

  satisfacao: {
    pesos: { espera: 0.25, maquina: 0.25, problemas: 0.2, conforto: 0.15, lanche: 0.15 },
    gorjetaMinSat: 0.6,
    pontoNeutro: 0.45,
    reputacaoPorCliente: 0.12,
    reputacaoPorFuga: 0.08,
    reputacaoDiaMax: 0.5,
    reputacaoRecusa: 0.02,
    /** Satisfação a partir da qual o cliente vira frequente. */
    frequenteSat: 0.75,
    gorjetaMaxSobreGanhos: 0.5,
  },

  /** Contas da semana, a cada `dias` dias. */
  contas: {
    dias: 7,
    aluguelBase: 110,
    aluguelPorNivel: 40,
    /** Luz por dia: por máquina (tubo ou tela fina) e extras. */
    luzPorPcTubo: 3,
    luzPorPcFina: 2,
    luzCorujaoMult: 1.4,
    reputacaoSeNaoPagar: 0.4,
  },

  /** Nível da lan por reputação e dias abertos. Índice 0 = nível 2. */
  niveis: [
    { reputacao: 2.5, dias: 4 },
    { reputacao: 3.1, dias: 10 },
    { reputacao: 3.7, dias: 20 },
    { reputacao: 4.3, dias: 35 },
  ],
  nivelMax: 5,

  limiteGravacoes: { max: 12, janelaSeg: 60 },
  vagasEquipe: [1, 1, 2, 3, 3],

  /** Requisito do "Abrir um cyber no centro" (em breve, não jogável). */
  cyberCentro: { reputacao: 4.5, nivel: 5 },
} as const;

export type DadosEquipe = {
  precos: number[];
  salario: number[];
  velocidade: number[];
  nivelLan: number;
};

/** Equipe: preço de contratar (nível 1) e de cada melhoria, salário por dia e velocidade em cada nível. Textos em conteudo.ts. */
export const EQUIPE: Record<Papel, DadosEquipe> = {
  caixa: { precos: [110, 170, 250], salario: [10, 15, 21], velocidade: [1, 1.4, 1.9], nivelLan: 1 },
  tecnico: { precos: [150, 230, 330], salario: [14, 20, 28], velocidade: [0.8, 1.2, 1.7], nivelLan: 2 },
  monitor: { precos: [130, 200, 290], salario: [12, 17, 24], velocidade: [1, 1.4, 1.9], nivelLan: 2 },
};

export const PAPEIS = Object.keys(EQUIPE) as Papel[];
