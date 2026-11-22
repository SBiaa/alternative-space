import type { Metadata } from "next";
import Link from "next/link";
import { MapaVila } from "@/components/assombracoes/MapaVila";
import { casosVisiveis } from "@/lib/assombracoes/casos";
import { TEXTOS, VILA } from "@/lib/assombracoes/config";

export const metadata: Metadata = { title: `${TEXTOS.mapa} · ${TEXTOS.titulo}` };

export default function Page() {
  const T = TEXTOS;
  const casos = casosVisiveis().map((c) => ({ slug: c.publico.slug, titulo: c.publico.titulo, resumo: c.publico.resumo, lugarPrincipal: c.publico.lugarPrincipal }));
  return (
    <section className="bg-ceu relative px-4 pb-18 pt-5 sm:px-6 sm:pt-9">
      <div className="mx-auto flex max-w-[1100px] flex-col gap-5">
        <Link href="/jogos/assombracoes" className="etiqueta text-[11px] text-laranja-claro no-underline sm:text-xs">← {T.titulo}</Link>
        <div className="flex flex-col gap-1">
          <span className="rotulo text-laranja-claro">{VILA.nome}</span>
          <h1 className="m-0 text-[28px] font-semibold leading-[1.05] tracking-[-0.02em] sm:text-[44px]">{T.mapa}</h1>
          <p className="m-0 text-areia">{T.mapaDica}</p>
        </div>
        <MapaVila casos={casos} />
      </div>
    </section>
  );
}
