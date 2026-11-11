-- Quiz com mistura (ex.: qual-sua-casa): pontos de cada resultado e se foi escolha no empate.
alter table quiz_results add column if not exists scores jsonb;
alter table quiz_results add column if not exists chosen_on_tie boolean not null default false;

-- Interesses do tripulante, pra recomendar coisas da loja e do site pelas tags de traço.
create table if not exists interests (
  user_id text not null,
  tag text not null,
  origem text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, tag, origem)
);
