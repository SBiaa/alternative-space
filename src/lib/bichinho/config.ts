// Tudo o que é número, nome ou texto do Bichinho da Cabine mora aqui. Os componentes só leem.

export const VERSAO_STATS = 1;
export const FUSO = "America/Sao_Paulo";

export type Barra = "energy" | "curiosity" | "affection";
export const BARRAS: readonly Barra[] = ["energy", "curiosity", "affection"];
export type Stats = Record<Barra, number>;

export type Humor = "feliz" | "curioso" | "sonolento" | "dormindo";
export type Fase = 0 | 1 | 2;

// Eventos (tabela events) que o bichinho lê. `ganho` sobe as barras; `xp` é o peso na evolução.
export const EVENTOS: Record<string, { ganho: Partial<Stats>; xp: number }> = {
  game_played: { ganho: { energy: 12 }, xp: 8 },
  park_played: { ganho: { energy: 12 }, xp: 8 },
  quiz_completed: { ganho: { curiosity: 15 }, xp: 10 },
  post_view: { ganho: { curiosity: 6 }, xp: 3 },
  pet_visit: { ganho: { affection: 10 }, xp: 2 },
  pet_treat: { ganho: { affection: 25 }, xp: 5 },
};
// Eventos que só registram o que aconteceu; não mexem em barra nem em XP.
export const EVENTOS_REGISTRO = ["pet_hatched", "pet_evolved"] as const;

// Jogos terminados para o marco (game_played de qualquer jogo e park_played do Rolê).
export const EVENTOS_DE_JOGO = ["game_played", "park_played"] as const;

export const MECANICA = {
  inicial: 60,
  piso: 20,
  teto: 100,
  // Pontos perdidos por hora. Barra que já está no piso (ou abaixo) não cai mais.
  queda: { energy: 0.5, curiosity: 0.5, affection: 0.7 } satisfies Stats,
  // Abaixo disso o bichinho dorme; a média das barras decide.
  limiarDormindo: 35,
  limiarSonolento: 45,
  limiarCurioso: 60,
  // Depois de tanto tempo sem aparecer, ele acorda feliz e recebe boas-vindas.
  ausenciaLongaHoras: 72,
  nomeMax: 20,
  nomeMin: 1,
  // Limites por pessoa (ações do servidor).
  limites: {
    petisco: { max: 6, janelaSeg: 3600 },
    acessorio: { max: 30, janelaSeg: 600 },
    nome: { max: 10, janelaSeg: 600 },
    ovo: { max: 6, janelaSeg: 600 },
    leitura: { max: 60, janelaSeg: 600 },
  },
} as const;

// Fase = ovo (0), filhote (1), adulto (2). `xp` é o mínimo para entrar nela.
export const FASES: readonly { fase: Fase; nome: string; xp: number }[] = [
  { fase: 0, nome: "Ovo", xp: 0 },
  { fase: 1, nome: "Filhote", xp: 30 },
  { fase: 2, nome: "Adulto", xp: 200 },
];

export type Forma = "poeira" | "gota" | "cometa";
export type Especie = {
  slug: string;
  nome: string;
  descricao: string;
  nomePadrao: string;
  forma: Forma;
  // Cores do corpo, do detalhe e do brilho (tokens Cozy e variações).
  cores: { corpo: string; detalhe: string; brilho: string };
};

export const ESPECIES: readonly Especie[] = [
  {
    slug: "pulvi",
    nome: "Pulvi",
    descricao: "Bolinha de poeira estelar, quentinha, com duas antenas curiosas.",
    nomePadrao: "Pulvi",
    forma: "poeira",
    cores: { corpo: "#e3d8ac", detalhe: "#dd5d05", brilho: "#f6f0d6" },
  },
  {
    slug: "lumio",
    nome: "Lumio",
    descricao: "Gota de luz comprida, com um olho grande que observa tudo.",
    nomePadrao: "Lumio",
    forma: "gota",
    cores: { corpo: "#d6deec", detalhe: "#093f7a", brilho: "#f6f0d6" },
  },
  {
    slug: "cometim",
    nome: "Cometim",
    descricao: "Cauda de cometa com duas patinhas, sempre a caminho de algum lugar.",
    nomePadrao: "Cometim",
    forma: "cometa",
    cores: { corpo: "#f2a66e", detalhe: "#ab392f", brilho: "#ece3be" },
  },
];

// Marco = um número que vem do histórico real da pessoa. `campo` é um campo do resumo (ver regras.ts).
export type Campo = "quizzes" | "jogos" | "fichas";
export type Slot = "cabeca" | "corpo";
export type Acessorio = { slug: string; nome: string; descricao: string; slot: Slot; marco: { campo: Campo; min: number }; dica: string };

export const ACESSORIOS: readonly Acessorio[] = [
  {
    slug: "antena-de-papel",
    nome: "Antena de papel",
    descricao: "Dobrada à mão, capta ideias.",
    slot: "cabeca",
    marco: { campo: "quizzes", min: 1 },
    dica: "Termine um quiz.",
  },
  {
    slug: "fone-de-cabine",
    nome: "Fone de cabine",
    descricao: "Para ouvir o rádio da base.",
    slot: "cabeca",
    marco: { campo: "jogos", min: 1 },
    dica: "Termine um jogo.",
  },
  {
    slug: "cracha-de-bordo",
    nome: "Crachá de bordo",
    descricao: "Identifica quem é da tripulação.",
    slot: "corpo",
    marco: { campo: "fichas", min: 1 },
    dica: "Crie uma ficha.",
  },
  // O acessório de 7 dias seguidos da Constelação do Dia entra quando essa função existir.
];

export const TEXTOS = {
  titulo: "Bichinho da cabine",
  janela: (nome: string) => `Janela da cabine com ${nome} flutuando em frente ao planeta laranja`,
  faseRotulo: "Fase",
  barras: {
    energy: { nome: "Energia", icone: "⚡", sobe: "Sobe quando você termina jogos." },
    curiosity: { nome: "Curiosidade", icone: "✦", sobe: "Sobe com quizzes e posts lidos." },
    affection: { nome: "Carinho", icone: "♥", sobe: "Sobe com a visita do dia e com o petisco." },
  },
  barraTexto: (nome: string, valor: number) => `${nome}: ${valor} de 100`,
  humor: { feliz: "Feliz", curioso: "Curioso", sonolento: "Sonolento", dormindo: "Dormindo" },
  frases: {
    feliz: ["Hoje a luz da cabine está ótima.", "Gostei de te ver por aqui.", "Tudo brilha um pouquinho mais agora."],
    curioso: ["O que você descobriu hoje?", "Posso ver mais um quiz?", "Tem uma estrela nova na janela."],
    sonolento: ["Só uma sonequinha e já volto.", "A cabine está tão macia…", "Bocejo estelar."],
    dormindo: ["Zzz…", "Sonhando com o planeta laranja.", "Zzz… quando você quiser, é só chamar."],
  } satisfies Record<Humor, string[]>,
  boasVindas: "Que bom que você voltou! Ele acordou feliz.",
  petisco: { botao: "Dar petisco", feito: "Petisco de hoje já foi. Volte amanhã.", ok: "Nham! Ele adorou.", rotulo: "Petisco do dia" },
  tocar: { botao: "Tocar", respostas: ["Ele fez uma cambalhota.", "Ele piscou pra você.", "Ele ronronou baixinho."] },
  acessorios: {
    titulo: "Acessórios",
    vazio: "Nenhum acessório ainda. Eles chegam conforme você usa a plataforma.",
    bloqueado: "Ainda não",
    equipar: "Usar",
    tirar: "Tirar",
    equipado: "Em uso",
    slot: { cabeca: "Cabeça", corpo: "Corpo" } satisfies Record<Slot, string>,
  },
  renomear: { rotulo: "Nome", botao: "Salvar nome", ok: "Nome salvo." },
  ovo: {
    titulo: "Escolha o seu ovo",
    descricao: "Ele cresce com o que você faz na plataforma: jogos, quizzes, fichas e leituras.",
    botao: (nome: string) => `Chocar ${nome}`,
  },
  previa: { titulo: "Um bichinho espera por você", texto: "Ele mora na janela da sua cabine e cresce com o que você faz aqui.", botao: "Crie sua conta pra chocar seu bichinho" },
  erros: {
    semLogin: "Sua sessão acabou. Entre de novo.",
    falhou: "Não deu agora. Tente de novo daqui a pouco.",
    muitos: "Muitas ações seguidas. Tente de novo daqui a pouco.",
    invalido: "Isso não deu certo.",
    semPet: "Escolha um ovo primeiro.",
    jaTem: "Você já tem um bichinho.",
    bloqueado: "Esse acessório ainda não foi liberado.",
    nome: (min: number, max: number) => `Use de ${min} a ${max} letras ou números.`,
  },
  cabine: { titulo: (nome: string) => `${nome} na janela` },
  base: { titulo: "Seu bichinho", ver: "Cuidar do bichinho" },
} as const;
