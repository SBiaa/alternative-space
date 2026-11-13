-- O Corre: save, dias e semanas do motoboy.
--   node --env-file=.env.local scripts/aplicar-sql.mjs db/o-corre.sql
-- Depende de db/diario.sql (tabela events). Idempotente.

create table if not exists corre_saves (
  id uuid primary key default gen_random_uuid(),
  user_id text not null unique,
  seed text not null,
  game_day int not null check (game_day >= 1),
  game_week int not null check (game_week >= 1),
  state jsonb not null,
  state_version int not null check (state_version >= 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists corre_days (
  id uuid primary key default gen_random_uuid(),
  save_id uuid not null references corre_saves(id) on delete cascade,
  game_day int not null check (game_day >= 1),
  earnings int not null check (earnings >= 0),
  expenses int not null check (expenses >= 0),
  deliveries int not null check (deliveries >= 0),
  on_time int not null check (on_time >= 0),
  late int not null check (late >= 0),
  declined int not null check (declined >= 0),
  rating_end numeric(3,2) not null check (rating_end between 1 and 5),
  created_at timestamptz not null default now(),
  unique (save_id, game_day)
);

create table if not exists corre_weeks (
  id uuid primary key default gen_random_uuid(),
  save_id uuid not null references corre_saves(id) on delete cascade,
  game_week int not null check (game_week >= 1),
  bills_paid boolean not null,
  balance_end int not null,
  goal_progress numeric(5,2) not null check (goal_progress between 0 and 100),
  created_at timestamptz not null default now(),
  unique (save_id, game_week)
);
