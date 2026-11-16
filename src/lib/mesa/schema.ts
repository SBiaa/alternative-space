/**
 * Tabelas da Mesa do Mestre (Neon Postgres, via Drizzle só para as consultas).
 * O SQL que cria as tabelas fica em db/mesa.sql: mudou algo aqui, mude lá também.
 */
import { boolean, index, integer, pgTable, primaryKey, smallint, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { characters } from '@/lib/fichas/db/schema';
import type { CorCampanha, RespostaPresenca, SistemaCampanha, StatusCampanha, StatusSessao } from './regras';

export const campanhas = pgTable(
  'campanhas',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    mestreId: text('mestre_id').notNull(),
    nome: text('nome').notNull(),
    sistema: text('sistema').$type<SistemaCampanha>().notNull().default('outro'),
    sinopse: text('sinopse').notNull().default(''),
    status: text('status').$type<StatusCampanha>().notNull().default('planejando'),
    /** Texto livre: "sábados 19h, quinzenal". */
    rotina: text('rotina').notNull().default(''),
    cor: text('cor').$type<CorCampanha>().notNull().default('laranja'),
    /** Rotina das sessões (db/mesa-agenda.sql). recDia: 0 = segunda ... 6 = domingo; nulo = sem rotina. */
    recDia: smallint('rec_dia'),
    /** HH:MM no horário de Brasília. */
    recHora: text('rec_hora'),
    /** 1 = toda semana, 2 = de quinze em quinze dias. */
    recIntervalo: smallint('rec_intervalo').$type<1 | 2>().notNull().default(1),
    recDuracaoMin: integer('rec_duracao_min').notNull().default(240),
    recLocal: text('rec_local').notNull().default(''),
    /** Início da última sessão que a rotina criou. A rotina só cria datas depois dela. */
    recGeradaAte: timestamp('rec_gerada_ate', { withTimezone: true }),
    /** Código do link de convite. Trocar o código invalida o link antigo. */
    inviteCode: text('invite_code').notNull().unique(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('campanhas_mestre_idx').on(t.mestreId)],
);

/** Quem está na campanha é o jogador; a ficha é opcional. */
export const campanhaJogadores = pgTable(
  'campanha_jogadores',
  {
    campanhaId: uuid('campanha_id')
      .notNull()
      .references(() => campanhas.id, { onDelete: 'cascade' }),
    userId: text('user_id').notNull(),
    characterId: uuid('character_id').references(() => characters.id, { onDelete: 'set null' }),
    joinedAt: timestamp('joined_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.campanhaId, t.userId] }), index('campanha_jogadores_user_idx').on(t.userId)],
);

/** Convites pendentes feitos pelo @apelido. Aceitou ou recusou, a linha some. */
export const campanhaConvites = pgTable(
  'campanha_convites',
  {
    campanhaId: uuid('campanha_id')
      .notNull()
      .references(() => campanhas.id, { onDelete: 'cascade' }),
    userId: text('user_id').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.campanhaId, t.userId] }), index('campanha_convites_user_idx').on(t.userId)],
);

export const campanhaSessoes = pgTable(
  'campanha_sessoes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    campanhaId: uuid('campanha_id')
      .notNull()
      .references(() => campanhas.id, { onDelete: 'cascade' }),
    titulo: text('titulo').notNull().default(''),
    iniciaEm: timestamp('inicia_em', { withTimezone: true }).notNull(),
    duracaoMin: integer('duracao_min').notNull().default(240),
    local: text('local').notNull().default(''),
    pauta: text('pauta').notNull().default(''),
    status: text('status').$type<StatusSessao>().notNull().default('marcada'),
    /** Criada pela rotina da campanha (e não marcada à mão). */
    daRotina: boolean('da_rotina').notNull().default(false),
    /** Para todos da mesa. */
    resumo: text('resumo').notNull().default(''),
    recompensas: text('recompensas').notNull().default(''),
    /** Só o mestre vê. */
    notasMestre: text('notas_mestre').notNull().default(''),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('campanha_sessoes_campanha_idx').on(t.campanhaId, t.iniciaEm),
    index('campanha_sessoes_inicio_idx').on(t.iniciaEm),
  ],
);

export const campanhaPresencas = pgTable(
  'campanha_presencas',
  {
    sessaoId: uuid('sessao_id')
      .notNull()
      .references(() => campanhaSessoes.id, { onDelete: 'cascade' }),
    userId: text('user_id').notNull(),
    resposta: text('resposta').$type<RespostaPresenca>().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.sessaoId, t.userId] })],
);

/** Ganchos em aberto da história. Só o mestre vê. */
export const campanhaGanchos = pgTable(
  'campanha_ganchos',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    campanhaId: uuid('campanha_id')
      .notNull()
      .references(() => campanhas.id, { onDelete: 'cascade' }),
    sessaoId: uuid('sessao_id').references(() => campanhaSessoes.id, { onDelete: 'set null' }),
    texto: text('texto').notNull(),
    resolvidoEm: timestamp('resolvido_em', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('campanha_ganchos_campanha_idx').on(t.campanhaId, t.createdAt)],
);

/** Link assinável do calendário de cada pessoa. Token novo invalida o antigo. */
export const mesaAgendaTokens = pgTable('mesa_agenda_tokens', {
  userId: text('user_id').primaryKey(),
  token: text('token').notNull().unique(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
