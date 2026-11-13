import Link from "next/link";
import { CORRE } from "@/lib/corre/config";
import { seloDe } from "@/lib/corre/dados";

// Selo da cabine: dias jogados, semanas fechadas no azul e a moto atual. Sem save, o bloco não aparece.
export async function SeloCorre({ userId }: { userId: string }) {
  const s = await seloDe(userId).catch(() => null);
  if (!s) return null;
  return (
    <section aria-labelledby="corre" className="surface-vidro flex flex-wrap items-center gap-x-8 gap-y-3 p-5">
      <div className="flex min-w-[180px] flex-1 flex-col gap-1">
        <span className="rotulo text-laranja-claro">Selo · {CORRE.textos.titulo}</span>
        <h2 id="corre" className="m-0 text-2xl font-bold">{s.moto ?? "Sua moto"}</h2>
        <Link href="/jogos/o-corre" className="font-ficha text-[11px] uppercase text-creme underline">Continuar o corre</Link>
      </div>
      <dl className="m-0 flex gap-8">
        <div><dt className="text-sm text-areia">Dias jogados</dt><dd className="m-0 font-ficha text-2xl">{s.diasJogados}</dd></div>
        <div><dt className="text-sm text-areia">Semanas no azul</dt><dd className="m-0 font-ficha text-2xl">{s.semanasNoAzul}</dd></div>
      </dl>
    </section>
  );
}
