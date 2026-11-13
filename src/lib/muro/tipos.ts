// Tipos do Muro Livre. Sem React nem canvas: o módulo inteiro roda em Node e nos testes.

export type Camada = "fundo" | "contorno" | "preenchimento" | "detalhe";
export type Tamanho = "porta" | "fachada" | "quadra" | "longo" | "empena";
export type Autorizacao = "autorizado" | "falta" | "recusado";
export type StatusJob = "aberta" | "em_andamento" | "entregue" | "perdida";
export type Ferramenta = "rolinho" | "spray";
export type Especialidade = "fundo" | "contorno" | "detalhe";
export type CorId = "laranja" | "azul" | "creme" | "tijolo" | "preto";
export type TipoItem = "material" | "andaime" | "protecao" | "espaco" | "planejamento" | "equipe" | "expansao";
export type Efeito = Record<string, number>;

export type Ponto = { x: number; y: number };

// ---------- templates (layouts de mural) ----------
export type Forma =
  | { t: "rect"; x: number; y: number; w: number; h: number }
  | { t: "elipse"; cx: number; cy: number; rx: number; ry: number }
  | { t: "poli"; p: [number, number][] };
export type Linha = { p: [number, number][]; fechada?: boolean };
export type Slot = { x: number; y: number; w: number; h: number };
/** Coordenadas em unidades do muro: x de 0 a 100 (largura), y de 0 a `altura` (= 100 × altura/largura). */
export type Template = {
  slug: string;
  nome: string;
  size: Tamanho;
  layers: { preenchimento: Forma[]; contorno: Linha[]; detalhe: Forma[] };
  slots: { texto: Slot; tag: Slot; tagGrande: Slot };
  tolerance: number;
};

// ---------- encomenda ----------
export type Briefing = { tema: string; palavra: string; cores: [CorId, CorId, CorId]; tagDestaque: boolean; obs: string };
export type EstadoCamada = {
  progresso: number; // 0 a 100
  qualidade: number; // 0 a 100 (média do que foi pintado)
  fidelidade: number; // 0 a 100: quanto seguiu a cor do briefing
  secaAte: number; // minuto absoluto em que a tinta seca
};
export type Negociacao = { respostas: number[]; resultado: "autorizado" | "mudanca" | "recusado" | null };
export type Job = {
  id: string;
  modelo: string; // slug do template
  cliente: string; // slug do arquétipo de cliente
  nomeCliente: string;
  tamanho: Tamanho;
  briefing: Briefing;
  pagamento: number;
  prazo: number; // dia (1-based) limite
  auth: Autorizacao;
  revisao: boolean; // autorizado com mudança: o desenho precisa ser refeito antes de começar
  aceita: boolean; // saiu do quadro e virou compromisso da crew
  prazoDias: number; // dias de prazo, contados a partir de quando aceita
  status: StatusJob;
  comunitario: boolean;
  encontro: boolean;
  exige: { clientes: number; quebrada: number };
  croqui: number; // 0 a 1
  camadas: Record<Camada, EstadoCamada>;
  coberto: boolean;
  ruinas: number; // quantas vezes a chuva estragou
  ruinasHoje: number;
  montado: boolean; // andaime montado
  tintaMax: number; // melhor qualidade de tinta usada (0 a 2)
  negociacao: Negociacao;
  criadoDia: number;
  entregueDia: number | null;
  qualFinal: number | null;
  pago: number | null;
};

// ---------- crew ----------
export type Habilidades = { tecnica: number; velocidade: number; estilo: number; resistencia: number };
export type Artista = {
  id: string;
  arquetipo: string;
  nivel: number;
  hab: Habilidades;
  cansaco: number; // 0 a 100
  contratadoDia: number;
  escala: { jobId: string; camada: Camada | "auto" } | null;
  folga: boolean;
  minTrabalhados: number;
};
export type ArquetipoArtista = {
  slug: string;
  nome: string;
  descricao: string;
  especialidade: Especialidade | null;
  hab: Habilidades;
  salario: number;
  contratacao: number;
  nivelMin: number;
  negociacao: number; // bônus de pontos na conversa
  desperdicio: number; // multiplicador de desperdício de tinta (1 = nada)
};

// ---------- material ----------
export type Estoque = {
  tinta: Record<CorId, number>; // % da lata, por cor
  spray: Record<CorId, number>; // latas (fracionado)
  rolinho: { saude: number; reserva: number };
  bico: { saude: number; reserva: number };
  lonas: number;
};
export type ItemMaterial = "tinta" | "spray" | "rolinho" | "bico" | "lona";

// ---------- progresso (o save) ----------
export type Gastos = { tinta: number; spray: number; salarios: number; lona: number; outros: number };
export type Encontro = { semana: number; inscrito: boolean; jobId: string | null; fimMinuto: number };
export type Progresso = {
  v: number;
  bairro: string;
  nivel: number;
  dinheiro: number;
  repQuebrada: number;
  repClientes: number;
  dia: number; // dias já fechados (o dia de hoje é dia + 1)
  minuto: number; // 0 a MIN_DIA
  seed: string;
  entregues: number;
  maiorMuro: Tamanho | null;
  estoque: Estoque;
  melhorias: Record<string, number>;
  equipe: Artista[];
  jobs: Job[];
  gastosDia: Gastos;
  ganhosDia: number;
  dinheiroIniDia: number;
  tagPropria: boolean;
  entreguesDia: string[];
  encontro: Encontro;
  tranquilo: boolean;
};

// ---------- catálogo ----------
export type ItemCatalogo = {
  id?: string;
  slug: string;
  kind: TipoItem;
  name: string;
  description: string;
  maxLevel: number;
  prices: number[];
  effects: Efeito[];
  minCrewLevel: number;
  position: number;
};
export type Dialogo = {
  id?: string;
  slug: string;
  kind: string; // diretor | sindico | associacao
  steps: DialogoEtapa[];
  requirements: { aprova: number; mudanca: number; mudancaTema: string };
};
export type DialogoEtapa = { fala: string; opcoes: DialogoOpcao[] };
export type DialogoOpcao = { texto: string; pontos: number; croqui?: number; prazo?: number; preco?: number; minQuebrada?: number; resposta: string };
export type Catalogo = { itens: ItemCatalogo[]; arquetipos: ArquetipoArtista[]; templates: Template[]; dialogos: Dialogo[] };

// ---------- registros ----------
export type RegistroDia = {
  dia: number;
  entregues: number;
  ruinasChuva: number;
  ganhos: number;
  gastos: Gastos;
  saldo: number;
  repQuebradaFim: number;
  repClientesFim: number;
  tranquilo: boolean;
  atrasados: number;
  evento: { resultado: "podio" | "mencao" | "nada"; score: ScoreEncontro; posicao: number } | null;
};
export type RegistroSemana = { semana: number; paga: boolean; contas: number; saldoFim: number };
export type ScoreEncontro = { tecnica: number; tema: number; assinatura: number };

export type Tag = { viewBox: [number, number]; paths: string[] };
export type Clima = { chuvas: { ini: number; fim: number; intensidade: number }[] };
