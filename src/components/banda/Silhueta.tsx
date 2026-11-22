import type { Papel } from "@/lib/banda/tipos";
import { NOME_PAPEL } from "@/lib/banda/conteudo";

// Ilustração simples: cada papel tem o seu instrumento e cada variante, o seu cabelo. Só silhueta, sem rosto.
const COR_PAPEL: Record<Papel, string> = { voz: "#f2a66e", guitarra: "#7fe0a8", baixo: "#9db8e8", bateria: "#f2c14e" };

function Cabelo({ variante }: { variante: number }) {
  switch (variante % 4) {
    case 1:
      return <path d="M34 28l4-10 5 8 5-11 5 11 5-8 4 10Z" />; // espetado
    case 2:
      return <path d="M32 30c0-12 7-16 18-16s18 4 18 16v26l-6-10V30H38v16l-6 10Z" />; // cabelo comprido
    case 3:
      return <path d="M32 28c1-9 8-13 18-13s17 4 18 13H32Zm30 0h16v5H62Z" />; // boné
    default:
      return <circle cx="50" cy="26" r="15" />; // redondo
  }
}

function Instrumento({ papel }: { papel: Papel }) {
  switch (papel) {
    case "voz":
      return (
        <g>
          <rect x="68" y="52" width="4" height="40" rx="2" />
          <circle cx="70" cy="48" r="7" />
        </g>
      );
    case "guitarra":
      return (
        <g>
          <path d="M26 82l36-26 4 5-34 28Z" />
          <ellipse cx="30" cy="84" rx="12" ry="9" />
          <rect x="58" y="48" width="12" height="5" rx="2" transform="rotate(-36 64 50)" />
        </g>
      );
    case "baixo":
      return (
        <g>
          <path d="M24 90l42-38 4 5-40 38Z" />
          <ellipse cx="28" cy="88" rx="10" ry="8" />
          <rect x="62" y="40" width="14" height="5" rx="2" transform="rotate(-42 69 42)" />
        </g>
      );
    default:
      return (
        <g>
          <ellipse cx="50" cy="86" rx="22" ry="7" />
          <rect x="28" y="78" width="44" height="8" />
          <circle cx="24" cy="64" r="9" />
          <circle cx="78" cy="64" r="9" />
          <rect x="22" y="70" width="3" height="22" />
          <rect x="76" y="70" width="3" height="22" />
        </g>
      );
  }
}

export function Silhueta({ papel, variante, tamanho = 72 }: { papel: Papel; variante: number; tamanho?: number }) {
  return (
    <svg width={tamanho} height={tamanho} viewBox="0 0 100 100" role="img" aria-label={`Integrante: ${NOME_PAPEL[papel]}`} className="shrink-0" fill={COR_PAPEL[papel]}>
      <rect x="0" y="0" width="100" height="100" rx="8" fill="#182f48" />
      <g fill="#ece3be">
        <Cabelo variante={variante} />
        <path d="M38 44h24l8 30H30Z" />
      </g>
      <g fill={COR_PAPEL[papel]}>
        <Instrumento papel={papel} />
      </g>
    </svg>
  );
}
