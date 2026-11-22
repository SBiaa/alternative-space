import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { carregarLaje } from "@/app/actions/laje";
import { LajeJogo } from "@/components/laje/LajeJogo";
import { TEXTOS } from "@/lib/laje/conteudo";

export const metadata: Metadata = { title: "A laje · Laje Verde" };

export default function Page() {
  return (
    <section className="bg-bege-fundo px-4 pb-18 pt-5 sm:px-6 sm:pt-9">
      <div className="mx-auto flex max-w-[480px] flex-col gap-3">
        <Link href="/jogos/laje-verde" className="etiqueta text-[11px] text-bege-fosforo no-underline sm:text-xs">
          ← {TEXTOS.titulo}
        </Link>
        <Suspense fallback={<p className="m-0 text-areia">{TEXTOS.carregando}</p>}>
          <Laje />
        </Suspense>
      </div>
    </section>
  );
}

async function Laje() {
  return <LajeJogo inicial={await carregarLaje()} />;
}
