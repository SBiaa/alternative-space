-- Link público das fichas (src/lib/fichas/db/schema.ts). Idempotente. Depende de db/fichas.sql.
-- Aplicar com: node --env-file=.env.local scripts/aplicar-sql.mjs db/ficha-links.sql
-- Fica numa tabela à parte (e não numa coluna de `fichas`) para o resto das fichas
-- não depender dela. Linha presente = link ligado; apagar a linha desliga.
create table if not exists ficha_links (
  character_id uuid primary key references fichas (id) on delete cascade,
  codigo text not null unique,
  created_at timestamptz not null default now()
);
