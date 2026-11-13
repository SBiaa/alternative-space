import type Phaser from "phaser";
import { PECAS, PISTA } from "@/lib/role/config";
import { formasDaPista, paraMundo, type Forma } from "@/lib/role/pecas";
import type { Peca, Pista } from "@/lib/role/pista";

// Desenho no tema Cozy. As cores vêm dos tokens do CSS (globals.css), nunca de valores soltos.

export type Cores = {
  ceu: number;
  noite: number;
  creme: number;
  cremeEscuro: number;
  areia: number;
  laranja: number;
  laranjaClaro: number;
  linha: number;
  linhaForte: number;
  azul: number;
};

const TOKENS: Record<keyof Cores, string> = {
  ceu: "--color-ceu",
  noite: "--color-noite",
  creme: "--color-creme",
  cremeEscuro: "--color-creme-escuro",
  areia: "--color-areia",
  laranja: "--color-laranja",
  laranjaClaro: "--color-laranja-claro",
  linha: "--color-line",
  linhaForte: "--color-line-strong",
  azul: "--color-azul",
};

export function lerCores(): Cores {
  const css = getComputedStyle(document.documentElement);
  const out = {} as Cores;
  for (const k of Object.keys(TOKENS) as (keyof Cores)[]) {
    const v = css.getPropertyValue(TOKENS[k]).trim().replace("#", "");
    out[k] = parseInt(v.length === 3 ? v.split("").map((c) => c + c).join("") : v, 16) || 0;
  }
  return out;
}

export function fonteMono(): string {
  const f = getComputedStyle(document.documentElement).getPropertyValue("--font-space-mono").trim();
  return f ? `${f}, monospace` : "monospace";
}

// Pseudoaleatório com semente: o cenário é o mesmo toda vez pra mesma pista.
export function sorteio(semente: number) {
  let s = semente >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return ((s >>> 0) % 10000) / 10000;
  };
}

// Céu, brilho laranja, estrelas, prédios e postes. Camadas com parallax (desligado no movimento reduzido).
export function desenharCenario(scene: Phaser.Scene, cores: Cores, larguraMundo: number, reduzido: boolean) {
  const H = PISTA.altura * PISTA.celula;
  const cam = scene.cameras.main;
  const vista = Math.max(cam.width, 1200) * 2;

  const ceu = scene.add.graphics().setScrollFactor(0).setDepth(-100);
  ceu.fillStyle(cores.ceu, 1).fillRect(0, 0, vista, vista);
  // Brilho laranja suave num canto.
  for (let i = 8; i > 0; i--) ceu.fillStyle(cores.laranja, 0.025).fillCircle(vista * 0.42, vista * 0.02 + 40, 70 * i);

  const r = sorteio(larguraMundo);
  const estrelas = scene.add.graphics().setScrollFactor(reduzido ? 0 : 0.05).setDepth(-90);
  for (let i = 0; i < 26; i++) estrelas.fillStyle(cores.creme, 0.35 + r() * 0.4).fillCircle(r() * vista, r() * H * 0.55, r() < 0.2 ? 1.6 : 1);

  const camadas = [
    { fator: 0.2, cor: cores.azul, alfa: 0.55, alturaMin: 3, alturaMax: 8 },
    { fator: 0.45, cor: cores.noite, alfa: 0.7, alturaMin: 2, alturaMax: 6 },
  ];
  for (const c of camadas) {
    const g = scene.add.graphics().setScrollFactor(reduzido ? 1 : c.fator, 1).setDepth(-80 + c.fator * 10);
    const total = larguraMundo * c.fator + vista;
    let x = -100;
    while (x < total) {
      const w = (2 + Math.floor(r() * 4)) * PISTA.celula;
      const h = (c.alturaMin + Math.floor(r() * (c.alturaMax - c.alturaMin))) * PISTA.celula;
      g.fillStyle(c.cor, c.alfa).fillRect(x, H - h, w, h);
      // Janelas acesas, poucas.
      for (let j = 0; j < 3; j++) if (r() < 0.5) g.fillStyle(cores.laranjaClaro, 0.35).fillRect(x + 6 + r() * (w - 16), H - h + 8 + r() * (h - 24), 5, 7);
      x += w + r() * 40;
    }
  }

  // Postes com luz quente, na frente dos prédios.
  const postes = scene.add.graphics().setScrollFactor(reduzido ? 1 : 0.7, 1).setDepth(-60);
  for (let x = 120; x < larguraMundo * 0.7 + vista; x += 260 + r() * 120) {
    postes.fillStyle(cores.noite, 0.9).fillRect(x, H - 6.5 * PISTA.celula, 4, 6.5 * PISTA.celula);
    postes.fillRect(x - 10, H - 6.5 * PISTA.celula, 18, 4);
    for (let i = 5; i > 0; i--) postes.fillStyle(cores.laranjaClaro, 0.05).fillCircle(x - 6, H - 6.3 * PISTA.celula, 10 * i);
    postes.fillStyle(cores.laranjaClaro, 0.9).fillCircle(x - 6, H - 6.3 * PISTA.celula + 4, 4);
  }
}

function poligono(g: Phaser.GameObjects.Graphics, f: Forma) {
  g.beginPath();
  g.moveTo(f.pontos[0].x, f.pontos[0].y);
  for (let i = 1; i < f.pontos.length; i++) g.lineTo(f.pontos[i].x, f.pontos[i].y);
  g.closePath();
}

// Peças da pista. Mesma função no editor e no jogo.
export function desenharPista(g: Phaser.GameObjects.Graphics, pista: Pista, cores: Cores) {
  g.clear();
  const formas = formasDaPista(pista);
  for (const f of formas) {
    g.fillStyle(f.grind ? cores.creme : cores.cremeEscuro, f.tipo === "rail" || f.tipo === "rail_down" ? 1 : 0.92);
    poligono(g, f);
    g.fillPath();
    g.lineStyle(1.5, cores.linhaForte, 1);
    poligono(g, f);
    g.strokePath();
  }
  // Detalhe laranja-claro nas bordas grindáveis (aresta de cima).
  for (const f of formas.filter((x) => x.grind)) {
    const topo = [...f.pontos].sort((a, b) => a.y - b.y).slice(0, 2).sort((a, b) => a.x - b.x);
    g.lineStyle(3, cores.laranjaClaro, 1).lineBetween(topo[0].x, topo[0].y, topo[1].x, topo[1].y);
  }
  for (const p of pista.pieces) desenharEnfeite(g, p, cores);
}

function desenharEnfeite(g: Phaser.GameObjects.Graphics, p: Peca, cores: Cores) {
  const c = PISTA.celula;
  const m = (u: number, v: number) => paraMundo(p, u, v);
  switch (p.type) {
    case "rail": {
      for (const u of [0.3, 2.7]) {
        const a = m(u, 0);
        const b = m(u, 0.62);
        g.lineStyle(3, cores.linhaForte, 1).lineBetween(a.x, a.y, b.x, b.y);
      }
      break;
    }
    case "rail_down": {
      for (const [u, v] of [[0.3, 4.3], [2.7, 1.9]]) {
        const a = m(u, v - 1.1);
        const b = m(u, v);
        g.lineStyle(3, cores.linhaForte, 1).lineBetween(a.x, a.y, b.x, b.y);
      }
      break;
    }
    case "bench": {
      for (const u of [0.25, 1.75]) {
        const a = m(u, 0);
        const b = m(u, 0.45);
        g.lineStyle(4, cores.linhaForte, 1).lineBetween(a.x, a.y, b.x, b.y);
      }
      break;
    }
    case "gap": {
      const a = m(0, 0);
      g.fillStyle(cores.noite, 0.6).fillRect(Math.min(a.x, m(PECAS.gap.w, 0).x), a.y - 6, PECAS.gap.w * c, 6);
      break;
    }
    case "start":
    case "finish": {
      const base = m(1, 1);
      g.lineStyle(3, cores.linhaForte, 1).lineBetween(base.x, base.y, base.x, base.y - 2 * c);
      const cor = p.type === "start" ? cores.laranjaClaro : cores.laranja;
      g.fillStyle(cor, 1).fillTriangle(base.x, base.y - 2 * c, base.x + 22, base.y - 2 * c + 8, base.x, base.y - 2 * c + 16);
      break;
    }
  }
}

// Skatista: arte própria, bem simples (gorro laranja, moletom creme, shape escuro).
export function desenharSkatista(scene: Phaser.Scene, cores: Cores) {
  const r = PISTA.celula * 0.38;
  const corpo = scene.add.graphics();
  corpo.fillStyle(cores.creme, 1).fillRoundedRect(-6, -r - 26, 12, 20, 4); // tronco
  corpo.lineStyle(3, cores.areia, 1).lineBetween(-3, -r - 7, -6, -r + 2).lineBetween(3, -r - 7, 6, -r + 2); // pernas
  corpo.fillStyle(cores.areia, 1).fillCircle(0, -r - 32, 6); // cabeça
  corpo.fillStyle(cores.laranja, 1).fillRoundedRect(-7, -r - 39, 14, 6, 3); // gorro
  const shape = scene.add.graphics();
  shape.fillStyle(cores.noite, 1).fillRoundedRect(-14, -3, 28, 5, 2);
  shape.fillStyle(cores.laranjaClaro, 1).fillCircle(-9, 4, 2.5).fillCircle(9, 4, 2.5);
  // O container fica no centro da roda (corpo físico); o shape encosta embaixo.
  shape.y = r - 6;
  corpo.y = 2 * r - 8;
  const c = scene.add.container(0, 0, [corpo, shape]);
  return { container: c, corpo, shape };
}
