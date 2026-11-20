// Tipos da Fanzine Perdida. O capítulo completo (com ligações, respostas e dicas) só existe no servidor;
// o navegador recebe a VisaoCapitulo.

export type Area = { x: number; y: number; w: number; h: number };

export type Pagina = { id: string; titulo: string; imagem: string; alt: string; mdx: string; largura: number; altura: number };

export type Pista = { id: string; pagina: string; area: Area; rotulo: string; descricao: string; texto: string };

export type Ligacao = { id: string; pistas: [string, string]; texto: string; faltou: string };

export type Opcao = { id: string; texto: string };

export type Parte = { id: string; rotulo: string; opcoes: Opcao[]; certa: string; exige: string[] };

export type Capitulo = {
  slug: string;
  ordem: number;
  titulo: string;
  resumo: string;
  publicadoEm: string;
  selo: { nome: string; descricao: string };
  paginas: Pagina[];
  pistas: Pista[];
  ligacoes: Ligacao[];
  pergunta: { enunciado: string; partes: Parte[] };
  dicas: [string, string, string];
};

/** Progresso de um capítulo (é o que vai pro localStorage e pra tabela fanzine_progress). */
export type Progresso = {
  v: number;
  clues: string[];
  deductions: string[];
  hints: number;
  solved: boolean;
};

/** O que o navegador vê do capítulo: sem ligações, respostas certas nem dicas. */
export type VisaoCapitulo = {
  slug: string;
  ordem: number;
  titulo: string;
  resumo: string;
  selo: { nome: string; descricao: string };
  paginas: Pagina[];
  pistas: Pista[];
  pergunta: { enunciado: string; partes: { id: string; rotulo: string; opcoes: Opcao[] }[] };
};

export type DeducaoFeita = { id: string; texto: string; pistas: [string, string] };

/** Estado devolvido pelo servidor depois de cada ação. */
export type Estado = {
  logado: boolean;
  prog: Progresso;
  deducoes: DeducaoFeita[];
  dicas: string[];
};

export type ResumoCapitulo = { slug: string; ordem: number; titulo: string; resumo: string; selo: { nome: string; descricao: string }; totalPistas: number };
