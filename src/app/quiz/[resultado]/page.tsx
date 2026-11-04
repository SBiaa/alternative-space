import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { ShareButton } from "@/components/ShareButton";
import { Star } from "@/components/Star";
import { isResultId, quiz, resultIds, resultTheme } from "@/lib/quiz";
import { joinHref, site } from "@/config/site";

export function generateStaticParams() {
  return resultIds.map((resultado) => ({ resultado }));
}

export async function generateMetadata({ params }: PageProps<"/quiz/[resultado]">): Promise<Metadata> {
  const { resultado } = await params;
  if (!isResultId(resultado)) return {};
  const r = quiz.results[resultado];
  const title = `Eu sou ${r.name}`;
  return {
    title,
    description: r.tagline,
    openGraph: { title: `${title} · ${quiz.intro.title}`, description: r.tagline, url: `${site.url}/quiz/${resultado}` },
  };
}

export default function ResultPage({ params }: PageProps<"/quiz/[resultado]">) {
  return (
    <section className="secao !pt-16">
      <div className="mx-auto flex max-w-[860px] flex-col gap-12">
        <Suspense fallback={<p className="font-titulo text-2xl font-bold text-azul">Carregando resultado…</p>}>
          <Result params={params} />
        </Suspense>
      </div>
    </section>
  );
}

async function Result({ params }: { params: PageProps<"/quiz/[resultado]">["params"] }) {
  const { resultado } = await params;
  if (!isResultId(resultado)) notFound();
  const r = quiz.results[resultado];
  const theme = resultTheme[r.color] ?? resultTheme.azul;
  const others = resultIds.filter((id) => id !== resultado);

  return (
    <>
      <div className={`relative flex flex-col gap-5 rounded-2xl border-[3px] border-noite px-8 py-10 shadow-duro-lg sm:px-12 sm:py-12 ${theme.card}`}>
        <Star className="absolute -right-5 -top-6" color="#ece3be" />
        <span className={`etiqueta text-[13px] ${theme.label}`}>Seu resultado</span>
        <h1 className="font-titulo font-bold leading-[0.98]" style={{ fontSize: "clamp(2.6rem, 7vw, 4.75rem)" }}>{r.name}</h1>
        <p className="font-titulo text-[1.5rem] font-semibold leading-tight">{r.tagline}</p>
        <p className="max-w-[640px] text-lg leading-relaxed">{r.text}</p>
        <ul className="flex list-none flex-wrap gap-2.5 p-0">
          {r.traits.map((t) => (
            <li key={t} className="rounded-full border-2 border-current px-4 py-1.5 font-ficha text-[13px] uppercase tracking-wider">{t}</li>
          ))}
        </ul>
      </div>

      <div className="flex flex-wrap items-start gap-4">
        <ShareButton title={`Eu sou ${r.name}`} text={`Fiz o quiz da ${site.name} e deu ${r.name}. E você?`} className="bg-laranja text-noite" />
        <Link href="/quiz" className="btn bg-creme-claro text-noite">Refazer o quiz</Link>
        <a href={joinHref} className="btn bg-azul text-creme">Entrar pra base</a>
      </div>

      <div className="flex flex-col gap-5">
        <span className="etiqueta text-azul">Os outros personagens</span>
        <ul className="grid list-none grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-5 p-0">
          {others.map((id) => {
            const o = quiz.results[id];
            return (
              <li key={id}>
                <Link href={`/quiz/${id}`} className="card flex h-full flex-col gap-2 p-5 text-noite no-underline">
                  <span className="font-titulo text-[1.35rem] font-bold text-azul">{o.name}</span>
                  <span className="leading-snug text-tinta">{o.tagline}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </>
  );
}
