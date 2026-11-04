import type { Metadata } from "next";
import { Quiz } from "@/components/Quiz";
import { Star } from "@/components/Star";
import { quiz } from "@/lib/quiz";

export const metadata: Metadata = {
  title: "Quiz",
  description: quiz.intro.text,
  openGraph: { title: quiz.intro.title, description: quiz.intro.text },
};

export default function Page() {
  const { intro } = quiz;
  return (
    <section className="secao relative overflow-hidden !pt-16">
      <div className="mx-auto flex max-w-[860px] flex-col gap-9">
        <div className="relative flex flex-col gap-4">
          <span className="etiqueta text-azul">{intro.eyebrow}</span>
          <h1 className="font-titulo font-bold leading-[1] text-azul" style={{ fontSize: "clamp(2.4rem, 6vw, 4.25rem)" }}>{intro.title}</h1>
          <p className="max-w-[620px] text-lg leading-relaxed text-tinta">{intro.text}</p>
          <Star className="absolute -top-4 right-0 hidden sm:block" />
        </div>
        <Quiz />
      </div>
    </section>
  );
}
