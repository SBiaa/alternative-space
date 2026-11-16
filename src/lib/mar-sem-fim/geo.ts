// Geometria do globo: distância, arco entre dois pontos, vetor 3D e a região de cada ponto (mar, Espinha, Corrente, Mares Parados).
// Tudo aqui é TypeScript puro: o globo 3D, o mapa 2D e os testes usam as mesmas funções.

import type { Mundo } from "./tipos";

const rad = (g: number) => (g * Math.PI) / 180;
const grau = (r: number) => (r * 180) / Math.PI;

export type LatLng = { lat: number; lng: number };

/** Menor diferença entre duas longitudes, em graus (0..180). */
export const difLng = (a: number, b: number) => {
  const d = Math.abs(((a - b + 540) % 360) - 180);
  return d;
};

/** Vetor unitário do ponto. Mesma convenção da esfera do three: lng 0 em +x, lng 90 leste em -z, y é o norte. */
export function paraVetor({ lat, lng }: LatLng, raio = 1): [number, number, number] {
  const la = rad(lat);
  const lo = rad(lng);
  return [raio * Math.cos(la) * Math.cos(lo), raio * Math.sin(la), -raio * Math.cos(la) * Math.sin(lo)];
}

export function deVetor([x, y, z]: [number, number, number]): LatLng {
  const r = Math.hypot(x, y, z) || 1;
  return { lat: grau(Math.asin(y / r)), lng: grau(Math.atan2(-z, x)) };
}

/** Distância entre dois pontos, em graus de arco de círculo máximo. */
export function distanciaGraus(a: LatLng, b: LatLng): number {
  const [ax, ay, az] = paraVetor(a);
  const [bx, by, bz] = paraVetor(b);
  const d = Math.min(1, Math.max(-1, ax * bx + ay * by + az * bz));
  return grau(Math.acos(d));
}

/** Ponto a uma fração t (0..1) do caminho entre a e b, pelo círculo máximo. */
export function pontoNoArco(a: LatLng, b: LatLng, t: number): LatLng {
  const va = paraVetor(a);
  const vb = paraVetor(b);
  const omega = rad(distanciaGraus(a, b));
  if (omega < 1e-9) return a;
  const k1 = Math.sin((1 - t) * omega) / Math.sin(omega);
  const k2 = Math.sin(t * omega) / Math.sin(omega);
  return deVetor([k1 * va[0] + k2 * vb[0], k1 * va[1] + k2 * vb[1], k1 * va[2] + k2 * vb[2]]);
}

/** Pontos do arco, para desenhar a rota sobre a esfera ou no mapa. */
export const amostrarArco = (a: LatLng, b: LatLng, n = 24): LatLng[] => Array.from({ length: n + 1 }, (_, i) => pontoNoArco(a, b, i / n));

export type Regiao =
  | { tipo: "espinha" }
  | { tipo: "corrente"; bravo: boolean }
  | { tipo: "parados" }
  | { tipo: "mar"; id: string };

export const naEspinha = (m: Mundo, lng: number) => m.espinha.meridianos.some((mer) => difLng(lng, mer) <= m.espinha.larguraGraus / 2);

/** O que existe naquele ponto do planeta. A Espinha vence a Corrente, que vence os Mares Parados, que vencem os quatro mares. */
export function regiaoEm(m: Mundo, lat: number, lng: number): Regiao {
  if (naEspinha(m, lng)) return { tipo: "espinha" };
  const a = Math.abs(lat);
  if (a <= m.corrente.latMax) {
    // O Lado Manso fica a leste do Monte (lng 0..180). A outra metade é o Lado Bravo.
    const manso = ((lng % 360) + 360) % 360 < 180;
    return { tipo: "corrente", bravo: !manso };
  }
  if (a <= m.parados.latMax) return { tipo: "parados" };
  const hemisferio = lat >= 0 ? "norte" : "sul";
  const lado = ((lng % 360) + 360) % 360 < 180 ? "leste" : "oeste";
  const mar = m.mares.find((x) => x.hemisferio === hemisferio && x.lado === lado);
  return { tipo: "mar", id: mar!.id };
}

export const regiaoIgual = (a: Regiao, b: Regiao) =>
  a.tipo === b.tipo && (a.tipo !== "mar" || a.id === (b as { id: string }).id) && (a.tipo !== "corrente" || a.bravo === (b as { bravo: boolean }).bravo);
