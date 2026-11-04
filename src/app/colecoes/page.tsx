import type { Metadata } from "next";
import Link from "next/link";
import { Star } from "@/components/Star";
import { colecoes } from "@/lib/colecoes";
import { resultTheme } from "@/lib/quiz";

export const metadata: Metadata = {
  title: "Coleções",
  description: "Os drops da Alternative Space. Tripulantes veem cada coleção na íntegra.",
};

export default function Page() {
  return (
    <section className="secao !pt-16">
      <div className="miolo flex flex-col gap-10">
        <div className="relative flex max-w-[760px] flex-col gap-4">
          <span className="etiqueta text-azul">Coleções</span>
          <h1 className="font-titulo font-bold leading-[1] text-azul" style={{ fontSize: "clamp(2.4rem, 6vw, 4.25rem)" }}>Os drops, peça por peça.</h1>
          <p className="text-lg leading-relaxed text-tinta">Todo mundo vê uma prévia. Tripulantes veem a coleção inteira, com detalhes e preços.</p>
          <Star className="absolute -top-4 right-0 hidden sm:block" />
        </div>
        <ul className="grid list-none grid-cols-[repeat(auto-fit,minmax(300px,1fr))] gap-7 p-0">
          {Object.entries(colecoes).map(([slug, c]) => {
            const theme = resultTheme[c.color] ?? resultTheme.azul;
            return (
              <li key={slug}>
                <Link href={`/colecoes/${slug}`} className={`flex h-full flex-col gap-3 rounded-2xl border-2 border-noite p-7 no-underline shadow-duro-sm ${theme.card}`}>
                  <span className={`etiqueta text-[13px] ${theme.label}`}>{c.status} · {c.date}</span>
                  <h2 className="font-titulo text-[2rem] font-bold leading-[1.05]">{c.name}</h2>
                  <p className="leading-normal">{c.tagline}</p>
                  <span className="mt-auto pt-2 font-ficha text-[13px] uppercase tracking-wider">{c.pieces.length} peças</span>
                  <span className="font-titulo text-xl font-bold">Ver coleção →</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
