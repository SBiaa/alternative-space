/**
 * Tabelas das fichas (Neon Postgres, via Drizzle só para as consultas).
 * O SQL que cria as tabelas fica em db/fichas.sql: mudou algo aqui, mude lá também.
 * O usuário é o do Neon Auth (mesmo id de quiz_results e perfis); não há tabela própria.
 */
import { date, index, integer, jsonb, pgTable, primaryKey, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import type { CharacterDraft } from '@/lib/fichas/sr5/character';
import type { GoalTarget } from '@/lib/fichas/sr5/goals';

/** Ficha. O conteúdo é o `CharacterDraft` inteiro, igual ao export JSON. */
export const characters = pgTable(
  'fichas',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    ownerId: text('user_id').notNull(),
    /** Sistema de jogo. Por enquanto só 'sr5'; o conteúdo de `draft` depende dele. */
    system: text('sistema').notNull().default('sr5'),
    name: text('name').notNull().default(''),
    status: text('status', { enum: ['draft', 'active', 'retired'] }).notNull().default('draft'),
    draft: jsonb('draft').$type<CharacterDraft>().notNull(),
    schemaVersion: integer('schema_version').notNull(),
    /** Passo do assistente em que o jogador parou. */
    step: integer('step').notNull().default(0),
    /** Em jogo: dano marcado nos monitores. */
    physicalDamage: integer('physical_damage').notNull().default(0),
    stunDamage: integer('stun_damage').notNull().default(0),
    /** Em jogo: anotações livres do jogador. */
    playNotes: text('play_notes').notNull().default(''),
    /** Quando a criação foi finalizada (status passou a 'active'). */
    activatedAt: timestamp('activated_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('fichas_user_idx').on(t.ownerId)],
);

/**
 * Histórico de nuyen e karma. O saldo é a soma; nada é editado, só lançado.
 * Ex.: +5000 nuyen "Pagamento da missão X", -1200 nuyen "Munição".
 */
export const ledger = pgTable(
  'ficha_lancamentos',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    characterId: uuid('character_id')
      .notNull()
      .references(() => characters.id, { onDelete: 'cascade' }),
    kind: text('kind', { enum: ['nuyen', 'karma'] }).notNull(),
    amount: integer('amount').notNull(),
    reason: text('reason').notNull(),
    missionId: uuid('mission_id').references(() => missions.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('ficha_lancamentos_ficha_idx').on(t.characterId, t.createdAt)],
);

/** Diário de missões/sessões de um personagem. */
export const missions = pgTable(
  'ficha_missoes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    characterId: uuid('character_id')
      .notNull()
      .references(() => characters.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    status: text('status', { enum: ['planned', 'active', 'done'] }).notNull().default('active'),
    /** O que aconteceu, ganchos em aberto, NPCs. */
    notes: text('notes').notNull().default(''),
    playedOn: date('played_on'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('ficha_missoes_ficha_idx').on(t.characterId)],
);

/**
 * Metas do personagem (planejamento). `target` diz o que a meta pede
 * (ex.: { kind: 'attribute', attr: 'AGI', rating: 6 }); ver `lib/sr5/goals.ts`.
 */
export const goals = pgTable(
  'ficha_metas',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    characterId: uuid('character_id')
      .notNull()
      .references(() => characters.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    notes: text('notes').notNull().default(''),
    target: jsonb('target').$type<GoalTarget>().notNull(),
    status: text('status', { enum: ['active', 'done', 'dropped'] }).notNull().default('active'),
    /** Ordem de prioridade (menor = mais importante). */
    position: integer('position').notNull().default(0),
    /** Quanto foi lançado no histórico ao concluir (se foi). */
    paid: integer('paid'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp('completed_at', { withTimezone: true }),
  },
  (t) => [index('ficha_metas_ficha_idx').on(t.characterId, t.position)],
);

/** Time de jogadores. Quem tem o link de convite entra com uma ficha. */
export const teams = pgTable('ficha_times', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  ownerId: text('user_id').notNull(),
  /** Código do link de convite. Trocar o código invalida o link antigo. */
  inviteCode: text('invite_code').notNull().unique(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

/** Quem está no time é a ficha, não o jogador. Uma ficha pode estar em vários times. */
export const teamMembers = pgTable(
  'ficha_time_membros',
  {
    teamId: uuid('team_id')
      .notNull()
      .references(() => teams.id, { onDelete: 'cascade' }),
    characterId: uuid('character_id')
      .notNull()
      .references(() => characters.id, { onDelete: 'cascade' }),
    joinedAt: timestamp('joined_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.teamId, t.characterId] }), index('ficha_time_membros_ficha_idx').on(t.characterId)],
);
