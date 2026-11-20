-- Bichinho da Cabine (src/lib/bichinho). Rodar uma vez no banco; pode rodar de novo sem estragar nada.
-- Depende de db/diario.sql (tabela events) e de db/fichas.sql (marco da primeira ficha).
-- Eventos gravados: pet_hatched, pet_evolved, pet_treat, pet_visit (e post_view, vindo do blog).
-- user_id é o id do Neon Auth (o mesmo de perfis e quiz_results).

create table if not exists pets (
  id uuid primary key default gen_random_uuid(),
  user_id text not null unique,
  species text not null,
  name text not null,
  stage smallint not null default 0 check (stage between 0 and 2),
  -- { v: 1, energy, curiosity, affection }, cada barra de 0 a 100. O servidor recalcula; o navegador nunca grava aqui.
  stats jsonb not null,
  xp integer not null default 0 check (xp >= 0),
  -- { slot: accessory_slug }
  accessories_equipped jsonb not null default '{}',
  last_tick_at timestamptz not null default now(),
  last_treat_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists pet_unlocks (
  user_id text not null,
  accessory_slug text not null,
  unlocked_at timestamptz not null default now(),
  primary key (user_id, accessory_slug)
);

-- Limite de ações por pessoa (petisco, troca de acessório, nome).
create table if not exists pet_limites (
  user_id text not null,
  acao text not null,
  janela timestamptz not null,
  total int not null default 1,
  primary key (user_id, acao, janela)
);

-- Ajuda o cálculo preguiçoso e os marcos (eventos por pessoa, tipo e data).
create index if not exists events_user_kind_created on events (user_id, kind, created_at);
