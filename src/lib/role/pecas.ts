import { FISICA, PECAS, PISTA, type TipoPeca } from "./config";
import type { Peca, Pista } from "./pista";

// Geometria das peças: a mesma função alimenta a física do jogo e o desenho do editor.
// Tudo em polígonos convexos (o Matter não precisa decompor nada).

export type Ponto = { x: number; y: number };
export type Forma = { pontos: Ponto[]; grind: boolean; tipo: TipoPeca };

// Polígonos locais em células: origem embaixo à esquerda, y pra cima, sem espelhar.
type Local = { pts: [number, number][]; grind?: boolean }[];

const ret = (x0: number, y0: number, x1: number, y1: number): [number, number][] => [
  [x0, y0],
  [x1, y0],
  [x1, y1],
  [x0, y1],
];

function escada(n: number): Local {
  return Array.from({ length: n }, (_, i) => ({ pts: ret(i, 0, i + 1, n - i) }));
}

function quarter(w: number, h: number, fatias = 8): Local {
  // Arco de circunferência: centro em (0, h), raio w. A parede fica do lado direito.
  const f = (u: number) => h - Math.sqrt(Math.max(0, w * w - u * u)) * (h / w);
  const out: Local = [];
  for (let k = 0; k < fatias; k++) {
    const u0 = (w * k) / fatias;
    const u1 = (w * (k + 1)) / fatias;
    out.push({ pts: [[u0, 0], [u1, 0], [u1, f(u1)], [u0, f(u0)]] });
  }
  return out;
}

// Espessura dos corrimãos, em células.
const BARRA = 0.12;

export function formasLocais(tipo: TipoPeca): Local {
  switch (tipo) {
    case "ground":
    case "step":
      return [{ pts: ret(0, 0, 1, 1) }];
    case "gap":
      return [];
    case "stairs3":
      return escada(3);
    case "stairs5":
      return escada(5);
    case "ramp_small":
      return [{ pts: [[0, 0], [2, 0], [2, 1]] }];
    case "ramp_big":
      return [{ pts: [[0, 0], [3, 0], [3, 2]] }];
    case "quarter":
      return quarter(3, 3);
    case "rail":
      return [{ pts: ret(0, 0.62, 3, 0.62 + BARRA), grind: true }];
    case "rail_down":
      // Feito pra ficar no mesmo lugar de uma escada de 3, acompanhando os degraus por cima.
      // Inclinação de 1 célula por célula, uns 0,6 acima da quina de cada degrau.
      return [{ pts: [[0, 4.6], [0, 4.6 - BARRA], [3, 1.6 - BARRA], [3, 1.6]], grind: true }];
    case "box":
      return [{ pts: ret(0, 0, 2, 0.9), grind: true }];
    case "bench":
      return [{ pts: ret(0, 0.45, 2, 0.62), grind: true }];
    case "ledge":
      return [{ pts: ret(0, 0, 3, 0.8), grind: true }];
    case "start":
    case "finish":
      return [{ pts: ret(0, 0, 2, 1) }];
  }
}

// Converte do espaço local (células, y pra cima) pro mundo (pixels, y pra baixo).
export function paraMundo(p: Peca, u: number, v: number): Ponto {
  const c = PISTA.celula;
  const { w } = PECAS[p.type];
  const uu = p.flip ? w - u : u;
  return { x: (p.x + uu) * c, y: (PISTA.altura - (p.y + v)) * c };
}

const alturaMundo = () => PISTA.altura * PISTA.celula;

export function formasDaPeca(p: Peca): Forma[] {
  const def = PECAS[p.type];
  return formasLocais(p.type).map((f) => {
    let pontos = f.pts.map(([u, v]) => paraMundo(p, u, v));
    // Espelhar inverte a ordem dos vértices; o Matter quer sempre o mesmo sentido.
    if (p.flip) pontos = pontos.reverse();
    return { pontos, grind: Boolean(f.grind ?? def.grind), tipo: p.type };
  });
}

// Peças de chão cheio (1 de altura) viram uma faixa só por linha, pra roda não enganchar na emenda.
const CHAO_CHEIO: TipoPeca[] = ["ground", "step", "start", "finish"];

export function formasDaPista(pista: Pista): Forma[] {
  const c = PISTA.celula;
  const H = alturaMundo();
  const cheias = new Map<number, Set<number>>();
  const formas: Forma[] = [];
  for (const p of pista.pieces) {
    if (CHAO_CHEIO.includes(p.type)) {
      const { w } = PECAS[p.type];
      const linha = cheias.get(p.y) ?? new Set<number>();
      for (let i = 0; i < w; i++) linha.add(p.x + i);
      cheias.set(p.y, linha);
    } else {
      formas.push(...formasDaPeca(p));
    }
  }
  for (const [y, xs] of cheias) {
    const ord = [...xs].sort((a, b) => a - b);
    let ini = ord[0];
    for (let i = 1; i <= ord.length; i++) {
      if (i === ord.length || ord[i] !== ord[i - 1] + 1) {
        const fim = ord[i - 1] + 1;
        formas.push({
          pontos: [
            { x: ini * c, y: H - (y + 1) * c },
            { x: fim * c, y: H - (y + 1) * c },
            { x: fim * c, y: H - y * c },
            { x: ini * c, y: H - y * c },
          ],
          grind: false,
          tipo: "ground",
        });
        ini = ord[i];
      }
    }
  }
  return formas;
}

// Onde o skatista nasce e onde fica a linha de chegada (pixels do mundo).
export function marcos(pista: Pista): { largada: Ponto; chegadaX: number } | null {
  const s = pista.pieces.find((p) => p.type === "start");
  const f = pista.pieces.find((p) => p.type === "finish");
  if (!s || !f) return null;
  const c = PISTA.celula;
  const largada = paraMundo({ ...s, flip: false }, 1, 1 + FISICA.raioSkatista + 0.05);
  return { largada, chegadaX: (f.x + 1) * c };
}

export const larguraMundo = (pista: Pista) => pista.width * PISTA.celula;
export { alturaMundo };
