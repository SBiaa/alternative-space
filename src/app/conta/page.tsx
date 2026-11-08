import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { sair } from "@/app/actions/tripulante";
import { Avatar } from "@/components/Avatar";
import { getUser } from "@/lib/auth/server";
import { anteriores, getPerfil, historico, totalQuizzes } from "@/lib/perfil";
import { getResult, quizzes, resultTheme } from "@/lib/quiz";

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

const data = (d: string) => new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });

async function Diario() {
  const user = await getUser();
  if (!user) redirect("/entrar?next=/conta");
  const [perfil, hist] = await Promise.all([getPerfil(user.id), historico(user.id)]);

  // O histórico vem do mais novo pro mais antigo: o primeiro de cada quiz é o atual.
  const atual = new Map<string, (typeof hist)[number]>();
  for (const h of hist) if (!atual.has(h.quiz)) atual.set(h.quiz, h);
  const antes = anteriores(hist);
  const feitos = [...atual.keys()].filter((q) => q in quizzes).length;
  const desde = (user as { createdAt?: string | Date }).createdAt;

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-6">
        <div className="flex flex-wrap items-center gap-6">
          <Avatar name={user.name} image={user.image} cor={perfil.cor} size={112} />
          <div className="flex flex-col gap-2">
            <span className="etiqueta text-azul">Diário de bordo</span>
            <h1 className="font-titulo font-bold leading-[1] text-azul" style={{ fontSize: "clamp(2.2rem, 6vw, 3.6rem)" }}>E aí, {user.name}.</h1>
            <p className="font-ficha text-sm text-neutro">
              {perfil.apelido ? `@${perfil.apelido}` : "Sem apelido ainda"}
              {desde && ` · tripulante desde ${new Date(desde).toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}`}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link href="/conta/editar" className="btn bg-azul text-creme">Editar perfil</Link>
          <form action={sair}>
            <button type="submit" className="btn bg-creme-claro text-noite">Sair</button>
          </form>
        </div>
      </div>

      <div className="card flex flex-col gap-3 p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <span className="font-titulo text-xl font-bold text-azul">
            {feitos === totalQuizzes ? "Todos os quizzes feitos. Respeito." : `Você fez ${feitos} de ${totalQuizzes} quizzes`}
          </span>
          {feitos < totalQuizzes && <Link href="/quiz" className="font-titulo text-lg font-bold text-azul">Fazer outro →</Link>}
        </div>
        <div className="h-4 overflow-hidden rounded-full border-2 border-noite bg-creme" role="progressbar" aria-valuemin={0} aria-valuemax={totalQuizzes} aria-valuenow={feitos} aria-label="Quizzes feitos">
          <div className="h-full bg-laranja" style={{ width: `${(feitos / totalQuizzes) * 100}%` }} />
        </div>
      </div>

      <ul className="grid list-none grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-6 p-0">
        {Object.entries(quizzes).map(([slug, q]) => {
          const s = atual.get(slug);
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
          const ja = (antes.get(slug) ?? []).map((id) => getResult(q, id)?.name).filter(Boolean).slice(0, 3);
          return (
            <li key={slug}>
              <Link href={`/quiz/${slug}/${s.result}`} className={`flex h-full flex-col gap-2 rounded-2xl border-2 border-noite p-6 no-underline shadow-duro-sm ${theme.card}`}>
                <span className={`etiqueta text-[13px] ${theme.label}`}>{q.intro.title}</span>
                <span className="font-titulo text-[1.75rem] font-bold leading-tight">{r.name}</span>
                <span className="leading-snug">{r.tagline}</span>
                {ja.length > 0 && <span className="text-sm opacity-85">Antes: {ja.join(", ")}</span>}
                <span className="mt-auto pt-2 font-ficha text-xs uppercase tracking-wider opacity-80">{data(s.created_at)}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </>
  );
}
