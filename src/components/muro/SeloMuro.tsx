import Link from "next/link";
import { TEXTOS } from "@/lib/muro/conteudo";
import { seloDe } from "@/lib/muro/dados";

/** Selo da cabine: murais entregues, reputação e o maior muro pintado. Sem crew ou sem murais entregues, o bloco não aparece. */
export async function SeloMuro({ userId, link = true }: { userId: string; link?: boolean }) {
  const s = await seloDe(userId).catch(() => null);
  if (!s || s.entregues === 0) return null;
  const T = TEXTOS.cabine;
  return (
    <section aria-labelledby="muro-livre" className="surface-vidro flex flex-wrap items-center gap-x-8 gap-y-3 p-5">
      <div className="flex min-w-[180px] flex-1 flex-col gap-1">
        <span className="rotulo text-laranja-claro">{T.titulo}</span>
        <h2 id="muro-livre" className="m-0 text-2xl font-bold">{s.bairro}</h2>
        {link && <Link href="/jogos/muro-livre" className="font-ficha text-[11px] uppercase text-creme underline">{T.abrir}</Link>}
      </div>
      <dl className="m-0 flex flex-wrap gap-8">
        <div><dt className="text-sm text-areia">{T.entregues}</dt><dd className="m-0 font-ficha text-2xl">{s.entregues}</dd></div>
        <div><dt className="text-sm text-areia">{T.quebrada}</dt><dd className="m-0 font-ficha text-2xl">{s.repQuebrada.toFixed(2)}</dd></div>
        <div><dt className="text-sm text-areia">{T.clientes}</dt><dd className="m-0 font-ficha text-2xl">{s.repClientes.toFixed(2)}</dd></div>
        {s.maiorMuro && <div><dt className="text-sm text-areia">{T.maior}</dt><dd className="m-0 font-ficha text-2xl">{TEXTOS.tamanhos[s.maiorMuro]}</dd></div>}
      </dl>
    </section>
  );
}
