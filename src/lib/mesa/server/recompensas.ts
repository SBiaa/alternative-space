/**
 * Recompensas da Mesa. O mestre dá; o jogador aceita ou recusa; aceitar lança na ficha vinculada.
 * - só o mestre cria e cancela (e só enquanto pendente);
 * - o jogador vê e resolve só as próprias; o mestre vê todas da campanha;
 * - aceitar vale uma vez só: a recompensa é "reservada" antes de lançar, então dois cliques não lançam duas vezes.
 */
import 'server-only';
import { and, asc, eq, sql } from 'drizzle-orm';
import { db } from '@/lib/fichas/db';
import { characters } from '@/lib/fichas/db/schema';
import { nomeDoTripulante } from '@/lib/fichas/server/nomes';
import { addLedgerEntry } from '@/lib/fichas/server/play';
import { FICHA_VAZIA, normalizarFicha, type Ficha } from '@/lib/pathfinder';
import { motivoNoHistorico, lerRecompensa, type StatusRecompensa, type TipoRecompensa } from '../regras-recompensas';
import { campanhaJogadores, campanhaRecompensas, campanhaSessoes, campanhas } from '../schema';
import { acesso, acessoDeMestre, InputError } from './acesso';
import { sessaoDaCampanha } from './sessoes';

export interface RecompensaView {
  id: string;
  sessaoId: string | null;
  sessaoTitulo: string | null;
  sessaoEm: Date | null;
  userId: string;
  nome: string;
  tipo: TipoRecompensa;
  quantidade: number;
  descricao: string;
  status: StatusRecompensa;
  /** Se foi lançada numa ficha (aceita e com ficha vinculada). */
  naFicha: boolean;
  criadaEm: Date;
}

/** Do mestre: todas da campanha. Do jogador: só as dele. `sessaoId` filtra por sessão. */
export async function listarRecompensas(campanhaId: string, sessaoId?: string): Promise<RecompensaView[]> {
  const { userId, papel } = await acesso(campanhaId);
  const rows = await db()
    .select({
      id: campanhaRecompensas.id,
      sessaoId: campanhaRecompensas.sessaoId,
      sessaoTitulo: campanhaSessoes.titulo,
      sessaoEm: campanhaSessoes.iniciaEm,
      userId: campanhaRecompensas.userId,
      nome: nomeDoTripulante(campanhaRecompensas.userId),
      tipo: campanhaRecompensas.tipo,
      quantidade: campanhaRecompensas.quantidade,
      descricao: campanhaRecompensas.descricao,
      status: campanhaRecompensas.status,
      characterId: campanhaRecompensas.characterId,
      criadaEm: campanhaRecompensas.createdAt,
    })
    .from(campanhaRecompensas)
    .leftJoin(campanhaSessoes, eq(campanhaSessoes.id, campanhaRecompensas.sessaoId))
    .where(
      and(
        eq(campanhaRecompensas.campanhaId, campanhaId),
        sessaoId ? eq(campanhaRecompensas.sessaoId, sessaoId) : undefined,
        papel === 'jogador' ? eq(campanhaRecompensas.userId, userId) : undefined,
      ),
    )
    .orderBy(asc(campanhaRecompensas.createdAt));
  return rows.map(({ characterId, ...r }) => ({ ...r, naFicha: !!characterId }));
}

/** O mestre manda a recompensa para todos os jogadores ou só para alguns. Devolve quantos receberam. */
export async function darRecompensa(campanhaId: string, sessaoId: unknown, raw: Record<string, unknown>): Promise<number> {
  const { campanha } = await acessoDeMestre(campanhaId, 'dar recompensas');
  const dados = lerRecompensa(raw, campanha.sistema);
  const sessao = typeof sessaoId === 'string' && sessaoId ? (await sessaoDaCampanha(campanhaId, sessaoId)).id : null;
  const jogadores = await db().select({ userId: campanhaJogadores.userId }).from(campanhaJogadores).where(eq(campanhaJogadores.campanhaId, campanhaId));
  const ids = dados.para === 'todos' ? jogadores.map((j) => j.userId) : dados.para;
  if (!ids.length) throw new InputError('Ainda não há jogadores na campanha.');
  if (ids.some((id) => !jogadores.some((j) => j.userId === id))) throw new InputError('Alguém dessa lista não está na campanha.');
  await db()
    .insert(campanhaRecompensas)
    .values(ids.map((userId) => ({ campanhaId, sessaoId: sessao, userId, tipo: dados.tipo, quantidade: dados.quantidade, descricao: dados.descricao })));
  return ids.length;
}

export async function cancelarRecompensa(campanhaId: string, recompensaId: unknown): Promise<void> {
  await acessoDeMestre(campanhaId, 'cancelar recompensas');
  if (typeof recompensaId !== 'string') throw new InputError('Recompensa não encontrada.');
  const [feito] = await db()
    .update(campanhaRecompensas)
    .set({ status: 'cancelada', resolvidaEm: new Date() })
    .where(and(eq(campanhaRecompensas.id, recompensaId), eq(campanhaRecompensas.campanhaId, campanhaId), eq(campanhaRecompensas.status, 'pendente')))
    .returning({ id: campanhaRecompensas.id });
  if (!feito) throw new InputError('Só dá para cancelar o que ainda está pendente.');
}

export async function recusarRecompensa(campanhaId: string, recompensaId: unknown): Promise<void> {
  const { userId, papel } = await acesso(campanhaId);
  if (papel !== 'jogador') throw new InputError('Só jogadores resolvem recompensas.');
  if (typeof recompensaId !== 'string') throw new InputError('Recompensa não encontrada.');
  const [feito] = await db()
    .update(campanhaRecompensas)
    .set({ status: 'recusada', resolvidaEm: new Date() })
    .where(
      and(
        eq(campanhaRecompensas.id, recompensaId),
        eq(campanhaRecompensas.campanhaId, campanhaId),
        eq(campanhaRecompensas.userId, userId),
        eq(campanhaRecompensas.status, 'pendente'),
      ),
    )
    .returning({ id: campanhaRecompensas.id });
  if (!feito) throw new InputError('Essa recompensa já foi resolvida ou não existe.');
}

/** O jogador aceita: a recompensa é lançada na ficha vinculada (quando o tipo vai para uma ficha). */
export async function aceitarRecompensa(campanhaId: string, recompensaId: unknown): Promise<string> {
  const { userId, campanha, papel } = await acesso(campanhaId);
  if (papel !== 'jogador') throw new InputError('Só jogadores resolvem recompensas.');
  if (typeof recompensaId !== 'string') throw new InputError('Recompensa não encontrada.');

  // Reserva primeiro: só uma chamada passa daqui, mesmo com dois cliques ao mesmo tempo.
  const [r] = await db()
    .update(campanhaRecompensas)
    .set({ status: 'aceita', resolvidaEm: new Date() })
    .where(
      and(
        eq(campanhaRecompensas.id, recompensaId),
        eq(campanhaRecompensas.campanhaId, campanhaId),
        eq(campanhaRecompensas.userId, userId),
        eq(campanhaRecompensas.status, 'pendente'),
      ),
    )
    .returning();
  if (!r) throw new InputError('Essa recompensa já foi resolvida ou não existe.');

  try {
    const [vinculo] = await db()
      .select({ characterId: campanhaJogadores.characterId })
      .from(campanhaJogadores)
      .where(and(eq(campanhaJogadores.campanhaId, campanhaId), eq(campanhaJogadores.userId, userId)));
    const fichaId = await lancarNaFicha(r, campanha, userId, vinculo?.characterId ?? null);
    if (fichaId) await db().update(campanhaRecompensas).set({ characterId: fichaId }).where(eq(campanhaRecompensas.id, r.id));
    return fichaId ? 'Recompensa lançada na sua ficha.' : 'Recompensa aceita.';
  } catch (e) {
    // Não deu para lançar: volta a ficar pendente para tentar de novo (ou recusar).
    await db().update(campanhaRecompensas).set({ status: 'pendente', resolvidaEm: null }).where(eq(campanhaRecompensas.id, r.id));
    throw e;
  }
}

type RecompensaRow = typeof campanhaRecompensas.$inferSelect;

/** Devolve o id da ficha em que lançou, ou null se esse tipo não vai para a ficha. */
async function lancarNaFicha(
  r: RecompensaRow,
  campanha: Pick<typeof campanhas.$inferSelect, 'nome' | 'sistema'>,
  userId: string,
  fichaId: string | null,
): Promise<string | null> {
  if ((r.tipo === 'karma' || r.tipo === 'nuyen') && campanha.sistema === 'sr5') {
    if (!fichaId) throw new InputError('Vincule uma ficha de Shadowrun à campanha para receber karma e nuyen, ou recuse a recompensa.');
    await addLedgerEntry(fichaId, { kind: r.tipo, amount: r.quantidade, reason: motivoNoHistorico(campanha.nome, r.descricao) });
    return fichaId;
  }
  if ((r.tipo === 'po' || r.tipo === 'item') && campanha.sistema === 'pf2e') {
    if (!fichaId) throw new InputError('Vincule uma ficha de Pathfinder à campanha para receber isso, ou recuse a recompensa.');
    await somarNaFichaPf2e(fichaId, userId, r);
    return fichaId;
  }
  return null; // XP e item de outros sistemas ficam só registrados na Mesa
}

const MAX_MOEDAS = 10_000_000;
const MAX_ITENS = 100;

/**
 * Soma ouro ou põe o item na ficha de Pathfinder. A ficha é gravada inteira pelo editor, então aqui lê e grava
 * conferindo a versão (`updated_at`): se o editor salvou no meio, lê de novo em vez de apagar a mudança dele.
 */
async function somarNaFichaPf2e(fichaId: string, userId: string, r: RecompensaRow): Promise<void> {
  for (let tentativa = 0; tentativa < 3; tentativa++) {
    const [row] = await db()
      .select({ draft: characters.draft, updatedAt: characters.updatedAt, ownerId: characters.ownerId, system: characters.system })
      .from(characters)
      .where(eq(characters.id, fichaId));
    if (!row || row.ownerId !== userId || row.system !== 'pf2e') throw new InputError('A ficha vinculada não existe mais. Vincule outra e tente de novo.');
    const ficha: Ficha = normalizarFicha(row.draft) ?? FICHA_VAZIA;
    let nova: Ficha;
    if (r.tipo === 'po') {
      nova = { ...ficha, dinheiro: { ...ficha.dinheiro, po: Math.min(MAX_MOEDAS, ficha.dinheiro.po + r.quantidade) } };
    } else {
      if (ficha.itens.length >= MAX_ITENS) throw new InputError('O inventário da ficha está cheio.');
      nova = { ...ficha, itens: [...ficha.itens, { nome: r.descricao.slice(0, 80), qtd: Math.min(9999, r.quantidade), volume: 0 }] };
    }
    const [gravou] = await db()
      .update(characters)
      .set({ draft: nova as never, updatedAt: new Date() })
      .where(
        and(
          eq(characters.id, fichaId),
          eq(characters.ownerId, userId),
          eq(characters.system, 'pf2e'),
          // O banco guarda microssegundos e o Date só milissegundos: compara cortando no milissegundo.
          sql`date_trunc('milliseconds', ${characters.updatedAt}) = ${row.updatedAt}`,
        ),
      )
      .returning({ id: characters.id });
    if (gravou) return;
  }
  throw new InputError('A ficha mudou enquanto salvava. Tente de novo.');
}

/** Total de XP aceito por jogador na campanha (o XP fica na Mesa, não na ficha). */
export async function xpAceitoPorJogador(campanhaId: string): Promise<Map<string, number>> {
  const rows = await db()
    .select({ userId: campanhaRecompensas.userId, total: sql<number>`sum(${campanhaRecompensas.quantidade})::int` })
    .from(campanhaRecompensas)
    .where(and(eq(campanhaRecompensas.campanhaId, campanhaId), eq(campanhaRecompensas.tipo, 'xp'), eq(campanhaRecompensas.status, 'aceita')))
    .groupBy(campanhaRecompensas.userId);
  return new Map(rows.map((x) => [x.userId, x.total]));
}
