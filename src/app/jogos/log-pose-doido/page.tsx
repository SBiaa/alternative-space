import type { Metadata } from "next";
import Link from "next/link";
import { LogPoseDoido } from "@/components/LogPoseDoido";

export const metadata: Metadata = {
  title: "Log Pose Doido",
  description: "Guie o navio entre redemoinhos, tempestades e reis do mar, com um Log Pose que muda de ideia o tempo todo.",
};

export default function Page() {
  return (
    <section className="secao !pt-12">
      <div className="miolo flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <Link href="/jogos" className="etiqueta text-azul no-underline hover:underline">← Jogos</Link>
          <h1 className="font-titulo font-bold leading-[1] text-azul" style={{ fontSize: "clamp(2.2rem, 5vw, 3.6rem)" }}>
            Log Pose Doido
          </h1>
          <p className="max-w-[640px] text-lg leading-relaxed text-tinta">
            Desvie dos redemoinhos, dos raios das tempestades e dos reis do mar. O problema: o Log Pose gira sozinho e as setas giram junto. Quando ele começar a tremer, se prepara.
          </p>
        </div>
        <div className="mx-auto w-full max-w-[960px]">
          <LogPoseDoido />
        </div>
        <p className="etiqueta text-center text-[12px] text-neutro">
          Setas / WASD, ou segure o dedo na tela pra remar naquela direção · 3 cascos de vida · moeda vale 10 pontos
        </p>
      </div>
    </section>
  );
}
