-- Mesa do Mestre, agenda: rotina das sessões, sessões geradas por ela e o link assinável do calendário.
-- Idempotente. Aplicar com: node --env-file=.env.local scripts/aplicar-sql.mjs db/mesa-agenda.sql
-- Depende de db/mesa.sql. Mudou algo aqui, mude src/lib/mesa/schema.ts também.

-- Rotina: dia da semana (0 = segunda ... 6 = domingo), hora no horário de Brasília e de quantas em quantas semanas.
-- rec_dia nulo = campanha sem rotina. rec_gerada_ate = início da última sessão que a rotina já criou:
-- só se criam datas depois dela, então uma sessão apagada não volta.
alter table campanhas add column if not exists rec_dia smallint check (rec_dia between 0 and 6);
alter table campanhas add column if not exists rec_hora text check (rec_hora ~ '^[0-2][0-9]:[0-5][0-9]$');
alter table campanhas add column if not exists rec_intervalo smallint not null default 1 check (rec_intervalo in (1, 2));
alter table campanhas add column if not exists rec_duracao_min integer not null default 240;
alter table campanhas add column if not exists rec_local text not null default '';
alter table campanhas add column if not exists rec_gerada_ate timestamptz;

-- Sessões criadas pela rotina. O índice único impede a rotina de criar a mesma data duas vezes
-- (duas pessoas abrindo a campanha ao mesmo tempo); sessões marcadas à mão não entram na regra.
alter table campanha_sessoes add column if not exists da_rotina boolean not null default false;
create unique index if not exists campanha_sessoes_rotina_uniq on campanha_sessoes (campanha_id, inicia_em) where da_rotina;

-- Link assinável do calendário (Google Agenda, celular). O token é o segredo: quem tem o link lê as sessões.
-- Gerar um token novo invalida o antigo.
create table if not exists mesa_agenda_tokens (
  user_id text primary key,
  token text not null unique,
  created_at timestamptz not null default now()
);
