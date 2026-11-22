import Link from "next/link";
import { CapaAcoes, CapaArte } from "@/components/mar/Capa";
import { Carta } from "@/components/mar/Pecas";
import { T } from "@/lib/mar-sem-fim/textos";

export default function Page() {
  return (
    <section className="bg-ceu relative px-4 pb-18 pt-5 sm:px-6 sm:pt-9">
      <div className="mx-auto flex max-w-[960px] flex-col gap-6">
        <Link href="/jogos" className="etiqueta inline-flex min-h-11 items-center text-[11px] text-laranja-claro no-underline sm:text-xs">
          {T.nav.fliperama}
        </Link>
        <div className="grid items-center gap-6 sm:grid-cols-2">
          <div className="flex flex-col gap-4">
            <h1 className="m-0 text-[34px] font-semibold leading-[1.02] tracking-[-0.02em] sm:text-[52px]">{T.capa.titulo}</h1>
            <p className="m-0 text-base text-areia sm:text-lg">{T.capa.chamada}</p>
            <CapaAcoes />
          </div>
          <CapaArte />
        </div>

        <Carta rotuloRegiao={T.capa.comoJogarTitulo}>
          <h2 className="m-0 mb-3 text-xl font-semibold text-azul">{T.capa.comoJogarTitulo}</h2>
          <ol className="m-0 grid list-none gap-3 p-0 sm:grid-cols-3">
            {T.capa.passos.map((p, i) => (
              <li key={p.titulo} className="flex flex-col gap-1">
                <span className="font-ficha text-xs text-neutro" aria-hidden="true">{String(i + 1).padStart(2, "0")}</span>
                <h3 className="m-0 text-base font-semibold text-azul">{p.titulo}</h3>
                <p className="m-0 text-sm text-tinta">{p.texto}</p>
              </li>
            ))}
          </ol>
        </Carta>
        <p className="m-0 text-xs text-poeira">{T.aviso}</p>
      </div>
    </section>
  );
}
