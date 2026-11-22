import type { Metadata } from "next";
import Link from "next/link";
import { Bestiario } from "@/components/assombracoes/Bestiario";
import { TEXTOS } from "@/lib/assombracoes/config";

export const metadata: Metadata = { title: `${TEXTOS.bestiario} · ${TEXTOS.titulo}` };

export default function Page() {
  return (
    <section className="bg-ceu relative px-4 pb-18 pt-5 sm:px-6 sm:pt-9">
      <div className="mx-auto flex max-w-[1100px] flex-col gap-5">
        <Link href="/jogos/assombracoes" className="etiqueta text-[11px] text-laranja-claro no-underline sm:text-xs">← {TEXTOS.titulo}</Link>
        <h1 className="m-0 text-[28px] font-semibold leading-[1.05] tracking-[-0.02em] sm:text-[44px]">{TEXTOS.bestiario}</h1>
        <Bestiario />
      </div>
    </section>
  );
}
