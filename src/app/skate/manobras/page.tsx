import type { Metadata } from "next";
import { ListaManobras } from "@/components/skate/ListaManobras";
import { getManobras } from "@/lib/skate/manobras";

export const metadata: Metadata = {
  title: "Guia de manobras · Skate Universe",
  description: "Manobras de skate do básico ao avançado, com passo a passo, erros comuns e pré-requisitos.",
};

export default function ManobrasPage() {
  return (
    <section className="px-4 pb-20 pt-10 sm:px-6">
      <div className="miolo flex flex-col gap-8">
        <header className="flex max-w-[640px] flex-col gap-3">
          <span className="etiqueta text-laranja-claro">Guia de manobras</span>
          <h1 className="h2 m-0 text-creme">Do básico ao avançado.</h1>
          <p className="m-0 text-areia">Cada manobra diz o que você precisa dominar antes. Vai na ordem que o tombo é menor.</p>
        </header>
        <ListaManobras manobras={getManobras()} />
      </div>
    </section>
  );
}
