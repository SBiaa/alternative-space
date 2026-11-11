-- Sugestões da galera pro próximo drop (src/app/api/sugestao-drop/route.ts).
create table if not exists sugestoes_drop (
  id bigserial primary key,
  tema text not null,
  peca text not null default '',
  detalhes text not null default '',
  contato text not null default '',
  user_id text,
  navegador text not null default '',
  lido boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists sugestoes_drop_recentes on sugestoes_drop (created_at desc);
