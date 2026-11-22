import Link from "next/link";
import { SELO, TEXTOS } from "@/lib/banca/conteudo";
import { seloDe } from "@/lib/banca/dados";

// Selo da cabine: eventos feitos e reputação. Sem banca, o bloco não aparece.
export async function SeloBanca({ userId, link = true }: { userId: string; link?: boolean }) {
  const s = await seloDe(userId).catch(() => null);
  if (!s) return null;
  return (
    <section aria-labelledby="banca-na-feira" className="surface-vidro flex flex-wrap items-center gap-x-8 gap-y-3 p-5">
      <div className="flex min-w-[180px] flex-1 flex-col gap-1">
        <span className="rotulo text-bege-fosforo">{SELO.rotulo}</span>
        <h2 id="banca-na-feira" className="m-0 text-2xl font-bold">{TEXTOS.titulo}</h2>
        {link && <Link href="/jogos/banca-na-feira" className="font-ficha text-[11px] uppercase text-creme underline">{SELO.abrir}</Link>}
      </div>
      <dl className="m-0 flex flex-wrap gap-8">
        <div><dt className="text-sm text-areia">{SELO.eventos}</dt><dd className="m-0 font-ficha text-2xl">{s.eventos}</dd></div>
        <div><dt className="text-sm text-areia">{SELO.reputacao}</dt><dd className="m-0 font-ficha text-2xl">{s.reputacao.toFixed(2)} ★</dd></div>
      </dl>
    </section>
  );
}
