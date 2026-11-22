-- Skate Universe: picos, pistas e skate shops cadastrados pela comunidade.
--   node --env-file=.env.local scripts/aplicar-sql.mjs db/skate-universe.sql
-- Quem cadastra dá o nome ao pico. Entra como pendente e só aparece no mapa depois que um admin aprova.

create table if not exists skate_spots (
  id uuid primary key default gen_random_uuid(),
  tipo text not null check (tipo in ('pico', 'pista', 'shop')),
  nome text not null check (char_length(nome) between 3 and 60),
  descricao text not null default '' check (char_length(descricao) <= 600),
  lat double precision not null check (lat between -90 and 90),
  lng double precision not null check (lng between -180 and 180),
  cidade text not null check (char_length(cidade) between 2 and 60),
  obstaculos text[] not null default '{}',
  descoberto_por text not null,
  status text not null default 'pendente' check (status in ('pendente', 'aprovado', 'recusado')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);

-- O mapa busca por área visível, só aprovados.
create index if not exists skate_spots_aprovados_pos on skate_spots (lat, lng) where status = 'aprovado';
create index if not exists skate_spots_status on skate_spots (status, created_at);
create index if not exists skate_spots_autor on skate_spots (descoberto_por, created_at desc);
