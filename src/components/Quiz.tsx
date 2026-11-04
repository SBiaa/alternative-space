"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { scoreAnswers, type QuizData } from "@/lib/quiz";
import { salvarResultado } from "@/app/actions/tripulante";

export function Quiz({ slug, questions }: { slug: string; questions: QuizData["questions"] }) {
  const router = useRouter();
  const [answers, setAnswers] = useState<string[]>([]);
  const total = questions.length;
  const step = answers.length;
  const done = step >= total;
  const current = questions[Math.min(step, total - 1)];

  async function choose(result: string) {
    const next = [...answers, result];
    setAnswers(next);
    if (next.length < total) return;
    const final = scoreAnswers(next);
    // Salva no diário de bordo de quem está logado; sem login (ou se falhar) só segue pro resultado.
    await salvarResultado(slug, final).catch(() => false);
    router.push(`/quiz/${slug}/${final}`);
  }

  return (
    <div className="card flex flex-col gap-7 p-7 sm:p-10">
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between font-ficha text-[13px] tracking-wider text-tinta">
          <span>PERGUNTA {String(Math.min(step + 1, total)).padStart(2, "0")} / {String(total).padStart(2, "0")}</span>
          {step > 0 && !done && (
            <button type="button" onClick={() => setAnswers(answers.slice(0, -1))} className="cursor-pointer font-ficha text-[13px] text-azul underline">
              ← VOLTAR
            </button>
          )}
        </div>
        <div className="h-3 overflow-hidden rounded-full border-2 border-noite bg-creme" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={step} aria-label="Progresso do quiz">
          <div className="h-full bg-laranja transition-[width] duration-300" style={{ width: `${(step / total) * 100}%` }} />
        </div>
      </div>

      {done ? (
        <p role="status" className="font-titulo text-2xl font-bold text-azul">Calculando seu resultado…</p>
      ) : (
        <fieldset key={step} className="flex flex-col gap-5">
          <legend className="mb-5 font-titulo font-bold leading-[1.08] text-azul" style={{ fontSize: "clamp(1.6rem, 4vw, 2.4rem)" }}>
            {current.q}
          </legend>
          <ul className="grid list-none grid-cols-1 gap-3.5 p-0 sm:grid-cols-2">
            {current.options.map((o, i) => (
              <li key={o.text}>
                <button
                  type="button"
                  onClick={() => choose(o.result)}
                  className="flex h-full w-full cursor-pointer items-start gap-3.5 rounded-xl border-2 border-noite bg-creme px-5 py-4 text-left text-[1.05rem] leading-snug shadow-duro-sm transition-[transform,box-shadow,background-color] duration-100 hover:translate-x-[2px] hover:translate-y-[2px] hover:bg-laranja-claro hover:shadow-none motion-reduce:transition-none"
                >
                  <span className="font-ficha text-sm font-bold text-azul">{String.fromCharCode(65 + i)}</span>
                  <span>{o.text}</span>
                </button>
              </li>
            ))}
          </ul>
        </fieldset>
      )}
    </div>
  );
}
