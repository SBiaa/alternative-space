import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { carregarTaverna } from "@/app/actions/taverna";
import { TavernaNoite } from "@/components/taverna/TavernaNoite";

export const metadata: Metadata = { title: "Taverna do Dragão Cansado · a noite", robots: { index: false } };

export default function Page() {
  return (
    <section className="bg-lareira-madeira relative px-4 pb-12 pt-4 sm:px-6 sm:pt-8">
      <div className="mx-auto flex max-w-[1240px] flex-col gap-3">
        <Link href="/jogos/taverna" className="etiqueta text-[11px] text-lareira-brasa no-underline sm:text-xs">← Taverna</Link>
        <h1 className="sr-only">Taverna do Dragão Cansado: a noite</h1>
        <Suspense fallback={<p className="text-areia">Acendendo a lareira…</p>}>
          <Noite />
        </Suspense>
      </div>
    </section>
  );
}

async function Noite() {
  return <TavernaNoite inicial={await carregarTaverna()} />;
}
