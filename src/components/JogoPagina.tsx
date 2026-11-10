import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { FeedbackJogo } from "./FeedbackJogo";
import { JogoArte } from "./JogoArte";
import { JogoRecorde, JogoTela } from "./JogoTela";
import { RankingJogo, RankingCarregando } from "./RankingJogo";
import { acharJogo, hrefJogo, outrosJogos } from "@/lib/jogos";

type Props = {
  slug: string;
  // O jogo em si (com os controles de toque dele).
  children: ReactNode;
  // Texto do cartão "Como jogar".
  comoJogar: ReactNode;
  // Algo a mais embaixo do "Como jogar" (tabela de comandos, aviso de fã...).
  extra?: ReactNode;
  // Jogos que não são uma tela 16:9 (Monte seu Pirata) usam a largura toda.
  largo?: boolean;
};

// Molde comum das páginas do Fliperama.
export function JogoPagina({ slug, children, comoJogar, extra, largo }: Props) {
  const jogo = acharJogo(slug);
  return (
    <section className="px-4 pb-18 pt-2.5 sm:px-6 sm:pt-8">
      <div className={`mx-auto flex flex-col gap-3.5 sm:gap-5 ${largo ? "max-w-[1200px]" : "max-w-[960px]"}`}>
        <JogoTela nome={jogo.nome}>{children}</JogoTela>

        <div className={`mt-1 grid gap-3 ${jogo.recorde ? "sm:grid-cols-[minmax(0,1fr)_280px]" : ""}`}>
          <div className="card flex flex-col gap-1.5 px-4 py-3.5">
            <span className="etiqueta text-[10px] text-laranja-claro">Como jogar</span>
            <div className="text-sm leading-normal text-areia sm:text-[15px]">{comoJogar}</div>
          </div>
          <JogoRecorde slug={slug} />
        </div>

        {jogo.recorde && (
          <Suspense fallback={<RankingCarregando />}>
            <RankingJogo slug={slug} />
          </Suspense>
        )}

        {extra}

        <FeedbackJogo slug={slug} nome={jogo.nome} />

        <section aria-labelledby="outros-jogos" className="mt-2.5 flex flex-col gap-2.5">
          <h2 id="outros-jogos" className="text-lg font-semibold">Outros jogos</h2>
          <ul className="grid list-none grid-cols-3 gap-2 p-0 sm:gap-3.5">
            {outrosJogos(slug).map((o) => (
              <li key={o.slug}>
                <Link href={hrefJogo(o.slug)} className="relative block overflow-hidden rounded-lg border border-creme/18 text-creme no-underline hover:border-creme/40">
                  <JogoArte jogo={o} className="aspect-square" />
                  <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-noite/85 to-transparent p-2 pt-6 text-xs font-semibold leading-tight sm:p-3 sm:text-sm">
                    {o.nome}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </section>
  );
}
