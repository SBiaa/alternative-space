import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { CasoJogo } from "@/components/assombracoes/CasoJogo";
import { acharCaso, publicoDe } from "@/lib/assombracoes/casos";
import { LUGARES, TEXTOS } from "@/lib/assombracoes/config";

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const c = acharCaso(slug);
  return c ? { title: `${c.publico.titulo} · ${TEXTOS.titulo}`, description: c.publico.resumo } : { title: TEXTOS.titulo, robots: { index: false } };
}

export default function Page({ params }: Params) {
  return (
    <section className="bg-ceu relative px-4 pb-18 pt-5 sm:px-6 sm:pt-9">
      <div className="mx-auto flex max-w-[960px] flex-col gap-5">
        <Link href="/jogos/assombracoes" className="etiqueta text-[11px] text-laranja-claro no-underline sm:text-xs">← {TEXTOS.titulo}</Link>
        <Suspense fallback={<p className="text-areia">{TEXTOS.conferindo}</p>}>
          <Caso params={params} />
        </Suspense>
      </div>
    </section>
  );
}

async function Caso({ params }: Params) {
  const { slug } = await params;
  const c = acharCaso(slug);
  if (!c) notFound();
  // Só a parte pública vai pro navegador: o gabarito fica aqui no servidor.
  const publico = publicoDe(c);
  return (
    <>
      <div className="flex flex-col gap-1">
        <span className="rotulo text-laranja-claro">{LUGARES[publico.lugarPrincipal].nome}</span>
        <h1 className="m-0 text-[28px] font-semibold leading-[1.05] tracking-[-0.02em] sm:text-[44px]">{publico.titulo}</h1>
      </div>
      <CasoJogo publico={publico} />
    </>
  );
}
