import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { MDXRemote } from "next-mdx-remote/rsc";
import { Suspense, type ReactNode } from "react";
import { carregarFanzine } from "@/app/actions/fanzine";
import { FanzineJogo } from "@/components/fanzine/FanzineJogo";
import { capituloPublicado, lerMdx } from "@/lib/fanzine/carregar";
import { visaoPublica } from "@/lib/fanzine/conteudo";
import { TEXTOS } from "@/lib/fanzine/config";

type Params = { params: Promise<{ capitulo: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { capitulo } = await params;
  await connection(); // a data de publicação depende da hora do pedido
  const cap = capituloPublicado(capitulo);
  return cap ? { title: `${cap.titulo} · ${TEXTOS.titulo}`, description: cap.resumo } : { robots: { index: false } };
}

export default function Page({ params }: Params) {
  return (
    <section className="bg-ceu relative px-4 pb-18 pt-5 sm:px-6 sm:pt-9">
      <div className="mx-auto flex max-w-[860px] flex-col gap-4">
        <Suspense fallback={<p className="text-areia">…</p>}>
          <Capitulo params={params} />
        </Suspense>
      </div>
    </section>
  );
}

async function Capitulo({ params }: Params) {
  const { capitulo } = await params;
  await connection();
  const cap = capituloPublicado(capitulo);
  if (!cap) notFound();
  // O capítulo completo (ligações, resposta, dicas) fica aqui no servidor; o navegador recebe só a visão pública.
  const visao = visaoPublica(cap);
  const inicial = await carregarFanzine(cap.slug);
  if (!inicial.ok) notFound();
  const textos: Record<string, ReactNode> = Object.fromEntries(cap.paginas.map((p) => [p.id, <MDXRemote key={p.id} source={lerMdx(cap, p.id)} />]));
  return (
    <>
      <Link href="/jogos/fanzine" className="etiqueta text-[11px] text-areia no-underline sm:text-xs">
        ← {TEXTOS.titulo}
      </Link>
      <p className="m-0 font-ficha text-xs uppercase text-areia">Capítulo {cap.ordem}</p>
      <h1 className="m-0 text-[28px] font-semibold leading-[1.05] tracking-[-0.02em] sm:text-[40px]">{cap.titulo}</h1>
      <p className="m-0 text-areia">{cap.resumo}</p>
      <FanzineJogo visao={visao} inicial={inicial.estado} textos={textos} />
    </>
  );
}
