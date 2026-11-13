-- Taverna do Dragão Cansado: tavernas, noites, semanas, catálogo de melhorias, equipe e arquétipos.
--   node --env-file=.env.local scripts/aplicar-sql.mjs db/taverna.sql
-- Depende de db/diario.sql (tabela events). Catálogo e arquétipos: npm run seed:taverna

-- Uma taverna por usuário no MVP (unique em user_id). Na fase 2 a filial vira outra linha, com city própria:
-- é só trocar este índice por (user_id, city).
create table if not exists taverns (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  city text not null,
  level int not null default 1 check (level between 1 and 5),
  gold int not null default 0 check (gold >= 0),
  reputation numeric(3,2) not null default 2 check (reputation between 0 and 5),
  night int not null default 0 check (night >= 0),
  seed text not null,
  layout jsonb not null default '[]'::jsonb,
  state_version int not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists taverns_user_unico on taverns (user_id);

create table if not exists tavern_nights (
  id uuid primary key default gen_random_uuid(),
  tavern_id uuid not null references taverns(id) on delete cascade,
  night int not null check (night >= 1),
  served int not null check (served >= 0),
  left_angry int not null check (left_angry >= 0),
  gold_earned int not null check (gold_earned >= 0),
  tips int not null check (tips >= 0),
  expenses jsonb not null, -- { ingredientes, salarios, reparos }
  reputation_end numeric(3,2) not null,
  best_archetype text,
  relaxed boolean not null default false,
  created_at timestamptz not null default now(),
  unique (tavern_id, night)
);

create table if not exists tavern_weeks (
  id uuid primary key default gen_random_uuid(),
  tavern_id uuid not null references taverns(id) on delete cascade,
  week int not null check (week >= 1),
  guild_fee_paid boolean not null,
  balance_end int not null check (balance_end >= 0),
  created_at timestamptz not null default now(),
  unique (tavern_id, week)
);

-- prices: preço de cada nível (o do nível 1, do 2...). effects: efeito de cada nível (mesmo tamanho).
create table if not exists tavern_catalog (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('mobilia', 'receita', 'ambiente', 'expansao')),
  slug text not null unique,
  name text not null,
  description text not null,
  max_level int not null check (max_level >= 1),
  prices jsonb not null,
  effects jsonb not null,
  min_tavern_level int not null default 1 check (min_tavern_level between 1 and 5),
  position int not null default 0
);

create table if not exists tavern_upgrades (
  tavern_id uuid not null references taverns(id) on delete cascade,
  catalog_id uuid not null references tavern_catalog(id) on delete cascade,
  level int not null check (level >= 1),
  unique (tavern_id, catalog_id)
);

create table if not exists tavern_staff (
  id uuid primary key default gen_random_uuid(),
  tavern_id uuid not null references taverns(id) on delete cascade,
  role text not null,
  level int not null default 1 check (level between 1 and 3),
  hired_night int not null default 0,
  unique (tavern_id, role)
);

-- orders: receitas preferidas. quirk: { id, ...parâmetros da mania }. unlock: { reputacao, nivel }.
create table if not exists archetypes (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  icon text not null,
  orders jsonb not null,
  patience int not null check (patience > 0),
  spend numeric(4,2) not null,
  tip numeric(4,2) not null,
  quirk jsonb not null,
  unlock jsonb not null
);
