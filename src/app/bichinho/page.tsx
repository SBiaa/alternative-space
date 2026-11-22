import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { PreviaBichinho } from "@/components/bichinho/PreviaBichinho";
import { getUser } from "@/lib/auth/server";
import { TEXTOS } from "@/lib/bichinho/config";

export const metadata: Metadata = { title: TEXTOS.titulo };

// Página pública do bichinho: quem está fora vê a prévia; quem está logado vai pra página de verdade
// (/conta/* exige login, então a prévia não podia morar lá).
export default function Page() {
  return (
    <section className="relative px-4 pb-16 pt-6 sm:px-6 sm:pt-9">
      <div className="mx-auto flex max-w-[1000px] flex-col gap-5">
        <Link href="/" className="link-ficha !text-xs">
          ← Início
        </Link>
        <h1 className="m-0 text-[28px] font-semibold leading-[1.05] tracking-[-0.02em] sm:text-[40px]">{TEXTOS.titulo}</h1>
        <Suspense fallback={<p className="text-areia">Abrindo a janela…</p>}>
          <Conteudo />
        </Suspense>
      </div>
    </section>
  );
}

async function Conteudo() {
  const user = await getUser();
  if (user) redirect("/conta/bichinho");
  return <PreviaBichinho />;
}
