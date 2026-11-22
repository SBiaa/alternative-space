-- Mesa de Bolso (src/lib/bolso). Rodar uma vez no banco; pode rodar de novo sem estragar nada.
-- Depende de db/diario.sql (tabela events). user_id é o id do Neon Auth, igual ao de perfis e fichas.
-- Migrar depois: solo_characters.ficha_id fica livre pra ligar a uma ficha (tabela fichas) quando houver
-- uma tabela de conversão de atributos revisada. Sem FK de propósito: fichas é de outro módulo.

create table if not exists solo_characters (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  name text not null,
  attrs jsonb not null,
  talents jsonb not null,
  portrait jsonb not null,
  ficha_id uuid,
  created_at timestamptz not null default now()
);
create index if not exists solo_characters_user_idx on solo_characters (user_id, created_at);

create table if not exists solo_runs (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  character_id uuid not null references solo_characters (id) on delete cascade,
  adventure_slug text not null,
  seed text not null,
  state jsonb not null,
  state_version integer not null default 1,
  roll_count integer not null default 0,
  finished boolean not null default false,
  ending text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists solo_runs_user_idx on solo_runs (user_id, updated_at desc);
-- Uma partida em andamento por pessoa e aventura.
create unique index if not exists solo_runs_ativa_uq on solo_runs (user_id, adventure_slug) where not finished;

create table if not exists solo_journal (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  character_id uuid not null references solo_characters (id) on delete cascade,
  adventure_slug text not null,
  ending text not null,
  summary text not null,
  rewards jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index if not exists solo_journal_char_idx on solo_journal (character_id, created_at desc);
create index if not exists solo_journal_user_idx on solo_journal (user_id);
