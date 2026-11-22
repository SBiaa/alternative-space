// Todos os números e catálogos da Banca na Feira. Nada disso mora em componente. Textos de interface ficam em conteudo.ts.
// Dinheiro do jogo: inteiros, sem centavos. Não vale dinheiro real e não compra nada na loja.
// Tudo é autoral: eventos, temas e personagens são inventados e não lembram obra nem evento real.

import type { Arquetipo, EventoDef, Melhoria, Produto, ProdutoSlug, Tema } from "./tipos";

export const BANCA = {
  versaoSave: 1,
  chaveLocal: "banca-na-feira:save",
  chaveResumo: "banca-na-feira:resumo",
  chaveOpcoes: "banca-na-feira:opcoes",
  dinheiroInicial: 150,
  reputacaoInicial: 1,
  reputacaoMax: 5,
  diasAtelieBase: 5,
  limiteLotes: 20,
  /** Mesa inicial: colunas x linhas (a linha 0 é a da frente). */
  mesaInicial: { colunas: 3, linhas: 2 },
  capacidadeCelula: 12,
  limiteGravacoes: { max: 20, janelaSeg: 60 },
  dinheiroMax: 10_000_000,
  semanaMax: 100_000,
  /** Quanto cada posição enxerga: o expositor vertical fica na altura do olho. */
  visExpositor: 0.95,
  visFundoMin: 0.5,
  visBonusMax: 0.25,
} as const;

export const EVENTO = {
  passoSeg: 0.25,
  /** Depois da hora marcada, quem já está na fila ainda é atendido. */
  gracaSeg: 20,
  chegadasAteFracao: 0.9,
  primeiraChegadaSeg: 3,
  atenderSeg: 1.2,
  reporSeg: 6,
  /** Tempo mínimo de um cliente na banca: base do teto de vendas. */
  tempoMinPorClienteSeg: 3,
  /** Itens por cliente que o teto aceita (o maior qtdMax dos arquétipos). */
  itensPorClienteMax: 4,
  precoElasticidade: 1.3,
  precoFatorMin: 0.25,
  precoFatorMax: 1.6,
  /** Quem já está no balcão tem paciência que cai mais devagar. */
  pacienciaNoBalcao: 0.4,
  tranquiloPaciencia: 1.6,
  cartaoTaxa: 0.04,
  /** Chance do cliente que pediu desconto comprar mesmo assim, ou aceitar a contraproposta. */
  aceitaRecusaChance: 0.55,
  aceitaContraChance: 0.8,
  /** Quanto o cliente que paga em dinheiro entrega a mais (chance de dar a nota seguinte). */
  notaSeguinteChance: 0.4,
  colecaoMinTemas: 3,
  colecaoMaxItens: 4,
  /** Quanto o artista que troca leva: um item. */
  trocaItens: 1,
} as const;

/** Notas e moedas do troco (R$). */
export const NOTAS = [2, 5, 10, 20, 50, 100] as const;
export const DENOMINACOES_TROCO = [1, 2, 5, 10, 20, 50] as const;

/** Variação de reputação por acontecimento. */
export const REPUTACAO = {
  compra: 0.02,
  desistiu: -0.04,
  trocoErrado: -0.02,
  esgotouSemPlaca: -0.03,
  trocaArtista: 0.08,
  recusouDesconto: -0.01,
  /** Teto do que um evento pode mexer na reputação (o servidor limita). */
  ganhoMaxEvento: 0.8,
  perdaMaxEvento: 0.6,
} as const;

export const PRODUTOS: Produto[] = [
  { slug: "print", nome: "Print", forma: "retangulo", custo: 5, lote: 6, diasLote: 2, precoSugerido: 25, precoMin: 15, precoMax: 40 },
  { slug: "adesivo", nome: "Adesivo", forma: "estrela", custo: 1, lote: 20, diasLote: 1, precoSugerido: 6, precoMin: 3, precoMax: 10 },
  { slug: "chaveiro", nome: "Chaveiro", forma: "chaveiro", custo: 4, lote: 8, diasLote: 1, precoSugerido: 15, precoMin: 9, precoMax: 24 },
  { slug: "botton", nome: "Botton", forma: "circulo", custo: 2, lote: 12, diasLote: 1, precoSugerido: 8, precoMin: 4, precoMax: 12 },
];

/** Temas autorais (nada de franquia). O tripulante escolhe um tema a cada lote. */
export const TEMAS: Tema[] = [
  { slug: "gato-astronauta", nome: "Gato astronauta", cor: "#f2a66e" },
  { slug: "dragao-de-cafe", nome: "Dragão de café", cor: "#c9743a" },
  { slug: "planeta-laranja", nome: "Planeta laranja", cor: "#e8863a" },
  { slug: "cogumelo-viajante", nome: "Cogumelo viajante", cor: "#d96a6a" },
  { slug: "robo-jardineiro", nome: "Robô jardineiro", cor: "#6fae8a" },
  { slug: "polvo-barista", nome: "Polvo barista", cor: "#8a7fd1" },
];

export const EVENTOS: EventoDef[] = [
  {
    slug: "feira-do-bairro", nome: "Feira do Bairro", tamanho: "bairro", taxaMesa: 25, publico: 34, publicoMax: 44, duracaoSeg: 150, repMin: 0,
    descricao: "Uma quadra fechada, barracas de tudo um pouco e muita gente de passagem.",
  },
  {
    slug: "encontro-cometa", nome: "Encontro Cometa", tamanho: "medio", taxaMesa: 70, publico: 70, publicoMax: 86, duracaoSeg: 200, repMin: 1.5,
    descricao: "Um ginásio com artistas, jogos de mesa e fila no corredor.",
  },
  {
    slug: "grande-pavilhao-orbita", nome: "Grande Pavilhão Órbita", tamanho: "grande", taxaMesa: 160, publico: 120, publicoMax: 144, duracaoSeg: 240, repMin: 3,
    descricao: "O maior evento da região: pavilhão lotado e mesa disputada.",
  },
];

/** Nomes de edição, sorteados pela semana (só enfeite do calendário). */
export const EDICOES = ["Edição Maré Baixa", "Edição Cometa Verde", "Edição Lua Cheia", "Edição Vento Sul", "Edição Brasa", "Edição Neblina"];
export const DIAS_EVENTO = ["Sábado", "Domingo"];

const apelo = (print: number, adesivo: number, chaveiro: number, botton: number): Record<ProdutoSlug, number> => ({ print, adesivo, chaveiro, botton });

export const ARQUETIPOS: Arquetipo[] = [
  {
    slug: "colecionador", nome: "Colecionador", rotulo: "Colec.", descricao: "Quer a coleção completa: três temas do mesmo produto na mesa. Paga bem.",
    peso: 1, paciencia: 40, atencao: 5, compra: 0.9, qtdMax: 4, orcamento: 120, apelo: apelo(0.9, 0.5, 0.6, 0.4), cartao: 0.4, especial: "colecao", desconto: 0, olharSeg: 5,
  },
  {
    slug: "olhando", nome: "Só olhando", rotulo: "Olhando", descricao: "Compra se algo chamar atenção. Quase não olha pro fundo da mesa.",
    peso: 4, paciencia: 35, atencao: 2, compra: 0.5, qtdMax: 1, orcamento: 30, apelo: apelo(0.5, 0.7, 0.6, 0.7), cartao: 0.3, especial: null, desconto: 0, olharSeg: 4,
  },
  {
    slug: "desconto", nome: "Pechincheiro", rotulo: "Desc.", descricao: "Gosta de tudo, mas pede desconto. Aceitar, recusar ou contrapor muda a venda e a reputação.",
    peso: 2, paciencia: 40, atencao: 3, compra: 0.7, qtdMax: 2, orcamento: 50, apelo: apelo(0.6, 0.6, 0.7, 0.6), cartao: 0.3, especial: "desconto", desconto: 0.25, olharSeg: 5,
  },
  {
    slug: "cosplayer", nome: "Cosplayer com pressa", rotulo: "Pressa", descricao: "Paciência baixa: se a fila demorar, vai embora.",
    peso: 2, paciencia: 18, atencao: 2, compra: 0.7, qtdMax: 2, orcamento: 40, apelo: apelo(0.4, 0.5, 0.9, 0.8), cartao: 0.6, especial: null, desconto: 0, olharSeg: 3,
  },
  {
    slug: "familia", nome: "Pai ou mãe com criança", rotulo: "Família", descricao: "A criança quer adesivo. Compra vários.",
    peso: 3, paciencia: 45, atencao: 3, compra: 0.8, qtdMax: 4, orcamento: 40, apelo: apelo(0.2, 1, 0.3, 0.6), cartao: 0.3, especial: "crianca", desconto: 0, olharSeg: 4,
  },
  {
    slug: "artista", nome: "Outro artista", rotulo: "Artista", descricao: "Troca uma peça por outra. Não paga, mas dá reputação.",
    peso: 1, paciencia: 50, atencao: 5, compra: 0.6, qtdMax: 1, orcamento: 0, apelo: apelo(0.9, 0.3, 0.7, 0.3), cartao: 0, especial: "troca", desconto: 0, olharSeg: 6,
  },
];

export const MELHORIAS: Melhoria[] = [
  {
    slug: "mesa-maior", nome: "Mesa maior", descricao: "Mais espaço pra expor: uma coluna a mais e, depois, uma fileira a mais.",
    niveis: [
      { preco: 120, repMin: 0, efeito: { colunas: 4, linhas: 2 } },
      { preco: 300, repMin: 1.5, efeito: { colunas: 4, linhas: 3 } },
    ],
  },
  {
    slug: "expositor", nome: "Expositor vertical", descricao: "Três espaços na altura do olho, vistos logo de cara.",
    niveis: [{ preco: 150, repMin: 0, efeito: { expositor: 3 } }, { preco: 320, repMin: 2, efeito: { expositor: 5 } }],
  },
  {
    slug: "maquininha", nome: "Maquininha de cartão", descricao: "Quem paga no cartão não precisa de troco. A maquininha fica com uma taxa.",
    niveis: [{ preco: 180, repMin: 0.5, efeito: { maquininha: true } }],
  },
  {
    slug: "toalha", nome: "Toalha de mesa", descricao: "Uma toalha colorida chama mais atenção pra tudo que está em cima da mesa.",
    niveis: [{ preco: 60, repMin: 0, efeito: { visBonus: 0.1 } }, { preco: 140, repMin: 1, efeito: { visBonus: 0.2 } }],
  },
  {
    slug: "iluminacao", nome: "Iluminação", descricao: "A luz faz o visitante olhar mais um espaço da mesa.",
    niveis: [{ preco: 90, repMin: 0, efeito: { atencao: 1 } }, { preco: 220, repMin: 1.5, efeito: { atencao: 2 } }],
  },
  {
    slug: "ajudante", nome: "Ajudante", descricao: "Ajuda no ateliê (mais um dia de produção por semana) e repõe a mesa em metade do tempo.",
    niveis: [{ preco: 200, repMin: 1, efeito: { diasAtelie: 1, reposMult: 0.5 } }, { preco: 450, repMin: 2.5, efeito: { diasAtelie: 2, reposMult: 0.5 } }],
  },
];

export const produtoDe = (slug: string) => PRODUTOS.find((p) => p.slug === slug);
export const temaDe = (slug: string) => TEMAS.find((t) => t.slug === slug);
export const eventoDe = (slug: string) => EVENTOS.find((e) => e.slug === slug);
export const arquetipoDe = (slug: string) => ARQUETIPOS.find((a) => a.slug === slug);
export const melhoriaDe = (slug: string) => MELHORIAS.find((m) => m.slug === slug);
