import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { KnowledgeQuiz } from "@/components/KnowledgeQuiz";
import { PartyQuiz } from "@/components/PartyQuiz";
import { Quiz } from "@/components/Quiz";
import { Star } from "@/components/Star";
import { getQuiz, quizSlugs } from "@/lib/quiz";

export function generateStaticParams() {
  return quizSlugs.map((quiz) => ({ quiz }));
}

export async function generateMetadata({ params }: PageProps<"/quiz/[quiz]">): Promise<Metadata> {
  const quiz = getQuiz((await params).quiz);
  if (!quiz) return {};
  const { title, text } = quiz.intro;
  return { title, description: text, openGraph: { title, description: text } };
}

export default function Page({ params }: PageProps<"/quiz/[quiz]">) {
  return (
    <section className="secao relative overflow-hidden !pt-16">
      <div className="mx-auto flex max-w-[860px] flex-col gap-9">
        <Link href="/quiz" className="font-titulo text-lg font-bold text-azul">← Todos os quizzes</Link>
        <Suspense fallback={<p className="font-titulo text-2xl font-bold text-azul">Carregando quiz…</p>}>
          <QuizBody params={params} />
        </Suspense>
      </div>
    </section>
  );
}

async function QuizBody({ params }: { params: PageProps<"/quiz/[quiz]">["params"] }) {
  const { quiz: slug } = await params;
  const quiz = getQuiz(slug);
  if (!quiz) notFound();
  const { intro } = quiz;

  return (
    <>
      <div className="relative flex flex-col gap-4">
        <span className="etiqueta text-azul">{intro.eyebrow}</span>
        <h1 className="font-titulo font-bold leading-[1] text-azul" style={{ fontSize: "clamp(2.4rem, 6vw, 4.25rem)" }}>{intro.title}</h1>
        <p className="max-w-[620px] text-lg leading-relaxed text-tinta">{intro.text}</p>
        <Star className="absolute -top-4 right-0 hidden sm:block" />
      </div>
      {quiz.kind === "conhecimento" ? (
        <KnowledgeQuiz key={slug} slug={slug} questions={quiz.questions} />
      ) : quiz.kind === "party" ? (
        <PartyQuiz key={slug} slug={slug} slots={quiz.slots} />
      ) : (
        <Quiz key={slug} slug={slug} quiz={quiz} />
      )}
      {quiz.note && <p className="font-ficha text-xs text-neutro">{quiz.note}</p>}
    </>
  );
}
