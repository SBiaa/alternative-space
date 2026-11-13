import type { Metadata } from "next";
import { Suspense } from "react";
import { MuroPintura } from "@/components/muro/MuroPintura";

export const metadata: Metadata = { title: "Muro · Muro Livre" };

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<p>Carregando…</p>}>
      <Conteudo params={params} />
    </Suspense>
  );
}

async function Conteudo({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <MuroPintura id={decodeURIComponent(id)} />;
}
