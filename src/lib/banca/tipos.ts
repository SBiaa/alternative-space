// Tipos da Banca na Feira. Sem React: o módulo inteiro roda em Node e nos testes.

export type ProdutoSlug = "print" | "adesivo" | "chaveiro" | "botton";
export type ArqSlug = "colecionador" | "olhando" | "desconto" | "cosplayer" | "familia" | "artista";
/** Item de estoque: "produto:tema". */
export type ItemKey = string;

export type Layout = {
  /** Mesa (linha da frente primeiro) e depois os espaços do expositor vertical. */
  celulas: (ItemKey | null)[];
  precos: Partial<Record<ProdutoSlug, number>>;
};

export type Estoque = {
  itens: Record<ItemKey, number>;
  /** Dias de ateliê gastos nesta semana. */
  diasUsados: number;
  /** Material comprado nesta semana (vai pro resumo do evento). */
  gastoMaterial: number;
};

export type Progresso = {
  v: number;
  dinheiro: number;
  reputacao: number;
  semana: number;
  seed: string;
  estoque: Estoque;
  layout: Layout;
  melhorias: Record<string, number>;
  /** "Evento tranquilo": paciência maior e troco automático. Fica no aparelho. */
  tranquilo: boolean;
};

export type Produto = {
  slug: ProdutoSlug;
  nome: string;
  /** Forma do desenho (ícone em SVG, ver ProdutoIcone). */
  forma: "retangulo" | "circulo" | "chaveiro" | "estrela";
  custo: number;
  /** Unidades que um lote rende e dias de ateliê que ele toma. */
  lote: number;
  diasLote: number;
  precoSugerido: number;
  precoMin: number;
  precoMax: number;
};

export type Tema = { slug: string; nome: string; cor: string };

export type EventoDef = {
  slug: string;
  nome: string;
  tamanho: "bairro" | "medio" | "grande";
  taxaMesa: number;
  publico: number;
  publicoMax: number;
  duracaoSeg: number;
  repMin: number;
  descricao: string;
};

export type Arquetipo = {
  slug: ArqSlug;
  nome: string;
  rotulo: string;
  descricao: string;
  peso: number;
  paciencia: number;
  /** Quantos espaços da mesa ele olha (mais os da iluminação). */
  atencao: number;
  compra: number;
  qtdMax: number;
  orcamento: number;
  apelo: Record<ProdutoSlug, number>;
  cartao: number;
  especial: "colecao" | "desconto" | "troca" | "crianca" | null;
  /** Fração do total que pede de desconto. */
  desconto: number;
  olharSeg: number;
};

export type NivelMelhoria = { preco: number; repMin: number; efeito: Efeito };
export type Efeito = {
  colunas?: number;
  linhas?: number;
  expositor?: number;
  maquininha?: boolean;
  visBonus?: number;
  atencao?: number;
  diasAtelie?: number;
  reposMult?: number;
};
export type Melhoria = { slug: string; nome: string; descricao: string; niveis: NivelMelhoria[] };

export type Atributos = {
  colunas: number;
  linhas: number;
  expositor: number;
  maquininha: boolean;
  visBonus: number;
  atencao: number;
  diasAtelie: number;
  reposMult: number;
};

export type ErroBanca =
  | "semConta" | "generico" | "saldo" | "dias" | "produto" | "tema" | "lotes" | "melhoria" | "nivelMax" | "reputacao"
  | "layout" | "preco" | "evento" | "invalido" | "limite" | "estoque" | "teto";

// ---------- evento ao vivo ----------

export type Fase = "andando" | "olhando" | "fila" | "atendido" | "desconto" | "troco" | "fim";
export type Saida = "comprou" | "trocou" | "olhou" | "desistiu" | "recusou" | "sem-estoque";

export type Visitante = {
  id: number;
  arq: ArqSlug;
  chegaEm: number;
  fase: Fase;
  olharAte: number;
  pac: number;
  pacMax: number;
  pedido: { item: ItemKey; qtd: number }[];
  troca: boolean;
  /** Fração de desconto que ele pede (0 = não pede). */
  pedeDesconto: number;
  descontoAplicado: number;
  cartao: boolean;
  total: number;
  entregou: number;
  troco: number;
  saiu: Saida | null;
};

export type Celula = { item: ItemKey | null; un: number; placa: boolean; repondoAte: number | null };

export type EventoEstado = {
  semana: number;
  seed: string;
  evento: string;
  t: number;
  duracao: number;
  graca: number;
  tranquilo: boolean;
  attrs: Atributos;
  celulas: Celula[];
  caixa: Record<ItemKey, number>;
  precos: Record<ProdutoSlug, number>;
  visitantes: Visitante[];
  /** Ids na ordem da fila. */
  fila: number[];
  atendendo: number | null;
  atendeAte: number;
  vendas: Record<ItemKey, number>;
  trocas: Record<ItemKey, number>;
  receita: number;
  receitaCartao: number;
  desistiram: number;
  repDelta: number;
  procurado: Partial<Record<ProdutoSlug, number>>;
  errosTroco: number;
  fim: boolean;
};

/** O que o cliente manda pro servidor no fim do evento. O servidor confere tudo contra estoque, tetos e preços. */
export type ResumoEvento = {
  evento: string;
  vendas: Record<ItemKey, number>;
  trocas: Record<ItemKey, number>;
  receita: number;
  receitaCartao: number;
  visitantes: number;
  desistiram: number;
  repDelta: number;
  procurado: Partial<Record<ProdutoSlug, number>>;
  tranquilo: boolean;
};

export type RegistroEvento = {
  evento: string;
  semana: number;
  vendas: Record<ItemKey, number>;
  trocas: number;
  receita: number;
  custos: { taxa: number; material: number; maquininha: number };
  lucro: number;
  visitantes: number;
  desistiram: number;
  reputacaoFim: number;
  maisProcurado: ProdutoSlug | null;
  tranquilo: boolean;
};
