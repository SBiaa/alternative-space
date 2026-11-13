import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { carregarTaverna } from "@/app/actions/taverna";
import { TavernaMelhorias } from "@/components/taverna/TavernaMelhorias";

export const metadata: Metadata = { title: "Taverna do Dragão Cansado · melhorias", robots: { index: false } };

export default function Page() {
  return (
    <section className="bg-lareira-madeira relative px-4 pb-18 pt-4 sm:px-6 sm:pt-8">
      <div className="mx-auto flex max-w-[1240px] flex-col gap-4">
        <div className="flex flex-wrap gap-x-5 gap-y-1">
          <Link href="/jogos/taverna" className="etiqueta text-[11px] text-lareira-brasa no-underline sm:text-xs">← Taverna</Link>
          <Link href="/jogos/taverna/noite" className="etiqueta text-[11px] text-lareira-brasa no-underline sm:text-xs">Abrir a noite →</Link>
        </div>
        <Suspense fallback={<p className="text-areia">Abrindo a oficina…</p>}>
          <Melhorias />
        </Suspense>
      </div>
    </section>
  );
}

async function Melhorias() {
  return <TavernaMelhorias inicial={await carregarTaverna()} />;
}
