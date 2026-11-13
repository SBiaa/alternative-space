import type { Metadata } from "next";
import { Suspense } from "react";
import { CorreJogo } from "@/components/corre/CorreJogo";

export const metadata: Metadata = { title: "O Corre · jogar" };

export default function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return (
    <section className="bg-ceu relative px-4 pb-18 pt-4 sm:px-6 sm:pt-8">
      <h1 className="sr-only">O Corre</h1>
      <Suspense fallback={<p className="text-areia">Abrindo o mapa…</p>}>
        <Jogo searchParams={searchParams} />
      </Suspense>
    </section>
  );
}

async function Jogo({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  return <CorreJogo novo={sp.novo === "1"} />;
}
