import { RETRATO, type PecaCor } from "@/lib/bolso/config";
import type { Personagem } from "@/lib/bolso/personagem";

type Peca = Personagem["retrato"];

const cor = (lista: readonly PecaCor[], id: string) => (lista.find((p) => p.id === id) ?? lista[0]).cor;

// Retrato montado com peças próprias, tudo em SVG. Peças e cores vêm de config.
export function Retrato({ retrato, nome, tamanho = 96 }: { retrato: Peca; nome: string; tamanho?: number }) {
  const pele = cor(RETRATO.pele, retrato.pele);
  const cabelo = cor(RETRATO.cabeloCor, retrato.cabeloCor);
  const roupa = cor(RETRATO.roupaCor, retrato.roupaCor);
  const tinta = "#1d1a1a";
  return (
    <svg width={tamanho} height={tamanho} viewBox="0 0 96 96" role="img" aria-label={`Retrato de ${nome || "personagem"}`} className="shrink-0 rounded-lg bg-creme-escuro">
      {retrato.cabelo === "longo" && (
        <>
          <rect x="22" y="32" width="12" height="42" rx="6" fill={cabelo} />
          <rect x="62" y="32" width="12" height="42" rx="6" fill={cabelo} />
        </>
      )}
      <path d="M10 96 Q14 70 48 68 Q82 70 86 96Z" fill={roupa} />
      <rect x="41" y="58" width="14" height="14" rx="4" fill={pele} />
      {retrato.rosto === "redondo" && <ellipse cx="48" cy="44" rx="22" ry="22" fill={pele} />}
      {retrato.rosto === "oval" && <ellipse cx="48" cy="44" rx="19" ry="25" fill={pele} />}
      {retrato.rosto === "quadrado" && <rect x="26" y="22" width="44" height="44" rx="10" fill={pele} />}
      {retrato.cabelo !== "careca" && <path d="M25 42 Q24 16 48 16 Q72 16 71 42 Q62 29 48 29 Q34 29 25 42Z" fill={cabelo} />}
      {retrato.cabelo === "coque" && <circle cx="48" cy="12" r="8" fill={cabelo} />}
      <circle cx="40" cy="46" r="2.3" fill={tinta} />
      <circle cx="56" cy="46" r="2.3" fill={tinta} />
      <path d="M42 56 Q48 60 54 56" fill="none" stroke={tinta} strokeWidth="2" strokeLinecap="round" />
      {retrato.acessorio === "oculos" && (
        <g fill="none" stroke={tinta} strokeWidth="2">
          <circle cx="40" cy="46" r="6.5" />
          <circle cx="56" cy="46" r="6.5" />
          <path d="M46.5 46 H49.5" />
        </g>
      )}
      {retrato.acessorio === "bone" && (
        <g fill={roupa}>
          <path d="M24 34 Q24 10 48 10 Q72 10 72 34Z" />
          <rect x="22" y="32" width="38" height="6" rx="3" />
        </g>
      )}
      {retrato.acessorio === "lenco" && <path d="M31 68 L65 68 L57 80 L39 80Z" fill={roupa} stroke={tinta} strokeWidth="1.5" strokeOpacity="0.4" />}
    </svg>
  );
}
