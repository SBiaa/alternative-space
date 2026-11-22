import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { carregarConves } from "@/app/actions/cartas-do-conves";
import { CartasDoConves } from "@/components/cartas-do-conves/CartasDoConves";
import { TEXTOS } from "@/lib/cartas-do-conves/textos";

export const metadata: Metadata = {
  title: TEXTOS.titulo,
  description: TEXTOS.descricaoMeta,
};

export default function Page() {
  return (
    <section className="bg-ceu relative px-4 pb-18 pt-5 sm:px-6 sm:pt-9">
      <div className="mx-auto flex max-w-[1100px] flex-col gap-5">
        <Link href="/jogos" className="etiqueta text-[11px] text-laranja-claro no-underline sm:text-xs">
          {TEXTOS.voltar}
        </Link>
        <h1 className="m-0 text-[28px] font-semibold leading-[1.05] tracking-[-0.02em] sm:text-[44px]">{TEXTOS.titulo}</h1>
        <p className="m-0 max-w-[60ch] text-base text-areia">{TEXTOS.chamada}</p>
        <Suspense fallback={<p className="text-areia">{TEXTOS.capa.carregando}</p>}>
          <Conteudo />
        </Suspense>
      </div>
    </section>
  );
}

async function Conteudo() {
  return <CartasDoConves inicial={await carregarConves()} />;
}
