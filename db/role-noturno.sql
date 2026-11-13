-- Rolê Noturno: picos (pistas feitas pelos tripulantes), corridas, entradas do top 1 e denúncias.
--   node --env-file=.env.local scripts/aplicar-sql.mjs db/role-noturno.sql
-- Depende de db/diario.sql (tabela events).

create table if not exists skate_parks (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  slug text unique,
  title text not null default '',
  description text not null default '',
  layout jsonb not null,
  layout_version int not null default 1,
  layout_hash text not null,
  status text not null default 'draft' check (status in ('draft', 'published', 'hidden')),
  verified_run_id uuid,
  plays_count int not null default 0 check (plays_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz,
  check (status = 'draft' or slug is not null)
);
create index if not exists skate_parks_user on skate_parks (user_id, updated_at desc);
create index if not exists skate_parks_recentes on skate_parks (published_at desc) where status = 'published';
create index if not exists skate_parks_jogados on skate_parks (plays_count desc) where status = 'published';

create table if not exists skate_runs (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  park_id uuid not null references skate_parks(id) on delete cascade,
  score int not null check (score >= 0),
  duration_ms int not null check (duration_ms >= 0),
  tricks jsonb not null default '{}',
  max_combo int not null default 0 check (max_combo >= 0),
  finished boolean not null,
  layout_hash text not null,
  created_at timestamptz not null default now()
);
create index if not exists skate_runs_ranking on skate_runs (park_id, score desc, created_at);
create index if not exists skate_runs_user on skate_runs (user_id, park_id, score desc);

-- Sequência de entradas (passo + ação) só do recorde top 1 de cada pico, pra revisão manual no admin.
create table if not exists skate_run_inputs (
  park_id uuid primary key references skate_parks(id) on delete cascade,
  run_id uuid not null references skate_runs(id) on delete cascade,
  inputs jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists park_reports (
  id uuid primary key default gen_random_uuid(),
  park_id uuid not null references skate_parks(id) on delete cascade,
  user_id text not null,
  reason text not null,
  created_at timestamptz not null default now(),
  unique (park_id, user_id)
);
create index if not exists park_reports_park on park_reports (park_id);
