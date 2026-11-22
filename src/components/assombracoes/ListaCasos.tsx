"use client";

import Link from "next/link";
import { LUGARES, TEXTOS, type LugarId } from "@/lib/assombracoes/config";
import { IconeLugar } from "./arte";
import { AvisoConta } from "./pecas";
import { useVila } from "./useVila";

export type CasoResumo = { slug: string; titulo: string; resumo: string; lugarPrincipal: LugarId };

const href = (slug: string) => `/jogos/assombracoes/caso/${slug}`;

/** Lista de casos da capa, com o estado de cada um (novo, em andamento, resolvido). */
export function ListaCasos({ casos }: { casos: CasoResumo[] }) {
  const T = TEXTOS;
  const v = useVila();
  if (casos.length === 0) return <p className="m-0 text-areia">{T.semCasos}</p>;
  return (
    <div className="flex flex-col gap-3">
      <ul className="m-0 grid list-none gap-3 p-0 sm:grid-cols-2 lg:grid-cols-3">
        {casos.map((c) => {
          const p = v.casos[c.slug];
          const resolvido = Boolean(p?.resolvido);
          const andamento = !resolvido && p && (p.estado.sinais.length > 0 || p.estado.depoimentos.length > 0);
          return (
            <li key={c.slug} className="surface-vidro flex flex-col gap-2 p-4">
              <div className="flex items-center gap-3">
                <IconeLugar id={c.lugarPrincipal} className="size-10 shrink-0" />
                <div>
                  <h3 className="m-0 text-lg font-semibold text-creme">{c.titulo}</h3>
                  <p className="m-0 font-ficha text-[11px] uppercase text-laranja-claro">{LUGARES[c.lugarPrincipal].nome}{resolvido ? ` · ${T.casoResolvido}` : ""}</p>
                </div>
              </div>
              <p className="m-0 text-sm text-areia">{c.resumo}</p>
              <div className="mt-auto">
                <Link href={href(c.slug)} className={`${resolvido ? "botao-vidro" : "botao-laranja"} inline-flex items-center no-underline`}>
                  {resolvido ? T.origemTitulo : andamento ? T.continuarCaso : T.abrirCaso}
                </Link>
              </div>
            </li>
          );
        })}
      </ul>
      {v.pronto && !v.logado && Object.keys(v.casos).length > 0 && <AvisoConta />}
    </div>
  );
}
