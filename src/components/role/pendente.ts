import type { Corrida } from "@/lib/role/pontuacao";

// Corrida de quem jogou sem conta: fica na sessão do navegador e é salva logo depois do cadastro.
const CHAVE = "role-noturno:pendente";

export type Pendente = { slug: string; titulo: string; corrida: Corrida };

export function guardarPendente(p: Pendente) {
  try {
    sessionStorage.setItem(CHAVE, JSON.stringify(p));
  } catch {}
}

export function lerPendente(): Pendente | null {
  try {
    const p = JSON.parse(sessionStorage.getItem(CHAVE) ?? "null");
    return p && typeof p.slug === "string" && p.corrida ? p : null;
  } catch {
    return null;
  }
}

export function limparPendente() {
  try {
    sessionStorage.removeItem(CHAVE);
  } catch {}
}
