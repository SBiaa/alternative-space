// Tipos da Taverna do Dragão Cansado. Sem React nem Phaser: o módulo inteiro roda em Node e nos testes.

export type Efeito = Record<string, number>;

export type TipoItem = "mobilia" | "receita" | "ambiente" | "expansao";

/** Item do catálogo de melhorias. prices[i] e effects[i] valem para o nível i+1. */
export type ItemCatalogo = {
  /** Id da linha no banco (ausente no catálogo embutido, usado só até o seed rodar). */
  id?: string;
  slug: string;
  kind: TipoItem;
  name: string;
  description: string;
  maxLevel: number;
  prices: number[];
  effects: Efeito[];
  minTavernLevel: number;
  position: number;
};

export type Mania = { id: string; rotulo: string; [param: string]: string | number };

export type Arquetipo = {
  slug: string;
  name: string;
  icone: string;
  orders: string[];
  patience: number;
  spend: number;
  tip: number;
  quirk: Mania;
  unlock: { reputacao: number; nivel: number };
};

export type Catalogo = { itens: ItemCatalogo[]; arquetipos: Arquetipo[] };

export type Papel = "atendente" | "garcom" | "cozinheiro" | "ajudante" | "seguranca" | "bardo";

export type Membro = { papel: Papel; nivel: number; contratadaNoite: number };

export type MesaLayout = { id: string; tipo: string; x: number; y: number };

/** A taverna inteira, do jeito que vai pro banco e pro localStorage. */
export type Progresso = {
  v: number;
  cidade: string;
  nivel: number;
  ouro: number;
  reputacao: number;
  noite: number; // noites já fechadas
  seed: string;
  layout: MesaLayout[];
  melhorias: Record<string, number>;
  equipe: Membro[];
  /** Opção "noite tranquila" (paciência cai mais devagar). */
  tranquila: boolean;
};

export type ResumoNoite = {
  noite: number;
  servidos: number;
  foram: number;
  vendas: Record<string, number>; // receita → quantidade vendida
  ganhos: number; // ouro cobrado pelas vendas, sem gorjetas
  gorjetas: number;
  reparos: number;
  repDelta: number;
  porArquetipo: Record<string, { n: number; sat: number }>;
  tranquila: boolean;
};

export type RegistroNoite = {
  noite: number;
  servidos: number;
  foram: number;
  ganhos: number;
  gorjetas: number;
  gastos: { ingredientes: number; salarios: number; reparos: number };
  saldo: number;
  reputacaoFim: number;
  melhorArquetipo: string | null;
  tranquila: boolean;
};

export type RegistroSemana = { semana: number; taxa: number; paga: boolean; saldoFim: number };
