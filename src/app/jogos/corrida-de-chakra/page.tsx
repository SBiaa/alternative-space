import type { Metadata } from "next";
import { CorridaDeChakra } from "@/components/CorridaDeChakra";
import { JogoPagina } from "@/components/JogoPagina";

export const metadata: Metadata = {
  title: "Corrida de Chakra",
  description: "Segura pra concentrar chakra e solta na hora certa: suba na árvore, ande na água e monte o Rasengan.",
};

export default function Page() {
  return (
    <JogoPagina
      slug="corrida-de-chakra"
      comoJogar={
        <p className="m-0">
          Segura pra encher a barra de chakra e solta quando ela estiver na faixa verde (no miolo claro vale perfeito). Pouco chakra ou demais
          custa uma vida, e se segurar até o topo estoura. Três fases: árvore, água e Rasengan. Vale mouse, toque, espaço ou seta pra cima.
        </p>
      }
      extra={<p className="etiqueta text-center text-[11px] text-poeira">jogo de fã, sem ligação oficial com a série</p>}
    >
      <CorridaDeChakra />
    </JogoPagina>
  );
}
