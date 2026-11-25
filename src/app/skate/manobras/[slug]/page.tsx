import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { MDXRemote } from "next-mdx-remote/rsc";
import { SeloNivel } from "@/components/skate/ListaManobras";
import { componentesMdx } from "@/components/skate/mdx";
import { getManobra, getManobras } from "@/lib/skate/manobras";

export function generateStaticParams() {
  return getManobras().map((m) => ({ slug: m.slug }));
}

export async function generateMetadata({ params }: PageProps<"/skate/manobras/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const m = getManobra(slug);
  if (!m) return {};
  return { title: `${m.meta.nome} · Guia de manobras`, description: m.meta.resumo };
}

export default function ManobraPage({ params }: PageProps<"/skate/manobras/[slug]">) {
  return (
    <Suspense fallback={<p className="px-4 pt-8 text-areia sm:px-6">Carregando manobra…</p>}>
      <Manobra params={params} />
    </Suspense>
  );
}

async function Manobra({ params }: { params: PageProps<"/skate/manobras/[slug]">["params"] }) {
  const { slug } = await params;
  const m = getManobra(slug);
  if (!m) notFound();
  const todas = getManobras();
  const nomeDe = (s: string) => todas.find((x) => x.slug === s)?.nome ?? s;
  const proximas = todas.filter((x) => x.prerequisitos.includes(slug));
  const { nome, nivel, obstaculo, resumo, prerequisitos } = m.meta;

  return (
    <article className="px-4 pb-20 pt-8 sm:px-6">
      <div className="mx-auto flex max-w-[720px] flex-col gap-6">
        <Link href="/skate/manobras" className="link-ficha no-underline">← Todas as manobras</Link>
        <header className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <SeloNivel nivel={nivel} />
            <span className="rotulo text-areia">{obstaculo}</span>
          </div>
          <h1 className="m-0 font-titulo text-4xl font-semibold text-creme sm:text-5xl">{nome}</h1>
          <p className="m-0 text-lg text-areia">{resumo}</p>
        </header>

        {prerequisitos.length > 0 && (
          <div className="surface-vidro flex flex-col gap-2 p-4">
            <span className="rotulo text-laranja-claro">Antes, domine</span>
            <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
              {prerequisitos.map((p) => (
                <li key={p}>
                  <Link href={`/skate/manobras/${p}`} className="botao-vidro inline-flex items-center text-sm no-underline">{nomeDe(p)}</Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex flex-col gap-4 text-[1.05rem] leading-relaxed text-areia">
          <MDXRemote source={m.content} components={componentesMdx} />
        </div>

        {proximas.length > 0 && (
          <div className="flex flex-col gap-2 border-t line-sutil pt-6">
            <span className="rotulo text-laranja-claro">Mandou bem? Próximas</span>
            <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
              {proximas.map((p) => (
                <li key={p.slug}>
                  <Link href={`/skate/manobras/${p.slug}`} className="botao-vidro inline-flex items-center text-sm no-underline">{p.nome}</Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </article>
  );
}
