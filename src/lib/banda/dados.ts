// Acesso ao banco da banda. Toda gravação confere a versão que o servidor leu (state_version) no próprio UPDATE,
// então duas ações ao mesmo tempo não passam as duas. Só roda no servidor.

import { sql } from "@/lib/db";
import { BANDA } from "./config";
import { migrar } from "./save";
import { maiorPalco } from "./show";
import type { Equipamento, Integrante, Logo, Musica, Progresso, RegistroShow } from "./tipos";

const JOGO = "banda-de-garagem";
type Linha = Record<string, unknown>;
const json = (v: unknown) => JSON.stringify(v);

export type BandaSalva = { id: string; versao: number; prog: Progresso };

export async function lerBanda(userId: string): Promise<BandaSalva | null> {
  const [t] = await sql`select * from band_saves where user_id = ${userId}`;
  if (!t) return null;
  const [musicas, shows] = await Promise.all([
    sql`select slot, title, structure, mood, bpm, theme, score from band_songs where save_id = ${t.id} order by slot`,
    sql`select week, venue_slug, setlist, audience, payout, fame_delta, moments, score, energy from band_shows where save_id = ${t.id} order by week desc limit ${BANDA.historicoShowsLocal}`,
  ]);
  const prog = migrar({
    v: Number(t.schema_version),
    nome: String(t.name),
    estilo: String(t.style),
    logo: t.logo as Logo,
    dinheiro: Number(t.money),
    fama: Number(t.fame),
    entrosamento: Number(t.chemistry),
    semana: Number(t.week),
    dia: Number(t.day),
    agenda: t.agenda,
    divulgacao: Number(t.promo),
    demo: Boolean(t.demo_recorded),
    seed: String(t.seed),
    membros: t.members as Integrante[],
    equipamento: t.gear as Equipamento,
    musicas: musicas.map((m: Linha): Musica => {
      const { semana, ...estrutura } = (m.structure ?? {}) as { id: string; secoes: Musica["estrutura"]["secoes"]; semana?: number };
      return { slot: Number(m.slot), titulo: String(m.title), estrutura, clima: String(m.mood), bpm: Number(m.bpm), tema: String(m.theme), nota: Number(m.score), semana: Number(semana ?? 1) };
    }),
    shows: shows
      .map((s: Linha): RegistroShow => ({
        semana: Number(s.week), palco: String(s.venue_slug), repertorio: s.setlist as number[], publico: Number(s.audience), cache: Number(s.payout),
        famaDelta: Number(s.fame_delta), nota: Number(s.score), energia: Number(s.energy), momentos: s.moments as string[],
      }))
      .reverse(),
  });
  return prog ? { id: String(t.id), versao: Number(t.state_version), prog } : null;
}

/** A semana em que a música foi composta fica dentro de structure (a tabela não tem coluna pra isso). */
const estruturaComSemana = (m: Musica) => ({ ...m.estrutura, semana: m.semana });

/** Cria a banda (ou a refaz inteira, no caso da migração do save local). */
export async function gravarBandaInteira(userId: string, p: Progresso): Promise<void> {
  const [t] = await sql`
    insert into band_saves (user_id, name, style, logo, money, fame, chemistry, week, day, agenda, promo, demo_recorded, seed, members, gear, schema_version)
    values (${userId}, ${p.nome}, ${p.estilo}, ${json(p.logo)}::jsonb, ${p.dinheiro}, ${p.fama}, ${p.entrosamento}, ${p.semana}, ${p.dia},
      ${json(p.agenda)}::jsonb, ${p.divulgacao}, ${p.demo}, ${p.seed}, ${json(p.membros)}::jsonb, ${json(p.equipamento)}::jsonb, ${BANDA.versaoSave})
    on conflict (user_id) do update set name = excluded.name, style = excluded.style, logo = excluded.logo, money = excluded.money, fame = excluded.fame,
      chemistry = excluded.chemistry, week = excluded.week, day = excluded.day, agenda = excluded.agenda, promo = excluded.promo,
      demo_recorded = excluded.demo_recorded, seed = excluded.seed, members = excluded.members, gear = excluded.gear,
      schema_version = excluded.schema_version, state_version = band_saves.state_version + 1, updated_at = now()
    returning id`;
  await sql.transaction([
    sql`delete from band_songs where save_id = ${t.id}`,
    sql`delete from band_shows where save_id = ${t.id}`,
    ...p.musicas.map(
      (m) => sql`insert into band_songs (save_id, slot, title, structure, mood, bpm, theme, score)
        values (${t.id}, ${m.slot}, ${m.titulo}, ${json(estruturaComSemana(m))}::jsonb, ${m.clima}, ${m.bpm}, ${m.tema}, ${m.nota})`,
    ),
    ...p.shows.map(
      (s) => sql`insert into band_shows (save_id, week, venue_slug, setlist, audience, payout, fame_delta, moments, score, energy)
        values (${t.id}, ${s.semana}, ${s.palco}, ${json(s.repertorio)}::jsonb, ${s.publico}, ${s.cache}, ${s.famaDelta}, ${json(s.momentos)}::jsonb, ${s.nota}, ${s.energia})`,
    ),
  ]);
}

export type Extras = {
  musica?: Musica;
  registro?: RegistroShow;
  evento?: { kind: "game_played" | "band_song_composed"; payload: Record<string, unknown> };
};

/**
 * Grava um passo do jogo (um dia, um show, uma demo, um conserto) de uma vez: o estado novo, a música ou o show
 * criados e o evento. Só grava se a versão do banco ainda é a que o servidor leu. Devolve false se perdeu a corrida.
 */
export async function gravarPasso(userId: string, saveId: string, versao: number, p: Progresso, extras: Extras = {}): Promise<boolean> {
  const m = extras.musica;
  const s = extras.registro;
  const e = extras.evento;
  const [res] = await sql`
    with up as (
      update band_saves set money = ${p.dinheiro}, fame = ${p.fama}, chemistry = ${p.entrosamento}, week = ${p.semana}, day = ${p.dia},
        agenda = ${json(p.agenda)}::jsonb, promo = ${p.divulgacao}, demo_recorded = ${p.demo}, members = ${json(p.membros)}::jsonb,
        gear = ${json(p.equipamento)}::jsonb, state_version = state_version + 1, updated_at = now()
      where id = ${saveId} and user_id = ${userId} and state_version = ${versao}
      returning id
    ), song as (
      insert into band_songs (save_id, slot, title, structure, mood, bpm, theme, score)
      select ${saveId}, ${m?.slot ?? 1}, ${m?.titulo ?? ""}, ${json(m ? estruturaComSemana(m) : {})}::jsonb, ${m?.clima ?? ""}, ${m?.bpm ?? 60}, ${m?.tema ?? ""}, ${m?.nota ?? 0}
      from up where ${m !== undefined}
    ), show as (
      insert into band_shows (save_id, week, venue_slug, setlist, audience, payout, fame_delta, moments, score, energy)
      select ${saveId}, ${s?.semana ?? 1}, ${s?.palco ?? ""}, ${json(s?.repertorio ?? [])}::jsonb, ${s?.publico ?? 0}, ${s?.cache ?? 0}, ${s?.famaDelta ?? 0},
        ${json(s?.momentos ?? [])}::jsonb, ${s?.nota ?? 0}, ${s?.energia ?? 0}
      from up where ${s !== undefined}
    ), ev as (
      insert into events (user_id, kind, payload)
      select ${userId}, ${e?.kind ?? "game_played"}, ${json({ jogo: JOGO, ...(e?.payload ?? {}) })}::jsonb from up where ${e !== undefined}
    )
    select count(*)::int as ok from up`;
  return Number(res?.ok ?? 0) === 1;
}

/** Selo da cabine: nome, logo, estilo, músicas e o maior palco tocado. */
export async function seloDe(userId: string): Promise<{ nome: string; estilo: string; logo: Logo; musicas: number; shows: number; maiorPalco: string | null } | null> {
  const [t] = await sql`select id, name, style, logo from band_saves where user_id = ${userId}`;
  if (!t) return null;
  const [[m], palcos] = await Promise.all([
    sql`select count(*)::int as n from band_songs where save_id = ${t.id}`,
    sql`select venue_slug as palco from band_shows where save_id = ${t.id}`,
  ]);
  return {
    nome: String(t.name),
    estilo: String(t.style),
    logo: t.logo as Logo,
    musicas: Number(m?.n ?? 0),
    shows: palcos.length,
    maiorPalco: maiorPalco(palcos as { palco: string }[]),
  };
}

// LGPD
export async function exportarBanda(userId: string) {
  const [t] = await sql`select id, name, style, logo, money, fame, chemistry, week, day, agenda, promo, demo_recorded, seed, members, gear, schema_version, state_version, created_at, updated_at from band_saves where user_id = ${userId}`;
  if (!t) return { banda: null, musicas: [], shows: [] };
  const [musicas, shows] = await Promise.all([
    sql`select slot, title, structure, mood, bpm, theme, score, created_at from band_songs where save_id = ${t.id} order by slot`,
    sql`select week, venue_slug, setlist, audience, payout, fame_delta, moments, score, energy, created_at from band_shows where save_id = ${t.id} order by week`,
  ]);
  const { id: _id, ...banda } = t;
  void _id;
  return { banda, musicas, shows };
}

export async function apagarBanda(userId: string) {
  await sql`delete from band_saves where user_id = ${userId}`; // músicas e shows vão junto (on delete cascade)
}
