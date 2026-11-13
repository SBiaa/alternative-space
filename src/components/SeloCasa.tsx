import Link from "next/link";
import { Mistura } from "@/components/Mistura";
import { getQuiz, resultTheme, type PersonalityQuiz } from "@/lib/quiz";
import { latestWithScores } from "@/lib/tripulante";

const SLUG = "qual-sua-casa";

// Selo da casa no perfil: o resultado mais recente do quiz e a mistura dele. Arte própria (nada de brasão oficial).
export async function SeloCasa({ userId }: { userId: string }) {
  const quiz = getQuiz(SLUG) as PersonalityQuiz | undefined;
  const salvo = await latestWithScores(userId, SLUG);
  const r = salvo && quiz?.results[salvo.result];
  if (!quiz || !salvo || !r) return null;
  const theme = resultTheme[r.color] ?? resultTheme.azul;
  const m = salvo.scores?.join(".");
  return (
    <section aria-labelledby="casa" className={`flex flex-wrap items-center gap-6 rounded-xl border-2 border-noite p-5 ${theme.card}`}>
      <svg viewBox="0 0 100 100" className="size-[92px] shrink-0" aria-hidden="true">
        <circle cx="50" cy="50" r="46" fill="none" stroke="currentColor" strokeWidth="3" strokeDasharray="2 5" />
        <circle cx="50" cy="50" r="38" fill="none" stroke="currentColor" strokeWidth="3" />
        <path d="M50 22 L56 44 L78 50 L56 56 L50 78 L44 56 L22 50 L44 44Z" fill="currentColor" />
      </svg>
      <div className="flex min-w-[180px] flex-1 flex-col gap-1">
        <span className={`font-ficha text-[11px] uppercase ${theme.label}`}>Selo · Sua casa{salvo.tie && " · escolhida no empate"}</span>
        <h2 id="casa" className="text-2xl font-bold leading-tight">{r.name}</h2>
        <span className="text-sm leading-snug">{r.tagline}</span>
        <Link href={`/quiz/${SLUG}`} className="mt-1 font-ficha text-[11px] uppercase underline opacity-85">Refazer o quiz</Link>
      </div>
      {m && (
        <div className="min-w-[200px] flex-1">
          <Mistura quiz={quiz} result={salvo.result} m={m} compact />
        </div>
      )}
    </section>
  );
}
