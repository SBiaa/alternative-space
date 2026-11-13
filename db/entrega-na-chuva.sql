-- Entrega na Chuva: catálogo de implantes, implantes do tripulante, carteira de créditos e turnos.
--   node --env-file=.env.local scripts/aplicar-sql.mjs db/entrega-na-chuva.sql
-- Depende de db/diario.sql (tabela events). Catálogo: npm run seed:entrega

-- prices: [preço do nível 1, do 2, do 3]. effects: [{atributo: valor} do nível 1, do 2, do 3].
create table if not exists implants (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text not null,
  max_level int not null check (max_level between 1 and 3),
  prices jsonb not null,
  effects jsonb not null,
  position int not null default 0
);

create table if not exists user_implants (
  user_id text not null,
  implant_id uuid not null references implants(id) on delete cascade,
  level int not null check (level between 1 and 3),
  equipped boolean not null default false,
  primary key (user_id, implant_id)
);

-- Saldo só muda no servidor (compra e fim de turno).
create table if not exists game_wallets (
  user_id text not null,
  game text not null,
  credits int not null default 0 check (credits >= 0),
  primary key (user_id, game)
);

create table if not exists delivery_runs (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  deliveries int not null check (deliveries >= 0),
  on_time int not null check (on_time >= 0),
  late int not null check (late >= 0),
  cancelled int not null check (cancelled >= 0),
  tips_total int not null check (tips_total >= 0),
  credits_earned int not null check (credits_earned >= 0),
  best_streak int not null check (best_streak >= 0),
  duration_ms int not null check (duration_ms > 0),
  relaxed boolean not null default false,
  implants_snapshot jsonb not null default '[]',
  created_at timestamptz not null default now()
);
create index if not exists delivery_runs_user on delivery_runs (user_id, credits_earned desc) where not relaxed;
