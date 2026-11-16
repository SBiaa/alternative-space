/**
 * Agenda da Mesa: rotina que cria as sessões, link assinável do calendário e lembretes das próximas sessões.
 * Regras de acesso em ./acesso.ts; contas de data em ../regras-agenda.ts.
 */
import 'server-only';
import { randomBytes } from 'node:crypto';
import { and, asc, eq, gt, gte, inArray, isNotNull, isNull, lt, lte, or, sql } from 'drizzle-orm';
import { db } from '@/lib/fichas/db';
import { eventoDeSessao, type EventoIcs } from '../ics';
import { dataLocal, type RespostaPresenca } from '../regras';
import { iniciosDaRotina, lerRotina, precisaRenovar, textoDaRotina, type Rotina } from '../regras-agenda';
import { campanhaPresencas, campanhas, campanhaSessoes, mesaAgendaTokens } from '../schema';
import { acessoDeMestre, usuarioDaMesa } from './acesso';

type CampanhaRow = typeof campanhas.$inferSelect;

/** A rotina gravada na campanha, ou null se ela não tem. */
export function rotinaDaCampanha(c: Pick<CampanhaRow, 'recDia' | 'recHora' | 'recIntervalo' | 'recDuracaoMin' | 'recLocal'>): Rotina | null {
  if (c.recDia === null || !c.recHora) return null;
  return { dia: c.recDia, hora: c.recHora, intervalo: c.recIntervalo, duracaoMin: c.recDuracaoMin, local: c.recLocal };
}

// ---------------------------------------------------------------------------
// Rotina das sessões

/**
 * Cria as sessões que a rotina ainda não criou (até seis semanas à frente). Pode rodar à vontade:
 * só olha para datas depois da última já criada, então uma sessão apagada pelo mestre não volta,
 * e o índice único de db/mesa-agenda.sql segura duas pessoas abrindo a campanha ao mesmo tempo.
 */
export async function garantirSessoesDaRotina(c: CampanhaRow, agora = new Date()): Promise<void> {
  const rotina = rotinaDaCampanha(c);
  if (!rotina || !precisaRenovar(c.recGeradaAte, agora)) return;
  const inicios = iniciosDaRotina(rotina, dataLocal(agora), c.recGeradaAte ? dataLocal(c.recGeradaAte) : null, agora);
  if (!inicios.length) return;
  const ultimo = inicios[inicios.length - 1];
  await db()
    .insert(campanhaSessoes)
    .values(inicios.map((iniciaEm) => ({ campanhaId: c.id, iniciaEm, duracaoMin: rotina.duracaoMin, local: rotina.local, daRotina: true })))
    .onConflictDoNothing();
  await db()
    .update(campanhas)
    .set({ recGeradaAte: ultimo })
    .where(and(eq(campanhas.id, c.id), or(isNull(campanhas.recGeradaAte), lt(campanhas.recGeradaAte, ultimo))));
}

/** Põe em dia a rotina de todas as campanhas do usuário (como mestre ou jogador). */
export async function garantirRotinasDoUsuario(userId: string, agora = new Date()): Promise<void> {
  const rows = await db()
    .select()
    .from(campanhas)
    .where(
      and(
        isNotNull(campanhas.recDia),
        or(
          eq(campanhas.mestreId, userId),
          sql`exists (select 1 from campanha_jogadores j where j.campanha_id = campanhas.id and j.user_id = ${userId})`,
        ),
      ),
    );
  await Promise.all(rows.map((c) => garantirSessoesDaRotina(c, agora)));
}

/**
 * O mestre liga, troca ou desliga a rotina. Trocar dia, hora ou intervalo apaga as sessões geradas por ela que
 * ainda não aconteceram e ninguém mexeu (sem título editado, pauta, diário...) e cria de novo no ritmo novo.
 */
export async function salvarRotina(campanhaId: string, raw: Record<string, unknown>): Promise<void> {
  const { campanha } = await acessoDeMestre(campanhaId, 'mudar a rotina');
  const rotina = lerRotina(raw);
  if (!rotina) {
    await db()
      .update(campanhas)
      .set({ recDia: null, recHora: null, recGeradaAte: null, ...(campanha.recDia !== null ? { rotina: '' } : {}) })
      .where(eq(campanhas.id, campanhaId));
    return;
  }
  const mudouRitmo = campanha.recDia !== rotina.dia || campanha.recHora !== rotina.hora || campanha.recIntervalo !== rotina.intervalo;
  const [nova] = await db()
    .update(campanhas)
    .set({
      recDia: rotina.dia,
      recHora: rotina.hora,
      recIntervalo: rotina.intervalo,
      recDuracaoMin: rotina.duracaoMin,
      recLocal: rotina.local,
      rotina: textoDaRotina(rotina),
      ...(mudouRitmo ? { recGeradaAte: null } : {}),
    })
    .where(eq(campanhas.id, campanhaId))
    .returning();
  const geradasQueNinguemMexeu = and(
    eq(campanhaSessoes.campanhaId, campanhaId),
    eq(campanhaSessoes.daRotina, true),
    eq(campanhaSessoes.status, 'marcada'),
    gt(campanhaSessoes.iniciaEm, new Date()),
    sql`updated_at = created_at`,
  );
  if (mudouRitmo) await db().delete(campanhaSessoes).where(geradasQueNinguemMexeu);
  else await db().update(campanhaSessoes).set({ duracaoMin: rotina.duracaoMin, local: rotina.local }).where(geradasQueNinguemMexeu);
  await garantirSessoesDaRotina(nova);
}

// ---------------------------------------------------------------------------
// Link assinável do calendário

export const TOKEN_AGENDA = /^[A-Za-z0-9_-]{32}$/;
const novoToken = () => randomBytes(24).toString('base64url'); // 32 caracteres

/** O token atual da pessoa, ou null se ela ainda não ativou o link. */
export async function tokenDaAgenda(): Promise<string | null> {
  const userId = await usuarioDaMesa('/mesa/calendario');
  const [t] = await db().select({ token: mesaAgendaTokens.token }).from(mesaAgendaTokens).where(eq(mesaAgendaTokens.userId, userId));
  return t?.token ?? null;
}

/** Ativa o link ou troca por um novo (o antigo deixa de funcionar). */
export async function gerarTokenDaAgenda(): Promise<void> {
  const userId = await usuarioDaMesa('/mesa/calendario');
  const token = novoToken();
  await db()
    .insert(mesaAgendaTokens)
    .values({ userId, token })
    .onConflictDoUpdate({ target: mesaAgendaTokens.userId, set: { token, createdAt: new Date() } });
}

/**
 * O calendário de quem tem este token: sessões dos últimos 30 dias até daqui a um ano, de todas as campanhas
 * (como mestre ou jogador). Só o que os jogadores já veem: a pauta, nunca as notas do mestre.
 * Devolve null se o token não existe.
 */
export async function eventosDaAgenda(token: string, origem: string): Promise<EventoIcs[] | null> {
  if (!TOKEN_AGENDA.test(token)) return null;
  const [t] = await db().select({ userId: mesaAgendaTokens.userId }).from(mesaAgendaTokens).where(eq(mesaAgendaTokens.token, token));
  if (!t) return null;
  const userId = t.userId;
  const agora = Date.now();
  const rows = await db()
    .select({
      id: campanhaSessoes.id,
      campanhaId: campanhas.id,
      campanha: campanhas.nome,
      titulo: campanhaSessoes.titulo,
      iniciaEm: campanhaSessoes.iniciaEm,
      duracaoMin: campanhaSessoes.duracaoMin,
      local: campanhaSessoes.local,
      pauta: campanhaSessoes.pauta,
      status: campanhaSessoes.status,
      updatedAt: campanhaSessoes.updatedAt,
    })
    .from(campanhaSessoes)
    .innerJoin(campanhas, eq(campanhas.id, campanhaSessoes.campanhaId))
    .where(
      and(
        gte(campanhaSessoes.iniciaEm, new Date(agora - 30 * 86_400_000)),
        lt(campanhaSessoes.iniciaEm, new Date(agora + 365 * 86_400_000)),
        or(
          eq(campanhas.mestreId, userId),
          sql`exists (select 1 from campanha_jogadores j where j.campanha_id = campanhas.id and j.user_id = ${userId})`,
        ),
      ),
    )
    .orderBy(asc(campanhaSessoes.iniciaEm))
    .limit(500);
  return rows.map((r) => eventoDeSessao(r, r.campanha, `${origem}/mesa/${r.campanhaId}/sessoes/${r.id}`));
}

// ---------------------------------------------------------------------------
// Lembretes no site

export interface LembreteSessao {
  id: string;
  campanhaId: string;
  campanha: string;
  cor: CampanhaRow['cor'];
  titulo: string;
  iniciaEm: Date;
  local: string;
  souMestre: boolean;
  minhaResposta: RespostaPresenca | null;
}

/** Sessões marcadas que começam nas próximas `horas` horas, nas campanhas do usuário. */
export async function lembretesDeSessao(horas = 36): Promise<LembreteSessao[]> {
  const userId = await usuarioDaMesa('/mesa');
  const agora = Date.now();
  const rows = await db()
    .select({
      id: campanhaSessoes.id,
      campanhaId: campanhas.id,
      campanha: campanhas.nome,
      cor: campanhas.cor,
      mestreId: campanhas.mestreId,
      titulo: campanhaSessoes.titulo,
      iniciaEm: campanhaSessoes.iniciaEm,
      local: campanhaSessoes.local,
    })
    .from(campanhaSessoes)
    .innerJoin(campanhas, eq(campanhas.id, campanhaSessoes.campanhaId))
    .where(
      and(
        eq(campanhaSessoes.status, 'marcada'),
        gt(campanhaSessoes.iniciaEm, new Date(agora)),
        lte(campanhaSessoes.iniciaEm, new Date(agora + horas * 3_600_000)),
        or(
          eq(campanhas.mestreId, userId),
          sql`exists (select 1 from campanha_jogadores j where j.campanha_id = campanhas.id and j.user_id = ${userId})`,
        ),
      ),
    )
    .orderBy(asc(campanhaSessoes.iniciaEm));
  if (!rows.length) return [];
  const respostas = await db()
    .select({ sessaoId: campanhaPresencas.sessaoId, resposta: campanhaPresencas.resposta })
    .from(campanhaPresencas)
    .where(and(eq(campanhaPresencas.userId, userId), inArray(campanhaPresencas.sessaoId, rows.map((r) => r.id))));
  return rows.map(({ mestreId, ...r }) => ({
    ...r,
    souMestre: mestreId === userId,
    minhaResposta: respostas.find((p) => p.sessaoId === r.id)?.resposta ?? null,
  }));
}
