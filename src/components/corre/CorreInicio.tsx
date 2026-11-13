"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { CORRE, reais } from "@/lib/corre/config";
import { CHAVE_LOCAL, migrar } from "@/lib/corre/save";

const nada = () => () => {};
const lerBruto = () => {
  try {
    return localStorage.getItem(CHAVE_LOCAL);
  } catch {
    return null;
  }
};

// Apresentação: "Continuar" só aparece se houver save no aparelho.
export function CorreInicio() {
  const bruto = useSyncExternalStore(nada, lerBruto, () => null);
  let save: { dia: number; dinheiro: number } | null = null;
  try {
    const s = bruto ? migrar(JSON.parse(bruto)) : null;
    if (s) save = { dia: s.dia, dinheiro: s.dinheiro };
  } catch {}
  return (
    <div className="flex flex-wrap gap-3">
      {save && (
        <Link href="/jogos/o-corre/jogar" className="btn bg-laranja text-noite">
          {CORRE.textos.continuar} · dia {save.dia} · {reais(save.dinheiro)}
        </Link>
      )}
      <Link href="/jogos/o-corre/jogar?novo=1" className={save ? "btn-contorno min-h-11 px-4" : "btn bg-laranja text-noite"}>
        {CORRE.textos.novoJogo}
      </Link>
    </div>
  );
}
