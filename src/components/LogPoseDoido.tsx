"use client";

import { mandarProRanking } from "@/lib/enviarRecorde";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  AVISO_LOGPOSE,
  H,
  MILHAS_POR_NIVEL,
  NAVIO_R,
  NIVEL_MAX,
  VIDAS,
  W,
  avisandoGiro,
  frasesMorte,
  girar,
  milhas,
  novoEstado,
  pontos,
  rank,
  step,
  type Estado,
  type Rei,
} from "@/lib/logpose";

type Fase = "menu" | "jogando" | "pausado" | "morto";
type Gota = { x: number; y: number; vx: number; vy: number; vida: number; cor: string };

const CHAVE_RECORDE = "log-pose-doido:recorde";
const TECLAS: Record<string, [number, number]> = {
  ArrowUp: [0, -1],
  KeyW: [0, -1],
  ArrowDown: [0, 1],
  KeyS: [0, 1],
  ArrowLeft: [-1, 0],
  KeyA: [-1, 0],
  ArrowRight: [1, 0],
  KeyD: [1, 0],
};
const SETAS = ["↑", "→", "↓", "←"];

function lerRecorde() {
  try {
    return Number(localStorage.getItem(CHAVE_RECORDE)) || 0;
  } catch {
    return 0;
  }
}

function salvarRecorde(p: number) {
  try {
    localStorage.setItem(CHAVE_RECORDE, String(p));
  } catch {
    // Sem storage: o recorde vale só nesta visita.
  }
  mandarProRanking("log-pose-doido", p);
}

// Pra onde a seta ↑ leva agora, como seta.
function cimaVira(rot: number) {
  const [x, y] = girar(0, -1, rot);
  if (y < 0) return SETAS[0];
  if (x > 0) return SETAS[1];
  if (y > 0) return SETAS[2];
  return SETAS[3];
}

// ---------- desenho ----------

function mar(ctx: CanvasRenderingContext2D, e: Estado) {
  ctx.fillStyle = "#0d4f73";
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = "rgba(255,255,255,0.13)";
  ctx.lineWidth = 2;
  const off = e.dist % 120;
  for (let row = 0; row < 10; row++) {
    const y = 22 + row * 46;
    const desloc = row % 2 ? 60 : 0;
    for (let x = -off - desloc; x < W + 60; x += 120) {
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(x + 10, y - 6 + Math.sin(e.tempo * 2 + row) * 2, x + 20, y);
      ctx.quadraticCurveTo(x + 30, y + 6, x + 40, y);
      ctx.stroke();
    }
  }
}

function tempestades(ctx: CanvasRenderingContext2D, e: Estado) {
  for (const c of e.coisas) {
    if (c.tipo !== "tempestade") continue;
    const sx = c.x - e.dist;
    if (sx > W || sx + c.w < 0) continue;
    const g = ctx.createLinearGradient(sx, 0, sx + c.w, 0);
    g.addColorStop(0, "rgba(10,14,30,0)");
    g.addColorStop(0.12, "rgba(10,14,30,0.5)");
    g.addColorStop(0.88, "rgba(10,14,30,0.5)");
    g.addColorStop(1, "rgba(10,14,30,0)");
    ctx.fillStyle = g;
    ctx.fillRect(sx, 0, c.w, H);
    // Chuva inclinada pro lado do vento.
    ctx.save();
    ctx.beginPath();
    ctx.rect(Math.max(0, sx), 0, Math.min(W, sx + c.w) - Math.max(0, sx), H);
    ctx.clip();
    ctx.strokeStyle = "rgba(190,215,255,0.35)";
    ctx.lineWidth = 1.5;
    const inc = c.vento > 0 ? 6 : -6;
    for (let i = 0; i < 70; i++) {
      const rx = (((i * 137.5 + c.x) % c.w) + c.w) % c.w + sx;
      const ry = (i * 61 + e.tempo * 520 * (c.vento > 0 ? 1 : -1)) % (H + 40);
      const y = ry < 0 ? ry + H + 40 : ry;
      ctx.beginPath();
      ctx.moveTo(rx, y - 20);
      ctx.lineTo(rx - 4, y - 20 + inc * 3);
      ctx.stroke();
    }
    // Setas do vento.
    ctx.fillStyle = "rgba(220,235,255,0.35)";
    for (let wx = sx + 80; wx < sx + c.w - 40; wx += 200) {
      ctx.save();
      ctx.translate(wx, H / 2 + Math.sin(e.tempo * 3 + wx) * 30);
      if (c.vento < 0) ctx.scale(1, -1);
      ctx.beginPath();
      ctx.moveTo(-8, -18);
      ctx.lineTo(8, -18);
      ctx.lineTo(8, 4);
      ctx.lineTo(18, 4);
      ctx.lineTo(0, 22);
      ctx.lineTo(-18, 4);
      ctx.lineTo(-8, 4);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  }
}

function redemoinho(ctx: CanvasRenderingContext2D, sx: number, y: number, r: number, tempo: number) {
  ctx.save();
  ctx.translate(sx, y);
  const g = ctx.createRadialGradient(0, 0, 2, 0, 0, r * 2.2);
  g.addColorStop(0, "rgba(1,18,30,0.95)");
  g.addColorStop(0.18, "rgba(5,40,66,0.8)");
  g.addColorStop(1, "rgba(13,79,115,0)");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, r * 2.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.rotate(tempo * 3);
  ctx.strokeStyle = "rgba(200,235,255,0.6)";
  ctx.lineWidth = 3;
  for (let b = 0; b < 3; b++) {
    ctx.beginPath();
    for (let i = 0; i <= 40; i++) {
      const a = i * 0.16 + (b * Math.PI * 2) / 3;
      const rr = r * 1.6 * (1 - i / 44);
      const px = Math.cos(a) * rr;
      const py = Math.sin(a) * rr;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
  }
  ctx.restore();
}

function moeda(ctx: CanvasRenderingContext2D, sx: number, y: number, tempo: number) {
  const larg = Math.abs(Math.cos(tempo * 4 + sx * 0.02)) * 9 + 2;
  ctx.fillStyle = "#f2c230";
  ctx.strokeStyle = "#01121e";
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.ellipse(sx, y, larg, 11, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
}

function reparo(ctx: CanvasRenderingContext2D, sx: number, y: number, tempo: number) {
  ctx.save();
  ctx.translate(sx, y + Math.sin(tempo * 3) * 3);
  ctx.fillStyle = "#a8743f";
  ctx.strokeStyle = "#01121e";
  ctx.lineWidth = 2.5;
  ctx.fillRect(-14, -14, 28, 28);
  ctx.strokeRect(-14, -14, 28, 28);
  ctx.fillStyle = "#ff5a4a";
  ctx.fillRect(-3, -9, 6, 18);
  ctx.fillRect(-9, -3, 18, 6);
  ctx.restore();
}

function raios(ctx: CanvasRenderingContext2D, e: Estado) {
  for (const r of e.raios) {
    const sx = r.x - e.dist;
    if (r.t > 0) {
      // Alvo piscando, cada vez mais rápido.
      const pisca = Math.sin((1 - r.t) * (10 + (1 - r.t) * 30)) > 0;
      ctx.strokeStyle = pisca ? "rgba(255,240,120,0.95)" : "rgba(255,240,120,0.4)";
      ctx.lineWidth = 3;
      ctx.setLineDash([8, 6]);
      ctx.beginPath();
      ctx.arc(sx, r.y, 36, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    } else {
      ctx.globalAlpha = Math.max(0, r.aceso / 0.3);
      ctx.fillStyle = "rgba(255,250,200,0.5)";
      ctx.beginPath();
      ctx.arc(sx, r.y, 46, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#fff6a8";
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(sx + 10, 0);
      let px = sx + 10;
      for (let y = 30; y < r.y; y += 30) {
        px += (((y * 7919) % 13) - 6) * 3;
        ctx.lineTo(px, y);
      }
      ctx.lineTo(sx, r.y);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }
}

function reiDoMar(ctx: CanvasRenderingContext2D, rei: Rei, tempo: number) {
  if (rei.aviso > 0) {
    // Bolhas e faixa vermelha marcando a linha do ataque.
    const a = 0.25 + 0.2 * Math.sin(tempo * 18);
    ctx.fillStyle = `rgba(255,70,60,${a})`;
    ctx.fillRect(0, rei.y - 26, W, 52);
    ctx.fillStyle = "rgba(220,240,255,0.8)";
    for (let i = 0; i < 14; i++) {
      const bx = W - ((i * 57 + tempo * 140) % W);
      const by = rei.y + Math.sin(i * 2.3 + tempo * 6) * 18;
      ctx.beginPath();
      ctx.arc(bx, by, 3 + (i % 3), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = "#ff3b2f";
    ctx.font = "700 34px system-ui";
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    ctx.fillText("!", W - 14, rei.y);
    return;
  }
  // Corpo: serpente grossa da cabeça até a borda direita.
  const ondaY = (x: number) => rei.y + Math.sin(x * 0.03 + tempo * 10) * 8;
  ctx.lineCap = "round";
  ctx.strokeStyle = "#01121e";
  ctx.lineWidth = 50;
  ctx.beginPath();
  for (let x = rei.cabeca; x <= W + 60; x += 10) ctx.lineTo(x, ondaY(x));
  ctx.stroke();
  ctx.strokeStyle = "#6a3fa0";
  ctx.lineWidth = 44;
  ctx.stroke();
  ctx.strokeStyle = "#f2a66e";
  ctx.lineWidth = 12;
  ctx.beginPath();
  for (let x = rei.cabeca; x <= W + 60; x += 10) ctx.lineTo(x, ondaY(x) + 12);
  ctx.stroke();
  // Escamas
  ctx.fillStyle = "#8b5cc4";
  for (let x = rei.cabeca + 40; x < W + 40; x += 34) {
    ctx.beginPath();
    ctx.arc(x, ondaY(x) - 8, 7, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.lineCap = "butt";
  // Cabeça
  ctx.save();
  ctx.translate(rei.cabeca, ondaY(rei.cabeca));
  ctx.fillStyle = "#6a3fa0";
  ctx.strokeStyle = "#01121e";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.ellipse(-10, 0, 46, 30, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  // Boca aberta com dentes
  ctx.fillStyle = "#3a0d1a";
  ctx.beginPath();
  ctx.moveTo(-58, 0);
  ctx.lineTo(-18, -12);
  ctx.lineTo(-18, 12);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#fff";
  for (const dx of [-48, -38, -28]) {
    ctx.beginPath();
    ctx.moveTo(dx, -9 + (dx + 58) * 0.06);
    ctx.lineTo(dx + 4, -1);
    ctx.lineTo(dx + 8, -9 + (dx + 58) * 0.06);
    ctx.fill();
  }
  // Olho bravo
  ctx.fillStyle = "#ffd23f";
  ctx.beginPath();
  ctx.arc(-4, -14, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#01121e";
  ctx.fillRect(-6, -20, 3, 12);
  ctx.restore();
}

function navio(ctx: CanvasRenderingContext2D, e: Estado, morto: boolean) {
  if (e.invulneravel > 0 && !morto && Math.floor(e.tempo * 14) % 2 === 0) return;
  ctx.save();
  ctx.translate(e.x, e.y);
  // Aponta pra onde está indo (com o mar empurrando pra frente).
  const ang = Math.atan2(e.vy, e.vx + 140);
  ctx.rotate(morto ? ang + e.tempo * 6 : ang);
  // Esteira
  ctx.fillStyle = "rgba(255,255,255,0.35)";
  ctx.beginPath();
  ctx.moveTo(-NAVIO_R - 4, -6);
  ctx.lineTo(-NAVIO_R - 26, -12);
  ctx.lineTo(-NAVIO_R - 26, 12);
  ctx.lineTo(-NAVIO_R - 4, 6);
  ctx.fill();
  // Casco
  ctx.fillStyle = "#8a5a2b";
  ctx.strokeStyle = "#01121e";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(NAVIO_R + 10, 0);
  ctx.quadraticCurveTo(NAVIO_R, -13, -NAVIO_R, -11);
  ctx.lineTo(-NAVIO_R, 11);
  ctx.quadraticCurveTo(NAVIO_R, 13, NAVIO_R + 10, 0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Tábuas
  ctx.strokeStyle = "#5e3b17";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(-NAVIO_R + 2, -4);
  ctx.lineTo(NAVIO_R + 2, -4);
  ctx.moveTo(-NAVIO_R + 2, 4);
  ctx.lineTo(NAVIO_R + 2, 4);
  ctx.stroke();
  // Vela vista de cima
  ctx.fillStyle = "#ece3be";
  ctx.strokeStyle = "#01121e";
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(2, -17);
  ctx.quadraticCurveTo(10, 0, 2, 17);
  ctx.lineTo(-2, 17);
  ctx.lineTo(-2, -17);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Caveirinha na vela
  ctx.fillStyle = "#01121e";
  ctx.beginPath();
  ctx.arc(3, 0, 3.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function logPoseHud(ctx: CanvasRenderingContext2D, e: Estado, fonte: string) {
  const cx = W - 56;
  const cy = 58;
  const aviso = avisandoGiro(e);
  const treme = aviso ? Math.sin(e.tempo * 50) * 0.5 : 0;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.strokeStyle = "#01121e";
  ctx.lineWidth = 3;
  // Pulseira atrás
  ctx.fillStyle = "#6b4423";
  ctx.fillRect(-48, 18, 96, 16);
  ctx.strokeRect(-48, 18, 96, 16);
  ctx.fillStyle = "#c9a227";
  ctx.fillRect(-4, 20, 8, 12);
  // Base de madeira
  ctx.fillStyle = "#8a5a2b";
  ctx.beginPath();
  ctx.ellipse(0, 22, 26, 9, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  // Bolha de vidro
  const vidro = ctx.createRadialGradient(-9, -12, 3, 0, 0, 32);
  vidro.addColorStop(0, "rgba(255,255,255,0.95)");
  vidro.addColorStop(0.35, "rgba(190,230,250,0.85)");
  vidro.addColorStop(1, aviso ? "rgba(255,140,120,0.9)" : "rgba(120,190,225,0.9)");
  ctx.fillStyle = vidro;
  ctx.beginPath();
  ctx.arc(0, -6, 28, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = 3.5;
  ctx.stroke();
  // Agulha flutuando dentro: aponta pra onde o ↑ leva.
  ctx.save();
  ctx.translate(0, -6);
  const [nx, ny] = girar(0, -1, e.logPose.rot);
  ctx.rotate(Math.atan2(ny, nx) + Math.PI / 2 + treme);
  ctx.lineWidth = 2;
  ctx.fillStyle = "#ff3b2f";
  ctx.beginPath();
  ctx.moveTo(0, -22);
  ctx.lineTo(5, 0);
  ctx.lineTo(-5, 0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#3a4a55";
  ctx.beginPath();
  ctx.moveTo(0, 18);
  ctx.lineTo(5, 0);
  ctx.lineTo(-5, 0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#c9a227";
  ctx.beginPath();
  ctx.arc(0, 0, 3.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
  // Brilho do vidro por cima
  ctx.strokeStyle = "rgba(255,255,255,0.8)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(0, -6, 21, Math.PI * 1.1, Math.PI * 1.45);
  ctx.stroke();
  ctx.restore();

  ctx.font = `700 15px ${fonte}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.lineWidth = 4;
  ctx.strokeStyle = "#01121e";
  const t = aviso ? "vai girar!" : `↑ = ${cimaVira(e.logPose.rot)}`;
  ctx.strokeText(t, cx, cy + 44);
  ctx.fillStyle = aviso ? "#ff8a7a" : "#ece3be";
  ctx.fillText(t, cx, cy + 44);
}

function hud(ctx: CanvasRenderingContext2D, e: Estado, recorde: number, fonte: string) {
  const mi = milhas(e.dist);
  ctx.textBaseline = "top";
  ctx.textAlign = "left";
  ctx.lineWidth = 5;
  ctx.strokeStyle = "#01121e";
  ctx.fillStyle = "#ece3be";
  ctx.font = `700 24px ${fonte}`;
  ctx.strokeText(`${mi} milhas`, 18, 14);
  ctx.fillText(`${mi} milhas`, 18, 14);
  ctx.font = `700 16px ${fonte}`;
  const prox = e.nivel < NIVEL_MAX ? ` · ${e.nivel * MILHAS_POR_NIVEL - mi} pro próximo` : " · máximo";
  ctx.strokeText(`nível ${e.nivel}${prox}`, 18, 44);
  ctx.fillText(`nível ${e.nivel}${prox}`, 18, 44);
  // Vidas (cascos) e moedas
  for (let i = 0; i < VIDAS; i++) {
    const x = 28 + i * 30;
    const y = 82;
    ctx.fillStyle = i < e.vidas ? "#8a5a2b" : "rgba(255,255,255,0.15)";
    ctx.strokeStyle = "#01121e";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(x - 12, y - 4);
    ctx.lineTo(x + 12, y - 4);
    ctx.lineTo(x + 7, y + 8);
    ctx.lineTo(x - 7, y + 8);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
  ctx.fillStyle = "#f2c230";
  ctx.beginPath();
  ctx.arc(28 + VIDAS * 30 + 6, 84, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.font = `700 16px ${fonte}`;
  ctx.lineWidth = 4;
  ctx.strokeText(`${e.moedas}`, 28 + VIDAS * 30 + 20, 75);
  ctx.fillStyle = "#ece3be";
  ctx.fillText(`${e.moedas}`, 28 + VIDAS * 30 + 20, 75);

  if (recorde > 0) {
    ctx.textAlign = "right";
    ctx.font = `700 14px ${fonte}`;
    const t = `recorde ${recorde}`;
    ctx.strokeText(t, W - 110, 14);
    ctx.fillStyle = "#f2a66e";
    ctx.fillText(t, W - 110, 14);
  }

  logPoseHud(ctx, e, fonte);

  // Avisos grandes no meio: nível novo e Log Pose girado.
  const aviso = (texto: string, sub: string, desde: number, cor: string) => {
    if (desde >= 1.8 || e.morto) return;
    const a = desde < 0.2 ? desde / 0.2 : desde > 1.4 ? (1.8 - desde) / 0.4 : 1;
    const esc = 0.8 + 0.2 * Math.min(1, desde / 0.2);
    ctx.save();
    ctx.globalAlpha = Math.max(0, a);
    ctx.translate(W / 2, H / 2 - 30);
    ctx.scale(esc, esc);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `700 46px ${fonte}`;
    ctx.lineWidth = 8;
    ctx.strokeStyle = "#01121e";
    ctx.strokeText(texto, 0, 0);
    ctx.fillStyle = cor;
    ctx.fillText(texto, 0, 0);
    ctx.font = `700 22px ${fonte}`;
    ctx.lineWidth = 5;
    ctx.strokeText(sub, 0, 44);
    ctx.fillStyle = "#ece3be";
    ctx.fillText(sub, 0, 44);
    ctx.restore();
  };
  const desdeGiro = e.tempo - e.logPose.giradaEm;
  const desdeNivel = e.tempo - e.nivelEm;
  if (desdeGiro < 1.8) {
    const rot = e.logPose.rot;
    const sub = rot === 0 ? "voltou ao normal. por enquanto." : rot === 2 ? "tudo invertido!" : `agora ↑ leva pra ${cimaVira(rot)}`;
    aviso("O Log Pose mudou de ideia!", sub, desdeGiro, "#ffd23f");
  } else if (desdeNivel < 1.8) {
    aviso(`Nível ${e.nivel}!`, e.nivel === NIVEL_MAX ? "nível máximo. boa sorte." : "mar mais bravo", desdeNivel, "#9fe3ff");
  }
}

// ---------- componente ----------

export function LogPoseDoido() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const caixaRef = useRef<HTMLDivElement>(null);
  // Rand fixo na renderização (o Next não aceita Math.random() aqui); cada partida sorteia o seu.
  const estado = useRef<Estado>(novoEstado(() => 0.5));
  const teclas = useRef(new Set<string>());
  const toque = useRef<{ x: number; y: number } | null>(null);
  const gotas = useRef<Gota[]>([]);
  const fase = useRef<Fase>("menu");
  const morteEm = useRef(0);
  const recorde = useRef(0);
  const [faseUi, setFaseUi] = useState<Fase>("menu");
  const [fim, setFim] = useState<{ pts: number; mi: number; moedas: number; nivel: number; frase: string; novo: boolean; recorde: number } | null>(null);

  const mudarFase = useCallback((f: Fase) => {
    fase.current = f;
    setFaseUi(f);
  }, []);

  const comecar = useCallback(() => {
    estado.current = novoEstado();
    gotas.current = [];
    setFim(null);
    mudarFase("jogando");
  }, [mudarFase]);

  const apertar = useCallback(() => {
    const f = fase.current;
    if (f === "pausado") mudarFase("jogando");
    else if (f === "menu") comecar();
    else if (f === "morto" && performance.now() - morteEm.current > 700) comecar();
  }, [comecar, mudarFase]);

  useEffect(() => {
    recorde.current = lerRecorde();
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    const fonte = getComputedStyle(document.body).getPropertyValue("--font-fredoka").trim() || "system-ui";

    let raf = 0;
    let antes = performance.now();
    let sacode = 0;
    let vidasAntes = VIDAS;

    const entrada = () => {
      const e = estado.current;
      if (toque.current) {
        // Toque/mouse: "rema" na direção do dedo (e o Log Pose gira isso também).
        const dx = toque.current.x - e.x;
        const dy = toque.current.y - e.y;
        const d = Math.hypot(dx, dy);
        if (d < 12) return { x: 0, y: 0 };
        const k = Math.min(1, d / 60) / d;
        return { x: dx * k, y: dy * k };
      }
      let x = 0;
      let y = 0;
      for (const c of teclas.current) {
        const t = TECLAS[c];
        if (t) {
          x += t[0];
          y += t[1];
        }
      }
      return { x: Math.sign(x), y: Math.sign(y) };
    };

    const frame = (agora: number) => {
      const dt = Math.min(1 / 30, (agora - antes) / 1000);
      antes = agora;
      const e = estado.current;
      const f = fase.current;

      if (f === "jogando") {
        step(e, dt, entrada());
        if (e.vidas < vidasAntes) {
          sacode = 0.3;
          for (let i = 0; i < 16; i++) {
            const a = Math.random() * Math.PI * 2;
            const v = 80 + Math.random() * 200;
            gotas.current.push({ x: e.x, y: e.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, vida: 0.7, cor: i % 2 ? "#8a5a2b" : "#e9f3ff" });
          }
        }
        vidasAntes = e.vidas;
        if (e.morto) {
          sacode = 0.45;
          const p = pontos(e);
          const novo = p > recorde.current;
          if (novo) {
            recorde.current = p;
            salvarRecorde(p);
          }
          const frases = frasesMorte[e.causa ?? "redemoinho"];
          setFim({
            pts: p,
            mi: milhas(e.dist),
            moedas: e.moedas,
            nivel: e.nivel,
            frase: frases[Math.floor(Math.random() * frases.length)],
            novo,
            recorde: recorde.current,
          });
          morteEm.current = performance.now();
          mudarFase("morto");
        }
      } else if (f !== "pausado") {
        e.tempo += dt;
        if (f === "menu") {
          // Abertura: o mar anda sozinho com o navio balançando.
          e.dist += 80 * dt;
          e.y = H / 2 + Math.sin(e.tempo * 1.5) * 30;
          e.vy = Math.cos(e.tempo * 1.5) * 45;
        }
      }
      if (f !== "pausado") {
        for (const g of gotas.current) {
          g.x += g.vx * dt;
          g.y += g.vy * dt;
          g.vx *= 1 - 2 * dt;
          g.vy *= 1 - 2 * dt;
          g.vida -= dt;
        }
        gotas.current = gotas.current.filter((g) => g.vida > 0);
      }
      sacode = Math.max(0, sacode - dt);

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (sacode > 0) ctx.translate((Math.random() - 0.5) * 40 * sacode, (Math.random() - 0.5) * 40 * sacode);
      mar(ctx, e);
      for (const c of e.coisas) {
        const sx = c.x - e.dist;
        if (c.tipo === "redemoinho") redemoinho(ctx, sx, c.y, c.r, e.tempo);
      }
      tempestades(ctx, e);
      for (const c of e.coisas) {
        const sx = c.x - e.dist;
        if (c.tipo === "moeda") moeda(ctx, sx, c.y, e.tempo);
        else if (c.tipo === "reparo") reparo(ctx, sx, c.y, e.tempo);
      }
      for (const r of e.reis) if (r.aviso > 0) reiDoMar(ctx, r, e.tempo);
      navio(ctx, e, e.morto);
      for (const r of e.reis) if (r.aviso <= 0) reiDoMar(ctx, r, e.tempo);
      raios(ctx, e);
      for (const g of gotas.current) {
        ctx.globalAlpha = Math.max(0, Math.min(1, g.vida * 2));
        ctx.fillStyle = g.cor;
        ctx.beginPath();
        ctx.arc(g.x, g.y, 3, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      // Tela treme de leve quando o Log Pose está pra girar.
      if (f === "jogando" && avisandoGiro(e)) {
        const k = 1 - (e.logPose.trocaEm - e.tempo) / AVISO_LOGPOSE;
        ctx.fillStyle = `rgba(255,210,63,${0.08 * k})`;
        ctx.fillRect(0, 0, W, H);
      }
      if (f !== "menu") hud(ctx, e, recorde.current, fonte);

      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    const onKeyDown = (ev: KeyboardEvent) => {
      const alvo = ev.target as HTMLElement | null;
      if (alvo && ["INPUT", "TEXTAREA", "SELECT", "BUTTON", "A"].includes(alvo.tagName)) return;
      if (TECLAS[ev.code]) {
        ev.preventDefault();
        teclas.current.add(ev.code);
        if (!ev.repeat && fase.current !== "jogando") apertar();
      } else if (ev.code === "Space" || ev.code === "Enter") {
        ev.preventDefault();
        if (!ev.repeat) apertar();
      } else if (ev.code === "KeyP" || ev.code === "Escape") {
        if (fase.current === "jogando") mudarFase("pausado");
      }
    };
    const onKeyUp = (ev: KeyboardEvent) => {
      teclas.current.delete(ev.code);
    };
    const onVis = () => {
      teclas.current.clear();
      toque.current = null;
      if (fase.current === "jogando") mudarFase("pausado");
    };
    const onVisChange = () => {
      if (document.hidden) onVis();
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onVis);
    document.addEventListener("visibilitychange", onVisChange);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onVis);
      document.removeEventListener("visibilitychange", onVisChange);
    };
  }, [apertar, mudarFase]);

  // Converte a posição do ponteiro pra coordenadas do jogo.
  const ponto = (ev: React.PointerEvent) => {
    const r = caixaRef.current!.getBoundingClientRect();
    return { x: ((ev.clientX - r.left) / r.width) * W, y: ((ev.clientY - r.top) / r.height) * H };
  };

  const r = fim ? rank(fim.pts) : null;

  return (
    <div
      ref={caixaRef}
      className="relative w-full select-none overflow-hidden rounded-lg border-[6px] border-creme bg-noite shadow-[0_10px_30px_rgb(0_0_0/0.35)]"
      style={{ aspectRatio: `${W} / ${H}`, touchAction: "none", WebkitTouchCallout: "none" }}
      onPointerDown={(ev) => {
        if ((ev.target as HTMLElement).closest("button")) return;
        ev.currentTarget.setPointerCapture(ev.pointerId);
        if (fase.current === "jogando") toque.current = ponto(ev);
        else apertar();
      }}
      onPointerMove={(ev) => {
        if (toque.current) toque.current = ponto(ev);
      }}
      onPointerUp={() => (toque.current = null)}
      onPointerCancel={() => (toque.current = null)}
      onContextMenu={(ev) => ev.preventDefault()}
    >
      <canvas ref={canvasRef} className="block h-full w-full" aria-label="Log Pose Doido: jogo de navegar desviando de redemoinhos, raios e reis do mar" />

      {faseUi === "menu" && (
        <div className="absolute inset-0 flex flex-col items-center justify-end gap-3 bg-gradient-to-t from-noite/85 via-noite/20 to-transparent p-5 text-center sm:justify-center sm:bg-noite/40">
          <h2 className="font-titulo text-4xl font-bold leading-none text-creme sm:text-6xl" style={{ textShadow: "3px 3px 0 #01121e" }}>
            Log Pose Doido
          </h2>
          <p className="max-w-md text-sm text-creme sm:text-base">
            Guie o navio com as <strong>setas</strong> (ou segurando o dedo na tela). De vez em quando o Log Pose <strong>gira</strong> e as direções giram junto.
          </p>
          <button type="button" onClick={comecar} className="btn bg-laranja text-noite !px-6 !py-2.5 !text-lg">
            Zarpar
          </button>
          <p className="etiqueta hidden text-[11px] text-creme/70 sm:block">setas ou WASD · P pausa</p>
        </div>
      )}

      {faseUi === "pausado" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-noite/60 text-center">
          <p className="font-titulo text-4xl font-bold text-creme">Pausado</p>
          <p className="text-creme">Toca ou aperta espaço pra continuar.</p>
        </div>
      )}

      {faseUi === "morto" && fim && r && (
        <div className="absolute inset-0 flex items-center justify-center bg-noite/55 p-3">
          <div className="card flex w-full max-w-sm flex-col items-center gap-1.5 !p-4 text-center sm:gap-2 sm:!p-6">
            <span className="etiqueta text-[11px] text-estrela">{fim.novo ? "Novo recorde!" : `recorde ${fim.recorde} pontos`}</span>
            <p className="font-titulo text-4xl font-bold leading-none text-azul sm:text-5xl">{fim.pts} pontos</p>
            <p className="etiqueta text-[11px] text-azul">
              {fim.mi} milhas · {fim.moedas} moedas · nível {fim.nivel}
            </p>
            <p className="font-titulo text-lg font-bold leading-tight sm:text-xl">{r.titulo}</p>
            <p className="hidden text-sm text-tinta sm:block">{r.texto}</p>
            <p className="text-sm italic text-neutro">“{fim.frase}”</p>
            <button type="button" onClick={comecar} className="btn mt-1 bg-laranja text-noite !px-5 !py-2 !text-base">
              Zarpar de novo
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
