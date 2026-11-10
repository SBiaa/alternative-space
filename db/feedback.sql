-- Feedback dos jogos: nota, sugestão, bug ou ideia (src/app/api/feedback/route.ts).
create table if not exists feedbacks (
  id bigserial primary key,
  jogo text not null,
  tipo text not null,
  nota smallint,
  mensagem text not null default '',
  contato text not null default '',
  user_id text,
  pagina text not null default '',
  navegador text not null default '',
  lido boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists feedbacks_recentes on feedbacks (created_at desc);
