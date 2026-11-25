/**
 * Mesa ao vivo: NPCs, contador de iniciativa e o painel com as fichas dos jogadores.
 * - NPCs e o controle do combate são só do mestre;
 * - o jogador vê a ordem e de quem é a vez, com NPCs só pelo nome (ver `visaoDoJogador`);
 * - a ficha de cada jogador segue a regra da Mesa: só o mestre e o dono veem o estado dela.
 */
import 'server-only';
import { randomUUID } from 'node:crypto';
import { and, asc, eq, sql } from 'drizzle-orm';
import { db } from '@/lib/fichas/db';
import { characters } from '@/lib/fichas/db/schema';
import { nomeDoTripulante } from '@/lib/fichas/server/nomes';
import { normalizeDraft } from '@/lib/fichas/sr5/character';
import { evaluate } from '@/lib/fichas/sr5/rules';
import { FICHA_VAZIA, normalizarFicha } from '@/lib/pathfinder';
import { emJogo } from '@/lib/pathfinder-jogo';
import { podeVerFicha, UUID, type SistemaCampanha } from '../regras';
import {
  adicionar,
  atualizar,
  COMBATE_VAZIO,
  encerrar,
  iniciar,
  lerIniciativa,
  lerParticipantes,
  LIMITE_NOME,
  novaRodada,
  proximoTurno,
  remover,
  rolarIniciativa,
  visaoDoJogador,
  type Combate,
  type MudancaParticipante,
  type Participante,
} from '../regras-combate';
import { dadosDoSistema, lerCopias, lerNpc, MAX_NPCS, nomesDasCopias, type DadosNpc, type TipoNpc } from '../regras-npcs';
import { campanhaCombate, campanhaJogadores, campanhaNpcs } from '../schema';
import { acesso, acessoDeMestre, InputError } from './acesso';
import { resumirFichas, type FichaResumo } from './fichas';

// ---------------------------------------------------------------------------
// NPCs

export interface NpcView {
  id: string;
  nome: string;
  tipo: TipoNpc;
  dados: DadosNpc;
  notas: string;
}

export async function listarNpcs(campanhaId: string): Promise<NpcView[]> {
  const { campanha } = await acessoDeMestre(campanhaId, 'ver os NPCs');
  const rows = await db().select().from(campanhaNpcs).where(eq(campanhaNpcs.campanhaId, campanhaId)).orderBy(asc(campanhaNpcs.createdAt), asc(campanhaNpcs.nome));
  return rows.map((r) => ({ id: r.id, nome: r.nome, tipo: r.tipo, dados: dadosDoSistema(r.dados, campanha.sistema), notas: r.notas }));
}

async function npcDaCampanha(campanhaId: string, npcId: string) {
  if (!UUID.test(npcId)) throw new InputError('NPC não encontrado.');
  const [n] = await db().select().from(campanhaNpcs).where(and(eq(campanhaNpcs.id, npcId), eq(campanhaNpcs.campanhaId, campanhaId)));
  if (!n) throw new InputError('NPC não encontrado.');
  return n;
}

async function contarNpcs(campanhaId: string): Promise<number> {
  const [r] = await db().select({ n: sql<number>`count(*)::int` }).from(campanhaNpcs).where(eq(campanhaNpcs.campanhaId, campanhaId));
  return r?.n ?? 0;
}

export async function criarNpc(campanhaId: string, raw: Record<string, unknown>): Promise<void> {
  const { campanha } = await acessoDeMestre(campanhaId, 'criar NPCs');
  const dados = lerNpc(raw, campanha.sistema);
  if ((await contarNpcs(campanhaId)) >= MAX_NPCS) throw new InputError(`No máximo ${MAX_NPCS} NPCs por campanha.`);
  await db().insert(campanhaNpcs).values({ campanhaId, ...dados });
}

export async function editarNpc(campanhaId: string, npcId: string, raw: Record<string, unknown>): Promise<void> {
  const { campanha } = await acessoDeMestre(campanhaId, 'editar NPCs');
  await npcDaCampanha(campanhaId, npcId);
  const dados = lerNpc(raw, campanha.sistema);
  await db().update(campanhaNpcs).set(dados).where(eq(campanhaNpcs.id, npcId));
}

/** "3 seguranças": cria cópias numeradas do NPC. */
export async function duplicarNpc(campanhaId: string, npcId: string, copias: unknown): Promise<number> {
  await acessoDeMestre(campanhaId, 'duplicar NPCs');
  const n = lerCopias(copias);
  const orig = await npcDaCampanha(campanhaId, npcId);
  if ((await contarNpcs(campanhaId)) + n > MAX_NPCS) throw new InputError(`No máximo ${MAX_NPCS} NPCs por campanha.`);
  await db()
    .insert(campanhaNpcs)
    .values(nomesDasCopias(orig.nome, n).map((nome) => ({ campanhaId, nome, tipo: orig.tipo, dados: orig.dados, notas: orig.notas })));
  return n;
}

export async function apagarNpc(campanhaId: string, npcId: string): Promise<void> {
  await acessoDeMestre(campanhaId, 'apagar NPCs');
  await npcDaCampanha(campanhaId, npcId);
  await db().delete(campanhaNpcs).where(eq(campanhaNpcs.id, npcId));
}

// ---------------------------------------------------------------------------
// Combate

async function lerCombate(campanhaId: string): Promise<{ c: Combate; versao: Date | null }> {
  const [r] = await db().select().from(campanhaCombate).where(eq(campanhaCombate.campanhaId, campanhaId));
  if (!r) return { c: COMBATE_VAZIO, versao: null };
  return {
    c: { ativo: r.ativo, rodada: r.rodada, passe: r.passe, turnoId: r.turnoId, participantes: lerParticipantes(r.participantes) },
    versao: r.updatedAt,
  };
}

/**
 * Lê o combate, aplica a mudança e grava só se ninguém gravou no meio (o mestre pode ter duas abas).
 * Devolve o combate novo.
 */
async function mutarCombate(campanhaId: string, fn: (c: Combate) => Combate | Promise<Combate>): Promise<Combate> {
  for (let tentativa = 0; tentativa < 4; tentativa++) {
    const { c, versao } = await lerCombate(campanhaId);
    const novo = await fn(c);
    const valores = {
      ativo: novo.ativo,
      rodada: novo.rodada,
      passe: novo.passe,
      turnoId: novo.turnoId,
      participantes: novo.participantes,
      updatedAt: new Date(),
    };
    if (!versao) {
      const [criou] = await db().insert(campanhaCombate).values({ campanhaId, ...valores }).onConflictDoNothing().returning({ id: campanhaCombate.campanhaId });
      if (criou) return novo;
      continue;
    }
    const [gravou] = await db()
      .update(campanhaCombate)
      .set(valores)
      .where(
        and(
          eq(campanhaCombate.campanhaId, campanhaId),
          // O banco guarda microssegundos e o Date só milissegundos: compara cortando no milissegundo.
          sql`date_trunc('milliseconds', ${campanhaCombate.updatedAt}) = ${versao}`,
        ),
      )
      .returning({ id: campanhaCombate.campanhaId });
    if (gravou) return novo;
  }
  throw new InputError('O combate mudou enquanto salvava. Tente de novo.');
}

/** Iniciativa sugerida a partir da ficha do jogador (rolada). Sem ficha ou sem sistema conhecido: 0, o mestre digita. */
async function iniciativaDoJogador(characterId: string | null, sistema: SistemaCampanha): Promise<number> {
  if (!characterId || sistema === 'outro') return 0;
  const [f] = await db().select({ draft: characters.draft, sistema: characters.system }).from(characters).where(eq(characters.id, characterId));
  if (!f || f.sistema !== sistema) return 0;
  if (sistema === 'sr5') {
    const { initiative } = evaluate(normalizeDraft(f.draft)).derived;
    return rolarIniciativa('sr5', initiative.base, initiative.dice);
  }
  return rolarIniciativa('pf2e', emJogo(normalizarFicha(f.draft) ?? FICHA_VAZIA).percepcao, 0);
}

const novoParticipante = (p: Omit<Participante, 'id'>): Participante => ({ id: randomUUID(), ...p });

export async function adicionarJogadorAoCombate(campanhaId: string, userId: unknown): Promise<void> {
  const { campanha } = await acessoDeMestre(campanhaId, 'mexer no combate');
  if (typeof userId !== 'string') throw new InputError('Escolha o jogador.');
  const [j] = await db()
    .select({ userId: campanhaJogadores.userId, characterId: campanhaJogadores.characterId, nome: nomeDoTripulante(campanhaJogadores.userId) })
    .from(campanhaJogadores)
    .where(and(eq(campanhaJogadores.campanhaId, campanhaId), eq(campanhaJogadores.userId, userId)));
  if (!j) throw new InputError('Esse jogador não está na campanha.');
  const iniciativa = await iniciativaDoJogador(j.characterId, campanha.sistema);
  await mutarCombate(campanhaId, (c) =>
    adicionar(c, novoParticipante({ tipo: 'jogador', refId: j.userId, nome: (j.nome || 'Jogador').slice(0, LIMITE_NOME), iniciativa, dano: 0, max: 0, atordoamento: 0, maxAtord: 0, condicoes: '', fora: false })),
  );
}

export async function adicionarNpcAoCombate(campanhaId: string, npcId: string, quantidade: unknown = 1): Promise<number> {
  const { campanha } = await acessoDeMestre(campanhaId, 'mexer no combate');
  const qtd = lerCopias(quantidade);
  const npc = await npcDaCampanha(campanhaId, npcId);
  const d = dadosDoSistema(npc.dados, campanha.sistema);
  const sistema = campanha.sistema;
  await mutarCombate(campanhaId, (c) => {
    let atual = c;
    for (let i = 0; i < qtd; i++) {
      const iniciativa =
        sistema === 'sr5'
          ? rolarIniciativa('sr5', Number(d.iniciativaBase), Number(d.dados))
          : rolarIniciativa(sistema, Number(sistema === 'pf2e' ? d.percepcao : d.iniciativaMod), 0);
      atual = adicionar(
        atual,
        novoParticipante({
          tipo: 'npc',
          refId: npc.id,
          nome: npc.nome,
          iniciativa,
          dano: 0,
          max: Number(sistema === 'sr5' ? d.fisico : d.pvMax),
          atordoamento: 0,
          maxAtord: sistema === 'sr5' ? Number(d.atordoamento) : 0,
          condicoes: '',
          fora: false,
        }),
      );
    }
    return atual;
  });
  return qtd;
}

export async function adicionarAvulsoAoCombate(campanhaId: string, nome: unknown, iniciativa: unknown): Promise<void> {
  await acessoDeMestre(campanhaId, 'mexer no combate');
  const n = typeof nome === 'string' ? nome.trim() : '';
  if (!n) throw new InputError('Dê um nome.');
  if (n.length > LIMITE_NOME) throw new InputError(`Nome com no máximo ${LIMITE_NOME} letras.`);
  const ini = lerIniciativa(iniciativa === '' || iniciativa == null ? 0 : iniciativa);
  await mutarCombate(campanhaId, (c) =>
    adicionar(c, novoParticipante({ tipo: 'avulso', refId: null, nome: n, iniciativa: ini, dano: 0, max: 0, atordoamento: 0, maxAtord: 0, condicoes: '', fora: false })),
  );
}

export async function iniciarCombate(campanhaId: string): Promise<void> {
  const { campanha } = await acessoDeMestre(campanhaId, 'começar o combate');
  await mutarCombate(campanhaId, (c) => iniciar(c, campanha.sistema));
}

export async function proximoDoCombate(campanhaId: string): Promise<void> {
  const { campanha } = await acessoDeMestre(campanhaId, 'mexer no combate');
  await mutarCombate(campanhaId, (c) => proximoTurno(c, campanha.sistema));
}

export async function novaRodadaDoCombate(campanhaId: string): Promise<void> {
  const { campanha } = await acessoDeMestre(campanhaId, 'mexer no combate');
  await mutarCombate(campanhaId, (c) => {
    if (!c.ativo) throw new InputError('O combate não começou.');
    return novaRodada(c, campanha.sistema);
  });
}

/** Termina o combate e tira todo mundo da lista. */
export async function encerrarCombate(campanhaId: string): Promise<void> {
  await acessoDeMestre(campanhaId, 'encerrar o combate');
  await mutarCombate(campanhaId, (c) => ({ ...encerrar(c), participantes: [] }));
}

export async function tirarDoCombate(campanhaId: string, participanteId: string): Promise<void> {
  const { campanha } = await acessoDeMestre(campanhaId, 'mexer no combate');
  await mutarCombate(campanhaId, (c) => remover(c, participanteId, campanha.sistema));
}

export async function mudarParticipante(campanhaId: string, participanteId: string, mudanca: MudancaParticipante): Promise<void> {
  await acessoDeMestre(campanhaId, 'mexer no combate');
  await mutarCombate(campanhaId, (c) => atualizar(c, participanteId, mudanca));
}

/** Rola de novo a iniciativa de todos os NPCs (no Shadowrun, a cada rodada). Jogadores ficam como estão. */
export async function rolarNpcsDoCombate(campanhaId: string): Promise<void> {
  const { campanha } = await acessoDeMestre(campanhaId, 'mexer no combate');
  const sistema = campanha.sistema;
  const npcs = await db().select().from(campanhaNpcs).where(eq(campanhaNpcs.campanhaId, campanhaId));
  const dados = new Map(npcs.map((n) => [n.id, dadosDoSistema(n.dados, sistema)]));
  await mutarCombate(campanhaId, (c) => ({
    ...c,
    participantes: c.participantes.map((p) => {
      const d = p.refId ? dados.get(p.refId) : undefined;
      if (p.tipo !== 'npc' || !d) return p;
      const ini =
        sistema === 'sr5'
          ? rolarIniciativa('sr5', Number(d.iniciativaBase), Number(d.dados))
          : rolarIniciativa(sistema, Number(sistema === 'pf2e' ? d.percepcao : d.iniciativaMod), 0);
      return { ...p, iniciativa: ini };
    }),
  }));
}

// ---------------------------------------------------------------------------
// Painel

export interface JogadorAoVivo {
  userId: string;
  nome: string;
  eu: boolean;
  ficha: FichaResumo | null;
}

/** Tudo que o painel mostra. O mestre vê o estado de todas as fichas; o jogador só o da própria. */
export async function getAoVivo(campanhaId: string) {
  const { userId, campanha, papel } = await acesso(campanhaId);
  const [jogadoresRows, combate] = await Promise.all([
    db()
      .select({ userId: campanhaJogadores.userId, characterId: campanhaJogadores.characterId, nome: nomeDoTripulante(campanhaJogadores.userId) })
      .from(campanhaJogadores)
      .where(eq(campanhaJogadores.campanhaId, campanhaId))
      .orderBy(asc(campanhaJogadores.joinedAt)),
    lerCombate(campanhaId),
  ]);
  const ids = jogadoresRows.map((j) => j.characterId).filter((id): id is string => !!id);
  const comEstado = new Set(jogadoresRows.filter((j) => j.characterId && podeVerFicha(papel, userId, j.userId)).map((j) => j.characterId!));
  const fichas = await resumirFichas(ids, comEstado);
  const jogadores: JogadorAoVivo[] = jogadoresRows.map((j) => ({
    userId: j.userId,
    nome: j.nome,
    eu: j.userId === userId,
    ficha: j.characterId ? (fichas.get(j.characterId) ?? null) : null,
  }));
  return {
    campanha: { id: campanha.id, nome: campanha.nome, cor: campanha.cor, sistema: campanha.sistema },
    papel,
    jogadores,
    combate: papel === 'mestre' ? combate.c : visaoDoJogador(combate.c),
    npcs: papel === 'mestre' ? await listarNpcs(campanhaId) : [],
  };
}
