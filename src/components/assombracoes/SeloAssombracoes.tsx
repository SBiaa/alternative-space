import Link from "next/link";
import { totalCriaturas } from "@/lib/assombracoes/casos";
import { TEXTOS } from "@/lib/assombracoes/config";
import { seloDe } from "@/lib/assombracoes/dados";

/** Selo da cabine: quantas criaturas do Bestiário o tripulante conhece. Sem nenhuma, o bloco não aparece. */
export async function SeloAssombracoes({ userId, link = true }: { userId: string; link?: boolean }) {
  const s = await seloDe(userId).catch(() => null);
  if (!s) return null;
  const T = TEXTOS;
  return (
    <section aria-labelledby="assombracoes-selo" className="surface-vidro flex flex-wrap items-center gap-x-8 gap-y-3 p-5">
      <div className="flex min-w-[180px] flex-1 flex-col gap-1">
        <span className="rotulo text-laranja-claro">{T.titulo}</span>
        <h2 id="assombracoes-selo" className="m-0 text-2xl font-bold">{T.cabine.titulo}</h2>
        {link && <Link href="/jogos/assombracoes/bestiario" className="font-ficha text-[11px] uppercase text-creme underline">{T.cabine.abrir}</Link>}
      </div>
      <p className="m-0 font-ficha text-2xl">{T.conhecidas(s.conhecidas, totalCriaturas())}</p>
    </section>
  );
}
