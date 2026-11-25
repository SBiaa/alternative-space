// Assina o estado que vai no cookie de quem joga sem conta. O navegador guarda, mas não consegue editar:
// rolagem, item e fôlego só mudam no servidor, que reassina a cada passo.
import { createHmac, timingSafeEqual } from "node:crypto";

function segredo(): string {
  const s = process.env.NEON_AUTH_COOKIE_SECRET;
  if (!s) throw new Error("Falta NEON_AUTH_COOKIE_SECRET pra assinar a partida local.");
  return s;
}

const mac = (corpo: string) => createHmac("sha256", segredo()).update(`mesa-de-bolso:${corpo}`).digest("base64url");

export function assinar(valor: unknown): string {
  const corpo = Buffer.from(JSON.stringify(valor), "utf8").toString("base64url");
  return `${corpo}.${mac(corpo)}`;
}

/** Devolve o valor se a assinatura bate; senão null. */
export function verificar(token: string | undefined | null): unknown | null {
  if (!token) return null;
  const i = token.lastIndexOf(".");
  if (i <= 0) return null;
  const corpo = token.slice(0, i);
  const dado = Buffer.from(token.slice(i + 1));
  const esperado = Buffer.from(mac(corpo));
  if (dado.length !== esperado.length || !timingSafeEqual(dado, esperado)) return null;
  try {
    return JSON.parse(Buffer.from(corpo, "base64url").toString("utf8"));
  } catch {
    return null;
  }
}
