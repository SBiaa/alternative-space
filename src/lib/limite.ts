import { createHmac } from "node:crypto";
import { sql } from "@/lib/db";

// Na Vercel esses cabeçalhos são preenchidos por ela, não pelo navegador, então não dá pra forjar.
export function ipDe(req: Request) {
  const h = req.headers;
  return h.get("x-real-ip") ?? h.get("x-forwarded-for")?.split(",")[0].trim() ?? "sem-ip";
}

// O IP não fica legível no banco: vira um HMAC com o segredo do servidor.
const chaveDe = (nome: string, ip: string) =>
  createHmac("sha256", process.env.NEON_AUTH_COOKIE_SECRET ?? "").update(`${nome}:${ip}`).digest("hex").slice(0, 40);

// Conta mais um envio e diz se ainda está dentro do limite (até `max` por janela de `janelaSeg` segundos).
// A contagem fica no Postgres (tabela em db/limites.sql) pra valer entre todas as instâncias.
// Se o banco falhar, deixa passar: melhor aceitar um envio a mais do que derrubar o formulário.
export async function dentroDoLimite(nome: string, req: Request, max: number, janelaSeg: number): Promise<boolean> {
  try {
    const [r] = await sql`
      insert into limites (chave, janela, total)
      values (${chaveDe(nome, ipDe(req))}, to_timestamp(floor(extract(epoch from now()) / ${janelaSeg}) * ${janelaSeg}), 1)
      on conflict (chave, janela) do update set total = limites.total + 1
      returning total`;
    if (Math.random() < 0.02) await sql`delete from limites where janela < now() - interval '1 day'`;
    return Number(r?.total ?? 0) <= max;
  } catch (e) {
    console.error("Limite de envios indisponível:", e);
    return true;
  }
}

export const MUITOS_ENVIOS = "Muitos envios seguidos. Tenta de novo daqui a pouco.";
