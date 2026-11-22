import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { EscolhaOvo } from "@/components/bichinho/EscolhaOvo";
import { PaginaBichinho } from "@/components/bichinho/PaginaBichinho";
import { PreviaBichinho } from "@/components/bichinho/PreviaBichinho";
import { getUser } from "@/lib/auth/server";
import { TEXTOS } from "@/lib/bichinho/config";
import { abrirBase } from "@/lib/bichinho/dados";

export const metadata: Metadata = { title: TEXTOS.titulo, robots: { index: false } };

export default function Page() {
  return (
    <section className="relative px-4 pb-16 pt-6 sm:px-6 sm:pt-9">
      <div className="mx-auto flex max-w-[1000px] flex-col gap-5">
        <Link href="/conta" className="link-ficha !text-xs">
          ← Sua base
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
  if (!user) return <PreviaBichinho />;
  const pet = await abrirBase(user.id);
  return pet ? <PaginaBichinho pet={pet} /> : <EscolhaOvo />;
}
