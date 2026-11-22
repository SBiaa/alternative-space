-- Laje Verde: save da laje, vasos e diário de ações.
--   node --env-file=.env.local scripts/aplicar-sql.mjs db/laje-verde.sql
-- Depende de db/diario.sql (tabela events). Fora do que o brief pedia: garden_pots.growth_ms (crescimento efetivo
-- acumulado) e as ações 'shoo' e 'place' no garden_log.

-- Uma laje por usuário. inventory guarda { sementes, colheita, decoracoes, meta } e decorations { encaixe: slug }.
create table if not exists garden_saves (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  coins int not null default 0 check (coins >= 0),
  seed text not null,
  inventory jsonb not null default '{}'::jsonb,
  decorations jsonb not null default '{}'::jsonb,
  state_version int not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists garden_saves_user_unico on garden_saves (user_id);

create table if not exists garden_pots (
  save_id uuid not null references garden_saves(id) on delete cascade,
  slot int not null check (slot between 0 and 11),
  plant_slug text,
  planted_at timestamptz,
  water_level numeric(5,2) not null default 0 check (water_level between 0 and 100),
  water_updated_at timestamptz not null default now(),
  pot_level int not null default 1 check (pot_level between 1 and 3),
  growth_ms bigint not null default 0 check (growth_ms >= 0),
  primary key (save_id, slot)
);

create table if not exists garden_log (
  id uuid primary key default gen_random_uuid(),
  save_id uuid not null references garden_saves(id) on delete cascade,
  action text not null check (action in ('plant', 'water', 'harvest', 'trade', 'sell', 'buy', 'shoo', 'place')),
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists garden_log_save on garden_log (save_id, created_at desc);
