"use client";

import { useState } from "react";
import { scoreAnswers, type PersonalityQuiz } from "@/lib/quiz";
import { QuizProgress, optionClass } from "@/components/QuizProgress";
import { useFinishQuiz } from "@/components/useFinishQuiz";

export function Quiz({ slug, questions }: { slug: string; questions: PersonalityQuiz["questions"] }) {
  const finish = useFinishQuiz(slug);
  const [answers, setAnswers] = useState<string[]>([]);
  const total = questions.length;
  const step = answers.length;
  const done = step >= total;
  const current = questions[Math.min(step, total - 1)];

  function choose(result: string) {
    const next = [...answers, result];
    setAnswers(next);
    if (next.length >= total) finish(scoreAnswers(next));
  }

  return (
    <div className="card flex flex-col gap-7 p-7 sm:p-10">
      <QuizProgress step={step} total={total} onBack={step > 0 && !done ? () => setAnswers(answers.slice(0, -1)) : undefined} />

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
                <button type="button" onClick={() => choose(o.result)} className={optionClass}>
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
