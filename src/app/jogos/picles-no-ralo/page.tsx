import type { Metadata } from "next";
import Link from "next/link";
import { PiclesNoRalo } from "@/components/PiclesNoRalo";

export const metadata: Metadata = {
  title: "Picles no Ralo",
  description: "Segura pra subir, solta pra descer: leve o Picles Rick pelo esgoto desviando de canos e ratos.",
};

export default function Page() {
  return (
    <section className="secao !pt-12">
      <div className="miolo flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <Link href="/jogos" className="etiqueta text-azul no-underline hover:underline">← Jogos</Link>
          <h1 className="font-titulo font-bold leading-[1] text-azul" style={{ fontSize: "clamp(2.2rem, 5vw, 3.6rem)" }}>
            Picles no Ralo
          </h1>
          <p className="max-w-[640px] text-lg leading-relaxed text-tinta">
            Um botão só: segura pra subir, solta pra descer. O esgoto vai apertando, os ratos não perdoam e o recorde fica salvo no seu navegador.
          </p>
        </div>
        <div className="mx-auto w-full max-w-[960px]">
          <PiclesNoRalo />
        </div>
        <p className="etiqueta text-center text-[12px] text-neutro">
          Mouse, toque ou espaço / seta pra cima · jogo de fã, sem ligação oficial com a série
        </p>
      </div>
    </section>
  );
}
