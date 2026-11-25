import { BASE } from "./config";

/** Só aceita voltar pra uma página da própria Mesa de Bolso (nada de link pra fora vindo da URL). */
export function voltaSegura(v: unknown): string | undefined {
  if (typeof v !== "string" || v.length > 120) return undefined;
  return v.startsWith(`${BASE}/`) && /^[a-z0-9/_-]+$/i.test(v) && !v.includes("//") ? v : undefined;
}
