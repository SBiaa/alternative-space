// Partida e personagem de quem joga sem conta: ficam em cookie assinado (httpOnly), então só o servidor muda.
import "server-only";
import { cookies } from "next/headers";
import { BASE } from "./config";
import { assinar, verificar } from "./assinatura";
import { personagemSchema, type Personagem } from "./personagem";
import { migrar, type Estado } from "./save";

export const COOKIE_PJ = "bolso_pj";
export const PREFIXO_RUN = "bolso_run_";
const NOVENTA_DIAS = 60 * 60 * 24 * 90;

const opcoes = () => ({ httpOnly: true, sameSite: "lax" as const, secure: process.env.NODE_ENV === "production", path: BASE, maxAge: NOVENTA_DIAS });

export async function lerPersonagemLocal(): Promise<Personagem | null> {
  const bruto = verificar((await cookies()).get(COOKIE_PJ)?.value);
  const r = personagemSchema.safeParse(bruto);
  return r.success ? r.data : null;
}

export async function gravarPersonagemLocal(p: Personagem) {
  (await cookies()).set(COOKIE_PJ, assinar(p), opcoes());
}

export async function lerRunLocal(slug: string): Promise<Estado | null> {
  const e = migrar(verificar((await cookies()).get(PREFIXO_RUN + slug)?.value));
  return e && e.aventura === slug ? e : null;
}

export async function gravarRunLocal(e: Estado) {
  (await cookies()).set(PREFIXO_RUN + e.aventura, assinar(e), opcoes());
}

export async function apagarRunLocal(slug: string) {
  (await cookies()).delete({ name: PREFIXO_RUN + slug, path: BASE });
}

export async function apagarPersonagemLocal() {
  (await cookies()).delete({ name: COOKIE_PJ, path: BASE });
}

/** Todas as partidas locais com assinatura válida (pra migrar quando a pessoa cria a conta). */
export async function lerRunsLocais(): Promise<Estado[]> {
  const todos = (await cookies()).getAll().filter((c) => c.name.startsWith(PREFIXO_RUN));
  return todos.flatMap((c) => {
    const e = migrar(verificar(c.value));
    return e && PREFIXO_RUN + e.aventura === c.name ? [e] : [];
  });
}
