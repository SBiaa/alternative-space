-- Mesa do Mestre, mesa ao vivo: NPCs/inimigos e o contador de iniciativa.
-- Idempotente. Aplicar com: node --env-file=.env.local scripts/aplicar-sql.mjs db/mesa-ao-vivo.sql
-- Depende de db/mesa.sql. Mudou algo aqui, mude src/lib/mesa/schema.ts também.

-- NPCs e inimigos da campanha. Só o mestre vê. "dados" muda conforme o sistema (ver regras-npcs.ts).
create table if not exists campanha_npcs (
  id uuid primary key default gen_random_uuid(),
  campanha_id uuid not null references campanhas (id) on delete cascade,
  nome text not null,
  tipo text not null default 'npc' check (tipo in ('npc', 'inimigo')),
  dados jsonb not null default '{}'::jsonb,
  notas text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists campanha_npcs_campanha_idx on campanha_npcs (campanha_id, created_at);

-- O combate em andamento: um por campanha. Os participantes ficam num jsonb porque só mudam juntos.
create table if not exists campanha_combate (
  campanha_id uuid primary key references campanhas (id) on delete cascade,
  ativo boolean not null default false,
  rodada integer not null default 1,
  passe integer not null default 1,
  turno_id text,
  participantes jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);
