"use client";

import { useState } from "react";
import type { KnowledgeQuiz as KnowledgeQuizData } from "@/lib/quiz";
import { QuizProgress, optionClass } from "@/components/QuizProgress";
import { useFinishQuiz } from "@/components/useFinishQuiz";

// Mostra se acertou logo depois de cada resposta; no fim, o resultado é o número de acertos.
export function KnowledgeQuiz({ slug, questions }: { slug: string; questions: KnowledgeQuizData["questions"] }) {
  const finish = useFinishQuiz(slug);
  const [picks, setPicks] = useState<number[]>([]);
  const [revealed, setRevealed] = useState(false);
  const total = questions.length;
  const step = revealed ? picks.length - 1 : picks.length;
  const done = step >= total;
  const current = questions[Math.min(step, total - 1)];
  const picked = revealed ? picks[picks.length - 1] : -1;
  const hits = picks.filter((p, i) => p === questions[i].answer).length;

  function choose(i: number) {
    if (revealed) return;
    setPicks([...picks, i]);
    setRevealed(true);
  }

  function next() {
    setRevealed(false);
    if (picks.length >= total) finish(String(hits));
  }

  const style = (i: number) => {
    if (!revealed) return "";
    if (i === current.answer) return "!bg-[#bfe3b4] !translate-x-0 !translate-y-0";
    if (i === picked) return "!bg-laranja-claro line-through !translate-x-0 !translate-y-0";
    return "opacity-60";
  };

  return (
    <div className="card flex flex-col gap-7 p-7 sm:p-10">
      <QuizProgress step={Math.min(step, total)} total={total} />
      <span className="-mt-4 font-ficha text-[13px] tracking-wider text-azul">ACERTOS: {hits}</span>

      {done ? (
        <p role="status" className="font-titulo text-2xl font-bold text-azul">Contando os acertos…</p>
      ) : (
        <fieldset key={step} className="flex flex-col gap-5">
          <legend className="mb-5 font-titulo font-bold leading-[1.08] text-azul" style={{ fontSize: "clamp(1.6rem, 4vw, 2.4rem)" }}>
            {current.q}
          </legend>
          <ul className="grid list-none grid-cols-1 gap-3.5 p-0 sm:grid-cols-2">
            {current.options.map((o, i) => (
              <li key={o}>
                <button type="button" onClick={() => choose(i)} disabled={revealed} aria-pressed={i === picked} className={`${optionClass} ${style(i)}`}>
                  <span className="font-ficha text-sm font-bold text-azul">{revealed && i === current.answer ? "✓" : String.fromCharCode(65 + i)}</span>
                  <span>{o}</span>
                </button>
              </li>
            ))}
          </ul>
          {revealed && (
            <div role="status" className="flex flex-col items-start gap-4 rounded-xl border-2 border-dashed border-noite bg-creme px-5 py-4">
              <p className="font-titulo text-xl font-bold text-azul">{picked === current.answer ? "Acertou!" : "Errou, mas faz parte."}</p>
              {current.fact && <p className="leading-snug text-tinta">{current.fact}</p>}
              <button type="button" onClick={next} autoFocus className="btn cursor-pointer bg-laranja text-noite !px-5 !py-2.5 !text-base">
                {picks.length >= total ? "Ver meu resultado" : "Próxima pergunta"}
              </button>
            </div>
          )}
        </fieldset>
      )}
    </div>
  );
}
