import { CONTEUDO } from "@/lib/cartas-do-conves/conteudo";
import { TEXTOS, textoLiberacao } from "@/lib/cartas-do-conves/textos";
import { Carta } from "./Carta";

/** Todas as cartas do jogo. As que ainda não foram liberadas aparecem trancadas, com a regra de como liberar. */
export function Colecao({ colecao }: { colecao: string[] }) {
  const T = TEXTOS.capa;
  const liberada = (slug: string) => CONTEUDO.cartas[slug].liberacao.tipo === "inicio" || colecao.includes(slug);
  const n = CONTEUDO.listaCartas.filter((c) => liberada(c.slug)).length;
  return (
    <section aria-labelledby="colecao" className="flex flex-col gap-3">
      <div className="flex flex-col gap-0.5">
        <h2 id="colecao" className="m-0 text-2xl font-semibold">
          {T.colecao}
        </h2>
        <p className="m-0 font-ficha text-sm text-areia">{T.colecaoResumo(n, CONTEUDO.listaCartas.length)}</p>
      </div>
      <ul className="m-0 grid list-none grid-cols-[repeat(auto-fill,minmax(168px,1fr))] justify-items-center gap-3 p-0">
        {CONTEUDO.listaCartas.map((c) => {
          const ok = liberada(c.slug);
          return (
            <li key={c.slug} className="flex flex-col items-center gap-1">
              <Carta carta={c} bloqueada={!ok} rotuloExtra={ok ? undefined : `${T.bloqueada}. ${textoLiberacao(c.liberacao, CONTEUDO)}`} />
              {!ok && <p className="m-0 max-w-[168px] text-center text-[12px] text-areia">{textoLiberacao(c.liberacao, CONTEUDO)}</p>}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
