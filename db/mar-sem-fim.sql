-- Mar Sem Fim: pirata, barco, viagens e progresso nas ilhas. Idempotente.
-- Aplicar com: node --env-file=.env.local scripts/aplicar-sql.mjs db/mar-sem-fim.sql
-- Depende de db/diario.sql (tabela events). Mudou algo aqui, mude src/lib/mar-sem-fim/dados.ts também.
-- Ilhas, mares, histórias, eventos e melhorias NÃO ficam no banco: moram em content/mar-sem-fim/.
-- Saldo, recompensa e liberação de ilhas são sempre calculados no servidor.

-- Um pirata por usuário (no MVP). A agulha de maré fica aqui: ilha onde está colada e se já carregou.
create table if not exists pirates (
  id uuid primary key default gen_random_uuid(),
  user_id text not null unique,
  name text not null,
  appearance jsonb not null,
  origin_sea text not null,
  profession text not null,
  bounty bigint not null default 0 check (bounty >= 0),
  gold bigint not null default 0 check (gold >= 0),
  seed text not null,
  state_version integer not null default 1,
  needle_island text,
  needle_charged boolean not null default false,
  needle_since timestamptz,
  items jsonb not null default '[]',
  allies jsonb not null default '[]',
  voyages_count integer not null default 0,
  save_format integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists ships (
  id uuid primary key default gen_random_uuid(),
  pirate_id uuid not null unique references pirates (id) on delete cascade,
  name text not null,
  flag jsonb not null,
  hull integer not null check (hull >= 0),
  supplies integer not null check (supplies >= 0),
  upgrades jsonb not null default '[]',
  current_island text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Uma linha por viagem. events guarda os eventos sorteados e as escolhas, mais a rota, o vento e os mantimentos gastos.
create table if not exists voyages (
  id uuid primary key default gen_random_uuid(),
  pirate_id uuid not null references pirates (id) on delete cascade,
  number integer not null,
  from_island text not null,
  to_island text not null,
  departed_at timestamptz not null,
  arrives_at timestamptz not null,
  events jsonb not null default '{}',
  resolved boolean not null default false,
  created_at timestamptz not null default now(),
  unique (pirate_id, number)
);
-- Só uma viagem por vez: o banco também recusa a segunda não resolvida.
create unique index if not exists voyages_uma_em_andamento on voyages (pirate_id) where resolved = false;

create table if not exists island_progress (
  pirate_id uuid not null references pirates (id) on delete cascade,
  island_slug text not null,
  status text not null check (status in ('travada', 'liberada', 'visitada', 'concluida')),
  choices jsonb not null default '{}',
  completed_at timestamptz,
  primary key (pirate_id, island_slug)
);
