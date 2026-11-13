import { sql } from "@/lib/db";
import type { Ajustes } from "./ajustes";
import { ehDificuldade, type Dificuldade } from "./config";
import type { Nota, Partida } from "./regras";

// Consultas do Riff Estelar. Toda gravação recebe o user_id da sessão, nunca do navegador.

export type Musica = {
  id: string;
  slug: string;
  title: string;
  artist: string;
  bpm: number;
  durationMs: number;
  audioUrl: string;
  coverUrl: string | null;
  credits: string;
  license: string;
  published: boolean;
};
export type Mapa = { difficulty: Dificuldade; notes: Nota[] };
export type MapaResumo = { difficulty: Dificuldade; total: number };
export type Recorde = { songId: string; difficulty: Dificuldade; score: number; accuracy: number };

const musica = (r: Record<string, unknown>): Musica => ({
  id: String(r.id),
  slug: String(r.slug),
  title: String(r.title),
  artist: String(r.artist),
  bpm: Number(r.bpm),
  durationMs: Number(r.duration_ms),
  audioUrl: String(r.audio_url),
  coverUrl: r.cover_url ? String(r.cover_url) : null,
  credits: String(r.credits),
  license: String(r.license),
  published: Boolean(r.published),
});

export async function listarMusicas(incluirRascunhos = false): Promise<(Musica & { mapas: MapaResumo[] })[]> {
  const rows = await sql`
    select s.*, coalesce(
      (select json_agg(json_build_object('difficulty', c.difficulty, 'total', jsonb_array_length(c.notes)))
       from song_charts c where c.song_id = s.id), '[]') as mapas
    from songs s
    where s.published or ${incluirRascunhos}
    order by s.created_at`;
  return rows.map((r) => ({ ...musica(r), mapas: (r.mapas as MapaResumo[]).filter((m) => ehDificuldade(m.difficulty)) }));
}

export async function acharMusica(slug: string, incluirRascunho = false): Promise<(Musica & { mapas: Mapa[] }) | null> {
  const rows = await sql`
    select s.*, coalesce(
      (select json_agg(json_build_object('difficulty', c.difficulty, 'notes', c.notes)) from song_charts c where c.song_id = s.id),
      '[]') as mapas
    from songs s where s.slug = ${slug} and (s.published or ${incluirRascunho})`;
  if (!rows[0]) return null;
  return { ...musica(rows[0]), mapas: (rows[0].mapas as Mapa[]).filter((m) => ehDificuldade(m.difficulty)) };
}

export async function recordesDe(userId: string): Promise<Recorde[]> {
  const rows = await sql`
    select distinct on (song_id, difficulty) song_id, difficulty, score, accuracy
    from game_scores where user_id = ${userId}
    order by song_id, difficulty, score desc`;
  return rows.map((r) => ({ songId: String(r.song_id), difficulty: r.difficulty as Dificuldade, score: Number(r.score), accuracy: Number(r.accuracy) }));
}

/** Total de notas do mapa publicado (pra validar a pontuação), ou null se não existir. */
export async function totalDoMapa(slug: string, d: Dificuldade): Promise<{ songId: string; total: number } | null> {
  const rows = await sql`
    select s.id, jsonb_array_length(c.notes) as total
    from songs s join song_charts c on c.song_id = s.id
    where s.slug = ${slug} and s.published and c.difficulty = ${d}`;
  return rows[0] ? { songId: String(rows[0].id), total: Number(rows[0].total) } : null;
}

/** Grava a partida e o evento. Devolve se foi o novo recorde do tripulante. */
export async function gravarPartida(userId: string, songId: string, slug: string, d: Dificuldade, p: Partida): Promise<boolean> {
  const [antes] = await sql`select max(score)::int as melhor from game_scores where user_id = ${userId} and song_id = ${songId} and difficulty = ${d}`;
  await sql`
    insert into game_scores (user_id, song_id, difficulty, score, accuracy, max_combo, perfect, good, miss)
    values (${userId}, ${songId}, ${d}, ${p.score}, ${p.accuracy}, ${p.maxCombo}, ${p.perfect}, ${p.good}, ${p.miss})`;
  await sql`
    insert into events (user_id, kind, payload)
    values (${userId}, 'game_played', ${JSON.stringify({ jogo: "riff-estelar", musica: slug, dificuldade: d, pontuacao: p.score })}::jsonb)`;
  return antes?.melhor === null || antes?.melhor === undefined || p.score > Number(antes.melhor);
}

export async function lerAjustes(userId: string): Promise<Ajustes | null> {
  const [r] = await sql`select latency_offset_ms, keybinds, note_speed from user_settings where user_id = ${userId}`;
  return r ? { offsetMs: Number(r.latency_offset_ms), teclas: r.keybinds as string[], velocidade: Number(r.note_speed) } : null;
}

export async function gravarAjustes(userId: string, a: Ajustes) {
  await sql`
    insert into user_settings (user_id, latency_offset_ms, keybinds, note_speed, updated_at)
    values (${userId}, ${a.offsetMs}, ${JSON.stringify(a.teclas)}::jsonb, ${a.velocidade}, now())
    on conflict (user_id) do update set latency_offset_ms = excluded.latency_offset_ms,
      keybinds = excluded.keybinds, note_speed = excluded.note_speed, updated_at = now()`;
}

export async function gravarMapa(songId: string, d: Dificuldade, notas: Nota[]) {
  await sql`
    insert into song_charts (song_id, difficulty, notes) values (${songId}, ${d}, ${JSON.stringify(notas)}::jsonb)
    on conflict (song_id, difficulty) do update set notes = excluded.notes`;
}

export async function duracaoDaMusica(songId: string): Promise<number | null> {
  const [r] = await sql`select duration_ms from songs where id = ${songId}`;
  return r ? Number(r.duration_ms) : null;
}

// LGPD
export async function exportarRiff(userId: string) {
  const [partidas, ajustes] = await Promise.all([
    sql`select s.slug as musica, g.difficulty, g.score, g.accuracy, g.max_combo, g.perfect, g.good, g.miss, g.created_at
        from game_scores g join songs s on s.id = g.song_id where g.user_id = ${userId} order by g.created_at`,
    sql`select latency_offset_ms, keybinds, note_speed, updated_at from user_settings where user_id = ${userId}`,
  ]);
  return { partidas, ajustes: ajustes[0] ?? null };
}

export async function apagarRiff(userId: string) {
  await sql`delete from game_scores where user_id = ${userId}`;
  await sql`delete from user_settings where user_id = ${userId}`;
}
