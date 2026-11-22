-- Assombrações da Vila: progresso por caso e Bestiário.
--   node --env-file=.env.local scripts/aplicar-sql.mjs db/assombracoes.sql
-- Depende de db/diario.sql (tabela events). Idempotente.

create table if not exists vila_progress (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  case_slug text not null,
  signals jsonb not null default '[]',
  testimonies jsonb not null default '[]',
  attempts int not null default 0 check (attempts >= 0),
  solved boolean not null default false,
  solved_at timestamptz,
  state_version int not null default 1 check (state_version >= 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, case_slug),
  check (solved = (solved_at is not null))
);
create index if not exists vila_progress_user on vila_progress (user_id);

create table if not exists vila_bestiary (
  user_id text not null,
  creature_slug text not null,
  met_at timestamptz not null default now(),
  primary key (user_id, creature_slug)
);
