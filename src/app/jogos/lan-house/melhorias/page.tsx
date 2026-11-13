import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { carregarLan } from "@/app/actions/lan";
import { LanMelhorias } from "@/components/lan/LanMelhorias";
import { TEXTOS } from "@/lib/lan/conteudo";

export const metadata: Metadata = { title: "Lan House 2005 · melhorias", robots: { index: false } };

export default function Page() {
  return (
    <section className="bg-bege-fundo relative px-4 pb-16 pt-5 sm:px-6 sm:pt-8">
      <div className="mx-auto flex max-w-[960px] flex-col gap-4">
        <Link href="/jogos/lan-house" className="etiqueta text-[11px] text-bege-fosforo no-underline sm:text-xs">← Lan House</Link>
        <h1 className="m-0 text-[26px] font-semibold leading-tight sm:text-[36px]">Melhorias</h1>
        <Suspense fallback={<p className="text-areia">{TEXTOS.procurando}</p>}>
          <Melhorias />
        </Suspense>
      </div>
    </section>
  );
}

async function Melhorias() {
  return <LanMelhorias inicial={await carregarLan()} />;
}
