import type { Metadata } from "next";
import { ConexoesShinobi } from "@/components/ConexoesShinobi";
import { JogoPagina } from "@/components/JogoPagina";

export const metadata: Metadata = {
  title: "Conexões Shinobi",
  description: "16 ninjas, 4 grupos escondidos. Ache o que cada grupo tem em comum, no estilo Connections.",
};

export default function Page() {
  return (
    <JogoPagina
      slug="conexoes-shinobi"
      comoJogar={
        <p className="m-0">
          Toque em 4 nomes que têm algo em comum e aperte Enviar. Cuidado com as pegadinhas: tem ninja que parece caber em dois grupos.
          Você tem 4 chances. Do amarelo (mais fácil) ao roxo (mais difícil). Jogo de fã, sem ligação oficial com Naruto.
        </p>
      }
    >
      <ConexoesShinobi />
    </JogoPagina>
  );
}
