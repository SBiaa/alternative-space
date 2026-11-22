import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getCidades, getMaterias } from "@/lib/skate/jornal";

// Com Cache Components, generateStaticParams não pode voltar vazio (erro de build). Enquanto não há
// matéria publicada, devolve um parâmetro de enchimento; a página responde 404 pra ele.
export function generateStaticParams() {
  const params = getCidades().map((c) => ({ cidade: c.slug }));
  return params.length ? params : [{ cidade: "_" }];
}

export async function generateMetadata({ params }: PageProps<"/skate/jornal/[cidade]">): Promise<Metadata> {
  const { cidade } = await params;
  const c = getCidades().find((x) => x.slug === cidade);
  return c ? { title: `Cena de ${c.nome} · Jornal Skate Universe`, description: `A história do skate em ${c.nome}, dos começos até hoje.` } : {};
}

// Linha do tempo da cidade, do mais antigo pro mais recente.
export default function CidadePage({ params }: PageProps<"/skate/jornal/[cidade]">) {
  return (
    <Suspense fallback={<p className="px-4 pt-8 text-areia sm:px-6">Carregando…</p>}>
      <Cidade params={params} />
    </Suspense>
  );
}

async function Cidade({ params }: { params: PageProps<"/skate/jornal/[cidade]">["params"] }) {
  const { cidade } = await params;
  const materias = getMaterias(cidade);
  if (materias.length === 0) notFound();
  const nome = materias[0].nomeCidade;

  return (
    <section className="px-4 pb-20 pt-8 sm:px-6">
      <div className="mx-auto flex max-w-[760px] flex-col gap-8">
        <Link href="/skate/jornal" className="link-ficha no-underline">← Todas as cidades</Link>
        <header className="flex flex-col gap-2">
          <span className="etiqueta text-laranja-claro">Jornal da cena</span>
          <h1 className="h2 m-0 text-creme">A cena de {nome}</h1>
          <p className="m-0 text-areia">Dos começos até hoje.</p>
        </header>
        <ol className="relative m-0 flex list-none flex-col gap-6 border-l-2 border-laranja/60 p-0 pl-6">
          {materias.map((m) => (
            <li key={m.slug} className="relative">
              <span aria-hidden className="absolute -left-[33px] top-1.5 size-4 rounded-full border-2 border-noite bg-laranja" />
              <span className="rotulo text-laranja-claro">{m.epoca} · {m.ano}</span>
              <Link href={`/skate/jornal/${cidade}/${m.slug}`} className="mt-1 block font-titulo text-2xl font-semibold text-creme no-underline hover:underline">
                {m.titulo}
                {m.rascunho && <span className="rotulo ml-2 align-middle text-[#f2c14e]">rascunho</span>}
              </Link>
              <p className="m-0 mt-1 text-areia">{m.resumo}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
