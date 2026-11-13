-- Riff Estelar: músicas, mapas de notas, partidas e ajustes do tripulante.
--   node --env-file=.env.local scripts/aplicar-sql.mjs db/riff-estelar.sql
-- Depende de db/diario.sql (tabela events).

create table if not exists songs (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  artist text not null,
  bpm numeric(6,2) not null check (bpm > 0),
  duration_ms int not null check (duration_ms > 0),
  audio_url text not null,
  cover_url text,
  credits text not null,
  license text not null,
  published boolean not null default false,
  created_at timestamptz not null default now()
);

-- notes: [{ "t": ms, "lane": 0-3 }], ordenada por t.
create table if not exists song_charts (
  id uuid primary key default gen_random_uuid(),
  song_id uuid not null references songs(id) on delete cascade,
  difficulty text not null check (difficulty in ('facil', 'medio', 'dificil')),
  notes jsonb not null default '[]',
  created_at timestamptz not null default now(),
  unique (song_id, difficulty)
);

create table if not exists game_scores (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  song_id uuid not null references songs(id) on delete cascade,
  difficulty text not null check (difficulty in ('facil', 'medio', 'dificil')),
  score int not null check (score >= 0),
  accuracy numeric(5,2) not null check (accuracy between 0 and 100),
  max_combo int not null check (max_combo >= 0),
  perfect int not null check (perfect >= 0),
  good int not null check (good >= 0),
  miss int not null check (miss >= 0),
  created_at timestamptz not null default now()
);
create index if not exists game_scores_user_song on game_scores (user_id, song_id, difficulty, score desc);

create table if not exists user_settings (
  user_id text primary key,
  latency_offset_ms int not null default 0 check (latency_offset_ms between -300 and 300),
  keybinds jsonb not null default '["d","f","j","k"]',
  note_speed numeric(3,2) not null default 1 check (note_speed between 0.5 and 2),
  updated_at timestamptz not null default now()
);
