// Rotas: um grafo definido em content/mar-sem-fim/mundo.json (nós = ilhas + bocas de canal, arestas = trechos navegáveis).
// Por que grafo e não grade: a Espinha e os Mares Parados simplesmente não têm aresta, então nenhum caminho pode atravessá-los
// (só os trechos "canal", que terminam no Monte das Quatro Águas). É barato de testar e fácil de editar no JSON.

import { ILHAS, MUNDO } from "./conteudo";
import { distanciaGraus, type LatLng } from "./geo";
import type { Aresta } from "./tipos";

export type PontoDoMapa = LatLng & { id: string; nome: string; ilha: boolean };

export const PONTOS: Record<string, PontoDoMapa> = {
  ...Object.fromEntries(ILHAS.map((i) => [i.slug, { id: i.slug, nome: i.nome, lat: i.lat, lng: i.lng, ilha: true }])),
  ...Object.fromEntries(MUNDO.nos.map((n) => [n.id, { id: n.id, nome: n.nome, lat: n.lat, lng: n.lng, ilha: false }])),
};

export type Trecho = { de: string; para: string; graus: number; tipo: Aresta["tipo"] };

const vizinhos = new Map<string, Trecho[]>();
export const TRECHOS: Trecho[] = [];
for (const a of MUNDO.arestas) {
  const de = PONTOS[a.de];
  const para = PONTOS[a.para];
  if (!de || !para) continue;
  const graus = distanciaGraus(de, para);
  TRECHOS.push({ de: a.de, para: a.para, graus, tipo: a.tipo });
  for (const [x, y] of [[a.de, a.para], [a.para, a.de]]) {
    vizinhos.set(x, [...(vizinhos.get(x) ?? []), { de: x, para: y, graus, tipo: a.tipo }]);
  }
}

export type Rota = { nos: string[]; graus: number; trechos: Trecho[] };

/** Menor caminho pelo grafo (Dijkstra). null = não há rota navegável. */
export function menorRota(origem: string, destino: string): Rota | null {
  if (!PONTOS[origem] || !PONTOS[destino]) return null;
  if (origem === destino) return { nos: [origem], graus: 0, trechos: [] };
  const dist = new Map<string, number>([[origem, 0]]);
  const veio = new Map<string, Trecho>();
  const aberto = new Set<string>([origem]);
  while (aberto.size) {
    let atual = "";
    let melhor = Infinity;
    for (const n of aberto) {
      const d = dist.get(n)!;
      if (d < melhor) { melhor = d; atual = n; }
    }
    aberto.delete(atual);
    if (atual === destino) break;
    for (const t of vizinhos.get(atual) ?? []) {
      const nd = melhor + t.graus;
      if (nd < (dist.get(t.para) ?? Infinity)) {
        dist.set(t.para, nd);
        veio.set(t.para, t);
        aberto.add(t.para);
      }
    }
  }
  if (!dist.has(destino)) return null;
  const trechos: Trecho[] = [];
  for (let n = destino; n !== origem; ) {
    const t = veio.get(n)!;
    trechos.unshift(t);
    n = t.de;
  }
  return { nos: [origem, ...trechos.map((t) => t.para)], graus: dist.get(destino)!, trechos };
}

/** Pontos da rota, para desenhar o arco no globo e no mapa. */
export const pontosDaRota = (r: Rota): PontoDoMapa[] => r.nos.map((n) => PONTOS[n]);
