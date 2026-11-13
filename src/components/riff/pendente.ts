import type { Partida } from "@/lib/riff/regras";

// Partida de quem jogou sem conta: fica na sessão do navegador e é salva logo depois do cadastro.
const CHAVE = "riff-estelar:pendente";

export type Pendente = { slug: string; dificuldade: string; titulo: string; partida: Partida };

export function guardarPendente(p: Pendente) {
  try {
    sessionStorage.setItem(CHAVE, JSON.stringify(p));
  } catch {}
}

export function lerPendente(): Pendente | null {
  try {
    const p = JSON.parse(sessionStorage.getItem(CHAVE) ?? "null");
    return p && typeof p.slug === "string" && p.partida ? p : null;
  } catch {
    return null;
  }
}

export function limparPendente() {
  try {
    sessionStorage.removeItem(CHAVE);
  } catch {}
}
