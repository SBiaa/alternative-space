import type { Metadata } from "next";
import Link from "next/link";
import { JogarAbas } from "@/components/JogarAbas";
import { Star } from "@/components/Star";
import { quizzes } from "@/lib/quiz";

export const metadata: Metadata = {
  title: "Quizzes",
  description: "Descubra que personagem, fruta ou criatura mora aí dentro e compartilhe com a galera.",
};

export default function Page() {
  return (
    <section className="secao !pt-16">
      <div className="miolo flex flex-col gap-10">
        <div className="relative flex max-w-[760px] flex-col gap-4">
          <span className="etiqueta text-azul">Quizzes</span>
          <h1 className="font-titulo font-bold leading-[1] text-azul" style={{ fontSize: "clamp(2.4rem, 6vw, 4.25rem)" }}>Descobre quem mora aí dentro.</h1>
          <p className="text-lg leading-relaxed text-tinta">Poucos minutos, zero cadastro. No final, o resultado é seu pra mandar pra galera.</p>
          <div className="mt-2 self-start"><JogarAbas atual="quiz" /></div>
          <Star className="absolute -top-4 right-0 hidden sm:block" />
        </div>
        <ul className="grid list-none grid-cols-[repeat(auto-fit,minmax(300px,1fr))] gap-7 p-0">
          {Object.entries(quizzes).map(([slug, q], i) => (
            <li key={slug}>
              <Link
                href={`/quiz/${slug}`}
                className={`card flex h-full flex-col gap-3 p-7 no-underline ${i % 2 === 0 ? "!bg-laranja text-noite" : "!bg-azul text-creme"}`}
              >
                <span className="etiqueta text-[13px]">{q.intro.eyebrow}</span>
                <h2 className="font-titulo text-[2rem] font-bold leading-[1.05]">{q.intro.title}</h2>
                <p className="leading-normal">{q.intro.text}</p>
                <span className="mt-auto pt-2 font-titulo text-xl font-bold">Fazer o quiz →</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
