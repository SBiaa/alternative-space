import type { Metadata } from "next";
import Link from "next/link";
import { ResumoPagina } from "@/components/banca/ResumoPagina";
import { TEXTOS } from "@/lib/banca/conteudo";

export const metadata: Metadata = { title: "Banca na Feira · resumo do evento", robots: { index: false } };

export default function Page() {
  return (
    <section className="bg-bege-fundo relative px-4 pb-12 pt-4 sm:px-6 sm:pt-6">
      <div className="mx-auto flex max-w-[860px] flex-col gap-4">
        <Link href="/jogos/banca-na-feira" className="etiqueta text-[11px] text-bege-fosforo no-underline sm:text-xs">{TEXTOS.voltarBanca}</Link>
        <ResumoPagina />
      </div>
    </section>
  );
}
