"use client";

import { useId, type ReactNode } from "react";
import type { Pirata } from "@/lib/pirata";

// Desenho do pirata em camadas. Fundo transparente: quem usa decide a cor atrás.
const O = "#01121e"; // contorno
const W = 4;
const OURO = "#f2b134";
const PRATA = "#d6deec";
const PELES = ["#f6d6b4", "#eab58c", "#c98b5c", "#8e5a39", "#5a3824", "#9fc49a", "#c9dcef"];
const BOCHECHA = ["#f2a6a0", "#e8957e", "#c9705a", "#7e4a2f", "#4c2d1c", "#82aa7d", "#a9c1db"];

const linha = { stroke: O, strokeWidth: W, strokeLinejoin: "round" as const, strokeLinecap: "round" as const };

const TRONCO = "M28 214 C 30 172 58 152 100 152 C 142 152 170 172 172 214 Z";

function Roupa({ i, clip }: { i: number; clip: string }) {
  const corpo = (fill: string, extra?: ReactNode) => (
    <>
      <path d={TRONCO} fill={fill} />
      <g clipPath={`url(#${clip})`}>{extra}</g>
      <path d={TRONCO} fill="none" {...linha} />
    </>
  );
  switch (i) {
    case 1: // marujo listrado
      return (
        <>
          {corpo(
            "#f6f0d6",
            [164, 178, 192, 206].map((y) => <rect key={y} x="20" y={y} width="160" height="7" fill="#ab392f" />),
          )}
          <path d="M80 154 L100 182 L120 154" fill="#093f7a" {...linha} />
        </>
      );
    case 2: // colete de couro
      return (
        <>
          {corpo("#f6f0d6")}
          <path d="M88 154 L100 176 L112 154" fill="none" {...linha} />
          <path d="M40 214 C 42 180 56 162 84 156 L 92 214 Z" fill="#7a4a26" {...linha} />
          <path d="M160 214 C 158 180 144 162 116 156 L 108 214 Z" fill="#7a4a26" {...linha} />
          <circle cx="98" cy="196" r="3" fill={OURO} stroke={O} strokeWidth="2" />
        </>
      );
    case 3: // casaco vermelho
      return (
        <>
          {corpo("#ab392f")}
          <path d="M74 154 L100 196 L126 154 Z" fill="#f6f0d6" {...linha} />
          <path d="M70 154 L84 190 L94 176 Z M130 154 L116 190 L106 176 Z" fill="#01121e" {...linha} />
          <path d="M100 196 L100 214" {...linha} />
          {[184, 200].map((y) => (
            <g key={y}>
              <circle cx="88" cy={y + 6} r="3.5" fill={OURO} stroke={O} strokeWidth="2" />
              <circle cx="112" cy={y + 6} r="3.5" fill={OURO} stroke={O} strokeWidth="2" />
            </g>
          ))}
        </>
      );
    case 4: // trapos
      return (
        <>
          {corpo(
            "#d9c08f",
            <>
              <rect x="48" y="178" width="20" height="18" fill="#a3b56a" stroke={O} strokeWidth="2" strokeDasharray="4 3" />
              <rect x="128" y="186" width="18" height="16" fill="#c97b4a" stroke={O} strokeWidth="2" strokeDasharray="4 3" />
            </>,
          )}
          <path d="M80 154 L86 166 L92 158 L100 172 L108 158 L114 166 L120 154" fill="#8e5a39" {...linha} />
        </>
      );
    default: // capitão
      return (
        <>
          {corpo("#093f7a")}
          <path d="M80 154 L100 200 L120 154 Z" fill="#f6f0d6" {...linha} />
          <path d="M92 160 q8 6 16 0 M90 170 q10 7 20 0 M93 180 q7 5 14 0" fill="none" stroke={O} strokeWidth="2.5" strokeLinecap="round" />
          <path d="M76 154 L92 200 L82 204 L66 160 Z M124 154 L108 200 L118 204 L134 160 Z" fill="#0d5299" {...linha} />
          <path d="M34 178 C 40 164 54 158 66 160 L 62 172 C 52 172 44 176 38 186 Z" fill={OURO} {...linha} />
          <path d="M166 178 C 160 164 146 158 134 160 L 138 172 C 148 172 156 176 162 186 Z" fill={OURO} {...linha} />
          {[196, 208].map((y) => (
            <circle key={y} cx="76" cy={y} r="3.5" fill={OURO} stroke={O} strokeWidth="2" />
          ))}
        </>
      );
  }
}

function Rosto({ pele, cicatriz }: { pele: number; cicatriz: number }) {
  const cor = PELES[pele];
  const fantasma = pele === 6;
  return (
    <>
      <rect x="86" y="124" width="28" height="34" fill={cor} {...linha} />
      <circle cx="60" cy="104" r="10" fill={cor} {...linha} />
      <circle cx="140" cy="104" r="10" fill={cor} {...linha} />
      <ellipse cx="100" cy="100" rx="40" ry="43" fill={cor} {...linha} />
      <circle cx="78" cy="116" r="7" fill={BOCHECHA[pele]} opacity="0.55" />
      <circle cx="122" cy="116" r="7" fill={BOCHECHA[pele]} opacity="0.55" />
      {/* olhos e sobrancelhas */}
      <circle cx="85" cy="100" r="5" fill={fantasma ? "#093f7a" : O} />
      <circle cx="115" cy="100" r="5" fill={fantasma ? "#093f7a" : O} />
      <circle cx="86.5" cy="98.5" r="1.6" fill="#fff" />
      <circle cx="116.5" cy="98.5" r="1.6" fill="#fff" />
      <path d="M77 88 L92 91 M108 91 L123 88" fill="none" {...linha} strokeWidth={3.5} />
      <path d="M100 103 q7 9 -2 12" fill="none" {...linha} strokeWidth={3} />
      <Boca ouro={cicatriz === 5} />
    </>
  );
}

// Sorriso aberto. A barba cheia cobre a boca, então ela é desenhada de novo por cima.
function Boca({ ouro }: { ouro: boolean }) {
  return (
    <>
      <path d="M86 122 Q100 136 114 122 Z" fill="#7a2a22" {...linha} strokeWidth={3} />
      <rect x="93" y="122.5" width="14" height="4" fill="#fff" />
      {ouro && <rect x="101" y="122.5" width="7" height="6" rx="1" fill={OURO} stroke={O} strokeWidth="1.5" />}
    </>
  );
}

function Cicatriz({ i }: { i: number }) {
  switch (i) {
    case 1: // tapa-olho
      return (
        <>
          <path d="M62 84 Q90 84 108 96 M124 104 L140 110" fill="none" stroke={O} strokeWidth="3" />
          <ellipse cx="116" cy="101" rx="11" ry="10" fill={O} />
        </>
      );
    case 2: // risco no olho
      return (
        <>
          <path d="M78 82 L92 118" fill="none" stroke="#ab392f" strokeWidth="3.5" strokeLinecap="round" />
          <path d="M80 92 L88 89 M83 101 L91 98 M86 110 L94 107" fill="none" stroke="#ab392f" strokeWidth="2.5" strokeLinecap="round" />
        </>
      );
    case 3: // X na bochecha
      return <path d="M116 110 L128 122 M128 110 L116 122" fill="none" stroke="#ab392f" strokeWidth="3.5" strokeLinecap="round" />;
    case 4: // curativo na testa
      return (
        <g transform="rotate(-18 112 74)">
          <rect x="96" y="68" width="32" height="12" rx="6" fill="#f2c9a0" stroke={O} strokeWidth="2.5" />
          <rect x="107" y="68" width="10" height="12" fill="#e3d8ac" stroke={O} strokeWidth="2" />
        </g>
      );
    default:
      return null;
  }
}

function Barba({ i }: { i: number }) {
  const bigode = (cor: string) => (
    <path d="M100 116 C 92 110 80 111 74 120 C 84 119 92 122 100 119 C 108 122 116 119 126 120 C 120 111 108 110 100 116 Z" fill={cor} {...linha} strokeWidth={3} />
  );
  const cheia = (cor: string) => (
    <path
      d="M60 100 C 58 146 84 164 100 164 C 116 164 142 146 140 100 C 134 118 126 126 116 126 Q 100 140 84 126 C 74 126 66 118 60 100 Z"
      fill={cor}
      {...linha}
    />
  );
  switch (i) {
    case 1:
      return bigode("#3a2416");
    case 2: // cavanhaque
      return (
        <>
          {bigode("#3a2416")}
          <path d="M92 134 Q100 152 108 134 Q100 138 92 134 Z" fill="#3a2416" {...linha} strokeWidth={3} />
        </>
      );
    case 3:
      return (
        <>
          {cheia("#24180f")}
          {bigode("#24180f")}
        </>
      );
    case 4: // ruiva com trança
      return (
        <>
          {cheia("#c4521c")}
          <path d="M94 160 L94 186 Q100 194 106 186 L106 160 Z" fill="#c4521c" {...linha} />
          <path d="M93 172 L107 172" stroke={OURO} strokeWidth="5" />
          <path d="M93 172 L107 172" stroke={O} strokeWidth="1.5" />
          {bigode("#c4521c")}
        </>
      );
    case 5:
      return (
        <>
          {cheia("#d8d8d2")}
          {bigode("#d8d8d2")}
        </>
      );
    default:
      return null;
  }
}

function Chapeu({ i, pele }: { i: number; pele: number }) {
  switch (i) {
    case 1: // tricórnio
      return (
        <>
          <path d="M66 72 C 64 40 136 40 134 72 Z" fill="#3b2a1e" {...linha} />
          <path d="M34 76 C 52 60 76 72 100 58 C 124 72 148 60 166 76 C 150 88 124 80 100 84 C 76 80 50 88 34 76 Z" fill="#2b1f16" {...linha} />
          <path d="M44 76 C 60 68 80 76 100 66 C 120 76 140 68 156 76" fill="none" stroke={OURO} strokeWidth="3" strokeLinecap="round" />
        </>
      );
    case 2: // capitão com caveira
      return (
        <>
          <path d="M30 82 C 40 20 160 20 170 82 C 140 70 60 70 30 82 Z" fill="#141a2a" {...linha} />
          <path d="M38 78 C 70 68 130 68 162 78" fill="none" stroke={OURO} strokeWidth="3.5" strokeLinecap="round" />
          <circle cx="100" cy="48" r="9" fill="#f6f0d6" stroke={O} strokeWidth="2" />
          <rect x="94" y="52" width="12" height="7" rx="2" fill="#f6f0d6" stroke={O} strokeWidth="2" />
          <circle cx="96.5" cy="47" r="2.2" fill={O} />
          <circle cx="103.5" cy="47" r="2.2" fill={O} />
          <path d="M84 60 L116 70 M116 60 L84 70" stroke="#f6f0d6" strokeWidth="4" strokeLinecap="round" />
        </>
      );
    case 3: // bandana vermelha
      return (
        <>
          <path d="M140 84 L160 74 L156 92 Z M140 88 L162 98 L146 104 Z" fill="#ab392f" {...linha} strokeWidth={3} />
          <path d="M59 92 C 56 50 144 50 141 92 Q 100 76 59 92 Z" fill="#ab392f" {...linha} />
          {[
            [80, 70],
            [100, 62],
            [120, 70],
            [92, 80],
            [112, 79],
          ].map(([x, y]) => (
            <circle key={`${x}-${y}`} cx={x} cy={y} r="3" fill="#f6f0d6" />
          ))}
        </>
      );
    case 4: // palha
      return (
        <>
          <path d="M66 74 C 66 34 134 34 134 74 Z" fill="#e9c46a" {...linha} />
          <path d="M67 62 L133 62 L134 72 L66 72 Z" fill="#ab392f" stroke={O} strokeWidth="3" />
          <ellipse cx="100" cy="76" rx="64" ry="12" fill="#e9c46a" {...linha} />
          <path d="M60 78 Q100 86 140 78" fill="none" stroke="#c99a3c" strokeWidth="2" />
        </>
      );
    case 5: // coroa
      return (
        <>
          <path d="M66 74 L64 40 L82 56 L100 32 L118 56 L136 40 L134 74 Z" fill={OURO} {...linha} />
          <circle cx="100" cy="62" r="5" fill="#ab392f" stroke={O} strokeWidth="2" />
          <circle cx="80" cy="66" r="3.5" fill="#093f7a" stroke={O} strokeWidth="2" />
          <circle cx="120" cy="66" r="3.5" fill="#093f7a" stroke={O} strokeWidth="2" />
        </>
      );
    default: // careca com brilho e uns fios
      return (
        <>
          <path d="M78 72 Q84 64 92 62" fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" opacity={pele === 6 ? 0.9 : 0.6} />
          <path d="M98 58 q-4 -10 4 -14 M104 58 q2 -9 10 -10" fill="none" {...linha} strokeWidth={3} />
        </>
      );
  }
}

function Arma({ i, pele }: { i: number; pele: number }) {
  if (i === 0) return null;
  const mao = <circle cx="56" cy="176" r="11" fill={PELES[pele]} {...linha} />;
  switch (i) {
    case 1: // sabre
      return (
        <>
          <path d="M58 164 C 44 140 30 118 36 84 C 44 108 56 132 66 160 Z" fill={PRATA} {...linha} />
          <path d="M42 102 L52 128" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M44 166 C 46 156 70 150 74 160" fill="none" stroke={OURO} strokeWidth="6" strokeLinecap="round" />
          <path d="M44 166 C 46 156 70 150 74 160" fill="none" stroke={O} strokeWidth="1.5" />
          <rect x="52" y="180" width="9" height="18" rx="3" fill="#5a3824" {...linha} strokeWidth={3} />
          {mao}
        </>
      );
    case 2: // pistola
      return (
        <g transform="rotate(-22 56 176)">
          <rect x="49" y="104" width="14" height="66" rx="3" fill="#4a4f5a" {...linha} />
          <rect x="46" y="100" width="20" height="10" rx="2" fill={OURO} {...linha} strokeWidth={3} />
          <path d="M50 160 L64 160 L70 196 L52 198 Z" fill="#7a4a26" {...linha} />
          <path d="M63 150 l8 -4" stroke={O} strokeWidth="4" strokeLinecap="round" />
          {mao}
        </g>
      );
    case 3: // gancho no lugar da mão
      return (
        <>
          <rect x="44" y="176" width="24" height="14" rx="4" fill="#5a3824" {...linha} />
          <path d="M56 176 L56 150 C 56 128 32 128 34 148" fill="none" stroke={O} strokeWidth="11" strokeLinecap="round" />
          <path d="M56 176 L56 150 C 56 128 32 128 34 148" fill="none" stroke={PRATA} strokeWidth="5" strokeLinecap="round" />
        </>
      );
    case 4: // luneta
      return (
        <g transform="rotate(-28 56 176)">
          <rect x="48" y="138" width="16" height="44" rx="3" fill="#7a4a26" {...linha} />
          <rect x="50" y="110" width="12" height="32" rx="2" fill={OURO} {...linha} />
          <rect x="52" y="88" width="8" height="26" rx="2" fill={OURO} {...linha} />
          <rect x="46" y="134" width="20" height="7" rx="2" fill={OURO} {...linha} strokeWidth={3} />
          {mao}
        </g>
      );
    case 5: // peixe
      return (
        <g transform="rotate(-14 56 176)">
          <path d="M56 168 L44 182 L68 182 Z" fill="#6aa5c9" {...linha} strokeWidth={3} />
          <ellipse cx="56" cy="130" rx="14" ry="36" fill="#6aa5c9" {...linha} />
          <path d="M44 118 Q56 126 68 118" fill="none" stroke={O} strokeWidth="2.5" />
          <circle cx="51" cy="106" r="3" fill={O} />
          <path d="M60 100 q3 4 0 7" fill="none" stroke={O} strokeWidth="2.5" strokeLinecap="round" />
          {mao}
        </g>
      );
    default:
      return null;
  }
}

function Bicho({ i }: { i: number }) {
  switch (i) {
    case 1: // papagaio
      return (
        <>
          <path d="M156 160 L150 190 L164 186 L166 160 Z" fill="#093f7a" {...linha} strokeWidth={3} />
          <ellipse cx="156" cy="138" rx="15" ry="24" fill="#ab392f" {...linha} />
          <path d="M160 130 C 176 140 174 162 160 164 C 166 152 164 140 160 130 Z" fill="#f2b134" {...linha} strokeWidth={3} />
          <path d="M146 124 C 136 124 134 136 142 138 C 142 132 144 130 148 130 Z" fill="#f6f0d6" {...linha} strokeWidth={3} />
          <circle cx="153" cy="124" r="3" fill={O} />
          <path d="M150 160 l-2 6 M160 162 l0 6" stroke={O} strokeWidth="3" strokeLinecap="round" />
        </>
      );
    case 2: // macaco
      return (
        <>
          <path d="M168 160 C 186 150 186 128 174 128" fill="none" stroke="#7a4a26" strokeWidth="5" strokeLinecap="round" />
          <ellipse cx="156" cy="152" rx="13" ry="12" fill="#7a4a26" {...linha} />
          <circle cx="140" cy="126" r="7" fill="#e3c39a" {...linha} strokeWidth={3} />
          <circle cx="172" cy="126" r="7" fill="#e3c39a" {...linha} strokeWidth={3} />
          <circle cx="156" cy="128" r="16" fill="#7a4a26" {...linha} />
          <ellipse cx="156" cy="133" rx="11" ry="9" fill="#e3c39a" />
          <circle cx="151" cy="125" r="2.5" fill={O} />
          <circle cx="161" cy="125" r="2.5" fill={O} />
          <path d="M151 135 q5 4 10 0" fill="none" stroke={O} strokeWidth="2.5" strokeLinecap="round" />
        </>
      );
    case 3: // caranguejo
      return (
        <>
          <path d="M140 156 L132 136 M172 156 L180 136" stroke={O} strokeWidth="4" strokeLinecap="round" />
          <path d="M124 130 C 124 120 140 120 140 130 L 132 128 Z" fill="#dd5d05" {...linha} strokeWidth={3} />
          <path d="M172 130 C 172 120 188 120 188 130 L 180 128 Z" fill="#dd5d05" {...linha} strokeWidth={3} />
          <path d="M150 150 L148 138 M162 150 L164 138" stroke={O} strokeWidth="3" />
          <circle cx="148" cy="136" r="4" fill="#fff" stroke={O} strokeWidth="2" />
          <circle cx="164" cy="136" r="4" fill="#fff" stroke={O} strokeWidth="2" />
          <circle cx="148" cy="136" r="1.6" fill={O} />
          <circle cx="164" cy="136" r="1.6" fill={O} />
          <ellipse cx="156" cy="158" rx="20" ry="12" fill="#dd5d05" {...linha} />
          <path d="M150 160 q6 4 12 0" fill="none" stroke={O} strokeWidth="2.5" strokeLinecap="round" />
        </>
      );
    case 4: // polvo
      return (
        <>
          {[134, 146, 158, 170].map((x, k) => (
            <path key={x} d={`M${x + 6} 146 C ${x + 2} 164 ${x + (k % 2 ? 12 : -6)} 170 ${x + 4} 182`} fill="none" stroke={O} strokeWidth="9" strokeLinecap="round" />
          ))}
          {[134, 146, 158, 170].map((x, k) => (
            <path key={x} d={`M${x + 6} 146 C ${x + 2} 164 ${x + (k % 2 ? 12 : -6)} 170 ${x + 4} 182`} fill="none" stroke="#8a5bb5" strokeWidth="4" strokeLinecap="round" />
          ))}
          <path d="M136 148 C 132 112 180 112 176 148 Z" fill="#8a5bb5" {...linha} />
          <circle cx="149" cy="136" r="4" fill="#fff" stroke={O} strokeWidth="2" />
          <circle cx="163" cy="136" r="4" fill="#fff" stroke={O} strokeWidth="2" />
          <circle cx="150" cy="137" r="1.8" fill={O} />
          <circle cx="164" cy="137" r="1.8" fill={O} />
        </>
      );
    case 5: // rato
      return (
        <>
          <path d="M168 162 C 186 168 186 186 172 190" fill="none" stroke="#e8957e" strokeWidth="4" strokeLinecap="round" />
          <ellipse cx="156" cy="156" rx="16" ry="12" fill="#9aa3ad" {...linha} />
          <circle cx="146" cy="130" r="9" fill="#9aa3ad" {...linha} strokeWidth={3} />
          <circle cx="166" cy="130" r="9" fill="#9aa3ad" {...linha} strokeWidth={3} />
          <circle cx="146" cy="130" r="4.5" fill="#f2a6a0" />
          <circle cx="166" cy="130" r="4.5" fill="#f2a6a0" />
          <path d="M144 140 C 144 128 168 128 168 140 L 156 156 Z" fill="#9aa3ad" {...linha} strokeWidth={3} />
          <circle cx="151" cy="140" r="2" fill={O} />
          <circle cx="161" cy="140" r="2" fill={O} />
          <circle cx="156" cy="154" r="2.5" fill="#e8957e" />
        </>
      );
    default:
      return null;
  }
}

export function PirataArt({ p, className, title }: { p: Pirata; className?: string; title?: string }) {
  const clip = `tronco-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  return (
    <svg viewBox="0 0 200 200" className={className} role={title ? "img" : undefined} aria-hidden={title ? undefined : true}>
      {title && <title>{title}</title>}
      <defs>
        <clipPath id={clip}>
          <path d={TRONCO} />
        </clipPath>
      </defs>
      {/* Um pouco menor que o quadro: o avatar é recortado em círculo. */}
      <g transform="translate(10 8) scale(0.9)">
        <Roupa i={p.roupa} clip={clip} />
        <Rosto pele={p.pele} cicatriz={p.cicatriz} />
        <Barba i={p.barba} />
        {p.barba >= 3 && <Boca ouro={p.cicatriz === 5} />}
        <Cicatriz i={p.cicatriz} />
        <Chapeu i={p.chapeu} pele={p.pele} />
        <Arma i={p.arma} pele={p.pele} />
        <Bicho i={p.bicho} />
      </g>
    </svg>
  );
}
