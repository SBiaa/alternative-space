/** Mundo (wiki) e handouts: categorias, limites e validação. Puro, sem acesso ao banco. */
import { InputError } from '@/lib/fichas/sr5/play';

export const CATEGORIAS_PAGINA = ['lugar', 'faccao', 'personagem', 'item', 'outro'] as const;
export type CategoriaPagina = (typeof CATEGORIAS_PAGINA)[number];
export const NOME_CATEGORIA: Record<CategoriaPagina, string> = {
  lugar: 'Lugares',
  faccao: 'Facções',
  personagem: 'Personagens',
  item: 'Itens',
  outro: 'Outros',
};
export const NOME_CATEGORIA_UM: Record<CategoriaPagina, string> = {
  lugar: 'Lugar',
  faccao: 'Facção',
  personagem: 'Personagem',
  item: 'Item',
  outro: 'Outro',
};

export const TIPOS_HANDOUT = ['imagem', 'pdf', 'texto'] as const;
export type TipoHandout = (typeof TIPOS_HANDOUT)[number];
export const NOME_TIPO_HANDOUT: Record<TipoHandout, string> = { imagem: 'Imagem', pdf: 'PDF', texto: 'Texto' };

export const LIMITE_TITULO = 120;
export const LIMITE_CORPO = 20_000;
export const MAX_PAGINAS = 300;
export const MAX_HANDOUTS = 100;
export const MAX_BYTES_HANDOUT = 10 * 1024 * 1024;
export const TIPOS_DE_ARQUIVO: Record<Exclude<TipoHandout, 'texto'>, string[]> = {
  imagem: ['image/png', 'image/jpeg', 'image/webp', 'image/gif'],
  pdf: ['application/pdf'],
};
export const ARQUIVOS_PERMITIDOS = [...TIPOS_DE_ARQUIVO.imagem, ...TIPOS_DE_ARQUIVO.pdf];

/** O tipo do handout a partir do tipo MIME do arquivo; nulo se não for imagem nem PDF aceitos. */
export function tipoDoArquivo(mime: string): Exclude<TipoHandout, 'texto'> | null {
  if (TIPOS_DE_ARQUIVO.imagem.includes(mime)) return 'imagem';
  if (TIPOS_DE_ARQUIVO.pdf.includes(mime)) return 'pdf';
  return null;
}

/** Todo arquivo de uma campanha fica sob este prefixo no Blob. */
export const prefixoDosArquivos = (campanhaId: string) => `mesa/${campanhaId}/`;

const texto = (v: unknown) => (typeof v === 'string' ? v.replace(/\r\n/g, '\n').trim() : '');

function titulo(raw: unknown): string {
  const t = texto(raw).replace(/\s+/g, ' ');
  if (!t) throw new InputError('Dê um título.');
  if (t.length > LIMITE_TITULO) throw new InputError(`O título tem no máximo ${LIMITE_TITULO} caracteres.`);
  return t;
}

function corpo(raw: unknown, rotulo: string): string {
  const t = texto(raw);
  if (t.length > LIMITE_CORPO) throw new InputError(`${rotulo} tem no máximo ${LIMITE_CORPO} caracteres.`);
  return t;
}

export interface DadosPagina {
  titulo: string;
  categoria: CategoriaPagina;
  corpo: string;
}

export function lerPagina(raw: Record<string, unknown>): DadosPagina {
  const categoria = raw.categoria as CategoriaPagina;
  if (!CATEGORIAS_PAGINA.includes(categoria)) throw new InputError('Escolha uma categoria.');
  return { titulo: titulo(raw.titulo), categoria, corpo: corpo(raw.corpo, 'O texto') };
}

export interface DadosHandout {
  titulo: string;
  tipo: TipoHandout;
  /** Só para imagem e PDF. */
  blobUrl: string | null;
  blobPathname: string | null;
  texto: string;
  sessaoId: string | null;
}

/** Valida o handout. Arquivo: o caminho no Blob tem de estar sob o prefixo desta campanha. */
export function lerHandout(raw: Record<string, unknown>, campanhaId: string): DadosHandout {
  const tipo = raw.tipo as TipoHandout;
  if (!TIPOS_HANDOUT.includes(tipo)) throw new InputError('Escolha o tipo do handout.');
  const t = titulo(raw.titulo);
  const sessaoId = typeof raw.sessaoId === 'string' && raw.sessaoId ? raw.sessaoId : null;
  if (tipo === 'texto') {
    const conteudo = corpo(raw.texto, 'O texto');
    if (!conteudo) throw new InputError('Escreva o texto do handout.');
    return { titulo: t, tipo, blobUrl: null, blobPathname: null, texto: conteudo, sessaoId };
  }
  const pathname = typeof raw.blobPathname === 'string' ? raw.blobPathname : '';
  const url = typeof raw.blobUrl === 'string' ? raw.blobUrl : '';
  if (!pathname.startsWith(prefixoDosArquivos(campanhaId)) || pathname.includes('..')) {
    throw new InputError('Arquivo inválido. Envie de novo.');
  }
  if (!url || url.length > 2000) throw new InputError('Arquivo inválido. Envie de novo.');
  return { titulo: t, tipo, blobUrl: url, blobPathname: pathname, texto: '', sessaoId };
}

/** A partir de quando uma página liberada conta como "nova" para o jogador: a última sessão feita, ou 7 dias atrás. */
export function referenciaDeNovidade(ultimaSessao: Date | null, agora: Date): Date {
  return ultimaSessao ?? new Date(agora.getTime() - 7 * 86_400_000);
}

export const eNova = (liberadaEm: Date | null, referencia: Date) => !!liberadaEm && liberadaEm.getTime() > referencia.getTime();

const semAcento = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Filtra por categoria e por busca (título e texto, sem acento nem caixa). */
export function filtrarPaginas<T extends { titulo: string; corpo: string; categoria: CategoriaPagina }>(
  paginas: T[],
  busca: string,
  categoria: CategoriaPagina | 'todas',
): T[] {
  const q = semAcento(busca.trim());
  return paginas.filter(
    (p) => (categoria === 'todas' || p.categoria === categoria) && (!q || semAcento(p.titulo).includes(q) || semAcento(p.corpo).includes(q)),
  );
}
