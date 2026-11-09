import { connection } from "next/server";
import { sql } from "@/lib/db";

export type Linha = { posicao: number; userId: string; nome: string; valor: number };

// Guarda o recorde se for melhor que o anterior. true = melhorou.
export async function registrarRecorde(userId: string, jogo: string, valor: number): Promise<boolean> {
  const r = await sql`
    insert into recordes (user_id, jogo, valor) values (${userId}, ${jogo}, ${valor})
    on conflict (user_id, jogo) do update set valor = excluded.valor, updated_at = now()
    where recordes.valor < excluded.valor
    returning valor`;
  return r.length > 0;
}

// Os melhores de um jogo. Empate: quem chegou primeiro fica na frente.
// Nome mostrado: @apelido se tiver, senão o primeiro nome da conta.
export async function topDe(jogo: string, limite = 10): Promise<Linha[]> {
  await connection();
  const rows = await sql`
    select r.user_id, r.valor, p.apelido, u.name
    from recordes r
    left join perfis p on p.user_id = r.user_id
    left join neon_auth."user" u on u.id::text = r.user_id
    where r.jogo = ${jogo} and coalesce(u.banned, false) = false
    order by r.valor desc, r.updated_at asc
    limit ${limite}`;
  return rows.map((r, i) => ({
    posicao: i + 1,
    userId: String(r.user_id),
    nome: nomeNoRanking(r.apelido as string | null, r.name as string | null),
    valor: Number(r.valor),
  }));
}

// Posição de alguém fora do top (null = ainda sem recorde nesse jogo).
export async function posicaoDe(userId: string, jogo: string): Promise<Linha | null> {
  await connection();
  const [r] = await sql`
    select me.valor, p.apelido, u.name,
      (select count(*) from recordes o where o.jogo = me.jogo
         and (o.valor > me.valor or (o.valor = me.valor and o.updated_at < me.updated_at)))::int + 1 as posicao
    from recordes me
    left join perfis p on p.user_id = me.user_id
    left join neon_auth."user" u on u.id::text = me.user_id
    where me.user_id = ${userId} and me.jogo = ${jogo}`;
  if (!r) return null;
  return { posicao: Number(r.posicao), userId, nome: nomeNoRanking(r.apelido as string | null, r.name as string | null), valor: Number(r.valor) };
}

export function nomeNoRanking(apelido: string | null, nome: string | null): string {
  if (apelido) return `@${apelido}`;
  const primeiro = (nome ?? "").trim().split(/\s+/)[0];
  return primeiro || "Tripulante";
}
