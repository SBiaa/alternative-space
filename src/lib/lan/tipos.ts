// Tipos da Lan House 2005. Sem React nem Phaser: o módulo inteiro roda em Node e nos testes.

export type Efeito = Record<string, number>;

export type TipoItem = "maquina" | "internet" | "energia" | "software" | "servico" | "balcao" | "conforto" | "ambiente" | "expansao";

/** Item do catálogo de melhorias. prices[i] e effects[i] valem para o nível i+1. */
export type ItemCatalogo = {
  id?: string;
  slug: string;
  kind: TipoItem;
  name: string;
  description: string;
  maxLevel: number;
  prices: number[];
  effects: Efeito[];
  minLanLevel: number;
  position: number;
};

export type TipoPc = "basica" | "media" | "gamer";
export type Atividade = "jogar" | "mensageiro" | "servico";
export type Servico = "pesquisa" | "impressao" | "curriculo" | "cd" | "xerox" | "scanner";
export type Periodo = "manha" | "tarde" | "noite" | "madrugada";
export type Produto = "refri" | "salgadinho" | "bala" | "misto";

export type Mania = { id: string; rotulo: string; [param: string]: string | number };

export type Arquetipo = {
  slug: string;
  name: string;
  icone: string;
  wants: {
    atividade: Atividade;
    /** Slug do jogo fictício (conteudo.ts), pra quem vem jogar. */
    jogo?: string;
    servicos?: Servico[];
    /** Horas que a pessoa quer ficar. */
    horas: number;
    grupo: [number, number];
    /** Máquina mínima que deixa a pessoa satisfeita. */
    tier: TipoPc;
    /** Precisa de internet boa (jogo online). */
    online: boolean;
    /** Chance de pedir lanche durante o uso (0 a 1). */
    lanche: number;
    periodos: Record<Periodo, number>;
  };
  patience: number;
  spend: number;
  tip: number;
  noiseTolerance: number;
  makesNoise: boolean;
  quirk: Mania;
  unlock: { reputacao: number; nivel: number };
};

export type Catalogo = { itens: ItemCatalogo[]; arquetipos: Arquetipo[] };

export type Papel = "caixa" | "tecnico" | "monitor";
export type Membro = { papel: Papel; nivel: number; contratadoDia: number };

export type PcLayout = { id: string; x: number; y: number };
export type Layout = { pcs: PcLayout[]; divisoria: number | null };
export type MaquinaSalva = { id: string; tipo: TipoPc; saude: number; sujeira: number };

/** A lan inteira, do jeito que vai pro banco e pro localStorage. */
export type Progresso = {
  v: number;
  local: string;
  nivel: number;
  dinheiro: number;
  reputacao: number;
  dia: number; // dias já fechados
  seed: string;
  layout: Layout;
  maquinas: MaquinaSalva[];
  estoque: Partial<Record<Produto, number>>;
  frequentes: Record<string, number>;
  melhorias: Record<string, number>;
  equipe: Membro[];
  /** Opção "dia tranquilo": paciência cai mais devagar e há menos problemas. */
  tranquilo: boolean;
};

export type Incidente = "travou" | "mouse" | "virus" | "erro" | "internet" | "energia";

export type ResumoDia = {
  dia: number;
  servidos: number;
  foram: number;
  /** Minutos de máquina vendidos (pacote + tempo extra). */
  minutosVendidos: number;
  ganhosTempo: number;
  servicos: Partial<Record<Servico, number>>;
  ganhosServicos: number;
  lanches: Partial<Record<Produto, number>>;
  ganhosLanches: number;
  gorjetas: number;
  reembolsos: number;
  formatacoes: number;
  incidentes: Partial<Record<Incidente, number>>;
  repDelta: number;
  porArquetipo: Record<string, { n: number; sat: number }>;
  novosFrequentes: Record<string, number>;
  maquinas: { id: string; saude: number; sujeira: number }[];
  tranquilo: boolean;
};

export type RegistroDia = {
  dia: number;
  servidos: number;
  foram: number;
  horasVendidas: number;
  servicos: Partial<Record<Servico, number>>;
  lanchesVendidos: number;
  ganhos: number;
  gastos: { estoque: number; salarios: number; consertos: number };
  incidentes: Partial<Record<Incidente, number>>;
  saldo: number;
  reputacaoFim: number;
  melhorArquetipo: string | null;
  tranquilo: boolean;
};

export type RegistroSemana = { semana: number; contas: { aluguel: number; luz: number; internet: number }; paga: boolean; saldoFim: number };
