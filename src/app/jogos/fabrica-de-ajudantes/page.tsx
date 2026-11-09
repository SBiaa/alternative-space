import type { Metadata } from "next";
import { FabricaDeAjudantes } from "@/components/FabricaDeAjudantes";
import { JogoPagina } from "@/components/JogoPagina";

export const metadata: Metadata = {
  title: "Fábrica de Ajudantes",
  description: "Um clicker de ajudantes azuis que cumprem pedidos absurdos e entram em pane se o trabalho demora demais.",
};

export default function Page() {
  return (
    <JogoPagina
      slug="fabrica-de-ajudantes"
      comoJogar={
        <p className="m-0">
          Aperta a caixa, sai um ajudante azul doido pra cumprir o pedido. A paciência deles é curta: se o pedido demorar, eles entram em pane,
          correm pela fábrica, derrubam seus favores e sentam em cima dos botões. O progresso fica salvo neste navegador.
        </p>
      }
    >
      <FabricaDeAjudantes />
    </JogoPagina>
  );
}
