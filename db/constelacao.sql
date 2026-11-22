-- Constelação do Dia: puzzle diário igual pra todo mundo.
--   node --env-file=.env.local scripts/aplicar-sql.mjs db/constelacao.sql
-- Depende de db/diario.sql (tabela events) e db/limites.sql (limite de envios).
-- A resposta (answer) só é lida pelo servidor; nenhuma consulta de página devolve esse campo pro navegador.

create table if not exists daily_puzzles (
  id uuid primary key default gen_random_uuid(),
  date date not null unique,
  answer text not null check (answer ~ '^[A-Z]{5,7}$'),
  length int not null check (length between 5 and 7),
  theme text not null check (theme in ('anime', 'rpg', 'ficcao-cientifica', 'games', 'quadrinhos')),
  hint text not null default '' check (char_length(hint) <= 120),
  created_at timestamptz not null default now(),
  check (length = char_length(answer))
);

create table if not exists daily_plays (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  puzzle_id uuid not null references daily_puzzles(id) on delete cascade,
  guesses jsonb not null default '[]',
  solved boolean not null default false,
  attempts int not null default 0 check (attempts between 0 and 6),
  finished_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, puzzle_id)
);
create index if not exists daily_plays_puzzle on daily_plays (puzzle_id) where finished_at is not null;

create table if not exists daily_streaks (
  user_id text primary key,
  current int not null default 0 check (current >= 0),
  best int not null default 0 check (best >= 0),
  last_date date
);
