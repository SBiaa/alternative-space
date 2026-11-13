import Link from "next/link";
import { TAVERNA } from "@/lib/taverna/config";
import { seloDe } from "@/lib/taverna/dados";

// Selo da cabine: noites abertas, reputação e nível da taverna. Sem taverna, o bloco não aparece.
export async function SeloTaverna({ userId }: { userId: string }) {
  const s = await seloDe(userId).catch(() => null);
  if (!s) return null;
  return (
    <section aria-labelledby="taverna" className="surface-vidro flex flex-wrap items-center gap-x-8 gap-y-3 p-5">
      <div className="flex min-w-[180px] flex-1 flex-col gap-1">
        <span className="rotulo text-lareira-brasa">Selo · {TAVERNA.textos.titulo}</span>
        <h2 id="taverna" className="m-0 text-2xl font-bold">{s.cidade}</h2>
        <Link href="/jogos/taverna" className="font-ficha text-[11px] uppercase text-creme underline">Continuar a taverna</Link>
      </div>
      <dl className="m-0 flex gap-8">
        <div><dt className="text-sm text-areia">Noites abertas</dt><dd className="m-0 font-ficha text-2xl">{s.noites}</dd></div>
        <div><dt className="text-sm text-areia">Reputação</dt><dd className="m-0 font-ficha text-2xl">{s.reputacao.toFixed(2)}</dd></div>
        <div><dt className="text-sm text-areia">Nível</dt><dd className="m-0 font-ficha text-2xl">{s.nivel}</dd></div>
      </dl>
    </section>
  );
}
