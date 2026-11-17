-- Mesa do Mestre, material da campanha: páginas do Mundo (wiki) e handouts.
-- Idempotente. Aplicar com: node --env-file=.env.local scripts/aplicar-sql.mjs db/mesa-mundo.sql
-- Depende de db/mesa.sql. Mudou algo aqui, mude src/lib/mesa/schema.ts também.

-- Páginas do Mundo. O mestre escreve; o jogador só vê as liberadas.
create table if not exists campanha_paginas (
  id uuid primary key default gen_random_uuid(),
  campanha_id uuid not null references campanhas (id) on delete cascade,
  titulo text not null,
  categoria text not null default 'outro' check (categoria in ('lugar', 'faccao', 'personagem', 'item', 'outro')),
  corpo text not null default '',
  liberada boolean not null default false,
  liberada_em timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists campanha_paginas_campanha_idx on campanha_paginas (campanha_id, categoria, titulo);

-- Handouts: imagem ou PDF num Blob privado, ou um texto. O jogador só vê depois de revelado_em.
create table if not exists campanha_handouts (
  id uuid primary key default gen_random_uuid(),
  campanha_id uuid not null references campanhas (id) on delete cascade,
  sessao_id uuid references campanha_sessoes (id) on delete set null,
  titulo text not null,
  tipo text not null check (tipo in ('imagem', 'pdf', 'texto')),
  blob_url text,
  blob_pathname text,
  texto text not null default '',
  revelado_em timestamptz,
  created_at timestamptz not null default now(),
  check ((tipo = 'texto' and blob_pathname is null) or (tipo <> 'texto' and blob_pathname is not null))
);
create index if not exists campanha_handouts_campanha_idx on campanha_handouts (campanha_id, created_at);
