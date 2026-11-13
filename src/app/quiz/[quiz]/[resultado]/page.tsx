import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Mistura } from "@/components/Mistura";
import { QuizArt } from "@/components/QuizArt";
import { SaveResult } from "@/components/SaveResult";
import { ShareButton } from "@/components/ShareButton";
import { Star } from "@/components/Star";
import { getQuiz, getResult, otherResults, quizzes, resultTheme, staticResultIds, type PersonalityQuiz } from "@/lib/quiz";
import { joinHref, site } from "@/config/site";

type Params = PageProps<"/quiz/[quiz]/[resultado]">["params"];
type Search = PageProps<"/quiz/[quiz]/[resultado]">["searchParams"];

export function generateStaticParams() {
  return Object.entries(quizzes).flatMap(([quiz, q]) => staticResultIds(q).map((resultado) => ({ quiz, resultado })));
}

async function load(params: Params) {
  const { quiz: slug, resultado } = await params;
  const quiz = getQuiz(slug);
  const result = quiz && getResult(quiz, resultado);
  return quiz && result ? { slug, resultado, quiz, result } : null;
}

export async function generateMetadata({ params }: PageProps<"/quiz/[quiz]/[resultado]">): Promise<Metadata> {
  const data = await load(params);
  if (!data) return {};
  const { slug, resultado, quiz, result } = data;
  const title = `${quiz.resultPrefix} ${result.name}`;
  return {
    title,
    description: result.tagline,
    openGraph: {
      title: `${title} · ${quiz.intro.title}`,
      description: result.tagline,
      url: `${site.url}/quiz/${slug}/${resultado}`,
    },
  };
}

export default function ResultPage({ params, searchParams }: PageProps<"/quiz/[quiz]/[resultado]">) {
  return (
    <section className="secao !pt-16">
      <div className="mx-auto flex max-w-[860px] flex-col gap-12">
        <Suspense fallback={<p className="font-titulo text-2xl font-bold text-azul">Carregando resultado…</p>}>
          <Result params={params} searchParams={searchParams} />
        </Suspense>
      </div>
    </section>
  );
}

async function Result({ params, searchParams }: { params: Params; searchParams: Search }) {
  const data = await load(params);
  if (!data) notFound();
  const { slug, resultado, quiz, result: r } = data;
  const theme = resultTheme[r.color] ?? resultTheme.azul;
  const others = otherResults(quiz, resultado);
  const again = quiz.kind === "conhecimento" ? "Tentar de novo" : quiz.kind === "party" ? "Montar outra party" : "Refazer o quiz";

  return (
    <>
      <div className={`relative flex flex-col gap-8 rounded-2xl border-[3px] border-noite px-8 py-10 shadow-duro-lg sm:px-12 sm:py-12 md:flex-row md:items-center ${theme.card}`}>
        <Star className="absolute -right-5 -top-6 z-10" color={r.color === "creme" ? "#ab392f" : "#ece3be"} />
        <div className="flex min-w-0 flex-1 flex-col gap-5">
          <span className={`etiqueta text-[13px] ${theme.label}`}>Seu resultado{r.label && ` · ${r.label}`}</span>
          <h1 className="font-titulo font-bold leading-[0.98]" style={{ fontSize: "clamp(2.6rem, 7vw, 4.75rem)" }}>{r.name}</h1>
          <p className="font-titulo text-[1.5rem] font-semibold leading-tight">{r.tagline}</p>
          <p className="max-w-[640px] text-lg leading-relaxed">{r.text}</p>
          <ul className="flex list-none flex-wrap gap-2.5 p-0">
            {r.traits.map((t) => (
              <li key={t} className="rounded-full border-2 border-current px-4 py-1.5 font-ficha text-[13px] uppercase tracking-wider">{t}</li>
            ))}
          </ul>
        </div>
        <QuizArt image={r.image} alt={r.name} sizes="(min-width: 768px) 280px, 90vw" className="w-full max-w-[320px] shrink-0 self-center md:w-[280px]" />
      </div>

      {(r.dayToDay || r.watchOut) && (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          {r.dayToDay && (
            <div className="card flex flex-col gap-2 p-6">
              <span className="etiqueta text-azul">No dia a dia</span>
              <p className="text-lg leading-relaxed text-tinta">{r.dayToDay}</p>
            </div>
          )}
          {r.watchOut && (
            <div className="card flex flex-col gap-2 p-6">
              <span className="etiqueta text-laranja">Ponto de atenção</span>
              <p className="text-lg leading-relaxed text-tinta">{r.watchOut}</p>
            </div>
          )}
        </div>
      )}

      {!quiz.kind && quiz.mix && (
        <Suspense fallback={null}>
          <MisturaDaUrl quiz={quiz} result={resultado} searchParams={searchParams} />
        </Suspense>
      )}

      {r.members && (
        <ol className="grid list-none grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-5 p-0">
          {r.members.map((m) => (
            <li key={m.role} className="card flex flex-col overflow-hidden">
              <QuizArt image={m.image} alt={m.name} sizes="(min-width: 768px) 280px, 90vw" className="!rounded-none !border-0 border-b-2 !border-b-noite" />
              <div className="flex flex-col gap-1.5 p-5">
                <span className="etiqueta text-xs text-azul">{m.role}</span>
                <span className="font-titulo text-[1.3rem] font-bold leading-tight">{m.name}</span>
                <span className="leading-snug text-tinta">{m.text}</span>
              </div>
            </li>
          ))}
        </ol>
      )}

      <Suspense fallback={<div className="h-[76px] rounded-xl border-2 border-noite bg-creme-claro" />}>
        <SaveResult quiz={slug} result={resultado} searchParams={searchParams} />
      </Suspense>

      <div className="flex flex-wrap items-start gap-4">
        <ShareButton
          title={`${quiz.resultPrefix} ${r.name}`}
          text={`Fiz o quiz "${quiz.intro.title}" da ${site.name}: ${quiz.resultPrefix.toLowerCase()} ${r.name}. E você?`}
          className="bg-laranja text-noite"
        />
        <Link href={`/quiz/${slug}`} className="btn bg-creme-claro text-noite">{again}</Link>
        <a href={joinHref} className="btn bg-azul text-creme">Entrar pra base</a>
      </div>

      <div className="flex flex-col gap-5">
        {others.length > 0 && (
          <>
            <span className="etiqueta text-azul">Os outros resultados</span>
            <ul className="grid list-none grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-5 p-0">
              {others.map(([id, o]) => (
                <li key={id}>
                  <Link href={`/quiz/${slug}/${id}`} className="card flex h-full items-start gap-4 p-5 text-noite no-underline">
                    {o.image && <QuizArt image={o.image} alt="" sizes="72px" className="w-[72px] shrink-0 !rounded-lg" />}
                    <span className="flex flex-col gap-2">
                      <span className="font-titulo text-[1.35rem] font-bold text-azul">{o.name}</span>
                      <span className="leading-snug text-tinta">{o.tagline}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
        <Link href="/quiz" className="font-titulo text-xl font-bold text-azul">Fazer outro quiz →</Link>
      </div>
      {quiz.note && <p className="font-ficha text-xs text-neutro">{quiz.note}</p>}
    </>
  );
}

async function MisturaDaUrl({ quiz, result, searchParams }: { quiz: PersonalityQuiz; result: string; searchParams: Search }) {
  const m = (await searchParams).m;
  return <Mistura quiz={quiz} result={result} m={typeof m === "string" ? m : null} />;
}
