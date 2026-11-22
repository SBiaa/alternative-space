import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { carregarBanca } from "@/app/actions/banca";
import { EventoView } from "@/components/banca/EventoView";
import { EVENTO_TXT, TEXTOS } from "@/lib/banca/conteudo";

export const metadata: Metadata = { title: "Banca na Feira · o evento", robots: { index: false } };

export default function Page() {
  return (
    <section className="bg-bege-fundo relative px-3 pb-10 pt-3 sm:px-6 sm:pt-6">
      <div className="mx-auto flex max-w-[1180px] flex-col gap-3">
        <Link href="/jogos/banca-na-feira/atelie" className="etiqueta text-[11px] text-bege-fosforo no-underline sm:text-xs">{EVENTO_TXT.voltarAtelie}</Link>
        <h1 className="sr-only">{TEXTOS.titulo}: {EVENTO_TXT.titulo}</h1>
        <Suspense fallback={<p className="text-areia">{TEXTOS.carregando}</p>}>
          <Conteudo />
        </Suspense>
      </div>
    </section>
  );
}

async function Conteudo() {
  return <EventoView inicial={await carregarBanca()} />;
}
