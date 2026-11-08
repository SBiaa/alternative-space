import type { Metadata } from "next";
import Link from "next/link";
import { DueloPirata } from "@/components/DueloPirata";

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
    <section className="secao !pt-12">
      <div className="miolo flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <Link href="/jogos" className="etiqueta text-azul no-underline hover:underline">← Jogos</Link>
          <h1 className="font-titulo font-bold leading-[1] text-azul" style={{ fontSize: "clamp(2.2rem, 5vw, 3.6rem)" }}>
            Duelo Pirata
          </h1>
          <p className="max-w-[640px] text-lg leading-relaxed text-tinta">
            Escolha seu pirata e sai na porrada no convés. Golpes acertados enchem a barra azul; quando ela passa da marca, solta o especial. Melhor de 3 rounds.
          </p>
        </div>
        <div className="mx-auto w-full max-w-[960px]">
          <DueloPirata />
        </div>
        <div className="mx-auto w-full max-w-[960px] overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="etiqueta text-[12px] text-azul">
                <th className="py-1 pr-4 font-normal">Comando</th>
                <th className="py-1 pr-4 font-normal">1 jogador / Jogador 1 *</th>
                <th className="py-1 font-normal">Jogador 2</th>
              </tr>
            </thead>
            <tbody>
              {comandos.map(([c, p1, p2]) => (
                <tr key={c} className="border-t border-noite/15">
                  <td className="py-1.5 pr-4 font-bold">{c}</td>
                  <td className="py-1.5 pr-4">{p1}</td>
                  <td className="py-1.5">{p2}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-2 text-xs text-neutro">
            * No modo 2 jogadores, o Jogador 1 usa WASD + F G H. Controle de videogame também funciona (X soco, A chute, B/Y especial). No celular aparecem botões embaixo do jogo (ou dos lados, com o celular deitado). Esc pausa.
          </p>
        </div>
        <p className="etiqueta text-center text-[12px] text-neutro">jogo de fã, sem ligação oficial com One Piece</p>
      </div>
    </section>
  );
}
