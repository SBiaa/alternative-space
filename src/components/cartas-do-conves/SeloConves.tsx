import Link from "next/link";
import { SLUG } from "@/lib/cartas-do-conves/config";
import { CONTEUDO } from "@/lib/cartas-do-conves/conteudo";
import { seloDe } from "@/lib/cartas-do-conves/dados";
import { TEXTOS } from "@/lib/cartas-do-conves/textos";
import { Carta } from "./Carta";
import { Icone } from "./Icone";

/** Selo da cabine: travessias vencidas e a carta favorita. Sem nenhuma travessia vencida, o bloco não aparece. */
export async function SeloConves({ userId, link = true }: { userId: string; link?: boolean }) {
  const s = await seloDe(userId).catch(() => null);
  if (!s) return null;
  const T = TEXTOS.selo;
  const favorita = s.favorita ? CONTEUDO.cartas[s.favorita] : null;
  return (
    <section aria-labelledby="cartas-do-conves" className="surface-vidro flex flex-wrap items-center gap-x-8 gap-y-3 p-5">
      <div className="flex min-w-[180px] flex-1 flex-col gap-1">
        <span className="rotulo text-laranja-claro">{T.titulo}</span>
        <h2 id="cartas-do-conves" className="m-0 flex items-center gap-2 text-2xl font-bold">
          <Icone nome="rosa" className="size-6 text-laranja-claro" />
          {T.vencida}
        </h2>
        {link && (
          <Link href={`/jogos/${SLUG}`} className="font-ficha text-[11px] uppercase text-creme underline">
            {T.abrir}
          </Link>
        )}
      </div>
      <dl className="m-0 flex flex-wrap items-center gap-8">
        <div>
          <dt className="text-sm text-areia">{T.vitorias}</dt>
          <dd className="m-0 font-ficha text-2xl">{s.vitorias}</dd>
        </div>
        {favorita && (
          <div className="flex flex-col gap-1">
            <dt className="text-sm text-areia">{T.favorita}</dt>
            <dd className="m-0">
              <Carta carta={favorita} compacta />
            </dd>
          </div>
        )}
      </dl>
    </section>
  );
}
