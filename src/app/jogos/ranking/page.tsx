import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { JogoArte } from "@/components/JogoArte";
import { RankingCarregando, RankingJogo } from "@/components/RankingJogo";
import { hrefJogo, jogosComRanking } from "@/lib/jogos";

export const metadata: Metadata = {
  title: "Ranking do Fliperama",
  description: "Os melhores recordes de cada jogo do Fliperama.",
};

export default function Page() {
  return (
    <section className="px-4 pb-18 pt-5 sm:px-6 sm:pt-9">
      <div className="mx-auto flex max-w-[1240px] flex-col gap-5 sm:gap-7.5">
        <div className="flex flex-col gap-1 sm:gap-1.5">
          <Link href="/jogos" className="etiqueta text-[11px] text-laranja-claro no-underline sm:text-xs">← Fliperama</Link>
          <h1 className="text-[28px] font-semibold leading-[1.05] tracking-[-0.02em] sm:text-[44px]">Ranking</h1>
          <p className="text-base text-areia">Os cinco melhores de cada jogo. Jogue com a conta aberta pra entrar na lista.</p>
        </div>
        <ul className="grid list-none gap-4 p-0 sm:grid-cols-2 lg:grid-cols-3">
          {jogosComRanking().map((j) => (
            <li key={j.slug} className="flex flex-col gap-2">
              <Link href={hrefJogo(j.slug)} className="flex items-center gap-3 text-creme no-underline hover:text-laranja-claro">
                <JogoArte jogo={j} className="size-10 shrink-0 rounded-md" />
                <span className="text-lg font-semibold">{j.nome}</span>
              </Link>
              <Suspense fallback={<RankingCarregando />}>
                <RankingJogo slug={j.slug} compacto />
              </Suspense>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
