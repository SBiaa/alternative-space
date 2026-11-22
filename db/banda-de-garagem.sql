-- Banda de Garagem: a banda (um save por usuário), as músicas compostas e os shows tocados.
--   node --env-file=.env.local scripts/aplicar-sql.mjs db/banda-de-garagem.sql
-- Depende de db/diario.sql (tabela events). Dinheiro do jogo não vale dinheiro real.
--
-- state_version é o contador de gravações (controle de concorrência: cada escrita confere a versão que leu).
-- schema_version é a versão do formato do save (migrações em src/lib/banda/save.ts).
-- A música é guardada num formato que o Riff Estelar poderá ler no futuro: BPM, estrutura (seções) e clima.

create table if not exists band_saves (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  name text not null check (char_length(name) between 1 and 40),
  style text not null,
  logo jsonb not null,                              -- { forma, corFundo, corForma }
  money int not null default 0 check (money >= 0),
  fame int not null default 0 check (fame between 0 and 100),
  chemistry int not null default 0 check (chemistry between 0 and 100),
  week int not null default 1 check (week >= 1),
  day int not null default 0 check (day between 0 and 6),   -- 0..5 = dias da semana a jogar, 6 = fim de semana (show)
  agenda jsonb not null default '[]'::jsonb,        -- ações já feitas nesta semana, em ordem
  promo int not null default 0 check (promo between 0 and 100),
  demo_recorded boolean not null default false,
  seed text not null,
  members jsonb not null,                           -- 4 integrantes (voz, guitarra, baixo, bateria)
  gear jsonb not null,                              -- { instrumentos, amplificador, cabos } de 0 a 100
  schema_version int not null default 1,
  state_version int not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists band_saves_user_unico on band_saves (user_id);

create table if not exists band_songs (
  id uuid primary key default gen_random_uuid(),
  save_id uuid not null references band_saves(id) on delete cascade,
  slot int not null check (slot >= 1),              -- número da música na banda; o repertório do show aponta pra ele
  title text not null check (char_length(title) between 1 and 40),
  structure jsonb not null,                         -- { id, secoes: [{ nome, compassos }] }
  mood text not null,
  bpm int not null check (bpm between 40 and 260),
  theme text not null,
  score int not null check (score between 0 and 100),
  created_at timestamptz not null default now(),
  unique (save_id, slot)
);
create index if not exists band_songs_save on band_songs (save_id, slot);

create table if not exists band_shows (
  id uuid primary key default gen_random_uuid(),
  save_id uuid not null references band_saves(id) on delete cascade,
  week int not null check (week >= 1),
  venue_slug text not null,
  setlist jsonb not null,                           -- slots das músicas tocadas
  audience int not null check (audience >= 0),
  payout int not null check (payout >= 0),
  fame_delta int not null,
  moments jsonb not null default '[]'::jsonb,       -- ids dos momentos narrados
  score int not null default 0 check (score between 0 and 100),
  energy int not null default 0 check (energy between 0 and 100),
  created_at timestamptz not null default now(),
  unique (save_id, week)
);
create index if not exists band_shows_save on band_shows (save_id, week desc);
