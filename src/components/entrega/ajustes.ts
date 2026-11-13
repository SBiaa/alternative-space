"use client";

import { useCallback, useSyncExternalStore } from "react";
import { ACOES, CONTROLES_PADRAO, type Acao } from "@/lib/entrega/config";
import type { TurnoEnviado } from "@/lib/entrega/regras";

// Configurações do jogo: ficam só no navegador.
const CHAVE = "entrega-na-chuva:ajustes";
export type AjustesEntrega = { chuva: boolean; piscarMenos: boolean; relaxado: boolean; teclas: Record<Acao, string[]> };
export const AJUSTES_PADRAO: AjustesEntrega = { chuva: true, piscarMenos: false, relaxado: false, teclas: CONTROLES_PADRAO };

function normalizar(v: unknown): AjustesEntrega {
  const a = (v ?? {}) as Partial<AjustesEntrega>;
  const teclas = { ...CONTROLES_PADRAO };
  for (const k of ACOES) {
    const t = a.teclas?.[k];
    if (Array.isArray(t) && t.every((x) => typeof x === "string") && t.length) teclas[k] = t.slice(0, 3);
  }
  return { chuva: a.chuva !== false, piscarMenos: a.piscarMenos === true, relaxado: a.relaxado === true, teclas };
}

const ouvintes = new Set<() => void>();
const assinar = (f: () => void) => {
  ouvintes.add(f);
  return () => ouvintes.delete(f);
};
const ler = () => {
  try {
    return localStorage.getItem(CHAVE);
  } catch {
    return null;
  }
};

export function useAjustesEntrega(): [AjustesEntrega, (a: AjustesEntrega) => void] {
  const bruto = useSyncExternalStore(assinar, ler, () => null);
  let atual = AJUSTES_PADRAO;
  try {
    atual = bruto ? normalizar(JSON.parse(bruto)) : AJUSTES_PADRAO;
  } catch {}
  const salvar = useCallback((a: AjustesEntrega) => {
    try {
      localStorage.setItem(CHAVE, JSON.stringify(a));
    } catch {}
    ouvintes.forEach((f) => f());
  }, []);
  return [atual, salvar];
}

/** Nome legível de uma tecla do Phaser. */
export const nomeTecla = (t: string) => ({ UP: "↑", DOWN: "↓", LEFT: "←", RIGHT: "→", SPACE: "Espaço", ESC: "Esc" })[t] ?? t;

/** KeyboardEvent → nome de tecla do Phaser (KeyCodes). */
export function teclaDoEvento(e: KeyboardEvent): string | null {
  const c = e.code;
  if (c.startsWith("Key")) return c.slice(3);
  if (c.startsWith("Digit")) return ["ZERO", "ONE", "TWO", "THREE", "FOUR", "FIVE", "SIX", "SEVEN", "EIGHT", "NINE"][Number(c.slice(5))];
  if (c.startsWith("Arrow")) return c.slice(5).toUpperCase();
  const mapa: Record<string, string> = { Space: "SPACE", Escape: "ESC", ShiftLeft: "SHIFT", ShiftRight: "SHIFT", Enter: "ENTER", ControlLeft: "CTRL", Tab: "TAB" };
  return mapa[c] ?? null;
}

// Turno de quem jogou sem conta: fica na sessão e é creditado uma vez depois do cadastro.
const PENDENTE = "entrega-na-chuva:pendente";
export function guardarPendente(t: TurnoEnviado) {
  try {
    sessionStorage.setItem(PENDENTE, JSON.stringify(t));
  } catch {}
}
export function tirarPendente(): TurnoEnviado | null {
  try {
    const t = JSON.parse(sessionStorage.getItem(PENDENTE) ?? "null");
    sessionStorage.removeItem(PENDENTE);
    return t && Array.isArray(t.pedidos) ? t : null;
  } catch {
    return null;
  }
}
