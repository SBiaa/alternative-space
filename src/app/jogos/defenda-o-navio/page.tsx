import type { Metadata } from "next";
import Link from "next/link";
import { DefendaONavio } from "@/components/DefendaONavio";

export const metadata: Metadata = {
  title: "Defenda o Navio",
  description: "Tower defense no convés: a marinha invade e você posiciona a tripulação, cada um com seu jeito de lutar.",
};

export default function Page() {
  return (
    <section className="secao !pt-12">
      <div className="miolo flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <Link href="/jogos" className="etiqueta text-azul no-underline hover:underline">← Jogos</Link>
          <h1 className="font-titulo font-bold leading-[1] text-azul" style={{ fontSize: "clamp(2.2rem, 5vw, 3.6rem)" }}>
            Defenda o Navio
          </h1>
          <p className="max-w-[680px] text-lg leading-relaxed text-tinta">
            A marinha sobe pela prancha e marcha pelo convés atrás do tesouro. Posicione a tripulação ao lado do caminho: o
            espadachim corta de perto, a atiradora fura escudo, o cozinheiro queima grupos, a navegadora deixa todo mundo lento e o
            canhoneiro explode de longe. São 12 ondas.
          </p>
        </div>
        <div className="mx-auto w-full max-w-[960px]">
          <DefendaONavio />
        </div>
        <p className="etiqueta text-center text-[12px] text-neutro">
          Teclas 1 a 5 escolhem o tripulante · espaço chama a onda · P pausa · Esc ou botão direito cancela
        </p>
      </div>
    </section>
  );
}
