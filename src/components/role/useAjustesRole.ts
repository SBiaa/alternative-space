"use client";

import { useSyncExternalStore } from "react";
import { TECLAS_PADRAO } from "@/lib/role/config";
import { normalizarTeclas, type Teclas } from "@/lib/role/entradas";

// Ajustes do Rolê Noturno guardados no navegador: teclas remapeadas e botões na tela.
const CHAVE = "role-noturno:ajustes";
const EVENTO = "role-noturno:ajustes";

export type AjustesRole = { teclas: Teclas; botoesNaTela: boolean };

const lerBruto = () => {
  try {
    return localStorage.getItem(CHAVE) ?? "";
  } catch {
    return "";
  }
};

function interpretar(bruto: string): AjustesRole {
  let v: { teclas?: unknown; botoesNaTela?: unknown } | null = null;
  try {
    v = bruto ? JSON.parse(bruto) : null;
  } catch {}
  const toque = typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches;
  return { teclas: normalizarTeclas(v?.teclas), botoesNaTela: typeof v?.botoesNaTela === "boolean" ? v.botoesNaTela : toque };
}

const assinar = (cb: () => void) => {
  window.addEventListener("storage", cb);
  window.addEventListener(EVENTO, cb);
  return () => {
    window.removeEventListener("storage", cb);
    window.removeEventListener(EVENTO, cb);
  };
};

const assinarMovimento = (cb: () => void) => {
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
};

export function useAjustesRole() {
  const bruto = useSyncExternalStore(assinar, lerBruto, () => "");
  const reduzido = useSyncExternalStore(assinarMovimento, () => window.matchMedia("(prefers-reduced-motion: reduce)").matches, () => false);
  const mudar = (a: AjustesRole) => {
    try {
      localStorage.setItem(CHAVE, JSON.stringify(a));
    } catch {}
    window.dispatchEvent(new Event(EVENTO));
  };
  return { ajustes: bruto || typeof window !== "undefined" ? interpretar(bruto) : { teclas: { ...TECLAS_PADRAO }, botoesNaTela: false }, reduzido, mudar };
}
