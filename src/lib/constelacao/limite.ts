import "server-only";
import { createHmac } from "node:crypto";
import { sql } from "@/lib/db";

// Limite por usuário logado. Usa a mesma tabela `limites` do limite por IP (src/lib/limite.ts),
// com a chave em HMAC pra o id do usuário não ficar legível ali.
export async function dentroDoLimiteUsuario(nome: string, userId: string, max: number, janelaSeg: number): Promise<boolean> {
  try {
    const chave = createHmac("sha256", process.env.NEON_AUTH_COOKIE_SECRET ?? "").update(`usuario:${nome}:${userId}`).digest("hex").slice(0, 40);
    const [r] = await sql`
      insert into limites (chave, janela, total)
      values (${chave}, to_timestamp(floor(extract(epoch from now()) / ${janelaSeg}) * ${janelaSeg}), 1)
      on conflict (chave, janela) do update set total = limites.total + 1
      returning total`;
    return Number(r?.total ?? 0) <= max;
  } catch (e) {
    console.error("Limite por usuário indisponível:", e);
    return true;
  }
}
