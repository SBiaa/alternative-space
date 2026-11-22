-- Cartas do Convés: partidas (travessias) e cartas liberadas por conta.
--   node --env-file=.env.local scripts/aplicar-sql.mjs db/cartas-do-conves.sql
-- Depende de db/diario.sql (tabela events). Idempotente.

-- Uma travessia por linha. A verdade é seed + profession + actions: o servidor refaz a partida inteira a cada envio.
-- state é só cópia pra leitura rápida (resumo, carta favorita). collection é a coleção da conta quando a partida começou,
-- que define quais cartas podem aparecer de recompensa e na loja (precisa ficar guardada pra re-simular igual depois).
create table if not exists deck_runs (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  seed text not null,
  profession text not null,
  collection jsonb not null default '[]'::jsonb,
  actions jsonb not null default '[]'::jsonb,
  state jsonb not null default '{}'::jsonb,
  state_version int not null default 1,
  result text not null default 'andamento' check (result in ('andamento', 'vitoria', 'derrota')),
  floor_reached int not null default 1 check (floor_reached between 1 and 3),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  finished_at timestamptz
);
-- No máximo uma travessia em andamento por conta.
create unique index if not exists deck_runs_andamento on deck_runs (user_id) where result = 'andamento';
-- Cada seed entra uma vez por conta: migrar a mesma partida local duas vezes não duplica nada.
create unique index if not exists deck_runs_seed on deck_runs (user_id, seed);
create index if not exists deck_runs_usuario on deck_runs (user_id, created_at desc);

-- Cartas liberadas jogando. Só o servidor grava aqui, depois de re-simular a partida.
create table if not exists deck_unlocks (
  user_id text not null,
  card_slug text not null,
  run_id uuid,
  unlocked_at timestamptz not null default now(),
  primary key (user_id, card_slug)
);
