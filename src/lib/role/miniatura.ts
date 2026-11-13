import { PISTA } from "./config";
import { formasDaPista } from "./pecas";
import type { Pista } from "./pista";

// Miniatura da pista em SVG (usada na imagem de compartilhamento e nos cartões da lista).
export type CoresMiniatura = { fundo: string; peca: string; grind: string; linha: string };

export function miniaturaSvg(p: Pista, cores: CoresMiniatura): string {
  const W = p.width * PISTA.celula;
  const H = PISTA.altura * PISTA.celula;
  const formas = formasDaPista(p)
    .map((f) => `<polygon points="${f.pontos.map((q) => `${q.x.toFixed(1)},${q.y.toFixed(1)}`).join(" ")}" fill="${f.grind ? cores.grind : cores.peca}" stroke="${cores.linha}" stroke-width="2"/>`)
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 ${H * 0.45} ${W} ${H * 0.55}" preserveAspectRatio="xMidYMax meet"><rect x="0" y="0" width="${W}" height="${H}" fill="${cores.fundo}"/>${formas}</svg>`;
}

export const miniaturaDataUri = (p: Pista, cores: CoresMiniatura) => `data:image/svg+xml;base64,${Buffer.from(miniaturaSvg(p, cores)).toString("base64")}`;
