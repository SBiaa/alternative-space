import type { Metadata } from "next";
import Link from "next/link";
import { FrutaMisteriosa } from "@/components/FrutaMisteriosa";

export const metadata: Metadata = {
  title: "Fruta Misteriosa",
  description: "Plataforma no meio do mar: atravesse as ilhas até o baú sem encostar na água.",
};

export default function Page() {
  return (
    <section className="secao !pt-12">
      <div className="miolo flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <Link href="/jogos" className="etiqueta text-azul no-underline hover:underline">← Jogos</Link>
          <h1 className="font-titulo font-bold leading-[1] text-azul" style={{ fontSize: "clamp(2.2rem, 5vw, 3.6rem)" }}>
            Fruta Misteriosa
          </h1>
          <p className="max-w-[640px] text-lg leading-relaxed text-tinta">
            Atravesse as ilhas até o baú. Encostou na água, afundou e recomeça.
          </p>
        </div>
        <div className="mx-auto w-full max-w-[960px]">
          <FrutaMisteriosa />
        </div>
        <p className="etiqueta text-center text-[12px] text-neutro">
          Setas ou A/D pra andar · espaço, W ou Z pra pular · X, K ou Shift pro poder
        </p>
      </div>
    </section>
  );
}
