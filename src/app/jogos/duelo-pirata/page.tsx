import type { Metadata } from "next";
import { DueloPirata } from "@/components/DueloPirata";
import { JogoPagina } from "@/components/JogoPagina";

export const metadata: Metadata = {
  title: "Duelo Pirata",
  description: "Jogo de luta 1 contra 1 com Luffy, Zoro, Sanji e Nami no convés de um navio. Contra a CPU ou contra um amigo.",
};

const comandos = [
  ["Andar / pular / agachar", "WASD ou setas", "setas"],
  ["Soco", "J (ou F)", "1 do teclado numérico (ou ,)"],
  ["Chute", "K (ou G)", "2 do teclado numérico (ou .)"],
  ["Especial", "L (ou H)", "3 do teclado numérico (ou ;)"],
  ["Defender", "segurar pra trás", "segurar pra trás"],
];

export default function Page() {
  return (
    <JogoPagina
      slug="duelo-pirata"
      comoJogar={
        <p className="m-0">
          Escolha seu pirata e sai na porrada no convés. Golpes acertados enchem a barra azul; quando ela passa da marca, solta o especial.
          Melhor de 3 rounds. No celular aparecem botões embaixo do jogo (ou dos lados, com o celular deitado). Esc pausa.
        </p>
      }
      extra={
        <div className="card overflow-x-auto px-4 py-3.5">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="etiqueta text-[10px] text-laranja-claro">
                <th className="py-1 pr-4 font-normal">Comando</th>
                <th className="py-1 pr-4 font-normal">1 jogador / Jogador 1 *</th>
                <th className="py-1 font-normal">Jogador 2</th>
              </tr>
            </thead>
            <tbody className="text-areia">
              {comandos.map(([c, p1, p2]) => (
                <tr key={c} className="border-t border-creme/15">
                  <td className="py-1.5 pr-4 font-semibold text-creme">{c}</td>
                  <td className="py-1.5 pr-4">{p1}</td>
                  <td className="py-1.5">{p2}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-2 mb-0 text-xs text-poeira">
            * No modo 2 jogadores, o Jogador 1 usa WASD + F G H. Controle de videogame também funciona (X soco, A chute, B/Y especial).
            Jogo de fã, sem ligação oficial com One Piece.
          </p>
        </div>
      }
    >
      <DueloPirata />
    </JogoPagina>
  );
}
