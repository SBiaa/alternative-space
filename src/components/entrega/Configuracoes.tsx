"use client";

import { useEffect, useState } from "react";
import { ACOES, TEXTOS, type Acao } from "@/lib/entrega/config";
import { nomeTecla, teclaDoEvento, useAjustesEntrega } from "./ajustes";

const T = TEXTOS.ajustes;

export function Configuracoes() {
  const [a, salvar] = useAjustesEntrega();
  const [ouvindo, setOuvindo] = useState<Acao | null>(null);

  useEffect(() => {
    if (!ouvindo) return;
    const f = (e: KeyboardEvent) => {
      e.preventDefault();
      const t = teclaDoEvento(e);
      if (!t) return;
      // A tecla sai de outra ação, pra não ficar duplicada.
      const teclas = Object.fromEntries(ACOES.map((k) => [k, a.teclas[k].filter((x) => x !== t)])) as typeof a.teclas;
      teclas[ouvindo] = [t, ...teclas[ouvindo].filter((x) => x !== t)].slice(0, 2);
      salvar({ ...a, teclas });
      setOuvindo(null);
    };
    window.addEventListener("keydown", f, { once: true });
    return () => window.removeEventListener("keydown", f);
  }, [ouvindo, a, salvar]);

  const caixa = (campo: "chuva" | "piscarMenos" | "relaxado", rotulo: string) => (
    <label className="flex min-h-11 items-center gap-3 text-sm">
      <input type="checkbox" className="size-5 accent-[var(--color-laranja-claro)]" checked={a[campo]} onChange={(e) => salvar({ ...a, [campo]: e.target.checked })} />
      {rotulo}
    </label>
  );

  return (
    <details className="surface-vidro p-4">
      <summary className="min-h-11 cursor-pointer content-center font-semibold">{T.titulo}</summary>
      <div className="mt-2 flex flex-col gap-1">
        {caixa("chuva", T.chuva)}
        {caixa("piscarMenos", T.piscar)}
        {caixa("relaxado", T.relaxado)}
        <p className="rotulo mt-3 text-areia">{T.teclas}</p>
        <ul className="m-0 grid list-none gap-2 p-0 sm:grid-cols-2">
          {ACOES.map((k) => (
            <li key={k} className="flex items-center justify-between gap-2">
              <span className="text-sm">{TEXTOS.acoes[k]}</span>
              <button type="button" className="botao-vidro font-ficha text-sm" aria-label={`${TEXTOS.acoes[k]}: ${a.teclas[k].map(nomeTecla).join(", ")}`} onClick={() => setOuvindo(k)}>
                {ouvindo === k ? T.aperte : a.teclas[k].map(nomeTecla).join(" / ")}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </details>
  );
}
