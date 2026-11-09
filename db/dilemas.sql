-- Dilemas Shinobi: um voto por tripulante em cada dilema (src/lib/dilemas.ts).
create table if not exists dilema_votos (
  dilema text not null,
  user_id text not null,
  opcao smallint not null,
  created_at timestamptz not null default now(),
  primary key (dilema, user_id)
);
create index if not exists dilema_votos_dilema on dilema_votos (dilema, opcao);
