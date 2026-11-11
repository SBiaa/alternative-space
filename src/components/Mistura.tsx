import { parseMix, percentages, type PersonalityQuiz } from "@/lib/quiz";

// Mistura em barras: quanto de cada resultado apareceu nas respostas.
export function Mistura({ quiz, result, m, compact }: { quiz: PersonalityQuiz; result: string; m: string | null | undefined; compact?: boolean }) {
  const scores = parseMix(quiz, result, m);
  if (!scores) return null;
  const pct = percentages(scores);
  const linhas = Object.entries(quiz.results)
    .map(([k, r], i) => ({ k, name: r.name, pct: pct[i] }))
    .sort((a, b) => b.pct - a.pct);
  return (
    <div className={compact ? "flex flex-col gap-2" : "card flex flex-col gap-4 p-6 sm:p-8"}>
      {!compact && <span className="etiqueta text-azul">Sua mistura</span>}
      <ul className="flex list-none flex-col gap-2.5 p-0">
        {linhas.map((l) => (
          <li key={l.k} className="flex flex-col gap-1">
            <span className={`flex justify-between font-ficha text-[13px] ${compact ? "" : "text-noite"}`}>
              <span className={l.k === result ? "font-bold" : ""}>{l.name}</span>
              <span>{l.pct}%</span>
            </span>
            <span className="h-2.5 overflow-hidden rounded-full border-2 border-noite bg-creme" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={l.pct} aria-label={l.name}>
              <span className={`block h-full ${l.k === result ? "bg-laranja" : "bg-azul/60"}`} style={{ width: `${l.pct}%` }} />
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
