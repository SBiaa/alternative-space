import type { Metadata } from "next";
import Link from "next/link";
import { MapaCliente } from "@/components/skate/MapaCliente";

export const metadata: Metadata = {
  title: "Mapa de picos · Skate Universe",
  description: "Pistas, picos de rua e skate shops em qualquer cidade. Achou um pico novo? Cadastra e dá o nome.",
};

export default function MapaPage() {
  return (
    <section className="px-4 pb-20 pt-8 sm:px-6">
      <div className="miolo flex flex-col gap-5">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex max-w-[620px] flex-col gap-2">
            <span className="etiqueta text-laranja-claro">Mapa de picos</span>
            <h1 className="h2 m-0 text-creme">Onde andar hoje?</h1>
            <p className="m-0 text-areia">Pistas e skate shops do OpenStreetMap, mais os picos de rua que a comunidade descobriu.</p>
          </div>
          <Link href="/skate/picos/novo" className="botao-laranja inline-flex items-center no-underline">+ Cadastrar pico</Link>
        </header>
        <MapaCliente />
      </div>
    </section>
  );
}
