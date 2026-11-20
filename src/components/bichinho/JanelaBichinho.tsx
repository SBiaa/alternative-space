import { TEXTOS, type Fase, type Humor, type Slot } from "@/lib/bichinho/config";
import { especieDe } from "@/lib/bichinho/regras";
import { BichinhoSvg } from "./BichinhoSvg";
import "./bichinho.css";

// Janela redonda da cabine com o planeta laranja e poucas estrelas. Usada na base e na cabine pública.
const ESTRELAS = [
  { x: 52, y: 58, r: 1.6 },
  { x: 150, y: 46, r: 1.2 },
  { x: 128, y: 84, r: 1.4 },
  { x: 74, y: 128, r: 1.1 },
  { x: 40, y: 98, r: 1.2 },
];

export type JanelaProps = {
  especie: string;
  fase: Fase;
  humor: Humor;
  nome: string;
  equipados?: Partial<Record<Slot, string>>;
  toque?: number;
  /** Largura máxima em px (a janela é quadrada e se ajusta ao espaço). */
  maxLargura?: number;
};

export function JanelaBichinho({ especie, fase, humor, nome, equipados, toque, maxLargura = 320 }: JanelaProps) {
  const e = especieDe(especie);
  if (!e) return null;
  return (
    <figure className="bic-janela" style={{ maxWidth: maxLargura }} role="img" aria-label={TEXTOS.janela(nome)}>
      <svg viewBox="0 0 200 200" aria-hidden="true" focusable="false">
        <defs>
          <clipPath id="bic-vidro">
            <circle cx="100" cy="100" r="86" />
          </clipPath>
          <linearGradient id="bic-ceu" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--janela-ceu-topo)" />
            <stop offset="1" stopColor="var(--janela-ceu-fundo)" />
          </linearGradient>
        </defs>
        <g clipPath="url(#bic-vidro)">
          <rect width="200" height="200" fill="url(#bic-ceu)" />
          {ESTRELAS.map((s, i) => (
            <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="var(--janela-estrela)" opacity="0.85" />
          ))}
          <circle cx="152" cy="150" r="46" fill="var(--janela-planeta)" />
          <path d="M112 134 Q150 122 196 140 L196 150 Q150 134 108 146 Z" fill="var(--janela-planeta-luz)" opacity="0.55" />
          <g className="bic-flutua">
            <BichinhoSvg especie={e} fase={fase} humor={humor} equipados={equipados} toque={toque} caixa={{ x: 28, y: 22, width: 144, height: 144 }} />
          </g>
        </g>
        <circle cx="100" cy="100" r="90" fill="none" stroke="var(--janela-moldura)" strokeWidth="8" />
        <circle cx="100" cy="100" r="94.5" fill="none" stroke="var(--bic-linha)" strokeWidth="1" />
      </svg>
    </figure>
  );
}
