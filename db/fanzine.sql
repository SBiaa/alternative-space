-- Fanzine Perdida: progresso de cada tripulante em cada capítulo.
--   node --env-file=.env.local scripts/aplicar-sql.mjs db/fanzine.sql
-- Depende de db/diario.sql (tabela events).
-- O conteúdo dos capítulos (pistas, ligações, resposta) fica em content/fanzine/, não no banco.

create table if not exists fanzine_progress (
  user_id text not null,
  chapter_slug text not null,
  state_version int not null default 1,
  clues jsonb not null default '[]',
  deductions jsonb not null default '[]',
  hints_used int not null default 0 check (hints_used between 0 and 3),
  solved boolean not null default false,
  solved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, chapter_slug),
  check (solved = (solved_at is not null))
);
create index if not exists fanzine_progress_resolvidos on fanzine_progress (user_id) where solved;
