"use client";

import { useState, useSyncExternalStore } from "react";
import { AJUSTES_PADRAO, CHAVE_AJUSTES, normalizarAjustes, type Ajustes } from "@/lib/riff/ajustes";

const ler = () => {
  try {
    return localStorage.getItem(CHAVE_AJUSTES);
  } catch {
    return null;
  }
};
const assinar = (cb: () => void) => {
  window.addEventListener("storage", cb);
  return () => window.removeEventListener("storage", cb);
};

// Ajustes em uso: o que o tripulante acabou de mudar, senão o do perfil, senão o do navegador.
export function useAjustes(servidor: Ajustes | null): [Ajustes, (a: Ajustes) => void] {
  const local = useSyncExternalStore(assinar, ler, () => null);
  const [proprio, setProprio] = useState<Ajustes | null>(null);
  let doNavegador: Ajustes | null = null;
  try {
    doNavegador = local ? normalizarAjustes(JSON.parse(local)) : null;
  } catch {}
  return [proprio ?? servidor ?? doNavegador ?? AJUSTES_PADRAO, setProprio];
}
