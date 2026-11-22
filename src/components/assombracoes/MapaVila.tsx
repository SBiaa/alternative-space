"use client";

import Link from "next/link";
import { LUGAR_IDS, LUGARES, TEXTOS } from "@/lib/assombracoes/config";
import { IconeLugar } from "./arte";
import type { CasoResumo } from "./ListaCasos";
import { useVila } from "./useVila";

/** Os 6 lugares da vila. Onde há caso aberto (ainda não resolvido), aparece o ponto laranja e o link. */
export function MapaVila({ casos }: { casos: CasoResumo[] }) {
  const T = TEXTOS;
  const v = useVila();
  return (
    <ul className="m-0 grid list-none gap-3 p-0 sm:grid-cols-2 lg:grid-cols-3">
      {LUGAR_IDS.map((id) => {
        const abertos = casos.filter((c) => c.lugarPrincipal === id && !v.casos[c.slug]?.resolvido);
        return (
          <li key={id} className="surface-vidro flex flex-col gap-3 p-4">
            <div className="flex items-center gap-3">
              <IconeLugar id={id} className="size-12 shrink-0" />
              <div>
                <h2 className="m-0 flex items-center gap-2 text-xl font-semibold text-creme">
                  {LUGARES[id].nome}
                  {abertos.length > 0 && (
                    <span className="inline-flex items-center gap-1 font-ficha text-[11px] font-normal uppercase text-laranja-claro">
                      <span aria-hidden="true" className="inline-block size-2.5 rounded-full bg-laranja-claro" />
                      {T.casoAberto}
                    </span>
                  )}
                </h2>
                <p className="m-0 text-sm text-areia">{LUGARES[id].descricao}</p>
              </div>
            </div>
            {abertos.map((c) => (
              <Link key={c.slug} href={`/jogos/assombracoes/caso/${c.slug}`} className="botao-laranja inline-flex items-center no-underline">
                {c.titulo}
              </Link>
            ))}
          </li>
        );
      })}
    </ul>
  );
}
