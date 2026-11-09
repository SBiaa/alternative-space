-- Fichas de personagem (src/lib/fichas/db/schema.ts). Rodar uma vez no banco; pode rodar de novo sem estragar nada.
-- user_id é o id do Neon Auth (o mesmo de quiz_results e perfis).

create table if not exists fichas (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  -- Sistema de jogo ('sr5' = Shadowrun 5ª). O formato de draft depende dele.
  sistema text not null default 'sr5',
  name text not null default '',
  status text not null default 'draft' check (status in ('draft', 'active', 'retired')),
  draft jsonb not null,
  schema_version integer not null,
  -- Passo do assistente em que o jogador parou.
  step integer not null default 0,
  -- Em jogo: dano marcado e anotações.
  physical_damage integer not null default 0,
  stun_damage integer not null default 0,
  play_notes text not null default '',
  activated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists fichas_user_idx on fichas (user_id);

-- Diário de missões/sessões de um personagem.
create table if not exists ficha_missoes (
  id uuid primary key default gen_random_uuid(),
  character_id uuid not null references fichas (id) on delete cascade,
  title text not null,
  status text not null default 'active' check (status in ('planned', 'active', 'done')),
  notes text not null default '',
  played_on date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists ficha_missoes_ficha_idx on ficha_missoes (character_id);

-- Histórico de nuyen e karma. O saldo é a soma; nada é editado, só lançado.
create table if not exists ficha_lancamentos (
  id uuid primary key default gen_random_uuid(),
  character_id uuid not null references fichas (id) on delete cascade,
  kind text not null check (kind in ('nuyen', 'karma')),
  amount integer not null,
  reason text not null,
  mission_id uuid references ficha_missoes (id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists ficha_lancamentos_ficha_idx on ficha_lancamentos (character_id, created_at);

-- Metas do personagem (planejamento de evolução).
create table if not exists ficha_metas (
  id uuid primary key default gen_random_uuid(),
  character_id uuid not null references fichas (id) on delete cascade,
  title text not null,
  notes text not null default '',
  target jsonb not null,
  status text not null default 'active' check (status in ('active', 'done', 'dropped')),
  position integer not null default 0,
  paid integer,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);
create index if not exists ficha_metas_ficha_idx on ficha_metas (character_id, position);

-- Times de jogadores. Quem tem o link de convite entra com uma ficha.
create table if not exists ficha_times (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  user_id text not null,
  invite_code text not null unique,
  created_at timestamptz not null default now()
);

-- Quem está no time é a ficha, não o jogador. Uma ficha pode estar em vários times.
create table if not exists ficha_time_membros (
  team_id uuid not null references ficha_times (id) on delete cascade,
  character_id uuid not null references fichas (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (team_id, character_id)
);
create index if not exists ficha_time_membros_ficha_idx on ficha_time_membros (character_id);
