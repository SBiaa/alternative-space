"use client";

import { MANOBRA, MANOBRAS, TEXTOS, type Direcao } from "@/lib/role/config";

// Alternativa aos gestos: um botão por direção (que vira a manobra certa no chão ou no ar) e remar/frear.
const SETA: Record<Direcao, string> = { up: "↑", down: "↓", left: "←", right: "→" };

export function BotoesManobra({ aoDirecao }: { aoDirecao: (d: Direcao, on: boolean) => void }) {
  const extra: Partial<Record<Direcao, string>> = { left: TEXTOS.jogo.frear, right: TEXTOS.jogo.remar };
  const rotulo = (d: Direcao) =>
    [extra[d], ...MANOBRAS.filter((m) => MANOBRA[m].direcao === d).map((m) => MANOBRA[m].nome)].filter(Boolean).join(" / ");
  const botao = (d: Direcao) => (
    <button
      key={d}
      type="button"
      className="botao-vidro pointer-events-auto flex min-h-11 min-w-11 flex-col items-center justify-center px-2 py-1 font-ficha text-xs"
      aria-label={`${SETA[d]} ${rotulo(d) || d}`}
      onPointerDown={(e) => {
        e.preventDefault();
        aoDirecao(d, true);
      }}
      onPointerUp={() => aoDirecao(d, false)}
      onPointerLeave={(e) => e.buttons && aoDirecao(d, false)}
    >
      <span className="text-base leading-none">{SETA[d]}</span>
      <span className="text-[10px] leading-tight text-areia">{rotulo(d)}</span>
    </button>
  );
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 p-3">
      <div className="flex gap-2">{(["left", "right"] as Direcao[]).map(botao)}</div>
      <div className="flex gap-2">{(["down", "up"] as Direcao[]).map(botao)}</div>
    </div>
  );
}
