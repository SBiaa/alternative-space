import type { Metadata } from "next";
import { Suspense } from "react";
import { ConversaTela } from "@/components/muro/ConversaTela";

export const metadata: Metadata = { title: "Conversa · Muro Livre" };

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<p>Carregando…</p>}>
      <Conteudo params={params} />
    </Suspense>
  );
}

async function Conteudo({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ConversaTela id={decodeURIComponent(id)} />;
}
