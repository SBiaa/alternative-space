-- Lan House 2005: lans, dias, semanas, catálogo de melhorias, melhorias compradas, equipe e arquétipos.
--   node --env-file=.env.local scripts/aplicar-sql.mjs db/lan-house.sql
-- Depende de db/diario.sql (tabela events). Catálogo e arquétipos: npm run seed:lan

-- Uma lan por usuário no MVP (unique em user_id). Na fase 2 (segunda loja) a outra lan vira outra linha com
-- location própria: é só trocar este índice por (user_id, location).
create table if not exists lan_houses (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  location text not null,
  level int not null default 1 check (level between 1 and 5),
  money int not null default 0 check (money >= 0),
  reputation numeric(3,2) not null default 2 check (reputation between 0 and 5),
  day int not null default 0 check (day >= 0),
  seed text not null,
  layout jsonb not null default '{}'::jsonb,    -- { pcs: [{ id, x, y }], divisoria: coluna | null }
  machines jsonb not null default '[]'::jsonb,  -- [{ id, tipo, saude, sujeira }]
  stock jsonb not null default '{}'::jsonb,     -- { produto: unidades }
  regulars jsonb not null default '{}'::jsonb,  -- { arquetipo: clientes frequentes }
  state_version int not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists lan_houses_user_unico on lan_houses (user_id);

create table if not exists lan_days (
  id uuid primary key default gen_random_uuid(),
  lan_id uuid not null references lan_houses(id) on delete cascade,
  day int not null check (day >= 1),
  served int not null check (served >= 0),
  left_angry int not null check (left_angry >= 0),
  hours_sold numeric(7,2) not null check (hours_sold >= 0),
  services jsonb not null,     -- { impressao, curriculo, cd, pesquisa, xerox, scanner }
  snacks_sold int not null check (snacks_sold >= 0),
  earnings int not null check (earnings >= 0),
  expenses jsonb not null,     -- { estoque, salarios, consertos }
  incidents jsonb not null,    -- { travou, mouse, virus, erro, internet, energia }
  reputation_end numeric(3,2) not null,
  best_archetype text,
  relaxed boolean not null default false,
  created_at timestamptz not null default now(),
  unique (lan_id, day)
);

create table if not exists lan_weeks (
  id uuid primary key default gen_random_uuid(),
  lan_id uuid not null references lan_houses(id) on delete cascade,
  week int not null check (week >= 1),
  bills_paid boolean not null,
  balance_end int not null check (balance_end >= 0),
  created_at timestamptz not null default now(),
  unique (lan_id, week)
);

-- prices[i] e effects[i] valem para o nível i+1.
create table if not exists lan_catalog (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('maquina', 'internet', 'energia', 'software', 'servico', 'balcao', 'conforto', 'ambiente', 'expansao')),
  slug text not null unique,
  name text not null,
  description text not null,
  max_level int not null check (max_level >= 1),
  prices jsonb not null,
  effects jsonb not null,
  min_lan_level int not null default 1 check (min_lan_level between 1 and 5),
  position int not null default 0
);

create table if not exists lan_upgrades (
  lan_id uuid not null references lan_houses(id) on delete cascade,
  catalog_id uuid not null references lan_catalog(id) on delete cascade,
  level int not null check (level >= 1),
  primary key (lan_id, catalog_id)
);

create table if not exists lan_staff (
  id uuid primary key default gen_random_uuid(),
  lan_id uuid not null references lan_houses(id) on delete cascade,
  role text not null check (role in ('caixa', 'tecnico', 'monitor')),
  level int not null default 1 check (level between 1 and 3),
  hired_day int not null check (hired_day >= 0),
  unique (lan_id, role)
);

create table if not exists lan_archetypes (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  wants jsonb not null,        -- { atividade, jogo?, servicos?, horas, grupo: [min, max], tier, online, periodos }
  patience int not null check (patience > 0),
  spend numeric(4,2) not null,
  tip numeric(4,2) not null,
  noise_tolerance numeric(3,2) not null check (noise_tolerance between 0 and 1),
  makes_noise boolean not null default false,
  quirk jsonb not null,
  unlock jsonb not null        -- { reputacao, nivel }
);
