/** Campanhas e jogadores. Regras de acesso em ./acesso.ts. */
import 'server-only';
import { and, asc, eq, gt, inArray, or, sql } from 'drizzle-orm';
import { db } from '@/lib/fichas/db';
import { nomeDoTripulante } from '@/lib/fichas/server/nomes';
import { acharPorApelido } from '@/lib/role/dados';
import { CODIGO, lerApelido, lerCampanha, podeVerFicha, sessaoVisivel, UUID, type Papel } from '../regras';
import { campanhaConvites, campanhaGanchos, campanhaJogadores, campanhaPresencas, campanhas, campanhaSessoes } from '../schema';
import { acesso, acessoDeMestre, CampanhaNaoEncontrada, InputError, novoCodigo, usuarioDaMesa } from './acesso';
import { fichaCompleta, fichasParaCampanha, fichaValida, resumirFichas, type FichaResumo } from './fichas';

// ---------------------------------------------------------------------------
// Leitura

export interface CampanhaResumo {
  id: string;
  nome: string;
  sistema: (typeof campanhas.$inferSelect)['sistema'];
  status: (typeof campanhas.$inferSelect)['status'];
  cor: (typeof campanhas.$inferSelect)['cor'];
  rotina: string;
  papel: Papel;
  mestre: string;
  jogadores: number;
  proximaSessao: Date | null;
}

/** Tudo o que aparece em /mesa: campanhas como mestre, como jogador e convites pendentes. */
export async function listarMesa() {
  const userId = await usuarioDaMesa();
  const [rows, convites] = await Promise.all([
    db()
      .select({
        id: campanhas.id,
        nome: campanhas.nome,
        sistema: campanhas.sistema,
        status: campanhas.status,
        cor: campanhas.cor,
        rotina: campanhas.rotina,
        mestreId: campanhas.mestreId,
        mestre: nomeDoTripulante(campanhas.mestreId),
        jogadores: sql<number>`(select count(*)::int from campanha_jogadores j where j.campanha_id = campanhas.id)`,
        proximaSessao: sql<string | null>`(select min(s.inicia_em) from campanha_sessoes s
          where s.campanha_id = campanhas.id and s.status = 'marcada' and s.inicia_em > now())`,
      })
      .from(campanhas)
      .where(
        or(
          eq(campanhas.mestreId, userId),
          sql`exists (select 1 from campanha_jogadores j where j.campanha_id = campanhas.id and j.user_id = ${userId})`,
        ),
      )
      .orderBy(asc(campanhas.nome)),
    db()
      .select({
        campanhaId: campanhas.id,
        nome: campanhas.nome,
        sistema: campanhas.sistema,
        mestre: nomeDoTripulante(campanhas.mestreId),
      })
      .from(campanhaConvites)
      .innerJoin(campanhas, eq(campanhas.id, campanhaConvites.campanhaId))
      .where(eq(campanhaConvites.userId, userId))
      .orderBy(asc(campanhaConvites.createdAt)),
  ]);
  const lista: CampanhaResumo[] = rows.map(({ mestreId, proximaSessao, ...r }) => ({
    ...r,
    papel: mestreId === userId ? 'mestre' : 'jogador',
    proximaSessao: proximaSessao ? new Date(proximaSessao) : null,
  }));
  return {
    comoMestre: lista.filter((c) => c.papel === 'mestre'),
    comoJogador: lista.filter((c) => c.papel === 'jogador'),
    convites,
  };
}

export interface JogadorView {
  userId: string;
  nome: string;
  eu: boolean;
  ficha: FichaResumo | null;
  /** Mestre e dono abrem a ficha completa. */
  podeAbrir: boolean;
}

export async function getCampanha(campanhaId: string) {
  const { userId, campanha, papel } = await acesso(campanhaId);
  const ehMestre = papel === 'mestre';
  const agora = new Date();

  const [jogadoresRows, convites, sessoes, ganchos, mestre] = await Promise.all([
    db()
      .select({ userId: campanhaJogadores.userId, characterId: campanhaJogadores.characterId, nome: nomeDoTripulante(campanhaJogadores.userId) })
      .from(campanhaJogadores)
      .where(eq(campanhaJogadores.campanhaId, campanhaId))
      .orderBy(asc(campanhaJogadores.joinedAt)),
    ehMestre
      ? db()
          .select({ userId: campanhaConvites.userId, nome: nomeDoTripulante(campanhaConvites.userId) })
          .from(campanhaConvites)
          .where(eq(campanhaConvites.campanhaId, campanhaId))
      : Promise.resolve([]),
    db().select().from(campanhaSessoes).where(eq(campanhaSessoes.campanhaId, campanhaId)).orderBy(asc(campanhaSessoes.iniciaEm)),
    ehMestre
      ? db().select().from(campanhaGanchos).where(eq(campanhaGanchos.campanhaId, campanhaId)).orderBy(asc(campanhaGanchos.createdAt))
      : Promise.resolve([]),
    db().select({ nome: nomeDoTripulante(campanhas.mestreId) }).from(campanhas).where(eq(campanhas.id, campanhaId)),
  ]);

  const ids = jogadoresRows.map((j) => j.characterId).filter((id): id is string => !!id);
  const comEstado = new Set(
    jogadoresRows.filter((j) => j.characterId && podeVerFicha(papel, userId, j.userId)).map((j) => j.characterId!),
  );
  const fichas = await resumirFichas(ids, comEstado);

  const presencas = sessoes.length
    ? await db()
        .select()
        .from(campanhaPresencas)
        .where(inArray(campanhaPresencas.sessaoId, sessoes.map((s) => s.id)))
    : [];

  const jogadores: JogadorView[] = jogadoresRows.map((j) => ({
    userId: j.userId,
    nome: j.nome,
    eu: j.userId === userId,
    ficha: j.characterId ? (fichas.get(j.characterId) ?? null) : null,
    podeAbrir: !!j.characterId && podeVerFicha(papel, userId, j.userId),
  }));
  const eu = jogadores.find((j) => j.eu);

  const sessoesView = sessoes.map((s) => {
    const respostas = presencas.filter((p) => p.sessaoId === s.id);
    return {
      ...sessaoVisivel(s, papel),
      presencas: jogadores.map((j) => ({
        userId: j.userId,
        nome: j.nome,
        resposta: respostas.find((p) => p.userId === j.userId)?.resposta ?? null,
      })),
      minhaResposta: respostas.find((p) => p.userId === userId)?.resposta ?? null,
    };
  });

  return {
    id: campanha.id,
    nome: campanha.nome,
    sistema: campanha.sistema,
    sinopse: campanha.sinopse,
    status: campanha.status,
    rotina: campanha.rotina,
    cor: campanha.cor,
    papel,
    mestre: mestre[0]?.nome ?? 'Tripulante',
    inviteCode: ehMestre ? campanha.inviteCode : null,
    jogadores,
    convites,
    proximas: sessoesView.filter((s) => s.status === 'marcada' && s.iniciaEm > agora),
    passadas: sessoesView.filter((s) => !(s.status === 'marcada' && s.iniciaEm > agora)).reverse(),
    ganchos: ganchos.map((g) => ({ id: g.id, texto: g.texto, sessaoId: g.sessaoId, resolvido: !!g.resolvidoEm })),
    /** Fichas do usuário que podem ser vinculadas (só para jogador). */
    minhasFichas: eu ? await fichasParaCampanha(userId, campanha.sistema) : [],
    minhaFichaId: eu?.ficha?.id ?? null,
  };
}

/** Ficha completa de um jogador. Só o mestre e o dono abrem; sem as anotações pessoais. */
export async function getFichaDoJogador(campanhaId: string, characterId: string) {
  if (!UUID.test(characterId)) throw new CampanhaNaoEncontrada();
  const { userId, campanha, papel } = await acesso(campanhaId);
  const [vinculo] = await db()
    .select({ userId: campanhaJogadores.userId, nome: nomeDoTripulante(campanhaJogadores.userId) })
    .from(campanhaJogadores)
    .where(and(eq(campanhaJogadores.campanhaId, campanhaId), eq(campanhaJogadores.characterId, characterId)));
  if (!vinculo || !podeVerFicha(papel, userId, vinculo.userId)) throw new CampanhaNaoEncontrada();
  const ficha = await fichaCompleta(characterId);
  if (!ficha) throw new CampanhaNaoEncontrada();
  return { campanha: { id: campanha.id, nome: campanha.nome }, jogador: vinculo.nome, eu: vinculo.userId === userId, ficha };
}

/** O que mostrar na página do link de convite antes de entrar. */
export async function getConvitePorLink(code: string) {
  if (!CODIGO.test(code)) throw new CampanhaNaoEncontrada();
  const userId = await usuarioDaMesa(`/mesa/convite/${code}`);
  const [c] = await db()
    .select({ id: campanhas.id, nome: campanhas.nome, sistema: campanhas.sistema, sinopse: campanhas.sinopse, mestreId: campanhas.mestreId, mestre: nomeDoTripulante(campanhas.mestreId) })
    .from(campanhas)
    .where(eq(campanhas.inviteCode, code));
  if (!c) throw new CampanhaNaoEncontrada();
  const jogadores = await db()
    .select({ userId: campanhaJogadores.userId, nome: nomeDoTripulante(campanhaJogadores.userId) })
    .from(campanhaJogadores)
    .where(eq(campanhaJogadores.campanhaId, c.id));
  return {
    campanhaId: c.id,
    nome: c.nome,
    sistema: c.sistema,
    sinopse: c.sinopse,
    mestre: c.mestre,
    jogadores: jogadores.map((j) => j.nome),
    souMestre: c.mestreId === userId,
    jaEstou: jogadores.some((j) => j.userId === userId),
    fichas: await fichasParaCampanha(userId, c.sistema),
  };
}

// ---------------------------------------------------------------------------
// Escrita: campanha

export async function criarCampanha(raw: Record<string, unknown>): Promise<string> {
  const userId = await usuarioDaMesa();
  const dados = lerCampanha(raw);
  const [c] = await db()
    .insert(campanhas)
    .values({ ...dados, mestreId: userId, inviteCode: novoCodigo() })
    .returning({ id: campanhas.id });
  return c.id;
}

export async function editarCampanha(campanhaId: string, raw: Record<string, unknown>): Promise<void> {
  const { campanha } = await acessoDeMestre(campanhaId, 'editar a campanha');
  const dados = lerCampanha(raw);
  if (dados.sistema !== campanha.sistema) {
    // Fichas de outro sistema deixam de valer: desvincula, o jogador continua na mesa.
    await db()
      .update(campanhaJogadores)
      .set({ characterId: null })
      .where(
        and(
          eq(campanhaJogadores.campanhaId, campanhaId),
          dados.sistema === 'outro' ? sql`false` : sql`character_id in (select id from fichas where sistema <> ${dados.sistema})`,
        ),
      );
  }
  await db().update(campanhas).set(dados).where(eq(campanhas.id, campanhaId));
}

export async function apagarCampanha(campanhaId: string): Promise<void> {
  await acessoDeMestre(campanhaId, 'apagar a campanha');
  await db().delete(campanhas).where(eq(campanhas.id, campanhaId));
}

export async function trocarLink(campanhaId: string): Promise<void> {
  await acessoDeMestre(campanhaId, 'trocar o link');
  await db().update(campanhas).set({ inviteCode: novoCodigo() }).where(eq(campanhas.id, campanhaId));
}

// ---------------------------------------------------------------------------
// Escrita: jogadores

async function adicionarJogador(campanhaId: string, userId: string, characterId: string | null) {
  await db()
    .insert(campanhaJogadores)
    .values({ campanhaId, userId, characterId })
    .onConflictDoUpdate({
      target: [campanhaJogadores.campanhaId, campanhaJogadores.userId],
      // Já estava: só troca a ficha se veio uma.
      set: { characterId: characterId ?? sql`${campanhaJogadores.characterId}` },
    });
  await db().delete(campanhaConvites).where(and(eq(campanhaConvites.campanhaId, campanhaId), eq(campanhaConvites.userId, userId)));
}

/** Entra pelo link. A ficha é opcional e pode ser vinculada depois. */
export async function entrarPorLink(code: unknown, characterId: unknown): Promise<string> {
  if (typeof code !== 'string' || !CODIGO.test(code)) throw new InputError('Convite inválido.');
  const userId = await usuarioDaMesa(`/mesa/convite/${code}`);
  const [c] = await db().select().from(campanhas).where(eq(campanhas.inviteCode, code));
  if (!c) throw new InputError('Esse convite não vale mais. Peça um link novo para o mestre.');
  if (c.mestreId === userId) throw new InputError('Você é o mestre dessa campanha.');
  await adicionarJogador(c.id, userId, await fichaValida(userId, characterId, c.sistema));
  return c.id;
}

/** O mestre chama um tripulante pelo @apelido; ele aceita em /mesa. */
export async function convidarPorApelido(campanhaId: string, raw: unknown): Promise<string> {
  const { campanha } = await acessoDeMestre(campanhaId, 'convidar jogadores');
  const apelido = lerApelido(raw);
  const alvo = await acharPorApelido(apelido);
  if (!alvo) throw new InputError(`Ninguém com o apelido @${apelido}. Confira com a pessoa ou mande o link.`);
  if (alvo.userId === campanha.mestreId) throw new InputError('Esse é você, o mestre.');
  const [ja] = await db()
    .select({ u: campanhaJogadores.userId })
    .from(campanhaJogadores)
    .where(and(eq(campanhaJogadores.campanhaId, campanhaId), eq(campanhaJogadores.userId, alvo.userId)));
  if (ja) throw new InputError(`@${alvo.apelido} já está na campanha.`);
  await db().insert(campanhaConvites).values({ campanhaId, userId: alvo.userId }).onConflictDoNothing();
  return alvo.apelido;
}

export async function cancelarConvite(campanhaId: string, userId: unknown): Promise<void> {
  await acessoDeMestre(campanhaId, 'cancelar convites');
  if (typeof userId !== 'string') return;
  await db().delete(campanhaConvites).where(and(eq(campanhaConvites.campanhaId, campanhaId), eq(campanhaConvites.userId, userId)));
}

async function meuConvite(campanhaId: string) {
  if (!UUID.test(campanhaId)) throw new CampanhaNaoEncontrada();
  const userId = await usuarioDaMesa();
  const [conv] = await db()
    .select({ sistema: campanhas.sistema })
    .from(campanhaConvites)
    .innerJoin(campanhas, eq(campanhas.id, campanhaConvites.campanhaId))
    .where(and(eq(campanhaConvites.campanhaId, campanhaId), eq(campanhaConvites.userId, userId)));
  if (!conv) throw new InputError('Esse convite não existe mais.');
  return { userId, sistema: conv.sistema };
}

export async function aceitarConvite(campanhaId: string, characterId: unknown): Promise<void> {
  const { userId, sistema } = await meuConvite(campanhaId);
  await adicionarJogador(campanhaId, userId, await fichaValida(userId, characterId, sistema));
}

export async function recusarConvite(campanhaId: string): Promise<void> {
  const { userId } = await meuConvite(campanhaId);
  await db().delete(campanhaConvites).where(and(eq(campanhaConvites.campanhaId, campanhaId), eq(campanhaConvites.userId, userId)));
}

/** O jogador troca (ou tira, com null) a ficha que usa na campanha. */
export async function vincularFicha(campanhaId: string, characterId: unknown): Promise<void> {
  const { userId, campanha, papel } = await acesso(campanhaId);
  if (papel !== 'jogador') throw new InputError('Só jogadores vinculam ficha.');
  const id = await fichaValida(userId, characterId, campanha.sistema);
  await db()
    .update(campanhaJogadores)
    .set({ characterId: id })
    .where(and(eq(campanhaJogadores.campanhaId, campanhaId), eq(campanhaJogadores.userId, userId)));
}

export async function sairDaCampanha(campanhaId: string): Promise<void> {
  const { userId, papel } = await acesso(campanhaId);
  if (papel !== 'jogador') throw new InputError('O mestre não sai da própria campanha: apague-a se ela acabou.');
  await removerDaMesa(campanhaId, userId);
}

export async function removerJogador(campanhaId: string, userId: unknown): Promise<void> {
  await acessoDeMestre(campanhaId, 'tirar jogadores');
  if (typeof userId !== 'string') return;
  await removerDaMesa(campanhaId, userId);
}

async function removerDaMesa(campanhaId: string, userId: string) {
  await db().delete(campanhaJogadores).where(and(eq(campanhaJogadores.campanhaId, campanhaId), eq(campanhaJogadores.userId, userId)));
  // As respostas de presença das próximas sessões não valem mais.
  await db()
    .delete(campanhaPresencas)
    .where(
      and(
        eq(campanhaPresencas.userId, userId),
        inArray(
          campanhaPresencas.sessaoId,
          db()
            .select({ id: campanhaSessoes.id })
            .from(campanhaSessoes)
            .where(and(eq(campanhaSessoes.campanhaId, campanhaId), gt(campanhaSessoes.iniciaEm, new Date()))),
        ),
      ),
    );
}
