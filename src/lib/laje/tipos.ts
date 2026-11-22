export type Fase = "semente" | "broto" | "crescendo" | "pronta";

export type Vaso = {
  slot: number;
  planta: string | null;
  // ms desde a época; null se o vaso está vazio.
  plantadoEm: number | null;
  agua: number; // 0 a 100
  aguaEm: number; // quando `agua` e `crescimentoMs` valiam
  nivel: number; // 1 a 3
  // Tempo de crescimento efetivo acumulado (ms): anda inteiro com água em dia e mais devagar com a planta murcha.
  crescimentoMs: number;
};

export type Meta = {
  // Último dia cujo pombo já foi resolvido (bicou ou foi espantado).
  pomboDia: number;
  espantadoDia: number | null;
  // Dia (do jogo) da última troca com o vizinho.
  ultimaTrocaDia: number | null;
  // Vasos bicados e ainda não colhidos.
  bicados: number[];
};

export type Inventario = {
  sementes: Record<string, number>;
  colheita: Record<string, number>;
  decoracoes: Record<string, number>;
  meta: Meta;
};

export type Save = {
  v: number;
  seed: string;
  moedas: number;
  criadoEm: number;
  inventario: Inventario;
  // encaixe -> slug da decoração
  decoracoes: Record<string, string>;
  vasos: Vaso[];
};

export type Erro =
  | "invalido"
  | "sem-semente"
  | "vaso-ocupado"
  | "vaso-vazio"
  | "nao-pronta"
  | "saldo"
  | "estoque"
  | "troca-feita"
  | "sem-pombo"
  | "nao-tem"
  | "ja-tem"
  | "nivel-max"
  | "encaixe";

export type Resultado<T = Save> = { ok: true; save: T } | { ok: false; erro: Erro };

export type Info = {
  fase: Fase;
  murcha: boolean;
  agua: number;
  // Quando a próxima fase deve chegar, mantidas as condições de agora (estimativa); null se já está pronta ou vazio.
  proximaFaseEm: number | null;
};
