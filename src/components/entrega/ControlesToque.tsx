"use client";

import { useRef, useState } from "react";
import { TEXTOS } from "@/lib/entrega/config";
import type { Toque } from "@/lib/entrega/cena";

// Joystick virtual à esquerda; freio e nitro à direita. Escreve no objeto `toque` lido pela cena.
export function ControlesToque({ mudar, temNitro }: { mudar: (t: Partial<Toque>) => void; temNitro: boolean }) {
  const base = useRef<HTMLDivElement>(null);
  const [pino, setPino] = useState({ x: 0, y: 0 });
  const ativo = useRef(false);
  const R = 48;

  const mover = (e: React.PointerEvent) => {
    const r = base.current!.getBoundingClientRect();
    const dx = e.clientX - (r.left + r.width / 2);
    const dy = e.clientY - (r.top + r.height / 2);
    const d = Math.min(R, Math.hypot(dx, dy));
    const ang = Math.atan2(dy, dx);
    ativo.current = true;
    mudar({ ativo: true, ang, forca: d / R });
    setPino({ x: Math.cos(ang) * d, y: Math.sin(ang) * d });
  };
  const soltar = () => {
    ativo.current = false;
    mudar({ ativo: false, forca: 0 });
    setPino({ x: 0, y: 0 });
  };

  const botao = "pointer-events-auto flex size-16 touch-none select-none items-center justify-center rounded-full border-2 border-creme/60 bg-noite/60 font-ficha text-xs text-creme";

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between p-4 [@media(pointer:fine)]:hidden">
      <div
        ref={base}
        role="application"
        aria-label={TEXTOS.acoes.cima}
        className="pointer-events-auto relative size-32 touch-none rounded-full border-2 border-creme/40 bg-noite/40"
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          mover(e);
        }}
        onPointerMove={(e) => ativo.current && mover(e)}
        onPointerUp={soltar}
        onPointerCancel={soltar}
      >
        <span className="absolute left-1/2 top-1/2 size-12 rounded-full bg-laranja-claro/80" style={{ transform: `translate(calc(-50% + ${pino.x}px), calc(-50% + ${pino.y}px))` }} />
      </div>
      <div className="flex gap-3">
        <button
          type="button"
          className={botao}
          onPointerDown={() => mudar({ freio: true })}
          onPointerUp={() => mudar({ freio: false })}
          onPointerCancel={() => mudar({ freio: false })}
          onPointerLeave={() => mudar({ freio: false })}
        >
          {TEXTOS.acoes.baixo.split(" ")[0]}
        </button>
        {temNitro && (
          <button type="button" className={`${botao} border-laranja-claro`} onPointerDown={() => mudar({ nitro: true })}>
            {TEXTOS.acoes.nitro}
          </button>
        )}
      </div>
    </div>
  );
}
