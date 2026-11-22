// Tipos da Banda de Garagem. Sem React e sem banco: tudo aqui é dado puro.

export type Papel = "voz" | "guitarra" | "baixo" | "bateria";
export type AcaoDia = "ensaiar" | "compor" | "divulgar" | "trabalhar" | "descansar";
export type ParteEquip = "instrumentos" | "amplificador" | "cabos";

export type Logo = { forma: string; corFundo: string; corForma: string };

export type Integrante = {
  id: string;
  nome: string;
  papel: Papel;
  tecnica: number;
  presenca: number;
  criatividade: number;
  humor: number;
  /** Sobe com ensaio e trabalho seguidos; descansar baixa. Acima do limiar, o humor despenca e dá briga. */
  cansaco: number;
  mania: string;
  silhueta: number;
  /** Semana em que o integrante foi avisado de que está por um fio. null = sem aviso. */
  avisoSemana: number | null;
};

export type Equipamento = Record<ParteEquip, number>;

export type Secao = { nome: string; compassos: number };
export type Estrutura = { id: string; secoes: Secao[] };

/** Formato pensado pra virar fase do Riff Estelar no futuro: BPM, estrutura e clima. */
export type Musica = {
  slot: number;
  titulo: string;
  estrutura: Estrutura;
  clima: string;
  bpm: number;
  tema: string;
  nota: number;
  semana: number;
};

export type RegistroShow = {
  semana: number;
  palco: string;
  repertorio: number[];
  publico: number;
  cache: number;
  famaDelta: number;
  nota: number;
  energia: number;
  momentos: string[];
};

export type Progresso = {
  v: number;
  nome: string;
  estilo: string;
  logo: Logo;
  dinheiro: number;
  fama: number;
  entrosamento: number;
  semana: number;
  /** 0 a 5: dias da semana ainda por jogar. 6: fim de semana, hora do show. */
  dia: number;
  agenda: AcaoDia[];
  divulgacao: number;
  demo: boolean;
  seed: string;
  membros: Integrante[];
  equipamento: Equipamento;
  musicas: Musica[];
  shows: RegistroShow[];
};

export type Candidato = Omit<Integrante, "humor" | "cansaco" | "avisoSemana"> & { humor: number };

export type Montagem = { nome: string; estilo: string; logo: Logo; escolhidos: Record<Papel, string> };

export type ErroJogo =
  | "invalido"
  | "diaErrado"
  | "semDia"
  | "dinheiro"
  | "semMusica"
  | "palcoFechado"
  | "repertorio"
  | "demoRequisito"
  | "demoJa"
  | "equipOk"
  | "titulo"
  | "limite"
  | "semConta"
  | "generico";

export type Eventos = {
  briga?: { a: string; b: string };
  avisos: string[];
  saiu?: { nome: string; entrou: string };
};

export type ResultadoDia =
  | { ok: true; prog: Progresso; aviso: string[]; briga: { a: string; b: string } | null; musica?: Musica }
  | { ok: false; erro: ErroJogo };

export type ResultadoShow =
  | { ok: true; prog: Progresso; registro: RegistroShow; faltou: string[]; saidas: { nome: string; entrou: string }[] }
  | { ok: false; erro: ErroJogo };
