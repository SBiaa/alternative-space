// Geometria da pintura: grade, máscaras por camada, alcance do andaime e avaliação do traço.
// Tudo puro (sem canvas): o componente só desenha o que estas funções decidem.

import { hash } from "../gestao/rng";
import { ALCANCE_M, MURO, TAMANHOS, limitar } from "./config";
import { alturaUn } from "./templates";
import type { Camada, Ferramenta, Forma, Linha, Ponto, Tamanho, Template } from "./tipos";

export type Grade = { cols: number; rows: number; cw: number; ch: number; H: number };
export const gradeDe = (size: Tamanho): Grade => {
  const [cols, rows] = TAMANHOS[size].grade;
  const H = alturaUn(size);
  return { cols, rows, cw: 100 / cols, ch: H / rows, H };
};

export const centroDe = (g: Grade, i: number): Ponto => ({ x: ((i % g.cols) + 0.5) * g.cw, y: (Math.floor(i / g.cols) + 0.5) * g.ch });
export const celulaEm = (g: Grade, x: number, y: number) => {
  const c = Math.floor(x / g.cw);
  const r = Math.floor(y / g.ch);
  return c < 0 || r < 0 || c >= g.cols || r >= g.rows ? -1 : r * g.cols + c;
};

function dentro(f: Forma, x: number, y: number): boolean {
  if (f.t === "rect") return x >= f.x && x <= f.x + f.w && y >= f.y && y <= f.y + f.h;
  if (f.t === "elipse") return ((x - f.cx) / f.rx) ** 2 + ((y - f.cy) / f.ry) ** 2 <= 1;
  let c = false;
  for (let i = 0, j = f.p.length - 1; i < f.p.length; j = i++) {
    const [xi, yi] = f.p[i];
    const [xj, yj] = f.p[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}

type Seg = [number, number, number, number];
export function segmentos(linhas: Linha[]): Seg[] {
  const out: Seg[] = [];
  for (const l of linhas) {
    for (let i = 0; i + 1 < l.p.length; i++) out.push([l.p[i][0], l.p[i][1], l.p[i + 1][0], l.p[i + 1][1]]);
    if (l.fechada && l.p.length > 2) out.push([l.p[l.p.length - 1][0], l.p[l.p.length - 1][1], l.p[0][0], l.p[0][1]]);
  }
  return out;
}
function distSeg(x: number, y: number, [x1, y1, x2, y2]: Seg) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const t = dx || dy ? limitar(((x - x1) * dx + (y - y1) * dy) / (dx * dx + dy * dy), 0, 1) : 0;
  return Math.hypot(x - (x1 + t * dx), y - (y1 + t * dy));
}
export const distanciaAoGuia = (segs: Seg[], x: number, y: number) => segs.reduce((m, s) => Math.min(m, distSeg(x, y, s)), Infinity);

const cacheMascara = new Map<string, Uint8Array>();
const cacheSegs = new Map<string, Seg[]>();

export const segsDe = (t: Template): Seg[] => {
  let s = cacheSegs.get(t.slug);
  if (!s) cacheSegs.set(t.slug, (s = segmentos(t.layers.contorno)));
  return s;
};

/** 1 onde a camada pinta. O fundo cobre o muro todo. */
export function mascara(t: Template, camada: Camada, tagDestaque: boolean): Uint8Array {
  const chave = `${t.slug}|${camada}|${tagDestaque ? 1 : 0}`;
  const guardada = cacheMascara.get(chave);
  if (guardada) return guardada;
  const g = gradeDe(t.size);
  const m = new Uint8Array(g.cols * g.rows);
  const slot = tagDestaque ? t.slots.tagGrande : t.slots.tag;
  const segs = segsDe(t);
  const perto = 0.75 * Math.max(g.cw, g.ch);
  for (let i = 0; i < m.length; i++) {
    const { x, y } = centroDe(g, i);
    if (camada === "fundo") m[i] = 1;
    else if (camada === "preenchimento") m[i] = t.layers.preenchimento.some((f) => dentro(f, x, y)) ? 1 : 0;
    else if (camada === "contorno") m[i] = distanciaAoGuia(segs, x, y) <= perto ? 1 : 0;
    else m[i] = t.layers.detalhe.some((f) => dentro(f, x, y)) || (x >= slot.x && x <= slot.x + slot.w && y >= slot.y && y <= slot.y + slot.h) ? 1 : 0;
  }
  cacheMascara.set(chave, m);
  return m;
}
export const totalCelulas = (m: Uint8Array) => m.reduce((a, b) => a + b, 0);

/** Ordem fixa (embaralhada pelo slug) em que as células aparecem conforme o progresso cresce. */
export function ordemDeCelulas(t: Template, camada: Camada, tagDestaque: boolean): number[] {
  const m = mascara(t, camada, tagDestaque);
  const lista: number[] = [];
  m.forEach((v, i) => v && lista.push(i));
  return lista.sort((a, b) => hash(`${t.slug}${camada}${a}`) - hash(`${t.slug}${camada}${b}`));
}

/** Altura do chão (em metros) do centro de uma linha da grade. */
export const alturaDaLinha = (size: Tamanho, row: number) => TAMANHOS[size].alturaM * (1 - (row + 0.5) / TAMANHOS[size].grade[1]);
export const alcanceDoNivel = (nivelAndaime: number) => ALCANCE_M[Math.min(Math.max(nivelAndaime, 0), ALCANCE_M.length - 1)];
export const linhaAlcancavel = (size: Tamanho, row: number, alcanceM: number) => alturaDaLinha(size, row) <= alcanceM + 1e-6;

/** Fração (0 a 1) da camada que a crew alcança com esse andaime. */
export function fracaoAlcancavel(t: Template, camada: Camada, tagDestaque: boolean, alcanceM: number): number {
  const g = gradeDe(t.size);
  const m = mascara(t, camada, tagDestaque);
  const total = totalCelulas(m);
  if (!total) return 1;
  let ok = 0;
  m.forEach((v, i) => v && linhaAlcancavel(t.size, Math.floor(i / g.cols), alcanceM) && ok++);
  return ok / total;
}
/** Precisa de andaime pra pintar o mural todo? */
export const precisaAndaime = (size: Tamanho) => TAMANHOS[size].alturaM > ALCANCE_M[0];
export const andaimeSuficiente = (size: Tamanho, alcanceM: number) => TAMANHOS[size].alturaM <= alcanceM + 1e-6;

export type Traco = {
  t: Template;
  camada: Camada;
  tagDestaque: boolean;
  ferramenta: Ferramenta;
  pontos: Ponto[];
  jaPintadas: Set<number>;
  alcanceM: number;
  /** Multiplicador da tolerância (dia tranquilo > 1; projetor < 1 não: o projetor sobe a precisão do contorno). */
  tolerancia?: number;
};
export type ResultadoTraco = { novas: number[]; precisao: number; travadas: number };

/** Avalia um traço: quais células novas ele pintou e quão preciso foi (0 a 1). */
export function avaliarTraco(a: Traco): ResultadoTraco {
  const g = gradeDe(a.t.size);
  const m = mascara(a.t, a.camada, a.tagDestaque);
  const raio = (a.ferramenta === "rolinho" ? MURO.traco.raioRolinho : MURO.traco.raioSpray) * Math.max(g.cw, g.ch);
  const tol = a.t.tolerance * MURO.traco.toleranciaBase * (a.tolerancia ?? 1);
  const segs = segsDe(a.t);
  const novas = new Set<number>();
  const tocadas = new Set<number>();
  let fora = 0;
  let travadas = 0;
  let dentroN = 0;
  let somaGuia = 0;
  let lacunas = 0;
  a.pontos.forEach((p, k) => {
    if (a.camada === "contorno" && segs.length) {
      const d = distanciaAoGuia(segs, p.x, p.y);
      somaGuia += limitar(1 - (d - tol * 0.5) / (tol * 1.5), 0, 1);
    }
    if (k > 0 && Math.hypot(p.x - a.pontos[k - 1].x, p.y - a.pontos[k - 1].y) > raio * 2.2) lacunas++;
    const c0 = Math.max(0, Math.floor((p.x - raio) / g.cw));
    const c1 = Math.min(g.cols - 1, Math.floor((p.x + raio) / g.cw));
    const r0 = Math.max(0, Math.floor((p.y - raio) / g.ch));
    const r1 = Math.min(g.rows - 1, Math.floor((p.y + raio) / g.ch));
    for (let r = r0; r <= r1; r++)
      for (let c = c0; c <= c1; c++) {
        const i = r * g.cols + c;
        const cc = centroDe(g, i);
        if (Math.hypot(cc.x - p.x, cc.y - p.y) > raio || tocadas.has(i)) continue;
        tocadas.add(i);
        if (!linhaAlcancavel(a.t.size, r, a.alcanceM)) {
          travadas++;
          continue;
        }
        if (m[i]) {
          dentroN++;
          if (!a.jaPintadas.has(i) && novas.size < MURO.traco.maxCelulasPorTraco) novas.add(i);
        } else fora++;
      }
  });
  let precisao: number;
  if (a.camada === "fundo") precisao = a.pontos.length > 1 ? 1 - lacunas / (a.pontos.length - 1) : 1;
  else if (a.camada === "contorno") precisao = a.pontos.length ? somaGuia / a.pontos.length : 0;
  else precisao = dentroN + fora ? dentroN / (dentroN + fora) : 0;
  return { novas: [...novas], precisao: limitar(precisao, 0, 1), travadas };
}
