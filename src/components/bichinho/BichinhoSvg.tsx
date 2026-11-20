import type { ReactNode } from "react";
import type { Especie, Fase, Forma, Humor, Slot } from "@/lib/bichinho/config";
import "./bichinho.css";

// Arte vetorial do bichinho (viewBox 120×120), em camadas: corpo, rosto, acessórios. Sem texto: só desenho.
// As cores vêm da espécie (config). A animação de respirar e piscar é CSS e para com prefers-reduced-motion.

type Cores = Especie["cores"];

const ESCALA: Record<Fase, number> = { 0: 1, 1: 0.78, 2: 1 };

// Onde ficam os olhos, a boca e os pontos de encaixe dos acessórios, por forma.
const GUIA: Record<Forma, { olhos: { x: number; y: number; r: number }[]; boca: { x: number; y: number }; topo: { x: number; y: number }; peito: { x: number; y: number } }> = {
  poeira: { olhos: [{ x: 50, y: 64, r: 4 }, { x: 70, y: 64, r: 4 }], boca: { x: 60, y: 74 }, topo: { x: 60, y: 38 }, peito: { x: 60, y: 90 } },
  gota: { olhos: [{ x: 60, y: 72, r: 8 }], boca: { x: 60, y: 88 }, topo: { x: 60, y: 30 }, peito: { x: 60, y: 96 } },
  cometa: { olhos: [{ x: 70, y: 60, r: 4 }, { x: 82, y: 60, r: 4 }], boca: { x: 76, y: 70 }, topo: { x: 76, y: 40 }, peito: { x: 74, y: 84 } },
};

function Ovo({ c, forma }: { c: Cores; forma: Forma }) {
  return (
    <g>
      <ellipse cx="60" cy="70" rx="27" ry="34" fill={c.corpo} />
      {forma === "poeira" && (
        <>
          <circle cx="50" cy="60" r="5" fill={c.detalhe} />
          <circle cx="68" cy="76" r="6" fill={c.detalhe} />
          <circle cx="56" cy="88" r="3.5" fill={c.detalhe} />
        </>
      )}
      {forma === "gota" && <path d="M36 70 q12 -10 24 0 t24 0" stroke={c.detalhe} strokeWidth="4" fill="none" strokeLinecap="round" />}
      {forma === "cometa" && (
        <>
          <path d="M44 54 L60 76 L76 52" stroke={c.detalhe} strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="60" cy="90" r="3.5" fill={c.detalhe} />
        </>
      )}
      <ellipse cx="50" cy="52" rx="5" ry="8" fill={c.brilho} opacity="0.6" />
    </g>
  );
}

function Corpo({ c, forma, fase }: { c: Cores; forma: Forma; fase: Fase }) {
  const adulto = fase === 2;
  if (forma === "poeira") {
    return (
      <g>
        <path d="M52 40 Q46 26 40 24 M68 40 Q74 26 80 24" stroke={c.detalhe} strokeWidth="3" fill="none" strokeLinecap="round" />
        <circle cx="40" cy="24" r="3.5" fill={c.detalhe} />
        <circle cx="80" cy="24" r="3.5" fill={c.detalhe} />
        <circle cx="60" cy="66" r="29" fill={c.corpo} />
        <circle cx="48" cy="54" r="5" fill={c.brilho} opacity="0.6" />
        {adulto && (
          <>
            <circle cx="26" cy="62" r="2.5" fill={c.brilho} />
            <circle cx="96" cy="70" r="3" fill={c.brilho} />
            <circle cx="32" cy="90" r="2" fill={c.brilho} />
          </>
        )}
      </g>
    );
  }
  if (forma === "gota") {
    return (
      <g>
        {adulto && (
          <>
            <path d="M38 78 Q24 74 22 86 Q30 90 40 88 Z" fill={c.detalhe} />
            <path d="M82 78 Q96 74 98 86 Q90 90 80 88 Z" fill={c.detalhe} />
          </>
        )}
        <path d="M60 26 C84 52 90 72 78 90 C70 102 50 102 42 90 C30 72 36 52 60 26 Z" fill={c.corpo} />
        <ellipse cx="50" cy="56" rx="4" ry="9" fill={c.brilho} opacity="0.6" transform="rotate(-18 50 56)" />
      </g>
    );
  }
  return (
    <g>
      <path d="M62 50 L14 34 L40 62 L12 86 L62 76 Z" fill={c.detalhe} opacity={adulto ? 1 : 0.85} />
      {adulto && <path d="M62 56 L26 48 L44 64 L28 78 L62 72 Z" fill={c.brilho} opacity="0.7" />}
      <rect x="62" y="80" width="7" height="12" rx="3" fill={c.corpo} />
      <rect x="78" y="80" width="7" height="12" rx="3" fill={c.corpo} />
      <circle cx="75" cy="62" r="23" fill={c.corpo} />
      <circle cx="67" cy="53" r="4.5" fill={c.brilho} opacity="0.6" />
    </g>
  );
}

function Rosto({ forma, humor, fase }: { forma: Forma; humor: Humor; fase: Fase }) {
  const g = GUIA[forma];
  const tinta = "#01121e";
  if (fase === 0) return null;
  const dorme = humor === "dormindo";
  return (
    <g aria-hidden="true">
      {g.olhos.map((o, i) =>
        dorme ? (
          <path key={i} d={`M${o.x - o.r} ${o.y} q${o.r} ${o.r} ${o.r * 2} 0`} stroke={tinta} strokeWidth="2.5" fill="none" strokeLinecap="round" />
        ) : (
          <g key={i} className="bic-pisca">
            <circle cx={o.x} cy={o.y} r={o.r} fill={tinta} />
            <circle cx={o.x + o.r * 0.3} cy={o.y - o.r * 0.3} r={o.r * 0.3} fill="#f6f0d6" />
          </g>
        ),
      )}
      {humor === "feliz" && <path d={`M${g.boca.x - 5} ${g.boca.y} q5 6 10 0`} stroke={tinta} strokeWidth="2.5" fill="none" strokeLinecap="round" />}
      {humor === "curioso" && <circle cx={g.boca.x} cy={g.boca.y + 1} r="2.8" fill={tinta} />}
      {humor === "sonolento" && <path d={`M${g.boca.x - 4} ${g.boca.y + 1} h8`} stroke={tinta} strokeWidth="2.5" strokeLinecap="round" />}
      {dorme && <path d={`M${g.topo.x + 24} ${g.topo.y + 4} h8 l-8 8 h8`} stroke="#f6f0d6" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />}
    </g>
  );
}

// Uma camada por acessório, no ponto de encaixe da espécie.
const ACESSORIO_ARTE: Record<string, (p: { x: number; y: number }) => ReactNode> = {
  "antena-de-papel": ({ x, y }) => (
    <g>
      <path d={`M${x} ${y} L${x - 6} ${y - 16} L${x + 2} ${y - 10} L${x + 8} ${y - 20}`} stroke="#f6f0d6" strokeWidth="3" fill="none" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={x + 8} cy={y - 20} r="3" fill="#f6f0d6" />
    </g>
  ),
  "fone-de-cabine": ({ x, y }) => (
    <g>
      <path d={`M${x - 24} ${y + 20} Q${x} ${y - 14} ${x + 24} ${y + 20}`} stroke="#093f7a" strokeWidth="4" fill="none" strokeLinecap="round" />
      <rect x={x - 30} y={y + 16} width="9" height="14" rx="4" fill="#dd5d05" />
      <rect x={x + 21} y={y + 16} width="9" height="14" rx="4" fill="#dd5d05" />
    </g>
  ),
  "cracha-de-bordo": ({ x, y }) => (
    <g>
      <rect x={x - 8} y={y - 12} width="16" height="12" rx="2" fill="#f6f0d6" stroke="#093f7a" strokeWidth="1.5" />
      <rect x={x - 5} y={y - 9} width="6" height="3" rx="1" fill="#dd5d05" />
      <rect x={x - 5} y={y - 4} width="10" height="1.8" rx="0.9" fill="#093f7a" />
    </g>
  ),
};

export type BichinhoProps = {
  especie: Especie;
  fase: Fase;
  humor: Humor;
  equipados?: Partial<Record<Slot, string>>;
  /** Pulinho de quando a pessoa toca no bichinho; troque o valor pra repetir. */
  toque?: number;
  /** Posição e tamanho quando o desenho vai dentro de outro SVG (a janela). */
  caixa?: { x: number; y: number; width: number; height: number };
};

export function BichinhoSvg({ especie, fase, humor, equipados = {}, toque = 0, caixa }: BichinhoProps) {
  const c = especie.cores;
  const g = GUIA[especie.forma];
  const s = ESCALA[fase];
  const cabeca = equipados.cabeca ? ACESSORIO_ARTE[equipados.cabeca] : undefined;
  const corpo = equipados.corpo ? ACESSORIO_ARTE[equipados.corpo] : undefined;
  return (
    <svg viewBox="0 0 120 120" aria-hidden="true" focusable="false" className="bic-svg" {...caixa}>
      <g key={toque} className={toque ? "bic-toque" : undefined}>
        <g transform={`translate(60 100) scale(${s}) translate(-60 -100)`}>
          <g className="bic-respira">
            {fase === 0 ? <Ovo c={c} forma={especie.forma} /> : <Corpo c={c} forma={especie.forma} fase={fase} />}
            <Rosto forma={especie.forma} humor={humor} fase={fase} />
            {fase > 0 && cabeca?.(g.topo)}
            {fase > 0 && corpo?.(g.peito)}
          </g>
        </g>
      </g>
    </svg>
  );
}
