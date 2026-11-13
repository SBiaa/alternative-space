"use client";

import { TEXTOS } from "@/lib/role/config";
import type { Hud } from "./motor/jogo";

const segundos = (ms: number) => Math.max(0, Math.ceil(ms / 1000));

// Placar por cima do canvas, em Space Mono.
export function HudJogo({ hud }: { hud: Hud | null }) {
  if (!hud) return null;
  const restante = hud.limiteMs - hud.tempoMs;
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-3 p-3 font-ficha text-creme" aria-live="off">
      <div className="flex flex-col">
        <span className="text-[11px] text-areia">{TEXTOS.jogo.pontos}</span>
        <span className="text-xl leading-none">{hud.pontos}</span>
      </div>
      <div className="flex flex-col items-center gap-1 text-center">
        {hud.combo > 0 && (
          <span className="text-lg leading-none text-laranja-claro">
            {TEXTOS.jogo.combo(hud.combo)} · {hud.valorCombo}
          </span>
        )}
        {hud.aviso && (
          <span key={hud.avisoId} className="role-aviso text-sm leading-none">
            {hud.aviso}
          </span>
        )}
      </div>
      <div className="flex flex-col items-end">
        <span className="text-[11px] text-areia">{TEXTOS.jogo.tempo}</span>
        <span className={`text-xl leading-none ${restante < 10_000 ? "text-laranja-claro" : ""}`}>{segundos(restante)}</span>
      </div>
    </div>
  );
}
