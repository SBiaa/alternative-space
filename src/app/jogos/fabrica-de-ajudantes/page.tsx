import type { Metadata } from "next";
import Link from "next/link";
import { FabricaDeAjudantes } from "@/components/FabricaDeAjudantes";

export const metadata: Metadata = {
  title: "Fábrica de Ajudantes",
  description: "Um clicker de ajudantes azuis que cumprem pedidos absurdos e entram em pane se o trabalho demora demais.",
};

export default function Page() {
  return (
    <section className="secao !pt-12">
      <div className="miolo flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <Link href="/jogos" className="etiqueta text-azul no-underline hover:underline">← Jogos</Link>
          <h1 className="font-titulo font-bold leading-[1] text-azul" style={{ fontSize: "clamp(2.2rem, 5vw, 3.6rem)" }}>
            Fábrica de Ajudantes
          </h1>
          <p className="max-w-[680px] text-lg leading-relaxed text-tinta">
            Aperta a caixa, sai um ajudante azul doido pra cumprir o pedido. Só que a paciência deles é curta: se o pedido demorar,
            eles entram em pane, correm pela fábrica, derrubam seus favores e sentam em cima dos botões.
          </p>
        </div>
        <div className="mx-auto w-full max-w-[1100px]">
          <FabricaDeAjudantes />
        </div>
      </div>
    </section>
  );
}
