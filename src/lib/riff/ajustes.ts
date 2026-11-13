import { RIFF, TRILHAS } from "./config";

// Ajustes do tripulante: offset de latência, teclas e velocidade das notas.
// Com conta, ficam em user_settings; sem conta, no localStorage.

export type Ajustes = { offsetMs: number; teclas: string[]; velocidade: number };

export const AJUSTES_PADRAO: Ajustes = { offsetMs: 0, teclas: [...RIFF.teclasPadrao], velocidade: 1 };
export const CHAVE_AJUSTES = "riff-estelar:ajustes";

const TECLAS_PROIBIDAS = [" ", "escape", "p", "tab", "enter"];

export function normalizarAjustes(v: unknown): Ajustes | null {
  if (!v || typeof v !== "object") return null;
  const o = v as Record<string, unknown>;
  const offset = Number(o.offsetMs);
  const vel = Number(o.velocidade);
  const teclas = Array.isArray(o.teclas) ? o.teclas.map((t) => String(t).toLowerCase()) : [];
  if (!Number.isInteger(offset) || Math.abs(offset) > RIFF.offsetLimiteMs) return null;
  if (!(RIFF.velocidades as readonly number[]).includes(vel)) return null;
  if (teclas.length !== TRILHAS || new Set(teclas).size !== TRILHAS) return null;
  if (teclas.some((t) => t.length === 0 || t.length > 12 || TECLAS_PROIBIDAS.includes(t))) return null;
  return { offsetMs: offset, teclas, velocidade: vel };
}

export function salvarAjustesLocais(a: Ajustes) {
  try {
    localStorage.setItem(CHAVE_AJUSTES, JSON.stringify(a));
  } catch {}
}

/** Nome da tecla pra mostrar na tela. */
export const nomeTecla = (t: string) => (t.length === 1 ? t.toUpperCase() : t.replace(/^arrow/, "seta ").replace(/^key/, ""));
