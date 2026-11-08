"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

// Guia "Como jogar" do Picles no Ralo: <dialog> nativo (prende o foco, fecha no Esc)
// com um passo por vez. Quem controla abrir/fechar é o PiclesNoRalo.

const VERDE = "#74b53c";
const NOITE = "#01121e";

function Picles({ x = 0, y = 0, rot = -25 }: { x?: number; y?: number; rot?: number }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot})`} stroke={NOITE} strokeWidth="3" strokeLinecap="round">
      <ellipse rx="17" ry="27" fill={VERDE} />
      <circle cx="-7" cy="-12" r="5.5" fill="#fff" />
      <circle cx="7" cy="-12" r="5.5" fill="#fff" />
      <circle cx="-6" cy="-12" r="1.6" fill={NOITE} stroke="none" />
      <circle cx="8" cy="-12" r="1.6" fill={NOITE} stroke="none" />
      <path d="M-13 -21 L0 -16 L13 -21" fill="none" strokeWidth="3.5" />
      <path d="M-10 -2 Q0 8 10 -2 Z" fill="#fff" strokeWidth="2" />
    </g>
  );
}

function Seta({ x, y, para }: { x: number; y: number; para: "cima" | "baixo" }) {
  const d = para === "cima" ? `M${x} ${y + 30} V${y} M${x - 10} ${y + 10} L${x} ${y} L${x + 10} ${y + 10}` : `M${x} ${y} V${y + 30} M${x - 10} ${y + 20} L${x} ${y + 30} L${x + 10} ${y + 20}`;
  return <path d={d} stroke="#dd5d05" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" fill="none" />;
}

function Tecla({ x, y, texto, apertada }: { x: number; y: number; texto: string; apertada: boolean }) {
  return (
    <g transform={`translate(${x} ${y + (apertada ? 3 : 0)})`}>
      {!apertada && <rect x="-46" y="4" width="92" height="28" rx="7" fill={NOITE} />}
      <rect x="-46" y="0" width="92" height="28" rx="7" fill="#ece3be" stroke={NOITE} strokeWidth="2.5" />
      <text x="0" y="19" textAnchor="middle" fontSize="13" fontWeight="700" fill={NOITE} fontFamily="var(--font-space-mono), monospace">
        {texto}
      </text>
    </g>
  );
}

function Tunel({ children }: { children: ReactNode }) {
  return (
    <svg viewBox="0 0 280 150" className="h-auto w-full" aria-hidden="true">
      <rect width="280" height="150" fill="#0f1d16" />
      <path d="M0 0 H280 V16 Q210 24 140 14 T0 18 Z" fill="#2b2219" />
      <path d="M0 18 Q70 10 140 14 T280 16" stroke="#7cc243" strokeWidth="4" fill="none" />
      <path d="M0 150 H280 V134 Q210 128 140 136 T0 132 Z" fill="#4a5a1c" />
      <path d="M0 132 Q70 140 140 136 T280 134" stroke="#a3c94a" strokeWidth="4" fill="none" />
      {children}
    </svg>
  );
}

function Cano({ x, y, h, bocal }: { x: number; y: number; h: number; bocal: "cima" | "baixo" | "ambos" }) {
  return (
    <g stroke={NOITE} strokeWidth="2.5">
      <rect x={x} y={y} width="30" height={h} fill="#7d8c89" />
      {(bocal === "baixo" || bocal === "ambos") && <rect x={x - 4} y={y + h - 10} width="38" height="10" fill="#6b7a77" />}
      {(bocal === "cima" || bocal === "ambos") && <rect x={x - 4} y={y} width="38" height="10" fill="#6b7a77" />}
    </g>
  );
}

function Rato({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`} stroke={NOITE} strokeWidth="2">
      <path d="M12 2 Q26 -10 34 4" stroke="#e48a9a" strokeWidth="3" fill="none" />
      <ellipse rx="16" ry="10" fill="#7a7069" />
      <path d="M-10 -6 L-24 2 L-10 6 Z" fill="#7a7069" />
      <circle cx="-9" cy="-9" r="4" fill="#e48a9a" />
      <circle cx="-15" cy="-1" r="2" fill="#ff3b2f" stroke="none" />
    </g>
  );
}

type Passo = { titulo: string; texto: ReactNode; arte: ReactNode };

const passos: Passo[] = [
  {
    titulo: "Segura pra subir",
    texto: (
      <>
        Segura o <strong>clique</strong>, o <strong>dedo na tela</strong> ou a <strong>barra de espaço</strong>. Enquanto você segurar, o Picles sobe.
      </>
    ),
    arte: (
      <Tunel>
        <Picles x={100} y={70} rot={-35} />
        <Seta x={140} y={40} para="cima" />
        <Tecla x={210} y={60} texto="ESPAÇO" apertada />
      </Tunel>
    ),
  },
  {
    titulo: "Solta pra descer",
    texto: (
      <>
        Soltou, ele cai. O segredo é dar <strong>toques curtos</strong>: segura um pouquinho, solta um pouquinho, e o Picles fica planando no meio do túnel.
      </>
    ),
    arte: (
      <Tunel>
        <path d="M20 90 Q50 60 80 80 T140 75" stroke="#c8e27a" strokeWidth="3" strokeDasharray="6 6" fill="none" />
        <Picles x={160} y={78} rot={-15} />
        <Seta x={200} y={60} para="baixo" />
        <Tecla x={240} y={100} texto="SOLTA" apertada={false} />
      </Tunel>
    ),
  },
  {
    titulo: "Não encosta em nada",
    texto: (
      <>
        Bateu no <strong>teto</strong>, na <strong>água</strong> ou num <strong>cano</strong>, acabou. Os canos saem de cima e de baixo e, a partir do nível 3, aparecem soltos no meio.
      </>
    ),
    arte: (
      <Tunel>
        <Cano x={70} y={0} h={70} bocal="baixo" />
        <Cano x={170} y={85} h={65} bocal="cima" />
        <Cano x={240} y={45} h={45} bocal="ambos" />
        <path d="M20 110 Q60 110 95 95 T150 50 T210 60" stroke="#c8e27a" strokeWidth="3" strokeDasharray="6 6" fill="none" />
        <Picles x={30} y={105} rot={-50} />
      </Tunel>
    ),
  },
  {
    titulo: "Cuidado com os ratos",
    texto: (
      <>
        Do nível 2 em diante, ratos vêm correndo na sua direção, <strong>subindo e descendo</strong>. Passa por cima ou por baixo no tempo certo.
      </>
    ),
    arte: (
      <Tunel>
        <Picles x={60} y={75} rot={-25} />
        <Rato x={170} y={55} />
        <Rato x={235} y={100} />
        <path d="M200 40 Q190 55 200 70 M265 85 Q255 100 265 115" stroke="#f2a66e" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      </Tunel>
    ),
  },
  {
    titulo: "Sobe de nível",
    texto: (
      <>
        A cada <strong>100 m</strong> você sobe um nível: fica mais rápido e mais apertado. Logo depois vem um trechinho livre pra respirar. Chega no <strong>nível 10</strong> e vira o Picles Rick, o próprio.
      </>
    ),
    arte: (
      <svg viewBox="0 0 280 150" className="h-auto w-full" aria-hidden="true">
        <rect width="280" height="150" fill="#0f1d16" />
        {Array.from({ length: 10 }, (_, i) => {
          const h = 18 + i * 9;
          return (
            <g key={i}>
              <rect x={14 + i * 26} y={130 - h} width="20" height={h} rx="3" fill={i < 3 ? "#c8e27a" : "#2b3a2a"} stroke={NOITE} strokeWidth="2" />
              <text x={24 + i * 26} y="145" textAnchor="middle" fontSize="10" fontWeight="700" fill="#ece3be" fontFamily="var(--font-space-mono), monospace">
                {i + 1}
              </text>
            </g>
          );
        })}
        <Picles x={76} y={66} rot={-20} />
        <text x="140" y="24" textAnchor="middle" fontSize="16" fontWeight="700" fill="#c8e27a" fontFamily="var(--font-fredoka), sans-serif">
          100 m = +1 nível
        </text>
      </svg>
    ),
  },
];

export function PiclesComoJogar({
  aberto,
  aoFechar,
  aoJogar,
  rotuloJogar,
}: {
  aberto: boolean;
  aoFechar: () => void;
  aoJogar: () => void;
  rotuloJogar: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [i, setI] = useState(0);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (aberto && !d.open) d.showModal();
    else if (!aberto && d.open) d.close();
  }, [aberto]);

  const ultimo = i === passos.length - 1;
  const p = passos[i];

  return (
    <dialog
      ref={ref}
      aria-labelledby="como-jogar-titulo"
      className="m-auto w-[min(440px,calc(100vw-32px))] rounded-2xl border-2 border-noite bg-creme-claro p-0 text-noite shadow-duro backdrop:bg-noite/70"
      // Esc e o "fechar" nativo passam por aqui.
      onClose={() => {
        setI(0); // reabre sempre do começo
        aoFechar();
      }}
      onClick={(ev) => {
        if (ev.target === ev.currentTarget) aoFechar(); // clique fora da caixa
      }}
      onKeyDown={(ev) => {
        if (ev.key === "ArrowRight" && !ultimo) setI(i + 1);
        if (ev.key === "ArrowLeft" && i > 0) setI(i - 1);
      }}
    >
      <div className="flex flex-col gap-4 p-5 sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <span className="etiqueta text-[12px] text-azul">
            Como jogar · {i + 1} de {passos.length}
          </span>
          <button
            type="button"
            onClick={aoFechar}
            aria-label="Fechar guia"
            className="grid h-9 w-9 place-items-center rounded-full border-2 border-noite bg-creme font-titulo text-lg font-bold leading-none hover:bg-creme-escuro"
          >
            ×
          </button>
        </div>

        <div className="overflow-hidden rounded-xl border-2 border-noite">{p.arte}</div>

        <div className="flex min-h-[7.5rem] flex-col gap-2" aria-live="polite">
          <h2 id="como-jogar-titulo" className="font-titulo text-2xl font-bold leading-tight text-azul">
            {p.titulo}
          </h2>
          <p className="leading-relaxed text-tinta">{p.texto}</p>
        </div>

        <div className="flex items-center justify-center gap-2" aria-hidden="true">
          {passos.map((_, n) => (
            <span key={n} className={`h-2.5 rounded-full border-2 border-noite transition-all ${n === i ? "w-6 bg-laranja" : "w-2.5 bg-creme"}`} />
          ))}
        </div>

        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setI(i - 1)}
            disabled={i === 0}
            className="font-titulo text-lg font-bold text-azul underline-offset-4 hover:underline disabled:invisible"
          >
            ← Voltar
          </button>
          {ultimo ? (
            <button type="button" onClick={aoJogar} className="btn bg-laranja text-noite !px-6 !py-2.5 !text-lg" autoFocus>
              {rotuloJogar}
            </button>
          ) : (
            <button type="button" onClick={() => setI(i + 1)} className="btn bg-laranja text-noite !px-6 !py-2.5 !text-lg">
              Próximo →
            </button>
          )}
        </div>
      </div>
    </dialog>
  );
}
