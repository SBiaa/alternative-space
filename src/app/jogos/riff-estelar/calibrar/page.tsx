import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { RiffCalibrar } from "@/components/riff/RiffCalibrar";
import { getUser } from "@/lib/auth/server";
import { lerAjustes } from "@/lib/riff/dados";

export const metadata: Metadata = { title: "Calibrar · Riff Estelar", robots: { index: false } };

export default function Page() {
  return (
    <section className="bg-ceu relative px-4 pb-18 pt-5 sm:px-6 sm:pt-9">
      <div className="mx-auto flex max-w-[640px] flex-col gap-5">
        <div className="flex flex-col gap-1.5">
          <Link href="/jogos/riff-estelar" className="etiqueta text-[11px] text-laranja-claro no-underline sm:text-xs">← Riff Estelar</Link>
          <h1 className="m-0 text-[28px] font-semibold leading-[1.05] sm:text-[40px]">Calibrar</h1>
        </div>
        <Suspense fallback={<p className="text-areia">Ligando o metrônomo…</p>}>
          <Ajustes />
        </Suspense>
      </div>
    </section>
  );
}

async function Ajustes() {
  const user = await getUser();
  const ajustes = user ? await lerAjustes(user.id) : null;
  return <RiffCalibrar ajustesServidor={ajustes} logado={Boolean(user)} />;
}
