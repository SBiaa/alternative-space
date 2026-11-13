import { TRILHAS } from "./config";
import type { Julgamento, Nota } from "./regras";

// Desenho da partida no canvas. Tudo sai do tempo da música (ms), nunca de contagem de quadros.

export const COR = {
  creme: "#ece3be",
  laranja: "#dd5d05",
  laranjaClaro: "#f2a66e",
  poeira: "#c8c3a6",
  linha: "rgba(236, 227, 190, 0.14)",
  alvo: "rgba(236, 227, 190, 0.55)",
};

export type Feedback = { julgamento: Julgamento; ate: number; inicio: number };
export type Particula = { x: number; y: number; vx: number; vy: number; inicio: number };

export type Cena = {
  w: number;
  h: number;
  agora: number;
  quedaMs: number;
  notas: Nota[];
  julgadas: (Julgamento | null)[];
  apertadas: boolean[];
  feedback: (Feedback | null)[];
  particulas: Particula[];
  energiaAtiva: boolean;
  reduzido: boolean;
  fonte: string;
};

export const alturaDoAnel = (h: number) => h * 0.84;

/** Estrela de quatro pontas (curvas côncavas entre as pontas). */
export function estrela4(c: CanvasRenderingContext2D, x: number, y: number, r: number) {
  c.beginPath();
  c.moveTo(x, y - r);
  c.quadraticCurveTo(x, y, x + r, y);
  c.quadraticCurveTo(x, y, x, y + r);
  c.quadraticCurveTo(x, y, x - r, y);
  c.quadraticCurveTo(x, y, x, y - r);
  c.closePath();
}

const TEXTO: Record<Julgamento, string> = { perfeito: "PERFEITO", boa: "BOA", passou: "PASSOU" };

export function desenhar(c: CanvasRenderingContext2D, s: Cena) {
  const { w, h } = s;
  const larg = w / TRILHAS;
  const anel = alturaDoAnel(h);
  c.clearRect(0, 0, w, h);

  if (s.energiaAtiva) {
    c.fillStyle = "rgba(221, 93, 5, 0.08)";
    c.fillRect(0, 0, w, h);
  }

  // Divisões das trilhas.
  c.strokeStyle = COR.linha;
  c.lineWidth = 1;
  for (let i = 1; i < TRILHAS; i++) {
    c.beginPath();
    c.moveTo(Math.round(i * larg) + 0.5, 0);
    c.lineTo(Math.round(i * larg) + 0.5, h);
    c.stroke();
  }

  // Anel do planeta: a linha de acerto.
  c.strokeStyle = COR.laranja;
  c.lineWidth = 3;
  c.beginPath();
  c.ellipse(w / 2, anel, w * 0.54, 12, 0, 0, Math.PI * 2);
  c.stroke();

  // Alvos de cada trilha.
  const rAlvo = Math.min(larg * 0.32, 26);
  for (let i = 0; i < TRILHAS; i++) {
    const x = larg * (i + 0.5);
    c.beginPath();
    c.arc(x, anel, rAlvo, 0, Math.PI * 2);
    if (s.apertadas[i]) {
      c.fillStyle = COR.laranjaClaro;
      c.fill();
    } else {
      c.fillStyle = "rgba(1, 18, 30, 0.6)";
      c.fill();
    }
    c.strokeStyle = s.apertadas[i] ? COR.laranjaClaro : COR.alvo;
    c.lineWidth = 2;
    c.stroke();
  }

  // Notas.
  const rNota = Math.min(larg * 0.3, 24);
  c.fillStyle = COR.creme;
  for (let i = 0; i < s.notas.length; i++) {
    if (s.julgadas[i] === "perfeito" || s.julgadas[i] === "boa") continue;
    const n = s.notas[i];
    const falta = n.t - s.agora;
    if (falta > s.quedaMs * 1.1) break; // em ordem: o resto ainda não apareceu
    const y = anel - (falta / s.quedaMs) * anel;
    if (y > h + rNota) continue;
    c.globalAlpha = s.julgadas[i] === "passou" ? 0.3 : 1;
    estrela4(c, larg * (n.lane + 0.5), y, rNota);
    c.fill();
  }
  c.globalAlpha = 1;

  // Partículas (só sem movimento reduzido).
  if (!s.reduzido) {
    c.fillStyle = COR.laranjaClaro;
    for (const p of s.particulas) {
      const dt = (s.agora - p.inicio) / 1000;
      if (dt < 0 || dt > 0.35) continue;
      c.globalAlpha = 1 - dt / 0.35;
      c.beginPath();
      c.arc(p.x + p.vx * dt, p.y + p.vy * dt, 2.5, 0, Math.PI * 2);
      c.fill();
    }
    c.globalAlpha = 1;
  }

  // Texto e forma do julgamento, acima do alvo.
  c.textAlign = "center";
  c.textBaseline = "middle";
  const tam = Math.max(11, Math.min(15, larg * 0.14));
  c.font = `700 ${tam}px ${s.fonte}`;
  for (let i = 0; i < TRILHAS; i++) {
    const f = s.feedback[i];
    if (!f || s.agora > f.ate) continue;
    const x = larg * (i + 0.5);
    const progresso = (s.agora - f.inicio) / (f.ate - f.inicio);
    const y = anel - rAlvo - 26 - (s.reduzido ? 0 : progresso * 10);
    c.globalAlpha = s.reduzido ? 1 : 1 - progresso * 0.6;
    const cor = f.julgamento === "perfeito" ? COR.laranjaClaro : f.julgamento === "boa" ? COR.creme : COR.poeira;
    c.fillStyle = cor;
    c.strokeStyle = cor;
    c.lineWidth = 2;
    c.fillText(TEXTO[f.julgamento], x, y);
    // Forma: estrela cheia (Perfeito), anel (Boa), X (Passou).
    const fy = y - tam - 4;
    if (f.julgamento === "perfeito") {
      estrela4(c, x, fy, 6);
      c.fill();
    } else if (f.julgamento === "boa") {
      c.beginPath();
      c.arc(x, fy, 5, 0, Math.PI * 2);
      c.stroke();
    } else {
      c.beginPath();
      c.moveTo(x - 4, fy - 4);
      c.lineTo(x + 4, fy + 4);
      c.moveTo(x + 4, fy - 4);
      c.lineTo(x - 4, fy + 4);
      c.stroke();
    }
  }
  c.globalAlpha = 1;
}
