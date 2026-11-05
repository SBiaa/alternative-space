"use client";

import { useState } from "react";
import type { PartyQuiz as PartyQuizData } from "@/lib/quiz";
import { QuizProgress, optionClass } from "@/components/QuizProgress";
import { useFinishQuiz } from "@/components/useFinishQuiz";

// Cada pergunta preenche uma posição da party. O resultado é o código das escolhas, ex.: "02131".
export function PartyQuiz({ slug, slots }: { slug: string; slots: PartyQuizData["slots"] }) {
  const finish = useFinishQuiz(slug);
  const [picks, setPicks] = useState<number[]>([]);
  const total = slots.length;
  const step = picks.length;
  const done = step >= total;
  const current = slots[Math.min(step, total - 1)];

  function choose(i: number) {
    const next = [...picks, i];
    setPicks(next);
    if (next.length >= total) finish(next.join(""));
  }

  return (
    <div className="card flex flex-col gap-7 p-7 sm:p-10">
      <QuizProgress step={step} total={total} label="POSIÇÃO" onBack={step > 0 && !done ? () => setPicks(picks.slice(0, -1)) : undefined} />

      <ol className="flex list-none flex-wrap gap-2 p-0" aria-label="Sua party até agora">
        {slots.map((s, i) => (
          <li
            key={s.role}
            className={`rounded-full border-2 border-noite px-3.5 py-1 font-ficha text-xs uppercase tracking-wider ${
              i < picks.length ? "bg-azul text-creme" : i === step ? "bg-laranja text-noite" : "border-dashed text-neutro"
            }`}
          >
            {s.role}{i < picks.length && `: ${s.options[picks[i]].name.split(",")[0]}`}
          </li>
        ))}
      </ol>

      {done ? (
        <p role="status" className="font-titulo text-2xl font-bold text-azul">Reunindo a party na taverna…</p>
      ) : (
        <fieldset key={step} className="flex flex-col gap-5">
          <legend className="mb-5 font-titulo font-bold leading-[1.08] text-azul" style={{ fontSize: "clamp(1.6rem, 4vw, 2.4rem)" }}>
            {current.q}
          </legend>
          <ul className="grid list-none grid-cols-1 gap-3.5 p-0 sm:grid-cols-2">
            {current.options.map((o, i) => (
              <li key={o.name}>
                <button type="button" onClick={() => choose(i)} className={optionClass}>
                  <span className="font-ficha text-sm font-bold text-azul">{String.fromCharCode(65 + i)}</span>
                  <span className="flex flex-col gap-1">
                    <span className="font-titulo text-lg font-bold">{o.name}</span>
                    <span className="text-[0.98rem] text-tinta">{o.text}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </fieldset>
      )}
    </div>
  );
}
