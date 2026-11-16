-- Mesa do Mestre: campanhas, jogadores, sessões e diário.
-- Idempotente. Aplicar com: node --env-file=.env.local scripts/aplicar-sql.mjs db/mesa.sql
-- Depende de db/fichas.sql (tabela fichas). Mudou algo aqui, mude src/lib/mesa/schema.ts também.

-- Campanha. Quem mestra é o dono; quem tem o link entra como jogador.
create table if not exists campanhas (
  id uuid primary key default gen_random_uuid(),
  mestre_id text not null,
  nome text not null,
  sistema text not null default 'outro' check (sistema in ('sr5', 'pf2e', 'outro')),
  sinopse text not null default '',
  status text not null default 'planejando' check (status in ('planejando', 'andamento', 'pausada', 'encerrada')),
  rotina text not null default '',
  cor text not null default 'laranja',
  invite_code text not null unique,
  created_at timestamptz not null default now()
);
create index if not exists campanhas_mestre_idx on campanhas (mestre_id);

-- Quem está na campanha é o jogador; a ficha é opcional e pode ser trocada.
create table if not exists campanha_jogadores (
  campanha_id uuid not null references campanhas (id) on delete cascade,
  user_id text not null,
  character_id uuid references fichas (id) on delete set null,
  joined_at timestamptz not null default now(),
  primary key (campanha_id, user_id)
);
create index if not exists campanha_jogadores_user_idx on campanha_jogadores (user_id);

-- Convites feitos pelo @apelido. O link de convite não passa por aqui.
create table if not exists campanha_convites (
  campanha_id uuid not null references campanhas (id) on delete cascade,
  user_id text not null,
  created_at timestamptz not null default now(),
  primary key (campanha_id, user_id)
);
create index if not exists campanha_convites_user_idx on campanha_convites (user_id);

-- Sessões marcadas. Resumo e recompensas são para todos; notas_mestre só o mestre vê.
create table if not exists campanha_sessoes (
  id uuid primary key default gen_random_uuid(),
  campanha_id uuid not null references campanhas (id) on delete cascade,
  titulo text not null default '',
  inicia_em timestamptz not null,
  duracao_min integer not null default 240,
  local text not null default '',
  pauta text not null default '',
  status text not null default 'marcada' check (status in ('marcada', 'realizada', 'cancelada')),
  resumo text not null default '',
  recompensas text not null default '',
  notas_mestre text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists campanha_sessoes_campanha_idx on campanha_sessoes (campanha_id, inicia_em);
create index if not exists campanha_sessoes_inicio_idx on campanha_sessoes (inicia_em);

-- Presença: cada jogador responde vou / talvez / não vou.
create table if not exists campanha_presencas (
  sessao_id uuid not null references campanha_sessoes (id) on delete cascade,
  user_id text not null,
  resposta text not null check (resposta in ('vou', 'talvez', 'nao')),
  updated_at timestamptz not null default now(),
  primary key (sessao_id, user_id)
);

-- Ganchos em aberto: o que ficou pendente na história. Só o mestre vê.
create table if not exists campanha_ganchos (
  id uuid primary key default gen_random_uuid(),
  campanha_id uuid not null references campanhas (id) on delete cascade,
  sessao_id uuid references campanha_sessoes (id) on delete set null,
  texto text not null,
  resolvido_em timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists campanha_ganchos_campanha_idx on campanha_ganchos (campanha_id, created_at);
