// Acesso ao banco do Cartas do Convés (tabelas em db/cartas-do-conves.sql). Só roda no servidor.

import { sql } from "@/lib/db";
import { CONFIG, SLUG } from "./config";
import { favoritaDe } from "./simular";
import type { Acao, Estado, Resumo } from "./tipos";

export type RunSalva = { id: string; seed: string; oficio: string; colecao: string[]; acoes: Acao[] };

const lista = <T>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);

export async function lerRunAtual(userId: string): Promise<RunSalva | null> {
  const [r] = await sql`select id, seed, profession, collection, actions from deck_runs where user_id = ${userId} and result = 'andamento'`;
  return r ? { id: r.id as string, seed: r.seed as string, oficio: r.profession as string, colecao: lista<string>(r.collection), acoes: lista<Acao>(r.actions) } : null;
}

export async function colecaoDe(userId: string): Promise<string[]> {
  const rows = await sql`select card_slug from deck_unlocks where user_id = ${userId} order by unlocked_at`;
  return rows.map((r) => r.card_slug as string);
}

/** Começa uma travessia. Se já havia uma em andamento, ela é descartada (a coleção não perde nada). */
export async function criarRun(userId: string, seed: string, oficio: string, colecao: string[]) {
  await sql.transaction([
    sql`delete from deck_runs where user_id = ${userId} and result = 'andamento'`,
    sql`insert into deck_runs (user_id, seed, profession, collection, state_version)
        values (${userId}, ${seed}, ${oficio}, ${JSON.stringify(colecao)}::jsonb, ${CONFIG.versaoEstado})`,
  ]);
}

export async function abandonarRun(userId: string) {
  await sql`delete from deck_runs where user_id = ${userId} and result = 'andamento'`;
}

/** Guarda o andamento (as ações já conferidas). Só mexe em partida que continua em andamento. */
export async function gravarAndamento(runId: string, userId: string, acoes: Acao[], estado: Estado): Promise<boolean> {
  const r = await sql`
    update deck_runs set actions = ${JSON.stringify(acoes)}::jsonb, state = ${JSON.stringify(estado)}::jsonb,
      floor_reached = ${estado.trechoMax}, updated_at = now()
    where id = ${runId} and user_id = ${userId} and result = 'andamento' returning id`;
  return r.length > 0;
}

const evento = (resumo: Resumo) => JSON.stringify({ jogo: SLUG, resultado: resumo.resultado, trecho: resumo.trecho });

/**
 * Fecha a travessia numa única instrução: grava o resultado, libera as cartas e registra o evento game_played.
 * Só acontece uma vez (a linha precisa estar em andamento), então reenviar não libera nem conta em dobro.
 */
export async function concluirRun(runId: string, userId: string, acoes: Acao[], estado: Estado, resumo: Resumo, cartas: string[]): Promise<boolean> {
  const r = await sql`
    with fim as (
      update deck_runs set actions = ${JSON.stringify(acoes)}::jsonb, state = ${JSON.stringify(estado)}::jsonb, result = ${resumo.resultado},
        floor_reached = ${resumo.trecho}, updated_at = now(), finished_at = now()
      where id = ${runId} and user_id = ${userId} and result = 'andamento' returning id
    ), lib as (
      insert into deck_unlocks (user_id, card_slug, run_id)
      select ${userId}, c, fim.id from fim, unnest(${cartas}::text[]) as c
      on conflict (user_id, card_slug) do nothing
    )
    insert into events (user_id, kind, payload) select ${userId}, 'game_played', ${evento(resumo)}::jsonb from fim returning id`;
  return r.length > 0;
}

/** Migração: a partida local já terminada vira uma linha concluída na conta (também numa instrução só). */
export async function registrarRunTerminada(userId: string, seed: string, oficio: string, acoes: Acao[], estado: Estado, resumo: Resumo, cartas: string[]): Promise<boolean> {
  const r = await sql`
    with nova as (
      insert into deck_runs (user_id, seed, profession, collection, actions, state, state_version, result, floor_reached, finished_at)
      values (${userId}, ${seed}, ${oficio}, '[]'::jsonb, ${JSON.stringify(acoes)}::jsonb, ${JSON.stringify(estado)}::jsonb, ${CONFIG.versaoEstado}, ${resumo.resultado}, ${resumo.trecho}, now())
      on conflict do nothing returning id
    ), lib as (
      insert into deck_unlocks (user_id, card_slug, run_id)
      select ${userId}, c, nova.id from nova, unnest(${cartas}::text[]) as c
      on conflict (user_id, card_slug) do nothing
    )
    insert into events (user_id, kind, payload) select ${userId}, 'game_played', ${evento(resumo)}::jsonb from nova returning id`;
  return r.length > 0;
}

/** Migração de partida local ainda em andamento: vira a travessia em andamento da conta (se não houver outra). */
export async function registrarRunAndamento(userId: string, seed: string, oficio: string, acoes: Acao[], estado: Estado): Promise<boolean> {
  const r = await sql`
    insert into deck_runs (user_id, seed, profession, collection, actions, state, state_version, floor_reached)
    values (${userId}, ${seed}, ${oficio}, '[]'::jsonb, ${JSON.stringify(acoes)}::jsonb, ${JSON.stringify(estado)}::jsonb, ${CONFIG.versaoEstado}, ${estado.trechoMax})
    on conflict do nothing returning id`;
  return r.length > 0;
}

/** Selo da cabine: travessias vencidas e a carta mais jogada nelas. Sem vitória, não há selo. */
export async function seloDe(userId: string): Promise<{ vitorias: number; favorita: string | null } | null> {
  const rows = await sql`select state from deck_runs where user_id = ${userId} and result = 'vitoria' order by finished_at desc limit 100`;
  if (rows.length === 0) return null;
  const jogadas = rows.map((r) => ((r.state as Estado | null)?.jogadas ?? {}) as Record<string, number>);
  return { vitorias: rows.length, favorita: favoritaDe(jogadas) };
}

// ---- LGPD ----
export async function exportarDeck(userId: string) {
  const [partidas, cartas] = await Promise.all([
    sql`select id, seed, profession, collection, actions, state, state_version, result, floor_reached, created_at, updated_at, finished_at from deck_runs where user_id = ${userId} order by created_at`,
    sql`select card_slug, run_id, unlocked_at from deck_unlocks where user_id = ${userId} order by unlocked_at`,
  ]);
  return { partidas, cartas_liberadas: cartas };
}

export async function apagarDeck(userId: string) {
  await sql`delete from deck_runs where user_id = ${userId}`;
  await sql`delete from deck_unlocks where user_id = ${userId}`;
}
