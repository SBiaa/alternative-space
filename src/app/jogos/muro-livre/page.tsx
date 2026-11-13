import type { Metadata } from "next";
import Link from "next/link";
import { MuroCapa } from "@/components/muro/MuroCapa";

export const metadata: Metadata = {
  title: "Muro Livre",
  description: "Gestão de crew de grafite autorizado: pegue encomendas de mural, negocie autorização, cuide de tinta, clima e prazo.",
};

export default function Page() {
  return (
    <>
      <Link href="/jogos" className="inline-block min-h-11 py-2 text-xs font-bold uppercase text-azul no-underline">← Fliperama</Link>
      <MuroCapa />
    </>
  );
}
