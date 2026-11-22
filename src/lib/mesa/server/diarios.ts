/**
 * Diário do jogador e estatísticas da campanha.
 * - cada jogador escreve o próprio diário de cada sessão; o mestre lê todos;
 * - os colegas só leem o que o autor marcou para compartilhar.
 */
import 'server-only';
import { and, asc, eq, inArray } from 'drizzle-orm';
import { db } from '@/lib/fichas/db';
import { nomeDoTripulante } from '@/lib/fichas/server/nomes';
import { calcularResumo } from '../regras-estatisticas';
import { LIMITE_DIARIO } from '../regras-recompensas';
import { campanhaDiarioJogador, campanhaJogadores, campanhaPresencas, campanhaSessoes } from '../schema';
import { acesso, InputError } from './acesso';
import { xpAceitoPorJogador } from './recompensas';
import { sessaoDaCampanha } from './sessoes';

export interface DiarioDeJogador {
  userId: string;
  nome: string;
  texto: string;
  compartilhado: boolean;
  atualizadoEm: Date;
  eu: boolean;
}

/** Meu diário e os que posso ler: o mestre lê todos; o jogador lê os compartilhados dos colegas. */
export async function diariosDaSessao(campanhaId: string, sessaoId: string) {
  const { userId, papel } = await acesso(campanhaId);
  await sessaoDaCampanha(campanhaId, sessaoId);
  const rows = await db()
    .select({
      userId: campanhaDiarioJogador.userId,
      nome: nomeDoTripulante(campanhaDiarioJogador.userId),
      texto: campanhaDiarioJogador.texto,
      compartilhado: campanhaDiarioJogador.compartilhado,
      atualizadoEm: campanhaDiarioJogador.updatedAt,
    })
    .from(campanhaDiarioJogador)
    .where(eq(campanhaDiarioJogador.sessaoId, sessaoId))
    .orderBy(asc(campanhaDiarioJogador.updatedAt));
  const todos = rows.map((r): DiarioDeJogador => ({ ...r, eu: r.userId === userId }));
  return {
    meu: todos.find((d) => d.eu) ?? null,
    leitura: todos.filter((d) => !d.eu && (papel === 'mestre' || d.compartilhado)),
  };
}

/** O jogador escreve (ou apaga, deixando em branco) o próprio diário da sessão. */
export async function salvarMeuDiario(campanhaId: string, sessaoId: string, raw: Record<string, unknown>): Promise<void> {
  const { userId, papel } = await acesso(campanhaId);
  if (papel !== 'jogador') throw new InputError('Só os jogadores escrevem diário de jogador.');
  await sessaoDaCampanha(campanhaId, sessaoId);
  const texto = typeof raw.texto === 'string' ? raw.texto.trim() : '';
  if (texto.length > LIMITE_DIARIO) throw new InputError(`Texto com no máximo ${LIMITE_DIARIO} letras.`);
  if (!texto) {
    await db().delete(campanhaDiarioJogador).where(and(eq(campanhaDiarioJogador.sessaoId, sessaoId), eq(campanhaDiarioJogador.userId, userId)));
    return;
  }
  const compartilhado = raw.compartilhado === true;
  await db()
    .insert(campanhaDiarioJogador)
    .values({ sessaoId, userId, texto, compartilhado })
    .onConflictDoUpdate({
      target: [campanhaDiarioJogador.sessaoId, campanhaDiarioJogador.userId],
      set: { texto, compartilhado, updatedAt: new Date() },
    });
}

/** Estatísticas da campanha, para todos da mesa. */
export async function getResumo(campanhaId: string) {
  await acesso(campanhaId);
  const agora = new Date();
  const [sessoes, jogadores, xpPorJogador] = await Promise.all([
    db()
      .select({ id: campanhaSessoes.id, status: campanhaSessoes.status, iniciaEm: campanhaSessoes.iniciaEm, duracaoMin: campanhaSessoes.duracaoMin })
      .from(campanhaSessoes)
      .where(eq(campanhaSessoes.campanhaId, campanhaId)),
    db()
      .select({ userId: campanhaJogadores.userId, nome: nomeDoTripulante(campanhaJogadores.userId) })
      .from(campanhaJogadores)
      .where(eq(campanhaJogadores.campanhaId, campanhaId))
      .orderBy(asc(campanhaJogadores.joinedAt)),
    xpAceitoPorJogador(campanhaId),
  ]);
  const presencas = sessoes.length
    ? await db()
        .select({ sessaoId: campanhaPresencas.sessaoId, userId: campanhaPresencas.userId, compareceu: campanhaPresencas.compareceu })
        .from(campanhaPresencas)
        .where(inArray(campanhaPresencas.sessaoId, sessoes.map((s) => s.id)))
    : [];
  return calcularResumo({ sessoes, jogadores, presencas, xpPorJogador, agora });
}
