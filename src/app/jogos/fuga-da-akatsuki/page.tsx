import type { Metadata } from "next";
import { FugaDaAkatsuki } from "@/components/FugaDaAkatsuki";
import { JogoPagina } from "@/components/JogoPagina";

export const metadata: Metadata = {
  title: "Fuga da Akatsuki",
  description: "Runner infinito: pule entre telhados, desvie de shurikens e pegue pergaminhos.",
};

export default function Page() {
  return (
    <JogoPagina
      slug="fuga-da-akatsuki"
      comoJogar={
        <p className="m-0">
          O ninja corre sozinho. Toque (ou espaço / seta pra cima) pra pular e toque de novo no ar pro pulo duplo; segurar pula mais alto. Cair
          entre os prédios acaba a fuga, e cada shuriken tira um dos 3 corações. Pergaminho vale 50 pontos, e a corrida vai acelerando.
        </p>
      }
      extra={<p className="etiqueta text-center text-[11px] text-poeira">jogo de fã, sem ligação oficial com a série</p>}
    >
      <FugaDaAkatsuki />
    </JogoPagina>
  );
}
