/**
 * Mundo (wiki) e handouts da campanha.
 * - só o mestre cria, edita, libera/oculta, revela e apaga;
 * - o jogador só recebe o que foi liberado/revelado: o filtro é feito na consulta, então
 *   página oculta e handout não revelado nem chegam ao servidor da tela;
 * - o jogador nunca recebe o caminho do arquivo no Blob; ele abre pela rota de arquivo, que confere de novo.
 */
import 'server-only';
import { del, get } from '@vercel/blob';
import { and, asc, desc, eq, isNotNull, sql } from 'drizzle-orm';
import { db } from '@/lib/fichas/db';
import { UUID } from '../regras';
import {
  eNova,
  lerHandout,
  lerPagina,
  MAX_HANDOUTS,
  MAX_PAGINAS,
  referenciaDeNovidade,
  type CategoriaPagina,
  type TipoHandout,
} from '../regras-mundo';
import { campanhaHandouts, campanhaPaginas, campanhaSessoes } from '../schema';
import { acesso, acessoDeMestre, InputError } from './acesso';

// ---------------------------------------------------------------------------
// Páginas

export interface PaginaView {
  id: string;
  titulo: string;
  categoria: CategoriaPagina;
  corpo: string;
  liberada: boolean;
  /** Liberada depois da última sessão feita: o jogador vê o selo "novo". */
  nova: boolean;
}

export async function listarPaginas(campanhaId: string): Promise<PaginaView[]> {
  const { campanha, papel } = await acesso(campanhaId);
  const ehMestre = papel === 'mestre';
  const [ultima] = await db()
    .select({ iniciaEm: sql<Date | null>`max(${campanhaSessoes.iniciaEm})` })
    .from(campanhaSessoes)
    .where(and(eq(campanhaSessoes.campanhaId, campanha.id), eq(campanhaSessoes.status, 'realizada')));
  const ref = referenciaDeNovidade(ultima?.iniciaEm ? new Date(ultima.iniciaEm) : null, new Date());
  const rows = await db()
    .select()
    .from(campanhaPaginas)
    .where(ehMestre ? eq(campanhaPaginas.campanhaId, campanha.id) : and(eq(campanhaPaginas.campanhaId, campanha.id), eq(campanhaPaginas.liberada, true)))
    .orderBy(asc(campanhaPaginas.categoria), asc(campanhaPaginas.titulo));
  return rows.map((r) => ({
    id: r.id,
    titulo: r.titulo,
    categoria: r.categoria,
    corpo: r.corpo,
    liberada: r.liberada,
    nova: !ehMestre && r.liberada && eNova(r.liberadaEm, ref),
  }));
}

async function paginaDaCampanha(campanhaId: string, paginaId: string) {
  if (!UUID.test(paginaId)) throw new InputError('Página não encontrada.');
  const [p] = await db().select().from(campanhaPaginas).where(and(eq(campanhaPaginas.id, paginaId), eq(campanhaPaginas.campanhaId, campanhaId)));
  if (!p) throw new InputError('Página não encontrada.');
  return p;
}

export async function criarPagina(campanhaId: string, raw: Record<string, unknown>): Promise<void> {
  await acessoDeMestre(campanhaId, 'criar páginas do Mundo');
  const dados = lerPagina(raw);
  const [r] = await db().select({ n: sql<number>`count(*)::int` }).from(campanhaPaginas).where(eq(campanhaPaginas.campanhaId, campanhaId));
  if ((r?.n ?? 0) >= MAX_PAGINAS) throw new InputError(`No máximo ${MAX_PAGINAS} páginas por campanha.`);
  await db().insert(campanhaPaginas).values({ campanhaId, ...dados });
}

export async function editarPagina(campanhaId: string, paginaId: string, raw: Record<string, unknown>): Promise<void> {
  await acessoDeMestre(campanhaId, 'editar páginas do Mundo');
  await paginaDaCampanha(campanhaId, paginaId);
  await db().update(campanhaPaginas).set({ ...lerPagina(raw), updatedAt: new Date() }).where(eq(campanhaPaginas.id, paginaId));
}

/** Libera ou oculta. Liberar de novo uma página que já estava liberada não muda a data (o selo "novo" não reaparece). */
export async function liberarPagina(campanhaId: string, paginaId: string, liberada: boolean): Promise<void> {
  await acessoDeMestre(campanhaId, 'liberar páginas do Mundo');
  const p = await paginaDaCampanha(campanhaId, paginaId);
  if (p.liberada === liberada) return;
  await db()
    .update(campanhaPaginas)
    .set({ liberada, liberadaEm: liberada ? new Date() : null })
    .where(eq(campanhaPaginas.id, paginaId));
}

export async function apagarPagina(campanhaId: string, paginaId: string): Promise<void> {
  await acessoDeMestre(campanhaId, 'apagar páginas do Mundo');
  await paginaDaCampanha(campanhaId, paginaId);
  await db().delete(campanhaPaginas).where(eq(campanhaPaginas.id, paginaId));
}

// ---------------------------------------------------------------------------
// Handouts

export interface HandoutView {
  id: string;
  titulo: string;
  tipo: TipoHandout;
  texto: string;
  sessaoId: string | null;
  revelado: boolean;
}

export async function listarHandouts(campanhaId: string): Promise<HandoutView[]> {
  const { campanha, papel } = await acesso(campanhaId);
  const ehMestre = papel === 'mestre';
  const rows = await db()
    .select({
      id: campanhaHandouts.id,
      titulo: campanhaHandouts.titulo,
      tipo: campanhaHandouts.tipo,
      texto: campanhaHandouts.texto,
      sessaoId: campanhaHandouts.sessaoId,
      reveladoEm: campanhaHandouts.reveladoEm,
    })
    .from(campanhaHandouts)
    .where(ehMestre ? eq(campanhaHandouts.campanhaId, campanha.id) : and(eq(campanhaHandouts.campanhaId, campanha.id), isNotNull(campanhaHandouts.reveladoEm)))
    .orderBy(desc(campanhaHandouts.createdAt));
  return rows.map((r) => ({ id: r.id, titulo: r.titulo, tipo: r.tipo, texto: r.texto, sessaoId: r.sessaoId, revelado: !!r.reveladoEm }));
}

async function handoutDaCampanha(campanhaId: string, handoutId: string) {
  if (!UUID.test(handoutId)) throw new InputError('Handout não encontrado.');
  const [h] = await db().select().from(campanhaHandouts).where(and(eq(campanhaHandouts.id, handoutId), eq(campanhaHandouts.campanhaId, campanhaId)));
  if (!h) throw new InputError('Handout não encontrado.');
  return h;
}

export async function criarHandout(campanhaId: string, raw: Record<string, unknown>): Promise<void> {
  await acessoDeMestre(campanhaId, 'criar handouts');
  const dados = lerHandout(raw, campanhaId);
  const [r] = await db().select({ n: sql<number>`count(*)::int` }).from(campanhaHandouts).where(eq(campanhaHandouts.campanhaId, campanhaId));
  if ((r?.n ?? 0) >= MAX_HANDOUTS) throw new InputError(`No máximo ${MAX_HANDOUTS} handouts por campanha.`);
  if (dados.sessaoId) {
    if (!UUID.test(dados.sessaoId)) throw new InputError('Sessão não encontrada.');
    const [s] = await db()
      .select({ id: campanhaSessoes.id })
      .from(campanhaSessoes)
      .where(and(eq(campanhaSessoes.id, dados.sessaoId), eq(campanhaSessoes.campanhaId, campanhaId)));
    if (!s) throw new InputError('Sessão não encontrada.');
  }
  await db().insert(campanhaHandouts).values({ campanhaId, ...dados });
}

export async function revelarHandout(campanhaId: string, handoutId: string, revelado: boolean): Promise<void> {
  await acessoDeMestre(campanhaId, 'revelar handouts');
  const h = await handoutDaCampanha(campanhaId, handoutId);
  if (!!h.reveladoEm === revelado) return;
  await db()
    .update(campanhaHandouts)
    .set({ reveladoEm: revelado ? new Date() : null })
    .where(eq(campanhaHandouts.id, handoutId));
}

export async function apagarHandout(campanhaId: string, handoutId: string): Promise<void> {
  await acessoDeMestre(campanhaId, 'apagar handouts');
  const h = await handoutDaCampanha(campanhaId, handoutId);
  if (h.blobPathname) {
    try {
      await del(h.blobPathname);
    } catch (e) {
      // Sem o arquivo o handout some do mesmo jeito; o que sobrar no Blob é só espaço.
      console.error('Não deu para apagar o arquivo do handout', e);
    }
  }
  await db().delete(campanhaHandouts).where(eq(campanhaHandouts.id, handoutId));
}

/**
 * Abre o arquivo de um handout. Mestre vê sempre; jogador, só depois de revelado.
 * Devolve nulo quando não existe ou não pode ver (a rota responde 404 nos dois casos).
 */
export async function abrirArquivoDoHandout(campanhaId: string, handoutId: string) {
  const { papel } = await acesso(campanhaId);
  if (!UUID.test(handoutId)) return null;
  const [h] = await db().select().from(campanhaHandouts).where(and(eq(campanhaHandouts.id, handoutId), eq(campanhaHandouts.campanhaId, campanhaId)));
  if (!h || !h.blobPathname) return null;
  if (papel !== 'mestre' && !h.reveladoEm) return null;
  const arquivo = await get(h.blobPathname, { access: 'private' });
  if (!arquivo || arquivo.statusCode !== 200) return null;
  return { stream: arquivo.stream, contentType: arquivo.blob.contentType, tipo: h.tipo };
}
