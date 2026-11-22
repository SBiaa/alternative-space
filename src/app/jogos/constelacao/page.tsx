import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { CartaCeleste } from "@/components/constelacao/CartaCeleste";
import { getUser } from "@/lib/auth/server";
import { TEXTOS } from "@/lib/constelacao/config";
import { montarEstado } from "@/lib/constelacao/servico";

export const metadata: Metadata = { title: TEXTOS.titulo, description: TEXTOS.descricao };

// Tema de jogo "Carta Celeste": tokens carta-* em globals.css, só dentro desta página.
export default function Page() {
  return (
    <section className="bg-carta-fundo relative px-4 pb-18 pt-5 sm:px-6 sm:pt-9">
      <div className="mx-auto flex max-w-[640px] flex-col gap-5">
        <div className="flex flex-col gap-1.5">
          <Link href="/jogos" className="etiqueta text-[11px] text-laranja-claro no-underline sm:text-xs">{TEXTOS.voltar}</Link>
          <h1 className="m-0 text-[28px] font-semibold leading-[1.05] tracking-[-0.02em] sm:text-[44px]">{TEXTOS.titulo}</h1>
          <p className="m-0 text-base text-areia">{TEXTOS.descricao}</p>
        </div>
        <Suspense fallback={<p className="text-areia">{TEXTOS.carregando}</p>}>
          <Jogo />
        </Suspense>
      </div>
    </section>
  );
}

async function Jogo() {
  const user = await getUser();
  // Sem conta, o navegador manda o save depois de abrir; o servidor reconfere e devolve o estado.
  const inicial = await montarEstado(user?.id ?? null, null);
  return <CartaCeleste inicial={inicial} />;
}
