import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { sair } from "@/app/actions/tripulante";
import { getUser } from "@/lib/auth/server";
import { getResult, quizzes, resultTheme } from "@/lib/quiz";
import { latestResults } from "@/lib/tripulante";

export const metadata: Metadata = { title: "Diário de bordo", robots: { index: false } };

export default function Page() {
  return (
    <section className="secao !pt-16">
      <div className="miolo flex flex-col gap-10">
        <Suspense fallback={<p className="font-titulo text-2xl font-bold text-azul">Abrindo o diário…</p>}>
          <Diario />
        </Suspense>
      </div>
    </section>
  );
}

async function Diario() {
  const user = await getUser();
  if (!user) redirect("/entrar?next=/conta");
  const saved = new Map((await latestResults(user.id)).map((r) => [r.quiz, r]));

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div className="flex flex-col gap-3">
          <span className="etiqueta text-azul">Diário de bordo</span>
          <h1 className="font-titulo font-bold leading-[1] text-azul" style={{ fontSize: "clamp(2.4rem, 6vw, 4rem)" }}>E aí, {user.name}.</h1>
          <p className="text-lg text-tinta">Seus resultados ficam guardados aqui. Refez um quiz? Vale o mais recente.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link href="/colecoes" className="btn bg-azul text-creme">Ver coleções</Link>
          <form action={sair}>
            <button type="submit" className="btn bg-creme-claro text-noite">Sair</button>
          </form>
        </div>
      </div>

      <ul className="grid list-none grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-6 p-0">
        {Object.entries(quizzes).map(([slug, q]) => {
          const s = saved.get(slug);
          const r = s && getResult(q, s.result);
          if (!r) {
            return (
              <li key={slug}>
                <Link href={`/quiz/${slug}`} className="card flex h-full flex-col gap-2 border-dashed p-6 text-noite no-underline">
                  <span className="etiqueta text-[13px] text-neutro">{q.intro.title}</span>
                  <span className="font-titulo text-[1.5rem] font-bold text-azul">Ainda não fez</span>
                  <span className="mt-auto pt-2 font-titulo text-lg font-bold text-azul">Fazer agora →</span>
                </Link>
              </li>
            );
          }
          const theme = resultTheme[r.color] ?? resultTheme.azul;
          return (
            <li key={slug}>
              <Link href={`/quiz/${slug}/${s.result}`} className={`flex h-full flex-col gap-2 rounded-2xl border-2 border-noite p-6 no-underline shadow-duro-sm ${theme.card}`}>
                <span className={`etiqueta text-[13px] ${theme.label}`}>{q.intro.title}</span>
                <span className="font-titulo text-[1.75rem] font-bold leading-tight">{r.name}</span>
                <span className="leading-snug">{r.tagline}</span>
                <span className="mt-auto pt-2 font-ficha text-xs uppercase tracking-wider opacity-80">
                  {new Date(s.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </>
  );
}
