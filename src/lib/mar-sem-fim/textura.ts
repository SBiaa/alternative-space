// Textura do planeta, pintada a partir do mundo.json: mesmos mares, Espinha, Corrente Anelar e Mares Parados
// do globo 3D e do mapa 2D (que usam esta mesma imagem). Cores e tamanhos vêm da config, não daqui.

import { regiaoEm } from "./geo";
import type { Mundo } from "./tipos";

const rgb = (hex: string): [number, number, number] => [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
const mistura = (a: [number, number, number], b: [number, number, number], t: number): [number, number, number] => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

// Ruído de valor barato e determinístico, só pro relevo da Espinha.
const ruido = (x: number, y: number) => {
  const h = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return h - Math.floor(h);
};
const suave = (x: number, y: number) => {
  const xi = Math.floor(x), yi = Math.floor(y);
  const xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = ruido(xi, yi), b = ruido(xi + 1, yi), c = ruido(xi, yi + 1), d = ruido(xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
};

export type Texturas = { cor: ImageData; relevo: ImageData };

/** Pinta a textura de cor e o mapa de relevo. Funciona em qualquer canvas 2D. */
export function pintarPlaneta(ctx: CanvasRenderingContext2D, m: Mundo, w = m.planeta.texturaLargura, h = m.planeta.texturaAltura): Texturas {
  const cor = ctx.createImageData(w, h);
  const relevo = ctx.createImageData(w, h);
  const oceano = rgb(m.planeta.corOceano);
  const noite = rgb(m.planeta.corFundo);
  const corrente = rgb(m.corrente.cor);
  const brilho = rgb(m.corrente.corBrilho);
  const parados = rgb(m.parados.cor);
  const rocha = rgb(m.espinha.cor);
  const rochaClara = rgb(m.espinha.corRelevo);
  const mares = new Map(m.mares.map((x) => [x.id, rgb(x.cor)]));

  for (let y = 0; y < h; y++) {
    const lat = 90 - ((y + 0.5) / h) * 180;
    for (let x = 0; x < w; x++) {
      const lng = ((x + 0.5) / w) * 360 - 180;
      const r = regiaoEm(m, lat, lng);
      let c: [number, number, number];
      let alt = 0;
      if (r.tipo === "espinha") {
        const n = suave(x / 6, y / 6) * 0.6 + suave(x / 2, y / 2) * 0.4;
        c = mistura(rocha, rochaClara, n);
        alt = 120 + n * 135;
      } else if (r.tipo === "corrente") {
        // Faixa mais clara, com brilho suave no meio.
        const meio = 1 - Math.abs(lat) / m.corrente.latMax;
        c = mistura(corrente, brilho, Math.max(0, meio) * 0.55);
        if (r.bravo) c = mistura(c, noite, 0.62); // Lado Bravo: área escurecida, "em breve"
      } else if (r.tipo === "parados") {
        c = parados; // liso: sem textura, mar quase parado
      } else {
        c = mistura(oceano, mares.get(r.id) ?? oceano, 0.34 + 0.08 * suave(x / 18, y / 18));
      }
      // Fios finos de meridiano e paralelo a cada 30 graus, como carta náutica.
      if (r.tipo !== "espinha" && (Math.abs(((lng + 180) % 30) - 15) > 14.6 || Math.abs(((lat + 90) % 30) - 15) > 14.75)) c = mistura(c, [236, 227, 190], 0.16);
      const i = (y * w + x) * 4;
      cor.data[i] = c[0]; cor.data[i + 1] = c[1]; cor.data[i + 2] = c[2]; cor.data[i + 3] = 255;
      relevo.data[i] = relevo.data[i + 1] = relevo.data[i + 2] = alt; relevo.data[i + 3] = 255;
    }
  }
  return { cor, relevo };
}
