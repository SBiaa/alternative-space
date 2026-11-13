// Leitura do bairro (JSON do Tiled), caminho mais curto e sorteio de pedidos. Puro, sem Phaser.
import { ENTREGA } from "./config";

export type Ponto = { nome: string; x: number; y: number; fragil?: boolean };
export type Ret = { nome: string; x: number; y: number; w: number; h: number; props: Record<string, unknown> };
export type Bairro = {
  w: number;
  h: number;
  tile: number;
  andavel: Uint8Array; // 1 = rua ou beco
  coletas: Ponto[];
  enderecos: Ponto[];
  pocas: Ret[];
  rotas: { x: number; y: number }[][];
  drones: Ret[];
  becos: Ret[];
  placas: Ponto[];
};

type Obj = { name: string; x: number; y: number; width: number; height: number; polygon?: { x: number; y: number }[]; properties?: { name: string; value: unknown }[] };
type Camada = { name: string; type: string; data?: number[]; objects?: Obj[] };
export type Tiled = { width: number; height: number; tilewidth: number; layers: Camada[] };

const props = (o: Obj) => Object.fromEntries((o.properties ?? []).map((p) => [p.name, p.value]));

export function lerBairro(t: Tiled): Bairro {
  const camada = (n: string) => t.layers.find((l) => l.name === n);
  const objs = (n: string) => camada(n)?.objects ?? [];
  const ruas = camada("ruas")?.data ?? [];
  const predios = camada("predios")?.data ?? [];
  const andavel = new Uint8Array(t.width * t.height);
  for (let i = 0; i < andavel.length; i++) andavel[i] = ruas[i] > 0 && !(predios[i] > 0) ? 1 : 0;
  const pt = (o: Obj): Ponto => ({ nome: o.name, x: o.x, y: o.y, ...(props(o).fragil ? { fragil: true } : {}) });
  const ret = (o: Obj): Ret => ({ nome: o.name, x: o.x, y: o.y, w: o.width, h: o.height, props: props(o) });
  return {
    w: t.width,
    h: t.height,
    tile: t.tilewidth,
    andavel,
    coletas: objs("coletas").map(pt),
    enderecos: objs("enderecos").map(pt),
    pocas: objs("pocas").map(ret),
    rotas: objs("rotas").map((o) => (o.polygon ?? []).map((p) => ({ x: o.x + p.x, y: o.y + p.y }))),
    drones: objs("drones").map(ret),
    becos: objs("becos").map(ret),
    placas: objs("placas").map((o) => ({ ...pt(o), cor: props(o).cor }) as Ponto),
  };
}

export const tileDe = (b: Bairro, x: number, y: number) => Math.floor(y / b.tile) * b.w + Math.floor(x / b.tile);
const centro = (b: Bairro, i: number) => ({ x: ((i % b.w) + 0.5) * b.tile, y: (Math.floor(i / b.w) + 0.5) * b.tile });

/** Distâncias em tiles a partir de um ponto (BFS na grade de ruas). -1 = inalcançável. */
export function distancias(b: Bairro, origem: number): Int32Array {
  const d = new Int32Array(b.w * b.h).fill(-1);
  if (!b.andavel[origem]) return d;
  const fila = [origem];
  d[origem] = 0;
  for (let k = 0; k < fila.length; k++) {
    const i = fila[k];
    const x = i % b.w;
    for (const j of [i - b.w, i + b.w, x > 0 ? i - 1 : -1, x < b.w - 1 ? i + 1 : -1]) {
      if (j < 0 || j >= d.length || d[j] >= 0 || !b.andavel[j]) continue;
      d[j] = d[i] + 1;
      fila.push(j);
    }
  }
  return d;
}

/** Caminho mais curto (centros dos tiles) de (x,y) até (tx,ty). Vazio se não houver. */
export function caminho(b: Bairro, x: number, y: number, tx: number, ty: number): { x: number; y: number }[] {
  const alvo = tileDe(b, tx, ty);
  const d = distancias(b, alvo);
  let i = tileDe(b, x, y);
  if (d[i] < 0) return [];
  const out = [centro(b, i)];
  while (d[i] > 0) {
    const xi = i % b.w;
    const viz = [i - b.w, i + b.w, xi > 0 ? i - 1 : -1, xi < b.w - 1 ? i + 1 : -1];
    i = viz.find((j) => j >= 0 && j < d.length && d[j] === d[i] - 1)!;
    out.push(centro(b, i));
  }
  return out;
}

export type Pedido = { coleta: Ponto; entrega: Ponto; distancia: number; prazoS: number; base: number; fragil: boolean };

/** Sorteia coleta e endereço com distância mínima entre eles (em tiles pelas ruas). */
export function sortearPedido(b: Bairro, rnd: () => number = Math.random, relaxado = false, c = ENTREGA): Pedido {
  for (let tentativa = 0; tentativa < 50; tentativa++) {
    const coleta = b.coletas[Math.floor(rnd() * b.coletas.length)];
    const d = distancias(b, tileDe(b, coleta.x, coleta.y));
    const longe = b.enderecos.filter((e) => d[tileDe(b, e.x, e.y)] >= c.pedido.distanciaMinTiles);
    if (longe.length === 0) continue;
    const entrega = longe[Math.floor(rnd() * longe.length)];
    const distancia = d[tileDe(b, entrega.x, entrega.y)];
    const [min, max] = c.pedido.gorjetaBase;
    const fragil = Boolean(coleta.fragil) || rnd() < c.pedido.chanceFragil;
    const prazoS = Math.round((c.pedido.prazoBaseS + distancia * c.pedido.segPorTile) * (relaxado ? c.pedido.fatorRelaxado : 1));
    return { coleta, entrega, distancia, prazoS, base: min + Math.floor(rnd() * (max - min + 1)), fragil };
  }
  throw new Error("Bairro sem pares de coleta e entrega distantes o bastante.");
}
