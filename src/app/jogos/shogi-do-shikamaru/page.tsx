import type { Metadata } from "next";
import { JogoPagina } from "@/components/JogoPagina";
import { ShogiShikamaru } from "@/components/ShogiShikamaru";

export const metadata: Metadata = {
  title: "Shogi do Shikamaru",
  description: "Mini shogi 5x5 contra a CPU: capture peças, largue-as de volta no tabuleiro e dê xeque-mate no rei.",
};

export default function Page() {
  return (
    <JogoPagina
      slug="shogi-do-shikamaru"
      comoJogar={
        <>
          <p className="m-0">
            Toque numa peça sua (as de baixo) e depois numa casa marcada. Vence quem der xeque-mate no rei. Peças capturadas vão pra sua mão e podem ser
            largadas em qualquer casa vazia, no lugar de mexer uma peça.
          </p>
          <p className="m-0 mt-1.5">
            Movimentos: Rei 王 anda 1 pra qualquer lado. Ouro 金 anda 1 menos nas diagonais de trás. Prata 銀 anda 1 nas diagonais e pra frente. Bispo 角
            desliza nas diagonais, Torre 飛 em linha reta, Peão 歩 anda 1 pra frente. Ao chegar na última fileira, a peça pode promover (fica vermelha): prata
            e peão viram ouro; bispo e torre ganham 1 casa nas outras direções.
          </p>
        </>
      }
      extra={<p className="etiqueta text-center text-[11px] text-poeira">jogo de fã, sem ligação oficial com a série</p>}
    >
      <ShogiShikamaru />
    </JogoPagina>
  );
}
