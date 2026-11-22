import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { carregarBanda } from "@/app/actions/banda";
import { Compor } from "@/components/banda/Compor";
import { TEXTOS } from "@/lib/banda/conteudo";

export const metadata: Metadata = {
  title: "Banda de Garagem · compor",
  robots: { index: false },
};

export default function Page() {
  return (
    <section className="bg-bege-fundo relative px-4 pb-18 pt-5 sm:px-6 sm:pt-9">
      <div className="mx-auto flex max-w-[720px] flex-col gap-5">
        <Link href="/jogos/banda-de-garagem/semana" className="etiqueta inline-flex min-h-11 items-center text-[11px] text-bege-fosforo no-underline sm:text-xs">{TEXTOS.capa}</Link>
        <h1 className="m-0 text-[28px] font-semibold leading-[1.05] tracking-[-0.02em] sm:text-[44px]">{TEXTOS.composicao.titulo}</h1>
        <Suspense fallback={<p className="text-areia">{TEXTOS.procurando}</p>}>
          <Conteudo />
        </Suspense>
      </div>
    </section>
  );
}

async function Conteudo() {
  return <Compor inicial={await carregarBanda()} />;
}
