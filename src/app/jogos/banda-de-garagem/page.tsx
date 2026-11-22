import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { carregarBanda } from "@/app/actions/banda";
import { BandaCapa } from "@/components/banda/BandaCapa";
import { TEXTOS } from "@/lib/banda/conteudo";

export const metadata: Metadata = {
  title: "Banda de Garagem",
  description: "Monte uma banda no bairro, ensaie, componha, toque nos palcos da região e grave uma demo.",
};

export default function Page() {
  return (
    <section className="bg-bege-fundo relative px-4 pb-18 pt-5 sm:px-6 sm:pt-9">
      <div className="mx-auto flex max-w-[720px] flex-col gap-5">
        <Link href="/jogos" className="etiqueta inline-flex min-h-11 items-center text-[11px] text-bege-fosforo no-underline sm:text-xs">{TEXTOS.voltar}</Link>
        <h1 className="m-0 text-[28px] font-semibold leading-[1.05] tracking-[-0.02em] sm:text-[44px]">{TEXTOS.titulo}</h1>
        <p className="m-0 text-base text-areia">{TEXTOS.chamada}</p>
        <ul className="m-0 flex list-none flex-col gap-1.5 p-0 text-creme">
          {TEXTOS.regras.map((r) => <li key={r}>{r}</li>)}
        </ul>
        <Suspense fallback={<p className="text-areia">{TEXTOS.procurando}</p>}>
          <Conteudo />
        </Suspense>
        <p className="m-0 text-xs text-poeira">{TEXTOS.avisoDinheiro}</p>
      </div>
    </section>
  );
}

async function Conteudo() {
  return <BandaCapa inicial={await carregarBanda()} />;
}
