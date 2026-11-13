import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { carregarLan } from "@/app/actions/lan";
import { LanDia } from "@/components/lan/LanDia";
import { TEXTOS } from "@/lib/lan/conteudo";

export const metadata: Metadata = { title: "Lan House 2005 · o dia", robots: { index: false } };

export default function Page() {
  return (
    <section className="bg-bege-fundo relative px-3 pb-12 pt-3 sm:px-6 sm:pt-6">
      <div className="mx-auto flex max-w-[1280px] flex-col gap-3">
        <Link href="/jogos/lan-house" className="etiqueta text-[11px] text-bege-fosforo no-underline sm:text-xs">← Lan House</Link>
        <h1 className="sr-only">{TEXTOS.titulo}: o dia</h1>
        <Suspense fallback={<p className="text-areia">{TEXTOS.carregandoSalao}</p>}>
          <Dia />
        </Suspense>
      </div>
    </section>
  );
}

async function Dia() {
  return <LanDia inicial={await carregarLan()} />;
}
