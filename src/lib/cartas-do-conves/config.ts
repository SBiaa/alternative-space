// Todos os números e textos do Cartas do Convés. Nada disso mora em componente.

import type { Raridade, StatusId, TipoCarta, Efeito, Intencao } from "./tipos";

export const SLUG = "cartas-do-conves";

export const CONFIG = {
  versaoEstado: 1,
  chaveLocal: "cartas-do-conves:local",
  chaveSom: "cartas-do-conves:som",

  folegoInicial: 60,
  energiaPorTurno: 3,
  maoInicial: 5,
  maoMax: 10,
  ouroInicial: 25,
  baralhoMinimo: 5,

  /** Teto de ações numa travessia. Uma partida normal usa bem menos; isso só segura envio abusivo. */
  maxAcoes: 1500,

  status: {
    encharcadoMult: 1.5, // quem está Encharcado recebe 50% a mais de dano
    enjoadoEnergia: 1, // o jogador Enjoado começa o turno com 1 de energia a menos
    enjoadoInimigoMult: 0.75, // o inimigo Enjoado bate 25% mais fraco
  },

  /** Cada trecho da travessia passa por um mar e uma ilha do Mar Sem Fim (nomes em nomes-mar.ts). */
  trechos: 3,
  mapa: {
    camadas: 5,
    nosPorCamada: [2, 3] as [number, number],
    pesosTipo: { encontro: 5, evento: 2, porto: 1, tesouro: 1 },
  },

  recompensa: {
    opcoes: 3,
    pesosRaridade: {
      1: { comum: 75, incomum: 23, rara: 2 },
      2: { comum: 55, incomum: 35, rara: 10 },
      3: { comum: 40, incomum: 42, rara: 18 },
    } as Record<number, Record<Raridade, number>>,
  },

  porto: {
    curarFracao: 0.3,
    lojaCartas: 3,
    precos: { comum: 40, incomum: 60, rara: 90 } as Record<Raridade, number>,
    remover: 75,
  },
  tesouro: { ouro: [15, 25] as [number, number], semReliquiaOuro: 40 },

  limites: {
    nova: { max: 12, janelaSeg: 60 },
    envio: { max: 60, janelaSeg: 60 },
  },
} as const;

export const STATUS: Record<StatusId, { nome: string; icone: string; texto: string }> = {
  encharcado: { nome: "Encharcado", icone: "gota", texto: "Recebe 50% a mais de dano." },
  firme: { nome: "Firme", icone: "ancora", texto: "Cada bloqueio ganho vem com bônus igual ao valor de Firme." },
  enjoado: { nome: "Enjoado", icone: "onda", texto: "Jogador: 1 de energia a menos no turno. Inimigo: ataques 25% mais fracos." },
};

export const TIPOS_CARTA: Record<TipoCarta, { nome: string; icone: string }> = {
  ataque: { nome: "Ataque", icone: "espada" },
  defesa: { nome: "Defesa", icone: "escudo" },
  manobra: { nome: "Manobra", icone: "vela" },
};

export const RARIDADES: Record<Raridade, string> = { comum: "Comum", incomum: "Incomum", rara: "Rara" };

/** Gerador dos textos das cartas, intenções e relíquias: o texto sai dos dados, nunca é digitado duas vezes. */
export const FRASES = {
  dano: (v: number, vezes?: number) => (vezes && vezes > 1 ? `Causa ${v} de dano ${vezes} vezes` : `Causa ${v} de dano`),
  danoTodos: (v: number) => `Causa ${v} de dano a todos os inimigos`,
  bloqueio: (v: number) => `Ganha ${v} de bloqueio`,
  curar: (v: number) => `Recupera ${v} de Fôlego`,
  comprar: (v: number) => `Compra ${v} ${v === 1 ? "carta" : "cartas"}`,
  energia: (v: number) => `Ganha ${v} de energia`,
  folegoMax: (v: number) => `Fôlego máximo +${v}`,
  statusInimigo: (nome: string, v: number) => `Aplica ${nome} ${v} no alvo`,
  statusTodos: (nome: string, v: number) => `Aplica ${nome} ${v} em todos os inimigos`,
  statusSi: (nome: string, v: number) => `Você ganha ${nome} ${v}`,
  exaurir: "Exaurir: some até o fim do combate.",
  custo: (c: number) => `Custo ${c}`,
  intencaoAtacar: (v: number, vezes?: number) => (vezes && vezes > 1 ? `Vai atacar: ${v} de dano, ${vezes} vezes` : `Vai atacar: ${v} de dano`),
  intencaoDefender: (v: number) => `Vai se defender: ${v} de bloqueio`,
  intencaoStatus: (nome: string, v: number) => `Vai aplicar ${nome} ${v} em você`,
};

export function frasesDeEfeitos(efeitos: Efeito[]): string[] {
  return efeitos.map((e) => {
    switch (e.tipo) {
      case "dano":
        return FRASES.dano(e.valor, e.vezes);
      case "dano_todos":
        return FRASES.danoTodos(e.valor);
      case "bloqueio":
        return FRASES.bloqueio(e.valor);
      case "curar":
        return FRASES.curar(e.valor);
      case "comprar":
        return FRASES.comprar(e.valor);
      case "energia":
        return FRASES.energia(e.valor);
      case "folego_max":
        return FRASES.folegoMax(e.valor);
      case "status":
        return e.em === "si" ? FRASES.statusSi(STATUS[e.status].nome, e.valor) : e.em === "todos" ? FRASES.statusTodos(STATUS[e.status].nome, e.valor) : FRASES.statusInimigo(STATUS[e.status].nome, e.valor);
    }
  });
}

export function fraseDeIntencao(i: Intencao): string {
  if (i.tipo === "atacar") return FRASES.intencaoAtacar(i.valor, i.vezes);
  if (i.tipo === "defender") return FRASES.intencaoDefender(i.valor);
  return FRASES.intencaoStatus(STATUS[i.status].nome, i.valor);
}

export const ERROS = {
  partida_encerrada: "Essa travessia já terminou.",
  fase_errada: "Essa ação não cabe agora.",
  no_invalido: "Esse ponto do mapa não está ao alcance.",
  carta_invalida: "Essa carta não está na sua mão.",
  sem_energia: "Falta energia pra jogar essa carta.",
  alvo_invalido: "Escolha um inimigo ainda de pé como alvo.",
  escolha_invalida: "Essa escolha não existe.",
  sem_ouro: "Ouro insuficiente.",
  ja_feito: "Isso já foi feito neste porto.",
  baralho_minimo: "O baralho não pode ficar tão pequeno.",
  limite_de_acoes: "Essa travessia ficou longa demais.",
  acao_desconhecida: "Ação desconhecida.",
  generico: "Não deu pra concluir. Tenta de novo.",
  semConta: "Entre na sua conta pra guardar a travessia.",
  limite: "Muitos envios seguidos. Tenta de novo daqui a pouco.",
  invalida: "Essa travessia não passou na conferência do servidor.",
} as const;
