"use client";

import { useState } from "react";
import { TECLAS_PADRAO, TEXTOS, type Direcao } from "@/lib/role/config";
import { normalizarTeclas } from "@/lib/role/entradas";
import type { AjustesRole } from "./useAjustesRole";

// Remapear teclas e ligar os botões de manobra na tela.
export function AjustesControles({ ajustes, mudar }: { ajustes: AjustesRole; mudar: (a: AjustesRole) => void }) {
  const [ouvindo, setOuvindo] = useState<Direcao | null>(null);
  return (
    <details className="surface-vidro p-3 text-sm">
      <summary className="min-h-11 cursor-pointer content-center font-semibold">{TEXTOS.ajustes.titulo}</summary>
      <div className="mt-2 flex flex-col gap-3">
        <label className="flex min-h-11 items-center gap-2">
          <input type="checkbox" className="size-5" checked={ajustes.botoesNaTela} onChange={(e) => mudar({ ...ajustes, botoesNaTela: e.target.checked })} />
          {TEXTOS.ajustes.botoesNaTela}
        </label>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(TECLAS_PADRAO) as Direcao[]).map((d) => (
            <button
              key={d}
              type="button"
              className="botao-vidro min-h-11 px-3 font-ficha text-xs"
              aria-pressed={ouvindo === d}
              onClick={() => setOuvindo(d)}
              onKeyDown={(e) => {
                if (ouvindo !== d || e.key === "Tab") return;
                e.preventDefault();
                mudar({ ...ajustes, teclas: normalizarTeclas({ ...ajustes.teclas, [d]: e.key }) });
                setOuvindo(null);
              }}
              onBlur={() => setOuvindo(null)}
            >
              {TEXTOS.ajustes.tecla[d]}: {ouvindo === d ? TEXTOS.ajustes.aperte : ajustes.teclas[d]}
            </button>
          ))}
          <button type="button" className="botao-vidro min-h-11 px-3 text-xs" onClick={() => mudar({ ...ajustes, teclas: { ...TECLAS_PADRAO } })}>
            {TEXTOS.ajustes.padrao}
          </button>
        </div>
      </div>
    </details>
  );
}
