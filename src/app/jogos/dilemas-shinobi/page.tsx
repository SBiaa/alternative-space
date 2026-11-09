import type { Metadata } from "next";
import { DilemasShinobi } from "@/components/DilemasShinobi";
import { JogoPagina } from "@/components/JogoPagina";

export const metadata: Metadata = {
  title: "Dilemas Shinobi",
  description: "Perguntas do tipo \"o que você faria?\". Vote e veja o que o resto da tripulação escolheu.",
};

export default function Page() {
  return (
    <JogoPagina
      slug="dilemas-shinobi"
      comoJogar={
        <p className="m-0">
          Leia o dilema e escolha o que você faria. Depois de votar aparece a porcentagem de cada resposta. Só votos de quem tem conta
          entram na conta, um por dilema. Jogo de fã, sem ligação oficial com Naruto.
        </p>
      }
    >
      <DilemasShinobi />
    </JogoPagina>
  );
}
