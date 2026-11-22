-- Banca na Feira: a banca de cada tripulante e o histórico de eventos.
--   node --env-file=.env.local scripts/aplicar-sql.mjs db/banca-na-feira.sql
-- Depende de db/diario.sql (tabela events). Catálogos (produtos, eventos, arquétipos, melhorias) ficam em config TypeScript.

-- Uma banca por usuário no MVP (unique em user_id).
create table if not exists stall_saves (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  money int not null default 0 check (money >= 0),
  reputation numeric(3,2) not null default 1 check (reputation between 0 and 5),
  week int not null default 1 check (week >= 1),
  seed text not null,
  stock jsonb not null default '{}'::jsonb,     -- { itens: { "produto:tema": unidades }, diasUsados: n }
  layout jsonb not null default '{}'::jsonb,    -- { celulas: [item | null], precos: { produto: preço } }
  upgrades jsonb not null default '{}'::jsonb,  -- { melhoria: nível }
  state_version int not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists stall_saves_user_unico on stall_saves (user_id);

create table if not exists stall_events (
  id uuid primary key default gen_random_uuid(),
  save_id uuid not null references stall_saves(id) on delete cascade,
  event_slug text not null,
  sales jsonb not null,           -- { "produto:tema": unidades vendidas }
  revenue int not null check (revenue >= 0),
  costs jsonb not null,           -- { taxa, material, maquininha }
  visitors int not null check (visitors >= 0),
  gave_up int not null check (gave_up >= 0),
  reputation_end numeric(3,2) not null,
  created_at timestamptz not null default now()
);
create index if not exists stall_events_save on stall_events (save_id, created_at desc);
