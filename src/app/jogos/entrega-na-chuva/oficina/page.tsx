import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Oficina } from "@/components/entrega/Oficina";
import { getUser } from "@/lib/auth/server";
import { TEXTOS } from "@/lib/entrega/config";
import { implantesDe, saldoDe } from "@/lib/entrega/dados";

export const metadata: Metadata = { title: `${TEXTOS.oficina} · ${TEXTOS.nome}` };

export default function Page() {
  return (
    <section className="bg-ceu relative px-4 pb-18 pt-5 sm:px-6 sm:pt-9">
      <div className="mx-auto flex max-w-[720px] flex-col gap-5">
        <div className="flex flex-col gap-1.5">
          <Link href="/jogos/entrega-na-chuva" className="etiqueta text-[11px] text-laranja-claro no-underline sm:text-xs">
            ← {TEXTOS.nome}
          </Link>
          <h1 className="m-0 text-[28px] font-semibold leading-[1.05] tracking-[-0.02em] sm:text-[40px]">{TEXTOS.oficina}</h1>
        </div>
        <Suspense fallback={null}>
          <Conteudo />
        </Suspense>
      </div>
    </section>
  );
}

async function Conteudo() {
  const user = await getUser();
  const [lista, saldo] = await Promise.all([implantesDe(user?.id ?? null), user ? saldoDe(user.id) : 0]);
  if (lista.length === 0) return null;
  const implantes = lista.map(({ slug, name, description, maxLevel, prices, level, equipped }) => ({ slug, name, description, maxLevel, prices, level, equipped }));
  return <Oficina implantes={implantes} saldo={saldo} logado={Boolean(user)} />;
}
