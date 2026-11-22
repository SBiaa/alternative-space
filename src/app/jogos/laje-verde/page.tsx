import type { Metadata } from "next";
import Link from "next/link";
import { CenaCeu } from "@/components/laje/arte";
import "@/components/laje/laje.css";
import { TEXTOS } from "@/lib/laje/conteudo";

export const metadata: Metadata = {
  title: "Laje Verde",
  description: "Uma horta calma na laje de casa. As plantas crescem sozinhas, a chuva rega, o pombo atrapalha e o vizinho troca muda.",
};

// Capa: arte, "Ir pra laje" e "Como jogar" em 3 passos.
export default function Page() {
  return (
    <section className="bg-bege-fundo px-4 pb-18 pt-5 sm:px-6 sm:pt-9">
      <div className="tema-laje mx-auto flex max-w-[480px] flex-col gap-4">
        <Link href="/jogos" className="etiqueta text-[11px] text-bege-fosforo no-underline sm:text-xs">
          {TEXTOS.voltar}
        </Link>
        <div className="overflow-hidden rounded-lg">
          <CenaCeu clima="sol" enfeites={{}} />
        </div>
        <h1 className="m-0 text-[32px] font-semibold leading-[1.05] tracking-[-0.02em] sm:text-[44px]">{TEXTOS.titulo}</h1>
        <p className="m-0 text-base text-areia">{TEXTOS.chamada}</p>
        <Link href="/jogos/laje-verde/laje" className="btn flex h-14 w-full items-center justify-center bg-laranja text-lg text-noite">
          {TEXTOS.botaoIr}
        </Link>
        <div className="painel flex flex-col gap-2 px-4 py-3.5">
          <h2 className="etiqueta m-0 text-[11px]">{TEXTOS.comoJogar}</h2>
          <ol className="m-0 flex flex-col gap-1.5 pl-5 text-[15px]">
            {TEXTOS.passos.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ol>
        </div>
        <p className="m-0 text-xs text-poeira">{TEXTOS.avisoMoeda}</p>
      </div>
    </section>
  );
}
