import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { CriarPersonagem } from "@/components/bolso/CriarPersonagem";
import { COLUNA, LINK_VOLTAR, MESA } from "@/components/bolso/tema";
import { getUser } from "@/lib/auth/server";
import { BASE } from "@/lib/bolso/config";
import { voltaSegura } from "@/lib/bolso/rotas";

export const metadata: Metadata = { title: "Nova personagem · Mesa de Bolso" };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default function Page({ searchParams }: Props) {
  return (
    <section className={MESA}>
      <div className={COLUNA}>
        <Link href={`${BASE}/personagens`} className={LINK_VOLTAR}>← Personagens</Link>
        <h1 className="m-0 text-[28px] font-semibold leading-[1.05] tracking-[-0.02em] sm:text-[40px]">Nova personagem</h1>
        <Suspense fallback={<p className="text-areia">Preparando a ficha…</p>}>
          <Formulario searchParams={searchParams} />
        </Suspense>
      </div>
    </section>
  );
}

async function Formulario({ searchParams }: Props) {
  const [sp, user] = await Promise.all([searchParams, getUser()]);
  return <CriarPersonagem volta={voltaSegura(sp.volta)} logado={!!user} />;
}
