"use client";

import { FANZINE, TEXTOS } from "@/lib/fanzine/config";

const T = TEXTOS.dicas;

/** Dica progressiva, 3 níveis por capítulo. Pedir dica não tira nada do jogador. */
export function Dicas({ dicas, ocupado, onPedir }: { dicas: string[]; ocupado: boolean; onPedir: () => void }) {
  const acabou = dicas.length >= FANZINE.maxDicas;
  return (
    <section aria-labelledby="dicas" className="surface-vidro flex flex-col gap-2 p-3">
      <h2 id="dicas" className="etiqueta m-0 text-[11px] text-laranja-claro">
        {T.titulo}
      </h2>
      <p className="m-0 text-sm text-areia">{T.aviso}</p>
      {dicas.length > 0 && (
        <ol className="m-0 flex list-none flex-col gap-2 p-0" aria-live="polite">
          {dicas.map((d, i) => (
            <li key={d} className="text-sm">
              <span className="block font-ficha text-[11px] uppercase text-areia">{T.nivel(i + 1)}</span>
              {d}
            </li>
          ))}
        </ol>
      )}
      <button type="button" className="btn h-11 self-start px-4" onClick={onPedir} disabled={ocupado || acabou}>
        {acabou ? T.acabaram : T.pedir}
      </button>
    </section>
  );
}
