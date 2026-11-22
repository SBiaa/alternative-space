import Link from "next/link";
import { NOME_ESTILO, NOME_PALCO, TEXTOS } from "@/lib/banda/conteudo";
import { seloDe } from "@/lib/banda/dados";
import { LogoBanda } from "./LogoBanda";

/** Selo da cabine: nome da banda, logo e o maior palco já tocado. Sem banda, o bloco não aparece. */
export async function SeloBanda({ userId, link = true }: { userId: string; link?: boolean }) {
  const s = await seloDe(userId).catch(() => null);
  if (!s) return null;
  const T = TEXTOS.selo;
  return (
    <section aria-labelledby="banda-de-garagem" className="surface-vidro flex flex-wrap items-center gap-x-8 gap-y-3 p-5">
      <LogoBanda logo={s.logo} tamanho={64} />
      <div className="flex min-w-[180px] flex-1 flex-col gap-1">
        <span className="rotulo text-laranja-claro">{T.titulo} · {NOME_ESTILO[s.estilo]}</span>
        <h2 id="banda-de-garagem" className="m-0 text-2xl font-bold">{s.nome}</h2>
        {link && <Link href="/jogos/banda-de-garagem" className="font-ficha text-[11px] uppercase text-creme underline">{T.abrir}</Link>}
      </div>
      <dl className="m-0 flex flex-wrap gap-8">
        <div><dt className="text-sm text-areia">{T.musicas}</dt><dd className="m-0 font-ficha text-2xl">{s.musicas}</dd></div>
        <div><dt className="text-sm text-areia">{T.shows}</dt><dd className="m-0 font-ficha text-2xl">{s.shows}</dd></div>
        <div>
          <dt className="text-sm text-areia">{T.maiorPalco}</dt>
          <dd className="m-0 font-ficha text-2xl">{s.maiorPalco ? NOME_PALCO[s.maiorPalco] : TEXTOS.nenhumShow}</dd>
        </div>
      </dl>
    </section>
  );
}
