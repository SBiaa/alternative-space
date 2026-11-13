import Link from "next/link";
import { salvarDaPagina } from "@/app/actions/tripulante";
import { getUser } from "@/lib/auth/server";
import { getQuiz, parseMix } from "@/lib/quiz";
import { latestResultFor } from "@/lib/tripulante";

const box = "flex flex-wrap items-center justify-between gap-4 rounded-xl border-2 border-noite bg-creme-claro px-5 py-4";

// Mostra se o resultado está no registro de bordo. Fica em <Suspense>: depende da sessão.
export async function SaveResult({ quiz, result, searchParams }: { quiz: string; result: string; searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = (await searchParams) ?? {};
  const user = await getUser();
  // Com mistura, ela vai junto ("quiz/resultado/6.3.2.1/1") pra ser salva depois do cadastro.
  const q = getQuiz(quiz);
  const m = typeof sp.m === "string" && q && parseMix(q, result, sp.m) ? sp.m : null;
  const salvar = m ? `${quiz}/${result}/${m}/${sp.e === "1" ? 1 : 0}` : `${quiz}/${result}`;
  const volta = `/quiz/${quiz}/${result}${m ? `?m=${m}${sp.e === "1" ? "&e=1" : ""}` : ""}`;
  const casa = quiz === "qual-sua-casa";

  if (!user) {
    return (
      <div className={box}>
        <p className="text-tinta">{casa ? "Sua casa vira um selo na sua cabine." : "Quer guardar esse resultado? Tripulantes têm um registro de bordo com todos os quizzes."}</p>
        <Link href={`/cadastro?${new URLSearchParams({ salvar, next: volta })}`} className="btn bg-azul text-creme !px-5 !py-3 !text-base">
          {casa ? "Crie sua conta pra guardar sua casa na cabine" : "Criar conta e salvar"}
        </Link>
      </div>
    );
  }

  if ((await latestResultFor(user.id, quiz)) === result) {
    return (
      <div className={box}>
        <p className="font-medium text-azul">✓ Salvo no seu registro de bordo.</p>
        <Link href="/conta" className="font-titulo text-lg font-bold text-azul">Ver registro →</Link>
      </div>
    );
  }

  return (
    <form action={salvarDaPagina} className={box}>
      <input type="hidden" name="salvar" value={salvar} />
      <p className="text-tinta">Esse é você? Guarda no seu registro de bordo.</p>
      <button type="submit" className="btn bg-azul text-creme !px-5 !py-3 !text-base">Salvar resultado</button>
    </form>
  );
}
