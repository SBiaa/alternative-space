-- Diário de Bordo (planner online). Tudo é do usuário (user_id do Neon Auth) e privado.
-- Rodar uma vez no banco (Neon console ou psql). Pode rodar de novo: só cria o que falta.

create table if not exists quests (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  scope text not null check (scope in ('day', 'month')),
  date date,
  year int,
  month int check (month between 1 and 12),
  text text not null check (char_length(text) between 1 and 200),
  status text not null default 'open' check (status in ('open', 'done', 'moved', 'dropped', 'urgent')),
  position int not null default 0,
  created_at timestamptz not null default now(),
  check ((scope = 'day' and date is not null) or (scope = 'month' and year is not null and month is not null))
);
create index if not exists quests_dia on quests (user_id, date) where scope = 'day';
create index if not exists quests_mes on quests (user_id, year, month) where scope = 'month';

create table if not exists week_notes (
  user_id text not null,
  year int not null,
  week int not null check (week between 1 and 53),
  buff text not null default '',
  debuff text not null default '',
  primary key (user_id, year, week)
);

create table if not exists habits (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  year int not null,
  month int not null check (month between 1 and 12),
  name text not null check (char_length(name) between 1 and 60),
  position int not null default 0
);
create index if not exists habits_mes on habits (user_id, year, month);

create table if not exists habit_logs (
  habit_id uuid not null references habits (id) on delete cascade,
  date date not null,
  done boolean not null default true,
  primary key (habit_id, date)
);

create table if not exists mood_legend (
  user_id text not null,
  year int not null,
  month int not null check (month between 1 and 12),
  slot int not null check (slot between 1 and 4),
  color text not null check (color ~ '^#[0-9a-fA-F]{6}$'),
  label text not null default '',
  primary key (user_id, year, month, slot)
);

create table if not exists mood_logs (
  user_id text not null,
  date date not null,
  slot int not null check (slot between 1 and 4),
  primary key (user_id, date)
);

create table if not exists inventory_items (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  year int not null,
  month int not null check (month between 1 and 12),
  type text not null check (type in ('serie', 'anime', 'jogo', 'livro')),
  title text not null check (char_length(title) between 1 and 200),
  rating int check (rating between 1 and 5),
  status text not null default 'quero' check (status in ('quero', 'fazendo', 'terminei')),
  created_at timestamptz not null default now()
);
create index if not exists inventory_mes on inventory_items (user_id, year, month);

create table if not exists month_xp (
  user_id text not null,
  year int not null,
  month int not null check (month between 1 and 12),
  points int not null default 0 check (points between 0 and 10),
  primary key (user_id, year, month)
);

-- Eventos do usuário para recomendações futuras (declaradas na política de privacidade).
create table if not exists events (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  kind text not null,
  payload jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index if not exists events_user on events (user_id, kind);
