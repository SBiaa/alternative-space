import Link from "next/link";
import { NOME_PC, TEXTOS } from "@/lib/lan/conteudo";
import { seloDe } from "@/lib/lan/dados";

// Selo da cabine: dias abertos, reputação, nível e a máquina mais top. Sem lan, o bloco não aparece.
export async function SeloLan({ userId }: { userId: string }) {
  const s = await seloDe(userId).catch(() => null);
  if (!s) return null;
  return (
    <section aria-labelledby="lan-house" className="surface-vidro flex flex-wrap items-center gap-x-8 gap-y-3 p-5">
      <div className="flex min-w-[180px] flex-1 flex-col gap-1">
        <span className="rotulo text-bege-fosforo">Selo · {TEXTOS.titulo}</span>
        <h2 id="lan-house" className="m-0 text-2xl font-bold">{s.local}</h2>
        <Link href="/jogos/lan-house" className="font-ficha text-[11px] uppercase text-creme underline">Abrir a lan</Link>
      </div>
      <dl className="m-0 flex flex-wrap gap-8">
        <div><dt className="text-sm text-areia">Dias abertos</dt><dd className="m-0 font-ficha text-2xl">{s.dias}</dd></div>
        <div><dt className="text-sm text-areia">Reputação</dt><dd className="m-0 font-ficha text-2xl">{s.reputacao.toFixed(2)}</dd></div>
        <div><dt className="text-sm text-areia">Nível</dt><dd className="m-0 font-ficha text-2xl">{s.nivel}</dd></div>
        {s.melhorPc && <div><dt className="text-sm text-areia">Máquina mais top</dt><dd className="m-0 font-ficha text-2xl">{NOME_PC[s.melhorPc]}</dd></div>}
      </dl>
    </section>
  );
}
