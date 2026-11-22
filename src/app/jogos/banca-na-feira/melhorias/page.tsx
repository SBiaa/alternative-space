import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { carregarBanca } from "@/app/actions/banca";
import { BancaMelhorias } from "@/components/banca/BancaMelhorias";
import { MELHORIAS_TXT, TEXTOS } from "@/lib/banca/conteudo";

export const metadata: Metadata = { title: "Banca na Feira · melhorias", robots: { index: false } };

export default function Page() {
  return (
    <section className="bg-bege-fundo relative px-4 pb-12 pt-4 sm:px-6 sm:pt-6">
      <div className="mx-auto flex max-w-[860px] flex-col gap-4">
        <Link href="/jogos/banca-na-feira" className="etiqueta text-[11px] text-bege-fosforo no-underline sm:text-xs">{TEXTOS.voltarBanca}</Link>
        <h1 className="m-0 text-[28px] font-semibold leading-[1.05] tracking-[-0.02em]">{MELHORIAS_TXT.titulo}</h1>
        <Suspense fallback={<p className="text-areia">{TEXTOS.carregando}</p>}>
          <Conteudo />
        </Suspense>
      </div>
    </section>
  );
}

async function Conteudo() {
  return <BancaMelhorias inicial={await carregarBanca()} />;
}
