import type { Metadata } from "next";
import { JogoPagina } from "@/components/JogoPagina";
import { RamenIchiraku } from "@/components/RamenIchiraku";

export const metadata: Metadata = {
  title: "Ramen do Ichiraku",
  description: "Monte tigelas de ramen contra o tempo: caldo, ingredientes e combo de pedidos certos.",
};

export default function Page() {
  return (
    <JogoPagina
      slug="ramen-do-ichiraku"
      comoJogar={
        <p className="m-0">
          Cada cliente mostra o pedido: um caldo e alguns ingredientes. Toque no caldo e nos ingredientes pra montar a tigela (tocar de novo tira) e
          depois toque no cliente pra servir. Pedido certo rende pontos, gorjeta por rapidez e sobe o combo; pedido errado ou cliente que desiste zera o
          combo. No teclado: Q W E caldos, A S D F G H ingredientes, 1 2 3 servem e Backspace joga a tigela fora.
        </p>
      }
      extra={<p className="etiqueta text-center text-[11px] text-poeira">jogo de fã, sem ligação oficial com a série</p>}
    >
      <RamenIchiraku />
    </JogoPagina>
  );
}
