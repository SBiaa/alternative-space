-- Ranking do Fliperama: o melhor recorde de cada tripulante em cada jogo (src/lib/ranking.ts).
create table if not exists recordes (
  user_id text not null,
  jogo text not null,
  valor int not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, jogo)
);
create index if not exists recordes_jogo_valor on recordes (jogo, valor desc, updated_at);
