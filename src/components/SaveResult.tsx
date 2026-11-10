import Link from "next/link";
import { salvarDaPagina } from "@/app/actions/tripulante";
import { getUser } from "@/lib/auth/server";
import { latestResultFor } from "@/lib/tripulante";

const box = "flex flex-wrap items-center justify-between gap-4 rounded-xl border-2 border-noite bg-creme-claro px-5 py-4";

// Mostra se o resultado está no registro de bordo. Fica em <Suspense>: depende da sessão.
export async function SaveResult({ quiz, result }: { quiz: string; result: string }) {
  const user = await getUser();
  const salvar = `${quiz}/${result}`;

  if (!user) {
    return (
      <div className={box}>
        <p className="text-tinta">Quer guardar esse resultado? Tripulantes têm um registro de bordo com todos os quizzes.</p>
        <Link href={`/cadastro?salvar=${salvar}&next=/quiz/${salvar}`} className="btn bg-azul text-creme !px-5 !py-3 !text-base">
          Criar conta e salvar
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
