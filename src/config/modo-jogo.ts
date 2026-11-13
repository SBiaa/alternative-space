// Textos do modo jogo (capa + tela cheia). Nada disso fica fixo nos componentes.

export const textosShell = {
  sair: "Sair do jogo",
  pausar: "Pausar",
  continuar: "Continuar",
  telaCheia: "Tela cheia",
  gavetaAbrir: "Abrir detalhes e ajustes",
  gavetaFechar: "Fechar detalhes",
  pausadoTitulo: "Pausado",
  pausadoTexto: "Toque em continuar quando quiser voltar.",
  sairDoJogo: "Sair",
  jogar: "Jogar",
  comoJogarCelular: "Como jogar no celular",
  jogandoComputador: "Jogando no computador?",
  seuRecorde: "Seu recorde",
  verRanking: "Ver ranking",
  semRecorde: "—",
};

export type CapaJogo = {
  // Texto do botão grande da capa.
  botao: string;
  tags: string[];
  // Exatamente 3 passos curtos.
  passos: [string, string, string];
  // Dica de gesto mostrada na tela de jogo até a primeira ação.
  dica: string;
};

const padrao: CapaJogo = {
  botao: textosShell.jogar,
  tags: ["1 jogador", "toque"],
  passos: ["Toque em jogar", "Siga as dicas na tela", "Bata o seu recorde"],
  dica: "Toque na tela pra começar",
};

export const capas: Record<string, Partial<CapaJogo>> = {
  "log-pose-doido": {
    botao: "Zarpar",
    tags: ["1 jogador", "3 min", "toque"],
    passos: ["Segure o dedo onde o navio deve ir", "Fuja de redemoinhos, raios e monstros", "Quando a bússola tremer, as direções giram"],
    dica: "Segure o dedo onde o navio deve ir",
  },
  "defenda-o-navio": {
    botao: "Zarpar",
    tags: ["1 jogador", "15 min", "toque"],
    passos: ["Escolha um tripulante na gaveta", "Toque numa casa ao lado do caminho", "Chame a onda quando estiver pronto"],
    dica: "Escolha um tripulante e toque numa casa",
  },
  "duelo-pirata": {
    botao: "Lutar",
    tags: ["1–2 jogadores", "3 min", "toque"],
    passos: ["Escolha o modo e o lutador", "Use o direcional e os golpes na gaveta", "Encha a barra azul e solte o especial"],
    dica: "Use os botões da gaveta pra lutar",
  },
  "duelo-ninja": {
    botao: "Lutar",
    tags: ["1–2 jogadores", "3 min", "toque"],
    passos: ["Escolha o modo e o lutador", "Use o direcional e os golpes na gaveta", "Encha a barra e solte o especial"],
    dica: "Use os botões da gaveta pra lutar",
  },
};

export function capaDe(slug: string): CapaJogo {
  return { ...padrao, ...capas[slug] };
}

// HUD e gaveta de cada jogo.
export const textosLogPose = {
  vidas: (n: number) => `${n} cascos`,
  moedas: (n: number) => `${n} moedas`,
  nivel: (n: number) => `nível ${n}`,
  bussolaGira: "Bússola gira em…",
  recorde: (n: number) => `recorde ${n}`,
};

export const textosNavio = {
  onda: (n: number, total: number) => `onda ${n}/${total}`,
  vidas: (n: number) => `${n} baús`,
  moedas: (n: number) => `${n} moedas`,
  faltam: (n: number) => `faltam ${n}`,
  chamarOnda: "Chamar onda",
  emOnda: "Onda em curso",
};
