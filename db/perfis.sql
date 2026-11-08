-- Perfil do tripulante: o que não cabe na tabela de usuário do Neon Auth.
-- Nome e avatar ficam em neon_auth."user" (name, image); aqui ficam apelido e cor.
create table if not exists perfis (
  user_id text primary key,
  apelido text unique,
  cor text not null default 'azul',
  updated_at timestamptz not null default now()
);
