import type { Metadata } from "next";
import { DefendaONavio } from "@/components/DefendaONavio";
import { JogoPagina } from "@/components/JogoPagina";

export const metadata: Metadata = {
  title: "Defenda o Navio",
  description: "Tower defense no convés: a marinha invade e você posiciona a tripulação, cada um com seu jeito de lutar.",
};

export default function Page() {
  return (
    <JogoPagina
      slug="defenda-o-navio"
      comoJogar={
        <>
          <p className="m-0">
            A marinha sobe pela prancha atrás do tesouro. Posicione a tripulação ao lado do caminho: o espadachim corta de perto, a atiradora
            fura escudo, o cozinheiro queima grupos, a navegadora deixa todo mundo lento e o canhoneiro explode de longe. São 12 ondas.
          </p>
          <p className="mt-2 mb-0 text-poeira">No computador: teclas 1 a 5 escolhem o tripulante, espaço chama a onda, P pausa, Esc ou botão direito cancela.</p>
        </>
      }
    >
      <DefendaONavio />
    </JogoPagina>
  );
}
