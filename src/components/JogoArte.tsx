import type { Jogo } from "@/lib/jogos";

const CREME = "#ece3be";
const LARANJA = "#f2a66e";

// Ícone de cada jogo, desenhado num quadrado 100x100.
function Icone({ slug }: { slug: string }) {
  const traco = { fill: "none", stroke: CREME, strokeWidth: 4, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  switch (slug) {
    case "defenda-o-navio":
      return (
        <g {...traco}>
          <path d="M22 60h56l-8 16H30z" />
          <path d="M50 60V22" />
          <path d="M50 26l20 14H50" fill={LARANJA} stroke={LARANJA} />
          <path d="M34 50l8-8 8 8-8 8z" stroke={LARANJA} />
        </g>
      );
    case "log-pose-doido":
      return (
        <g {...traco}>
          <circle cx="50" cy="50" r="26" />
          <path d="M50 30l7 20-7 20-7-20z" fill={LARANJA} stroke={LARANJA} />
          <path d="M50 18v-4M50 86v-4M18 50h-4M86 50h-4" />
        </g>
      );
    case "picles-no-ralo":
      return (
        <g {...traco}>
          <ellipse cx="50" cy="52" rx="14" ry="24" transform="rotate(-25 50 52)" fill="#74b53c" stroke={CREME} />
          <circle cx="44" cy="44" r="3" fill={CREME} stroke="none" />
          <circle cx="54" cy="40" r="3" fill={CREME} stroke="none" />
          <path d="M70 26v14M64 34l6 6 6-6" stroke={LARANJA} />
        </g>
      );
    case "corrida-de-chakra":
      return (
        <g {...traco}>
          <circle cx="50" cy="50" r="24" fill="#4fc3ff" fillOpacity="0.35" stroke="#4fc3ff" />
          <path d="M50 50q10-2 10 8t-14 10q-16 0-16-16 0-20 20-22 22 0 24 22" stroke={CREME} />
          <path d="M80 30v40" stroke={LARANJA} />
          <path d="M74 64h12" stroke={LARANJA} />
        </g>
      );
    case "duelo-pirata":
      return (
        <g {...traco}>
          <path d="M26 26l48 48M74 26L26 74" />
          <path d="M30 62l8 8M62 70l8-8" stroke={LARANJA} />
        </g>
      );
    case "fabrica-de-ajudantes":
      return (
        <g {...traco}>
          <rect x="26" y="40" width="48" height="36" rx="4" />
          <path d="M26 40l8-12h32l8 12" />
          <circle cx="50" cy="58" r="8" fill={LARANJA} stroke={LARANJA} />
        </g>
      );
    case "fruta-misteriosa":
      return (
        <g {...traco}>
          <circle cx="50" cy="56" r="20" />
          <path d="M42 50q8 6 16 0M40 62q10 6 20 0" stroke={LARANJA} />
          <path d="M50 36q2-10 12-12" />
        </g>
      );
    case "monte-seu-pirata":
      return (
        <g {...traco}>
          <path d="M22 46q28-26 56 0z" fill={LARANJA} stroke={LARANJA} />
          <circle cx="50" cy="60" r="16" />
          <path d="M42 56h6M54 58l6-4" />
        </g>
      );
    default:
      return null;
  }
}

// Arte do cartão: fundo na cor do jogo, umas estrelinhas e o ícone no meio.
export function JogoArte({ jogo, className = "" }: { jogo: Jogo; className?: string }) {
  return (
    <div className={`relative flex items-center justify-center overflow-hidden ${className}`} style={{ background: jogo.cor }} aria-hidden="true">
      <svg viewBox="0 0 100 100" className="absolute inset-0 size-full" preserveAspectRatio="xMidYMid slice">
        <g fill={CREME}>
          <circle cx="12" cy="14" r="0.9" opacity="0.7" />
          <circle cx="88" cy="20" r="0.7" opacity="0.6" />
          <circle cx="80" cy="86" r="0.9" opacity="0.5" />
          <circle cx="18" cy="80" r="0.6" opacity="0.6" />
        </g>
        <circle cx="96" cy="100" r="34" fill="#dd5d05" opacity="0.12" />
      </svg>
      <svg viewBox="0 0 100 100" className="relative h-[62%] max-h-40 w-auto">
        <Icone slug={jogo.slug} />
      </svg>
    </div>
  );
}
