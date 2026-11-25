"use client";

import { useState, useTransition } from "react";
import { escolherOvo } from "@/app/actions/bichinho";
import { ESPECIES, TEXTOS } from "@/lib/bichinho/config";
import { BichinhoSvg } from "./BichinhoSvg";
import "./bichinho.css";

// Primeira visita: três ovos, três espécies. A escolha vai pro servidor, que cria o bichinho.
export function EscolhaOvo() {
  const [pendente, comecar] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  const escolher = (especie: string) =>
    comecar(async () => {
      const r = await escolherOvo({ especie });
      setErro(r.error ?? null);
    });

  return (
    <section aria-labelledby="bic-ovo" className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 id="bic-ovo" className="m-0 text-2xl font-semibold">
          {TEXTOS.ovo.titulo}
        </h2>
        <p className="m-0 text-areia">{TEXTOS.ovo.descricao}</p>
      </div>
      <ul className="m-0 grid list-none gap-3 p-0 sm:grid-cols-3">
        {ESPECIES.map((e) => (
          <li key={e.slug} className="bic-card flex flex-col items-center gap-2 p-4 text-center">
            <div className="w-28">
              <BichinhoSvg especie={e} fase={0} humor="feliz" />
            </div>
            <h3 className="m-0 text-lg font-semibold">{e.nome}</h3>
            <p className="m-0 text-sm text-areia">{e.descricao}</p>
            <button type="button" className="bic-btn mt-auto" disabled={pendente} onClick={() => escolher(e.slug)}>
              {TEXTOS.ovo.botao(e.nome)}
            </button>
          </li>
        ))}
      </ul>
      <p role="status" aria-live="polite" className="m-0 min-h-6 text-sm text-laranja-claro">
        {erro}
      </p>
    </section>
  );
}
