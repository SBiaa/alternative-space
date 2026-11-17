import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { HistoriaIlha } from "@/components/mar/HistoriaIlha";
import { ILHA, ILHAS } from "@/lib/mar-sem-fim/conteudo";

export function generateStaticParams() {
  return ILHAS.map((i) => ({ slug: i.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  return { title: ILHA[slug]?.nome };
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!ILHA[slug]) notFound();
  return (
    <section className="bg-ceu relative px-4 pb-18 pt-5 sm:px-6 sm:pt-9">
      <div className="mx-auto max-w-[760px]">
        <HistoriaIlha slug={slug} />
      </div>
    </section>
  );
}
