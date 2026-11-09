-- Limite de envios dos formulários públicos (src/lib/limite.ts).
-- Uma linha por quem enviou (hash do IP + rota) e por janela de tempo. Linhas com mais de um dia são apagadas sozinhas.
create table if not exists limites (
  chave text not null,
  janela timestamptz not null,
  total int not null default 1,
  primary key (chave, janela)
);
