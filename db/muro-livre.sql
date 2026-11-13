-- Muro Livre: crews, encomendas, camadas, dias, semanas, encontros, catálogo, melhorias, artistas, modelos de mural e diálogos.
--   node --env-file=.env.local scripts/aplicar-sql.mjs db/muro-livre.sql
-- Depende de db/diario.sql (tabela events). Catálogo, modelos, diálogos e arquétipos: npm run seed:muro

-- Uma crew por usuário no MVP (unique em user_id). Na fase 2 (outro bairro) a segunda crew vira outra linha com
-- neighborhood próprio: é só trocar este índice por (user_id, neighborhood).
create table if not exists mural_crews (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  neighborhood text not null,
  level int not null default 1 check (level between 1 and 5),
  money int not null default 0 check (money >= 0),
  rep_quebrada numeric(4,3) not null default 1.5 check (rep_quebrada between 0 and 5),
  rep_clientes numeric(4,3) not null default 1.5 check (rep_clientes between 0 and 5),
  day int not null default 0 check (day >= 0),
  seed text not null,
  state jsonb not null default '{}'::jsonb,  -- estoque de material, equipe em campo, minuto do dia, gastos e ganhos do dia, encontro
  state_version int not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists mural_crews_user_unico on mural_crews (user_id);

create table if not exists mural_jobs (
  id uuid primary key default gen_random_uuid(),
  crew_id uuid not null references mural_crews(id) on delete cascade,
  job_key text not null,                      -- id do jogo, ex.: s2-3 (semana 2, encomenda 3) ou e5 (encontro da semana 5)
  template_id text not null,                  -- slug do modelo de mural
  client_archetype text not null,
  size text not null check (size in ('porta', 'fachada', 'quadra', 'longo', 'empena')),
  briefing jsonb not null,                    -- tema, palavra, cores, tag em destaque, observação do cliente
  pay int not null check (pay >= 0),
  deadline_day int not null check (deadline_day >= 0),
  auth_status text not null check (auth_status in ('autorizado', 'falta', 'recusado')),
  status text not null check (status in ('aberta', 'em_andamento', 'entregue', 'perdida')),
  final_quality numeric(5,2) check (final_quality is null or final_quality between 0 and 100),
  extra jsonb not null default '{}'::jsonb,   -- comunitário, revisão, croqui, negociação, lona, andaime, ruínas, entrega
  created_at timestamptz not null default now(),
  unique (crew_id, job_key)
);

create table if not exists mural_layers (
  job_id uuid not null references mural_jobs(id) on delete cascade,
  layer text not null check (layer in ('fundo', 'contorno', 'preenchimento', 'detalhe')),
  progress numeric(5,2) not null default 0 check (progress between 0 and 100),
  quality numeric(5,2) not null default 0 check (quality between 0 and 100),
  fidelity numeric(5,2) not null default 0 check (fidelity between 0 and 100),
  wet_until numeric not null default 0,       -- minuto absoluto do jogo em que a tinta seca
  primary key (job_id, layer)
);

create table if not exists mural_days (
  id uuid primary key default gen_random_uuid(),
  crew_id uuid not null references mural_crews(id) on delete cascade,
  day int not null check (day >= 1),
  delivered int not null check (delivered >= 0),
  ruined_by_rain int not null check (ruined_by_rain >= 0),
  earnings int not null check (earnings >= 0),
  expenses jsonb not null,                    -- { tinta, spray, salarios, lona, outros }
  rep_quebrada_end numeric(4,3) not null,
  rep_clientes_end numeric(4,3) not null,
  relaxed boolean not null default false,
  created_at timestamptz not null default now(),
  unique (crew_id, day)
);

create table if not exists mural_weeks (
  id uuid primary key default gen_random_uuid(),
  crew_id uuid not null references mural_crews(id) on delete cascade,
  week int not null check (week >= 1),
  bills_paid boolean not null,
  balance_end int not null check (balance_end >= 0),
  created_at timestamptz not null default now(),
  unique (crew_id, week)
);

create table if not exists mural_events (
  id uuid primary key default gen_random_uuid(),
  crew_id uuid not null references mural_crews(id) on delete cascade,
  week int not null check (week >= 1),
  theme text not null,
  result text not null check (result in ('podio', 'mencao', 'nada')),
  score jsonb not null,                       -- { tecnica, tema, assinatura }
  created_at timestamptz not null default now(),
  unique (crew_id, week)
);

-- prices[i] e effects[i] valem para o nível i+1.
create table if not exists mural_catalog (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('material', 'andaime', 'protecao', 'espaco', 'planejamento', 'equipe', 'expansao')),
  slug text not null unique,
  name text not null,
  description text not null,
  max_level int not null check (max_level >= 1),
  prices jsonb not null,
  effects jsonb not null,
  min_crew_level int not null default 1 check (min_crew_level between 1 and 5),
  position int not null default 0
);

create table if not exists mural_upgrades (
  crew_id uuid not null references mural_crews(id) on delete cascade,
  catalog_id uuid not null references mural_catalog(id) on delete cascade,
  level int not null check (level >= 1),
  primary key (crew_id, catalog_id)
);

create table if not exists mural_artists (
  id uuid primary key default gen_random_uuid(),
  crew_id uuid not null references mural_crews(id) on delete cascade,
  archetype text not null,
  level int not null default 1 check (level between 1 and 10),
  skills jsonb not null,                      -- { tecnica, velocidade, estilo, resistencia }
  fatigue numeric(5,2) not null default 0 check (fatigue between 0 and 100),
  hired_day int not null check (hired_day >= 0),
  assignment jsonb,                           -- { jobId, camada } ou nulo
  resting boolean not null default false,
  unique (crew_id, archetype)
);

-- Arquétipos de artista (sem nome próprio no MVP).
create table if not exists mural_archetypes (
  slug text primary key,
  name text not null,
  description text not null,
  specialty text check (specialty in ('fundo', 'contorno', 'detalhe')),
  skills jsonb not null,
  salary int not null check (salary >= 0),
  hire_fee int not null check (hire_fee >= 0),
  min_crew_level int not null default 1 check (min_crew_level between 1 and 5),
  negotiation numeric not null default 0,
  waste numeric not null default 1
);

-- Layouts de mural: paths por camada, espaços marcados pro texto e pra tag.
create table if not exists mural_templates (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  size text not null check (size in ('porta', 'fachada', 'quadra', 'longo', 'empena')),
  layers jsonb not null,    -- { preenchimento: [formas], contorno: [linhas], detalhe: [formas] }
  slots jsonb not null,     -- { texto, tag, tagGrande }
  tolerance numeric not null default 3
);

create table if not exists mural_dialogues (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  kind text not null,       -- diretor | sindico | associacao
  steps jsonb not null,     -- [{ fala, opcoes: [{ texto, pontos, resposta, croqui?, prazo?, preco?, minQuebrada? }] }]
  requirements jsonb not null
);
