import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { MDXRemote } from "next-mdx-remote/rsc";
import { componentesMdx } from "@/components/skate/mdx";
import { getCidades, getMateria, getMaterias } from "@/lib/skate/jornal";

export function generateStaticParams() {
  return getCidades().flatMap((c) => getMaterias(c.slug).map((m) => ({ cidade: c.slug, slug: m.slug })));
}

export async function generateMetadata({ params }: PageProps<"/skate/jornal/[cidade]/[slug]">): Promise<Metadata> {
  const { cidade, slug } = await params;
  const m = getMateria(cidade, slug);
  return m ? { title: `${m.meta.titulo} · Jornal Skate Universe`, description: m.meta.resumo } : {};
}

export default function MateriaPage({ params }: PageProps<"/skate/jornal/[cidade]/[slug]">) {
  return (
    <Suspense fallback={<p className="px-4 pt-8 text-areia sm:px-6">Carregando matéria…</p>}>
      <Materia params={params} />
    </Suspense>
  );
}

async function Materia({ params }: { params: PageProps<"/skate/jornal/[cidade]/[slug]">["params"] }) {
  const { cidade, slug } = await params;
  const m = getMateria(cidade, slug);
  if (!m) notFound();
  const { titulo, nomeCidade, epoca, ano, autor, capa } = m.meta;

  return (
    <article className="px-4 pb-20 pt-8 sm:px-6">
      <div className="mx-auto flex max-w-[720px] flex-col gap-6">
        <Link href={`/skate/jornal/${cidade}`} className="link-ficha no-underline">← Cena de {nomeCidade}</Link>
        <header className="flex flex-col gap-3">
          <span className="rotulo text-laranja-claro">{nomeCidade} · {epoca} · {ano}</span>
          <h1 className="m-0 font-titulo text-4xl font-semibold leading-tight text-creme sm:text-5xl">{titulo}</h1>
          <span className="font-ficha text-sm text-areia">Por {autor}</span>
        </header>
        {capa && (
          <div className="relative aspect-[16/10] overflow-hidden rounded-lg border line-sutil">
            <Image src={capa} alt="" fill sizes="720px" className="object-cover" />
          </div>
        )}
        <div className="flex flex-col gap-4 text-[1.05rem] leading-relaxed text-areia">
          <MDXRemote source={m.content} components={componentesMdx} />
        </div>
      </div>
    </article>
  );
}
