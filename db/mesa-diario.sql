-- Mesa do Mestre, diário: recompensas que o jogador aceita, presença de verdade e diário do jogador.
-- Idempotente. Aplicar com: node --env-file=.env.local scripts/aplicar-sql.mjs db/mesa-diario.sql
-- Depende de db/mesa.sql e db/fichas.sql. Mudou algo aqui, mude src/lib/mesa/schema.ts também.

-- Presença: "resposta" (vou / talvez / não vou) é o que o jogador disse antes; "compareceu" é o que o mestre
-- marca depois da sessão. Quem não respondeu pode ter presença marcada, então a resposta passa a aceitar nulo.
alter table campanha_presencas alter column resposta drop not null;
alter table campanha_presencas add column if not exists compareceu boolean;

-- Recompensas dadas pelo mestre. Ficam pendentes até o jogador aceitar; aceitar lança na ficha vinculada
-- (karma e nuyen no histórico do Shadowrun; peças de ouro e itens na ficha de Pathfinder). XP fica só aqui.
create table if not exists campanha_recompensas (
  id uuid primary key default gen_random_uuid(),
  campanha_id uuid not null references campanhas (id) on delete cascade,
  sessao_id uuid references campanha_sessoes (id) on delete set null,
  user_id text not null,
  -- A ficha em que a recompensa foi lançada (preenchido ao aceitar, quando ela vai para uma ficha).
  character_id uuid references fichas (id) on delete set null,
  tipo text not null check (tipo in ('karma', 'nuyen', 'po', 'xp', 'item')),
  quantidade integer not null check (quantidade > 0),
  descricao text not null default '',
  status text not null default 'pendente' check (status in ('pendente', 'aceita', 'recusada', 'cancelada')),
  created_at timestamptz not null default now(),
  resolvida_em timestamptz
);
create index if not exists campanha_recompensas_campanha_idx on campanha_recompensas (campanha_id, created_at);
create index if not exists campanha_recompensas_user_idx on campanha_recompensas (user_id, status);

-- Diário de cada jogador por sessão: o resumo ou o ponto de vista do personagem.
-- O mestre lê todos; os colegas só leem os marcados para compartilhar.
create table if not exists campanha_diario_jogador (
  sessao_id uuid not null references campanha_sessoes (id) on delete cascade,
  user_id text not null,
  texto text not null default '',
  compartilhado boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (sessao_id, user_id)
);
