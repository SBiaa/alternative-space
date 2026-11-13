// Layouts de mural, desenhados por nós (formas simples em coordenadas do muro). Nada copiado de obra real.
// x vai de 0 a 100 (largura); y vai de 0 a alturaUn(size) (= 100 × altura / largura), então um círculo é redondo.

import { TAMANHOS } from "./config";
import type { Forma, Linha, Tamanho, Template } from "./tipos";

export const alturaUn = (size: Tamanho) => (100 * TAMANHOS[size].alturaM) / TAMANHOS[size].larguraM;

const ret = (x: number, y: number, w: number, h: number): Forma => ({ t: "rect", x, y, w, h });
const eli = (cx: number, cy: number, rx: number, ry: number): Forma => ({ t: "elipse", cx, cy, rx, ry });
const poli = (...p: [number, number][]): Forma => ({ t: "poli", p });
const linha = (fechada: boolean, ...p: [number, number][]): Linha => ({ p, fechada });

/** Contorno automático: borda de cada forma de preenchimento. */
export function contornoDe(formas: Forma[]): Linha[] {
  return formas.map((f): Linha => {
    if (f.t === "rect") return linha(true, [f.x, f.y], [f.x + f.w, f.y], [f.x + f.w, f.y + f.h], [f.x, f.y + f.h]);
    if (f.t === "poli") return { p: f.p, fechada: true };
    const p: [number, number][] = [];
    for (let i = 0; i < 28; i++) {
      const a = (i / 28) * Math.PI * 2;
      p.push([f.cx + Math.cos(a) * f.rx, f.cy + Math.sin(a) * f.ry]);
    }
    return { p, fechada: true };
  });
}

function montar(slug: string, nome: string, size: Tamanho, preench: Forma[], extras: Linha[], detalhe: Forma[], tag: [number, number, number, number], texto: [number, number, number, number]): Template {
  const H = alturaUn(size);
  const [tx, ty, tw, th] = tag;
  return {
    slug, nome, size,
    layers: { preenchimento: preench, contorno: [...contornoDe(preench), ...extras], detalhe },
    slots: {
      texto: { x: texto[0], y: texto[1], w: texto[2], h: texto[3] },
      tag: { x: tx, y: ty, w: tw, h: th },
      tagGrande: { x: 18, y: H * 0.22, w: 64, h: H * 0.5 },
    },
    tolerance: size === "porta" ? 4 : 3,
  };
}

const HP = alturaUn("porta");
const HF = alturaUn("fachada");
const HQ = alturaUn("quadra");
const HL = alturaUn("longo");

export const TEMPLATES: Template[] = [
  // --- porta ---
  montar("porta-sol", "Sol de porta", "porta",
    [eli(50, HP * 0.42, 34, 34), ret(10, HP * 0.78, 80, 14)],
    [linha(false, [50, HP * 0.42 - 44], [50, HP * 0.42 - 52]), linha(false, [20, HP * 0.42 - 30], [14, HP * 0.42 - 38]), linha(false, [80, HP * 0.42 - 30], [86, HP * 0.42 - 38])],
    [eli(40, HP * 0.36, 6, 6), eli(60, HP * 0.48, 4, 4), ret(18, HP * 0.82, 10, 6)],
    [62, HP * 0.9, 30, 14], [12, HP * 0.1, 76, 12]),
  montar("porta-letreiro", "Letreiro de porta", "porta",
    [ret(8, HP * 0.12, 84, 30), ret(8, HP * 0.55, 84, 50), poli([50, HP * 0.18], [58, HP * 0.3], [42, HP * 0.3])],
    [linha(false, [14, HP * 0.5], [86, HP * 0.5])],
    [eli(30, HP * 0.7, 7, 7), eli(70, HP * 0.7, 7, 7), ret(36, HP * 0.84, 28, 5)],
    [60, HP * 0.94, 32, 12], [14, HP * 0.15, 72, 24]),
  // --- fachada ---
  montar("fachada-skyline", "Horizonte da fachada", "fachada",
    [ret(6, HF * 0.45, 14, HF * 0.5), ret(24, HF * 0.28, 18, HF * 0.67), ret(46, HF * 0.5, 12, HF * 0.45), ret(62, HF * 0.34, 16, HF * 0.61), eli(88, HF * 0.22, 7, 7)],
    [linha(false, [4, HF * 0.97], [96, HF * 0.97])],
    [ret(27, HF * 0.34, 4, 5), ret(35, HF * 0.34, 4, 5), ret(66, HF * 0.4, 4, 5), ret(72, HF * 0.4, 4, 5), eli(88, HF * 0.22, 3, 3)],
    [78, HF * 0.9, 18, 8], [8, HF * 0.08, 60, 14]),
  montar("fachada-ondas", "Ondas da fachada", "fachada",
    [poli([4, HF * 0.55], [20, HF * 0.4], [36, HF * 0.55], [52, HF * 0.4], [68, HF * 0.55], [84, HF * 0.4], [96, HF * 0.55], [96, HF * 0.92], [4, HF * 0.92]), eli(26, HF * 0.22, 9, 9)],
    [linha(false, [4, HF * 0.7], [20, HF * 0.62], [36, HF * 0.7], [52, HF * 0.62], [68, HF * 0.7], [84, HF * 0.62], [96, HF * 0.7])],
    [eli(60, HF * 0.78, 6, 3), eli(44, HF * 0.82, 4, 2), eli(26, HF * 0.22, 4, 4)],
    [78, HF * 0.93, 18, 7], [34, HF * 0.08, 60, 14]),
  // --- muro de quadra ---
  montar("quadra-bola", "Bola e campo", "quadra",
    [eli(50, HQ * 0.5, 22, 22), ret(4, HQ * 0.88, 92, 6), ret(8, HQ * 0.12, 20, 10), ret(72, HQ * 0.12, 20, 10)],
    [linha(false, [4, HQ * 0.82], [96, HQ * 0.82]), linha(false, [50, HQ * 0.5 - 22], [50, HQ * 0.5 + 22])],
    [eli(42, HQ * 0.42, 5, 5), eli(58, HQ * 0.58, 5, 5), ret(12, HQ * 0.15, 6, 4)],
    [80, HQ * 0.93, 16, 6], [30, HQ * 0.05, 40, 8]),
  montar("quadra-bairro", "Casinhas do bairro", "quadra",
    [ret(6, HQ * 0.48, 18, HQ * 0.4), poli([4, HQ * 0.48], [15, HQ * 0.22], [26, HQ * 0.48]), ret(30, HQ * 0.38, 20, HQ * 0.5), poli([28, HQ * 0.38], [40, HQ * 0.14], [52, HQ * 0.38]), ret(56, HQ * 0.52, 16, HQ * 0.36), eli(86, HQ * 0.4, 9, 12), ret(84.5, HQ * 0.55, 3, HQ * 0.33)],
    [linha(false, [4, HQ * 0.9], [96, HQ * 0.9])],
    [ret(10, HQ * 0.6, 5, 8), ret(36, HQ * 0.55, 6, 9), ret(60, HQ * 0.62, 5, 7)],
    [80, HQ * 0.93, 16, 6], [58, HQ * 0.06, 38, 8]),
  // --- muro longo ---
  montar("longo-serra", "Serra e sol", "longo",
    [poli([0, HL * 0.95], [14, HL * 0.42], [28, HL * 0.95]), poli([20, HL * 0.95], [40, HL * 0.28], [60, HL * 0.95]), poli([52, HL * 0.95], [72, HL * 0.46], [92, HL * 0.95]), eli(84, HL * 0.22, 6, 6)],
    [linha(false, [0, HL * 0.97], [100, HL * 0.97])],
    [eli(84, HL * 0.22, 3, 3), poli([38, HL * 0.42], [40, HL * 0.28], [42, HL * 0.42])],
    [82, HL * 0.9, 14, 6], [4, HL * 0.06, 50, 10]),
  montar("longo-fita", "Fita colorida", "longo",
    [poli([0, HL * 0.55], [18, HL * 0.3], [36, HL * 0.55], [54, HL * 0.3], [72, HL * 0.55], [90, HL * 0.3], [100, HL * 0.42], [100, HL * 0.78], [90, HL * 0.62], [72, HL * 0.85], [54, HL * 0.62], [36, HL * 0.85], [18, HL * 0.62], [0, HL * 0.82]), eli(18, HL * 0.16, 5, 5), eli(54, HL * 0.16, 5, 5)],
    [linha(false, [0, HL * 0.97], [100, HL * 0.97])],
    [eli(36, HL * 0.52, 3, 3), eli(72, HL * 0.52, 3, 3)],
    [84, HL * 0.9, 14, 6], [30, HL * 0.04, 40, 8]),
];

export const templatePorSlug = (slug: string, lista: Template[] = TEMPLATES) => lista.find((t) => t.slug === slug);
export const templatesDe = (size: Tamanho, lista: Template[] = TEMPLATES) => lista.filter((t) => t.size === size);
