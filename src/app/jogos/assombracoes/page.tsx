import type { Metadata } from "next";
import Link from "next/link";
import { VilaNoite } from "@/components/assombracoes/arte";
import { ListaCasos } from "@/components/assombracoes/ListaCasos";
import { casosVisiveis } from "@/lib/assombracoes/casos";
import { TEXTOS, VILA } from "@/lib/assombracoes/config";

export const metadata: Metadata = {
  title: TEXTOS.titulo,
  description: "Casos estranhos numa vila do interior, com criaturas do folclore brasileiro. Investigue, converse e entenda a história. Terror leve, livre.",
};

export default function Page() {
  const T = TEXTOS;
  const casos = casosVisiveis().map((c) => ({ slug: c.publico.slug, titulo: c.publico.titulo, resumo: c.publico.resumo, lugarPrincipal: c.publico.lugarPrincipal }));
  return (
    <section className="bg-ceu relative px-4 pb-18 pt-5 sm:px-6 sm:pt-9">
      <div className="mx-auto flex max-w-[960px] flex-col gap-6">
        <Link href="/jogos" className="etiqueta text-[11px] text-laranja-claro no-underline sm:text-xs">← Fliperama</Link>
        <div className="overflow-hidden rounded-lg border border-creme/18">
          <VilaNoite className="block aspect-[5/3] w-full sm:aspect-[2/1]" />
        </div>
        <div className="flex flex-col gap-2">
          <span className="rotulo text-laranja-claro">{VILA.nome}</span>
          <h1 className="m-0 text-[28px] font-semibold leading-[1.05] tracking-[-0.02em] sm:text-[44px]">{T.titulo}</h1>
          <p className="m-0 text-base text-areia">{T.chamada}</p>
          <p className="m-0 text-sm text-poeira">{T.aviso}</p>
        </div>

        <section aria-labelledby="como-jogar" className="flex flex-col gap-2">
          <h2 id="como-jogar" className="m-0 text-2xl font-semibold">{T.comoJogarTitulo}</h2>
          <ol className="m-0 flex list-decimal flex-col gap-1.5 pl-5 text-creme">
            {T.comoJogar.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ol>
          <p className="m-0 text-sm text-areia">{T.comoJogarNota}</p>
        </section>

        <section aria-labelledby="casos" className="flex flex-col gap-3">
          <h2 id="casos" className="m-0 text-2xl font-semibold">{T.casos}</h2>
          <ListaCasos casos={casos} />
        </section>

        <nav aria-label="Mais" className="flex flex-wrap gap-2">
          <Link href="/jogos/assombracoes/mapa" className="botao-vidro inline-flex items-center no-underline">{T.mapa}</Link>
          <Link href="/jogos/assombracoes/bestiario" className="botao-vidro inline-flex items-center no-underline">{T.bestiario}</Link>
        </nav>
      </div>
    </section>
  );
}
