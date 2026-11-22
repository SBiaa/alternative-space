// Dados e hooks que o globo 3D e o mapa 2D compartilham: os marcadores, a posição do barco e a textura do planeta.
import { useEffect, useState } from "react";
import { ILHAS, MUNDO } from "@/lib/mar-sem-fim/conteudo";
import { pontoNoArco, type LatLng } from "@/lib/mar-sem-fim/geo";
import { PONTOS, type PontoDoMapa } from "@/lib/mar-sem-fim/rotas";
import { pintarPlaneta } from "@/lib/mar-sem-fim/textura";
import type { Estado } from "@/lib/mar-sem-fim/tipos";

export type Marcador = { id: string; nome: string; lat: number; lng: number; emBreve: boolean };

export const MARCADORES: Marcador[] = [
  ...ILHAS.map((i) => ({ id: i.slug, nome: i.nome, lat: i.lat, lng: i.lng, emBreve: false })),
  ...MUNDO.emBreve.map((x) => ({ id: x.id, nome: x.nome, lat: x.lat, lng: x.lng, emBreve: true })),
];

/** Onde o barco está: parado numa ilha, ou ao longo da rota (progresso de 0 a 1 pelo tempo do servidor). */
export function posicaoDoBarco(e: Estado, agora: number): LatLng {
  const v = e.viagem;
  if (!v || v.resolvida || v.chegou || !agora) return PONTOS[e.barco.ilhaAtual] ?? { lat: 0, lng: 0 };
  const p = Math.min(1, Math.max(0, (agora - v.partiuEm) / Math.max(1, v.chegaEm - v.partiuEm)));
  const pts = v.rota.map((n) => PONTOS[n]).filter(Boolean);
  if (pts.length < 2) return pts[0] ?? { lat: 0, lng: 0 };
  // Distribui o progresso pelos trechos, na proporção do tamanho de cada um.
  const tam = pts.slice(1).map((b, i) => Math.hypot(b.lat - pts[i].lat, b.lng - pts[i].lng));
  const total = tam.reduce((a, b) => a + b, 0) || 1;
  let alvo = p * total;
  for (let i = 0; i < tam.length; i++) {
    if (alvo <= tam[i] || i === tam.length - 1) return pontoNoArco(pts[i], pts[i + 1], tam[i] ? Math.min(1, alvo / tam[i]) : 1);
    alvo -= tam[i];
  }
  return pts[pts.length - 1];
}

export const pontosDaRotaViagem = (e: Estado): PontoDoMapa[] | null => {
  const v = e.viagem;
  if (!v || v.resolvida || v.chegou) return null;
  return v.rota.map((n) => PONTOS[n]).filter(Boolean);
};

export type Planeta = { cor: HTMLCanvasElement; relevo: HTMLCanvasElement; url: string };
let cache: Planeta | null = null;

/** Pinta a textura do planeta uma vez (no navegador) e reaproveita. */
export function usePlaneta(): Planeta | null {
  const [p, setP] = useState<Planeta | null>(cache);
  useEffect(() => {
    if (cache) return;
    const w = MUNDO.planeta.texturaLargura;
    const h = MUNDO.planeta.texturaAltura;
    const cor = document.createElement("canvas");
    const relevo = document.createElement("canvas");
    cor.width = relevo.width = w;
    cor.height = relevo.height = h;
    const c1 = cor.getContext("2d")!;
    const c2 = relevo.getContext("2d")!;
    const t = pintarPlaneta(c1, MUNDO, w, h);
    c1.putImageData(t.cor, 0, 0);
    c2.putImageData(t.relevo, 0, 0);
    cache = { cor, relevo, url: cor.toDataURL("image/png") };
    // eslint-disable-next-line react-hooks/set-state-in-effect -- a textura só existe no navegador
    setP(cache);
  }, []);
  return p;
}

const CHAVE_VISAO = "mar-sem-fim:visao";
export type Visao = "globo" | "mapa";

/** O aparelho aguenta o globo 3D? Pouca memória/CPU ou movimento reduzido: começa no mapa 2D. */
export function visaoPadrao(): Visao {
  if (typeof window === "undefined") return "mapa";
  const reduz = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  const nav = navigator as Navigator & { deviceMemory?: number };
  const fraco = (nav.deviceMemory ?? 8) <= 2 || (navigator.hardwareConcurrency ?? 8) <= 2;
  return reduz || fraco ? "mapa" : "globo";
}
export function lerVisao(): Visao {
  try {
    const v = localStorage.getItem(CHAVE_VISAO);
    if (v === "globo" || v === "mapa") return v;
  } catch {
    /* sem armazenamento */
  }
  return visaoPadrao();
}
export function gravarVisao(v: Visao) {
  try {
    localStorage.setItem(CHAVE_VISAO, v);
  } catch {
    /* ok */
  }
}
export const reduzMovimento = () => typeof window !== "undefined" && Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)").matches);
