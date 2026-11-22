// Tipos do Cartas do Convés. Tudo aqui é dado puro (JSON-serializável): o motor não guarda classe nem função no estado.

export type TipoCarta = "ataque" | "defesa" | "manobra";
export type Raridade = "comum" | "incomum" | "rara";
export type StatusId = "encharcado" | "firme" | "enjoado";
export type Status = Partial<Record<StatusId, number>>;

export type Efeito =
  | { tipo: "dano"; valor: number; vezes?: number }
  | { tipo: "dano_todos"; valor: number }
  | { tipo: "bloqueio"; valor: number }
  | { tipo: "curar"; valor: number }
  | { tipo: "comprar"; valor: number }
  | { tipo: "energia"; valor: number }
  | { tipo: "status"; status: StatusId; valor: number; em?: "inimigo" | "todos" | "si" }
  | { tipo: "folego_max"; valor: number };

export type Liberacao =
  | { tipo: "inicio" }
  | { tipo: "derrotar"; inimigo: string }
  | { tipo: "trecho"; trecho: number }
  | { tipo: "vitoria_com"; oficio: string };

export type Carta = {
  slug: string;
  nome: string;
  tipo: TipoCarta;
  custo: number;
  raridade: Raridade;
  exaurir?: boolean;
  efeitos: Efeito[];
  liberacao: Liberacao;
};

export type Gatilho = "inicio_combate" | "inicio_turno" | "fim_combate" | "ao_pegar";

export type Oficio = {
  id: string;
  nome: string;
  icone: string;
  descricao: string;
  passiva: { texto: string; gatilho: Exclude<Gatilho, "ao_pegar">; efeitos: Efeito[] };
  baralho: string[];
};

export type Intencao =
  | { tipo: "atacar"; valor: number; vezes?: number }
  | { tipo: "defender"; valor: number }
  | { tipo: "status"; status: StatusId; valor: number };

export type InimigoDef = {
  slug: string;
  nome: string;
  icone: string;
  folego: number;
  ouro: [number, number];
  ciclo: Intencao[];
};

export type Encontro = { trecho: number; peso: number; inimigos: string[] };

export type Reliquia = { slug: string; nome: string; icone: string; texto: string; gatilho: Gatilho; efeitos: Efeito[] };

export type EfeitoEvento = { tipo: "folego"; valor: number } | { tipo: "ouro"; valor: number } | { tipo: "carta_aleatoria" } | { tipo: "reliquia_aleatoria" };
export type Evento = {
  slug: string;
  nome: string;
  texto: string;
  escolhas: { texto: string; exige?: { ouro: number }; efeitos: EfeitoEvento[] }[];
};

export type Conteudo = {
  cartas: Record<string, Carta>;
  listaCartas: Carta[];
  oficios: Oficio[];
  inimigos: Record<string, InimigoDef>;
  chefe: InimigoDef;
  encontros: Encontro[];
  reliquias: Record<string, Reliquia>;
  listaReliquias: Reliquia[];
  eventos: Evento[];
};

// ---- Mapa ----
export type TipoNo = "encontro" | "evento" | "porto" | "tesouro" | "chefe";
export type No = { id: string; tipo: TipoNo; trecho: number; camada: number; liga: string[] };
/** mapa[trecho - 1][camada] = nós daquela camada. */
export type Mapa = No[][][];

// ---- Estado da partida ----
export type InimigoEmCampo = { slug: string; folego: number; folegoMax: number; bloqueio: number; status: Status; passo: number };

export type Combate = {
  no: string;
  chefe: boolean;
  turno: number;
  energia: number;
  bloqueio: number;
  status: Status;
  mao: string[];
  compra: string[];
  descarte: string[];
  exaurida: string[];
  inimigos: InimigoEmCampo[];
};

export type Fase = "mapa" | "combate" | "recompensa" | "evento" | "porto" | "tesouro" | "fim";
export type ResultadoPartida = "andamento" | "vitoria" | "derrota";

export type LojaItem = { slug: string; preco: number; vendido: boolean };

export type Estado = {
  v: number;
  seed: string;
  oficio: string;
  /** Cartas liberadas na conta quando a partida começou (além das iniciais). Define o que pode aparecer de recompensa. */
  colecao: string[];
  rngN: number;
  folego: number;
  folegoMax: number;
  ouro: number;
  baralho: string[];
  reliquias: string[];
  mapa: Mapa;
  trecho: number;
  trechoMax: number;
  pos: string | null;
  visitados: string[];
  fase: Fase;
  combate: Combate | null;
  recompensa: { ouro: number; opcoes: string[] } | null;
  evento: string | null;
  porto: { loja: LojaItem[]; curou: boolean; removeu: boolean } | null;
  eventosVistos: string[];
  derrotados: string[];
  jogadas: Record<string, number>;
  resultado: ResultadoPartida;
  passos: number;
};

// ---- Ações do jogador (é isso que o cliente envia ao servidor) ----
export type Acao =
  | { t: "no"; id: string }
  | { t: "jogar"; c: number; a?: number }
  | { t: "fim" }
  | { t: "escolher"; i: number | null }
  | { t: "evento"; i: number }
  | { t: "curar" }
  | { t: "comprar"; i: number }
  | { t: "remover"; c: number }
  | { t: "sair" }
  | { t: "abrir" };

export type ErroAcao =
  | "partida_encerrada"
  | "fase_errada"
  | "no_invalido"
  | "carta_invalida"
  | "sem_energia"
  | "alvo_invalido"
  | "escolha_invalida"
  | "sem_ouro"
  | "ja_feito"
  | "baralho_minimo"
  | "limite_de_acoes"
  | "acao_desconhecida";

export type Resumo = {
  resultado: ResultadoPartida;
  trecho: number;
  oficio: string;
  derrotados: string[];
  jogadas: Record<string, number>;
};
