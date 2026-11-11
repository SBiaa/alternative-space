"use client";

import { useEffect, useState } from "react";
import { scoreAnswers, tally, topResults, type PersonalityQuiz } from "@/lib/quiz";
import { QuizProgress, optionClass } from "@/components/QuizProgress";
import { Constelacao } from "@/components/Constelacao";
import { useFinishQuiz } from "@/components/useFinishQuiz";

type Props = { slug: string; quiz: PersonalityQuiz };

function embaralha<T>(xs: T[]): T[] {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function Quiz({ slug, quiz }: Props) {
  const { questions } = quiz;
  const finish = useFinishQuiz(slug);
  const [answers, setAnswers] = useState<string[]>([]);
  const [empate, setEmpate] = useState<string[] | null>(null);
  // Embaralha só no navegador, pra não brigar com o HTML do servidor.
  const [ordem, setOrdem] = useState<PersonalityQuiz["questions"]>(questions);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (quiz.shuffle) setOrdem(questions.map((q) => ({ ...q, options: embaralha(q.options) })));
  }, [questions, quiz.shuffle]);

  const total = questions.length;
  const step = answers.length;
  const done = step >= total;
  const current = ordem[Math.min(step, total - 1)];

  function choose(result: string) {
    const next = [...answers, result];
    setAnswers(next);
    if (next.length < total) return;
    if (!quiz.mix) return finish(scoreAnswers(next));
    const scores = tally(quiz, next);
    const top = topResults(quiz, scores);
    if (top.length > 1) setEmpate(top);
    else finish(top[0], { scores });
  }

  const voltar = step > 0 && !done ? () => setAnswers(answers.slice(0, -1)) : undefined;

  return (
    <div className="card flex flex-col gap-7 p-7 sm:p-10">
      {quiz.progress === "constelacao" ? (
        <Constelacao step={step} total={total} onBack={voltar} />
      ) : (
        <QuizProgress step={step} total={total} onBack={voltar} />
      )}

      {empate ? (
        <div className="flex flex-col gap-5">
          <h2 className="font-titulo font-bold leading-[1.08] text-azul" style={{ fontSize: "clamp(1.6rem, 4vw, 2.4rem)" }}>
            {quiz.tieTitle ?? "Deu empate"}
          </h2>
          {quiz.tieText && <p className="text-lg text-tinta">{quiz.tieText}</p>}
          <ul className="grid list-none grid-cols-1 gap-3.5 p-0 sm:grid-cols-2">
            {empate.map((k) => (
              <li key={k}>
                <button type="button" onClick={() => finish(k, { scores: tally(quiz, answers), tie: true })} className={optionClass}>
                  <span className="flex flex-col gap-1">
                    <span className="font-titulo text-xl font-bold text-azul">{quiz.results[k].name}</span>
                    <span>{quiz.results[k].tagline}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <button type="button" onClick={() => { setEmpate(null); setAnswers(answers.slice(0, -1)); }} className="self-start font-ficha text-[13px] text-azul underline">
            ← VOLTAR UMA PERGUNTA
          </button>
        </div>
      ) : done ? (
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
