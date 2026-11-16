/** Sessões, presença, diário, ganchos e o calendário. Regras de acesso em ./acesso.ts. */
import 'server-only';
import { and, asc, eq, gte, lt, or, sql } from 'drizzle-orm';
import { db } from '@/lib/fichas/db';
import { nomeDoTripulante } from '@/lib/fichas/server/nomes';
import { intervaloDaGrade, lerDiario, lerGancho, lerResposta, lerSessao, sessaoVisivel, UUID } from '../regras';
import { campanhaGanchos, campanhaJogadores, campanhaPresencas, campanhas, campanhaSessoes } from '../schema';
import { acesso, acessoDeMestre, CampanhaNaoEncontrada, InputError, usuarioDaMesa } from './acesso';
import { garantirRotinasDoUsuario } from './agenda';

export async function sessaoDaCampanha(campanhaId: string, sessaoId: string) {
  if (!UUID.test(sessaoId)) throw new CampanhaNaoEncontrada();
  const [s] = await db()
    .select()
    .from(campanhaSessoes)
    .where(and(eq(campanhaSessoes.id, sessaoId), eq(campanhaSessoes.campanhaId, campanhaId)));
  if (!s) throw new CampanhaNaoEncontrada();
  return s;
}

// ---------------------------------------------------------------------------
// Leitura

export async function getSessao(campanhaId: string, sessaoId: string) {
  const { userId, campanha, papel } = await acesso(campanhaId);
  const s = await sessaoDaCampanha(campanhaId, sessaoId);
  const [jogadores, respostas, ganchos] = await Promise.all([
    db()
      .select({ userId: campanhaJogadores.userId, nome: nomeDoTripulante(campanhaJogadores.userId) })
      .from(campanhaJogadores)
      .where(eq(campanhaJogadores.campanhaId, campanhaId))
      .orderBy(asc(campanhaJogadores.joinedAt)),
    db().select().from(campanhaPresencas).where(eq(campanhaPresencas.sessaoId, sessaoId)),
    papel === 'mestre'
      ? db().select().from(campanhaGanchos).where(eq(campanhaGanchos.campanhaId, campanhaId)).orderBy(asc(campanhaGanchos.createdAt))
      : Promise.resolve([]),
  ]);
  return {
    campanha: { id: campanha.id, nome: campanha.nome, cor: campanha.cor, sistema: campanha.sistema },
    papel,
    sessao: sessaoVisivel(s, papel),
    presencas: jogadores.map((j) => {
      const linha = respostas.find((r) => r.userId === j.userId);
      return { userId: j.userId, nome: j.nome, resposta: linha?.resposta ?? null, compareceu: linha?.compareceu ?? null };
    }),
    minhaResposta: respostas.find((r) => r.userId === userId)?.resposta ?? null,
    ganchos: ganchos.map((g) => ({ id: g.id, texto: g.texto, daSessao: g.sessaoId === sessaoId, resolvido: !!g.resolvidoEm })),
  };
}

export interface SessaoNoCalendario {
  id: string;
  campanhaId: string;
  campanha: string;
  cor: (typeof campanhas.$inferSelect)['cor'];
  titulo: string;
  iniciaEm: Date;
  status: (typeof campanhaSessoes.$inferSelect)['status'];
  souMestre: boolean;
}

/** Sessões de todas as campanhas do usuário (mestre ou jogador) que caem na grade do mês. */
export async function sessoesDoMes(ano: number, mes: number): Promise<SessaoNoCalendario[]> {
  const userId = await usuarioDaMesa('/mesa/calendario');
  await garantirRotinasDoUsuario(userId);
  const { de, ate } = intervaloDaGrade(ano, mes);
  const rows = await db()
    .select({
      id: campanhaSessoes.id,
      campanhaId: campanhas.id,
      campanha: campanhas.nome,
      cor: campanhas.cor,
      mestreId: campanhas.mestreId,
      titulo: campanhaSessoes.titulo,
      iniciaEm: campanhaSessoes.iniciaEm,
      status: campanhaSessoes.status,
    })
    .from(campanhaSessoes)
    .innerJoin(campanhas, eq(campanhas.id, campanhaSessoes.campanhaId))
    .where(
      and(
        gte(campanhaSessoes.iniciaEm, de),
        lt(campanhaSessoes.iniciaEm, ate),
        or(
          eq(campanhas.mestreId, userId),
          sql`exists (select 1 from campanha_jogadores j where j.campanha_id = campanhas.id and j.user_id = ${userId})`,
        ),
      ),
    )
    .orderBy(asc(campanhaSessoes.iniciaEm));
  return rows.map(({ mestreId, ...r }) => ({ ...r, souMestre: mestreId === userId }));
}

// ---------------------------------------------------------------------------
// Escrita (mestre)

export async function criarSessao(campanhaId: string, raw: Record<string, unknown>): Promise<string> {
  await acessoDeMestre(campanhaId, 'marcar sessões');
  const dados = lerSessao(raw);
  const [s] = await db().insert(campanhaSessoes).values({ campanhaId, ...dados }).returning({ id: campanhaSessoes.id });
  return s.id;
}

export async function editarSessao(campanhaId: string, sessaoId: string, raw: Record<string, unknown>): Promise<void> {
  await acessoDeMestre(campanhaId, 'editar sessões');
  await sessaoDaCampanha(campanhaId, sessaoId);
  const dados = lerSessao(raw);
  await db().update(campanhaSessoes).set({ ...dados, updatedAt: new Date() }).where(eq(campanhaSessoes.id, sessaoId));
}

export async function apagarSessao(campanhaId: string, sessaoId: string): Promise<void> {
  await acessoDeMestre(campanhaId, 'apagar sessões');
  await sessaoDaCampanha(campanhaId, sessaoId);
  await db().delete(campanhaSessoes).where(eq(campanhaSessoes.id, sessaoId));
}

/** Diário da sessão: status, resumo e recompensas (para todos) e notas do mestre (só ele). */
export async function salvarDiario(campanhaId: string, sessaoId: string, raw: Record<string, unknown>): Promise<void> {
  await acessoDeMestre(campanhaId, 'escrever o diário');
  await sessaoDaCampanha(campanhaId, sessaoId);
  const dados = lerDiario(raw);
  await db().update(campanhaSessoes).set({ ...dados, updatedAt: new Date() }).where(eq(campanhaSessoes.id, sessaoId));
  // Quem veio só se marca em sessão realizada.
  if (dados.status === 'realizada' && Array.isArray(raw.compareceram)) {
    await registrarComparecimento(campanhaId, sessaoId, raw.compareceram.filter((x): x is string => typeof x === 'string'));
  }
}

/** O mestre marca quem veio: cada jogador da campanha fica com `compareceu` verdadeiro ou falso. */
async function registrarComparecimento(campanhaId: string, sessaoId: string, vieram: string[]): Promise<void> {
  const jogadores = await db().select({ userId: campanhaJogadores.userId }).from(campanhaJogadores).where(eq(campanhaJogadores.campanhaId, campanhaId));
  if (!jogadores.length) return;
  const presentes = new Set(vieram);
  await db()
    .insert(campanhaPresencas)
    .values(jogadores.map((j) => ({ sessaoId, userId: j.userId, compareceu: presentes.has(j.userId) })))
    .onConflictDoUpdate({
      target: [campanhaPresencas.sessaoId, campanhaPresencas.userId],
      set: { compareceu: sql`excluded.compareceu`, updatedAt: new Date() },
    });
}

export async function criarGancho(campanhaId: string, texto: unknown, sessaoId?: unknown): Promise<void> {
  await acessoDeMestre(campanhaId, 'anotar ganchos');
  const t = lerGancho(texto);
  let sessao: string | null = null;
  if (typeof sessaoId === 'string' && sessaoId) sessao = (await sessaoDaCampanha(campanhaId, sessaoId)).id;
  await db().insert(campanhaGanchos).values({ campanhaId, sessaoId: sessao, texto: t });
}

export async function marcarGancho(campanhaId: string, ganchoId: string, resolvido: boolean): Promise<void> {
  await acessoDeMestre(campanhaId, 'mexer nos ganchos');
  if (!UUID.test(ganchoId)) throw new CampanhaNaoEncontrada();
  await db()
    .update(campanhaGanchos)
    .set({ resolvidoEm: resolvido ? new Date() : null })
    .where(and(eq(campanhaGanchos.id, ganchoId), eq(campanhaGanchos.campanhaId, campanhaId)));
}

export async function apagarGancho(campanhaId: string, ganchoId: string): Promise<void> {
  await acessoDeMestre(campanhaId, 'mexer nos ganchos');
  if (!UUID.test(ganchoId)) throw new CampanhaNaoEncontrada();
  await db().delete(campanhaGanchos).where(and(eq(campanhaGanchos.id, ganchoId), eq(campanhaGanchos.campanhaId, campanhaId)));
}

// ---------------------------------------------------------------------------
// Escrita (jogador)

export async function responderPresenca(campanhaId: string, sessaoId: string, raw: unknown): Promise<void> {
  const { userId, papel } = await acesso(campanhaId);
  if (papel !== 'jogador') throw new InputError('Só jogadores confirmam presença.');
  const s = await sessaoDaCampanha(campanhaId, sessaoId);
  if (s.status !== 'marcada') throw new InputError('Essa sessão não está mais marcada.');
  const resposta = lerResposta(raw);
  await db()
    .insert(campanhaPresencas)
    .values({ sessaoId, userId, resposta })
    .onConflictDoUpdate({ target: [campanhaPresencas.sessaoId, campanhaPresencas.userId], set: { resposta, updatedAt: new Date() } });
}
