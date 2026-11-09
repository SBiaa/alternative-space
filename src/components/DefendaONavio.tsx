"use client";

import { useCallback, useEffect, useRef, useState, type PointerEvent } from "react";
import {
  CELL,
  COLS,
  GX,
  GY,
  H,
  INIMIGOS,
  MASTROS,
  ONDAS,
  ROTA,
  ROWS,
  TIPOS_TRIP,
  TRIPULANTES,
  W,
  casaEm,
  centro,
  colocar,
  custoMelhoria,
  estrelas,
  iniciarOnda,
  livre,
  melhorar,
  novoEstado,
  step,
  valorVenda,
  vender,
  type Efeito,
  type Estado,
  type Inim,
  type Proj,
  type TipoTrip,
} from "@/lib/navio";

type Fase = "menu" | "jogando";
type Casa = { col: number; row: number };

const CHAVE_RECORDE = "defenda-o-navio:recorde";

function lerRecorde(): number {
  try {
    return Number(localStorage.getItem(CHAVE_RECORDE)) || 0;
  } catch {
    return 0;
  }
}

function salvarRecorde(onda: number) {
  try {
    localStorage.setItem(CHAVE_RECORDE, String(onda));
  } catch {
    // Sem storage: o recorde vale só nesta visita.
  }
}

// ---------- desenho: cenário ----------

const CONVES = { x: GX - 14, y: GY - 14, w: COLS * CELL + 28, h: ROWS * CELL + 28 };

function mar(ctx: CanvasRenderingContext2D, tempo: number) {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, "#0f5d8f");
  g.addColorStop(1, "#073554");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = "rgba(214,222,236,0.18)";
  ctx.lineWidth = 2;
  for (let row = 0; row < 18; row++) {
    const y = 10 + row * 26;
    const off = ((tempo * 14 + row * 37) % 80) - 80;
    for (let x = off + (row % 2) * 40; x < W; x += 80) {
      ctx.beginPath();
      ctx.arc(x + 14, y + 6, 10, Math.PI * 1.15, Math.PI * 1.85);
      ctx.stroke();
    }
  }
}

function conves(ctx: CanvasRenderingContext2D) {
  const { x, y, w, h } = CONVES;
  // Prancha por onde a marinha sobe (esquerda) e casco.
  const entrada = ROTA[1].y;
  ctx.fillStyle = "#8b5a2b";
  ctx.fillRect(0, entrada - 22, x + 4, 44);
  ctx.strokeStyle = "#4a2a12";
  ctx.lineWidth = 2;
  ctx.strokeRect(-2, entrada - 22, x + 6, 44);
  for (let px = 6; px < x; px += 10) {
    ctx.beginPath();
    ctx.moveTo(px, entrada - 22);
    ctx.lineTo(px, entrada + 22);
    ctx.stroke();
  }

  ctx.fillStyle = "#5b3418";
  ctx.beginPath();
  ctx.roundRect(x - 6, y - 6, w + 12, h + 12, 22);
  ctx.fill();
  ctx.fillStyle = "#c18c55";
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 16);
  ctx.fill();

  // Tábuas.
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 16);
  ctx.clip();
  for (let row = 0, py = y; py < y + h; row++, py += 20) {
    ctx.fillStyle = row % 2 ? "#b8814b" : "#c18c55";
    ctx.fillRect(x, py, w, 20);
    ctx.strokeStyle = "rgba(74,42,18,0.45)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x, py);
    ctx.lineTo(x + w, py);
    const desloc = (row * 97) % 140;
    for (let px = x + desloc; px < x + w; px += 140) {
      ctx.moveTo(px, py);
      ctx.lineTo(px, py + 20);
    }
    ctx.stroke();
  }

  // Caminho gasto onde a marinha marcha.
  ctx.lineJoin = "round";
  ctx.lineCap = "butt";
  const linha = () => {
    ctx.beginPath();
    ROTA.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  };
  linha();
  ctx.strokeStyle = "#6e4220";
  ctx.lineWidth = 54;
  ctx.stroke();
  linha();
  ctx.strokeStyle = "#9a6534";
  ctx.lineWidth = 44;
  ctx.stroke();
  linha();
  ctx.setLineDash([6, 12]);
  ctx.strokeStyle = "rgba(74,42,18,0.35)";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();

  // Amurada.
  ctx.strokeStyle = "#3d220e";
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.roundRect(x - 3, y - 3, w + 6, h + 6, 19);
  ctx.stroke();
  ctx.fillStyle = "#3d220e";
  for (let px = x + 20; px < x + w - 10; px += 48) {
    if (px > x + 40 || Math.abs(y - entrada) > 30) ctx.fillRect(px - 3, y - 9, 6, 8);
    ctx.fillRect(px - 3, y + h + 1, 6, 8);
  }
  // Abertura da prancha na amurada.
  ctx.fillStyle = "#9a6534";
  ctx.fillRect(x - 8, entrada - 22, 14, 44);

  // Mastros.
  for (const [c, r] of MASTROS) {
    const p = centro(c, r);
    ctx.fillStyle = "rgba(0,0,0,0.25)";
    ctx.beginPath();
    ctx.ellipse(p.x + 4, p.y + 6, 22, 14, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#d8c08a";
    ctx.beginPath();
    ctx.arc(p.x, p.y, 21, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#a88b52";
    ctx.lineWidth = 2;
    for (const rr of [17, 13]) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, rr, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.fillStyle = "#5b3418";
    ctx.beginPath();
    ctx.arc(p.x, p.y, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#01121e";
    ctx.stroke();
  }
}

function cabine(ctx: CanvasRenderingContext2D, tempo: number, vidas: number) {
  const fim = ROTA[ROTA.length - 1];
  const x = W - 34;
  const y = fim.y - 70;
  ctx.fillStyle = "#4a2a12";
  ctx.fillRect(x, y, 40, 140);
  ctx.fillStyle = "#7b4a22";
  ctx.fillRect(x + 4, y + 4, 32, 132);
  ctx.strokeStyle = "#01121e";
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, 40, 140);
  // Porta.
  ctx.fillStyle = "#2b1609";
  ctx.beginPath();
  ctx.roundRect(x - 2, fim.y - 26, 22, 52, [10, 10, 0, 0]);
  ctx.fill();
  // Baú do tesouro brilhando na porta.
  const brilho = 0.5 + Math.sin(tempo * 3) * 0.2;
  ctx.fillStyle = `rgba(255,214,90,${vidas > 0 ? brilho : 0.1})`;
  ctx.beginPath();
  ctx.arc(x + 9, fim.y + 8, 18, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#8b4a1c";
  ctx.fillRect(x - 1, fim.y + 2, 20, 14);
  ctx.fillStyle = "#e0a526";
  ctx.fillRect(x - 1, fim.y + 2, 20, 3);
  ctx.fillRect(x + 7, fim.y + 5, 4, 5);
  // Bandeira.
  ctx.strokeStyle = "#01121e";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x + 30, y);
  ctx.lineTo(x + 30, y - 34);
  ctx.stroke();
  ctx.fillStyle = "#01121e";
  ctx.beginPath();
  ctx.moveTo(x + 30, y - 34);
  ctx.lineTo(x + 6, y - 28 + Math.sin(tempo * 5) * 2);
  ctx.lineTo(x + 30, y - 20);
  ctx.fill();
  ctx.fillStyle = "#ece3be";
  ctx.beginPath();
  ctx.arc(x + 22, y - 28, 3, 0, Math.PI * 2);
  ctx.fill();
}

// ---------- desenho: personagens ----------

const PELE = "#f0c08a";

function corpo(ctx: CanvasRenderingContext2D, x: number, y: number, roupa: string, r = 13) {
  ctx.fillStyle = "rgba(0,0,0,0.25)";
  ctx.beginPath();
  ctx.ellipse(x, y + 17, r + 2, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#01121e";
  ctx.lineWidth = 2;
  ctx.fillStyle = roupa;
  ctx.beginPath();
  ctx.ellipse(x, y + 5, r, r * 0.95, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
}

function cabeca(ctx: CanvasRenderingContext2D, x: number, y: number, olhar: number, r = 9, pele = PELE) {
  ctx.fillStyle = pele;
  ctx.strokeStyle = "#01121e";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(x, y - 10, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  const ox = Math.cos(olhar) * 2.5;
  const oy = Math.sin(olhar) * 1.5;
  ctx.fillStyle = "#01121e";
  ctx.beginPath();
  ctx.arc(x - 3 + ox, y - 10 + oy, 1.4, 0, Math.PI * 2);
  ctx.arc(x + 3 + ox, y - 10 + oy, 1.4, 0, Math.PI * 2);
  ctx.fill();
}

export function desenharTrip(
  ctx: CanvasRenderingContext2D,
  tipo: TipoTrip,
  x: number,
  y: number,
  ang: number,
  golpe: number,
  nivel: number,
  tempo: number,
) {
  const k = golpe / 0.25; // 1 logo após atacar, 0 descansando
  switch (tipo) {
    case "espadachim": {
      corpo(ctx, x, y, "#2f7d3a");
      cabeca(ctx, x, y, ang);
      ctx.fillStyle = "#1f5c29";
      ctx.beginPath();
      ctx.arc(x, y - 12, 9.5, Math.PI, 0);
      ctx.fill();
      ctx.fillRect(x + 6, y - 14, 8, 3);
      // Espada balançando no golpe.
      const giro = ang + (k > 0 ? -1.1 + (1 - k) * 2.2 : 0.5);
      ctx.save();
      ctx.translate(x + Math.cos(ang) * 8, y + 4);
      ctx.rotate(giro);
      ctx.strokeStyle = "#01121e";
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(4, 0);
      ctx.lineTo(30, 0);
      ctx.stroke();
      ctx.strokeStyle = "#e6edf0";
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.fillStyle = "#e0a526";
      ctx.fillRect(1, -5, 4, 10);
      ctx.restore();
      break;
    }
    case "atiradora": {
      corpo(ctx, x, y, "#6b3fa0");
      cabeca(ctx, x, y, ang);
      ctx.fillStyle = "#2b1840";
      ctx.beginPath();
      ctx.moveTo(x - 14, y - 14);
      ctx.lineTo(x, y - 26);
      ctx.lineTo(x + 14, y - 14);
      ctx.quadraticCurveTo(x, y - 18, x - 14, y - 14);
      ctx.fill();
      ctx.save();
      ctx.translate(x, y + 3);
      ctx.rotate(ang);
      const recuo = k * 4;
      ctx.fillStyle = "#5b3418";
      ctx.fillRect(-4 - recuo, -3, 14, 6);
      ctx.fillStyle = "#3a3f44";
      ctx.fillRect(8 - recuo, -2, 24, 4);
      ctx.strokeStyle = "#01121e";
      ctx.lineWidth = 1.5;
      ctx.strokeRect(-4 - recuo, -3, 36, 6);
      if (k > 0.6) {
        ctx.fillStyle = "#ffd95a";
        ctx.beginPath();
        ctx.arc(36 - recuo, 0, 6 * k, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
      break;
    }
    case "cozinheiro": {
      corpo(ctx, x, y, "#f4f1e8");
      ctx.fillStyle = "#d6deec";
      ctx.fillRect(x - 6, y + 2, 12, 12);
      cabeca(ctx, x, y, ang);
      // Chapéu de chef.
      ctx.fillStyle = "#ffffff";
      ctx.strokeStyle = "#01121e";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x - 5, y - 24, 6, 0, Math.PI * 2);
      ctx.arc(x + 5, y - 24, 6, 0, Math.PI * 2);
      ctx.arc(x, y - 28, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(x - 8, y - 22, 16, 6);
      ctx.strokeRect(x - 8, y - 22, 16, 6);
      if (k < 0.3) {
        ctx.save();
        ctx.translate(x + Math.cos(ang) * 12, y + 4 + Math.sin(ang) * 6);
        ctx.rotate(ang);
        ctx.fillStyle = "#3a3f44";
        ctx.fillRect(4, -2, 10, 4);
        ctx.beginPath();
        ctx.arc(18, 0, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#01121e";
        ctx.stroke();
        ctx.restore();
      }
      break;
    }
    case "navegadora": {
      ctx.fillStyle = "#e8742a";
      ctx.beginPath();
      ctx.ellipse(x, y - 6, 12, 14, 0, 0, Math.PI * 2);
      ctx.fill();
      corpo(ctx, x, y, "#2a7fb8");
      cabeca(ctx, x, y, ang);
      ctx.fillStyle = "#e8742a";
      ctx.beginPath();
      ctx.arc(x, y - 13, 9.5, Math.PI * 1.05, Math.PI * 1.95);
      ctx.fill();
      // Bastão com nuvenzinha.
      ctx.strokeStyle = "#5b3418";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(x + 14, y + 16);
      ctx.lineTo(x + 14, y - 18);
      ctx.stroke();
      const flut = Math.sin(tempo * 3) * 2;
      ctx.fillStyle = k > 0.3 ? "#fff3a8" : "#c9d6e6";
      ctx.strokeStyle = "#01121e";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(x + 9, y - 30 + flut, 6, 0, Math.PI * 2);
      ctx.arc(x + 16, y - 33 + flut, 7, 0, Math.PI * 2);
      ctx.arc(x + 23, y - 29 + flut, 5, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case "canhoneiro": {
      // Artilheiro atrás do canhão.
      const bx = x - Math.cos(ang) * 10;
      const by = y - Math.sin(ang) * 6;
      corpo(ctx, bx, by, "#a33a2c", 11);
      cabeca(ctx, bx, by, ang, 8);
      ctx.fillStyle = "#7a1f16";
      ctx.beginPath();
      ctx.arc(bx, by - 12, 8.5, Math.PI, 0);
      ctx.fill();
      ctx.save();
      ctx.translate(x + 2, y + 8);
      ctx.rotate(ang);
      const recuo = k * 7;
      ctx.fillStyle = "#2b2f33";
      ctx.strokeStyle = "#01121e";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(-8 - recuo, -8, 34, 16, 6);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#4a5056";
      ctx.fillRect(22 - recuo, -9, 6, 18);
      if (k > 0.6) {
        ctx.fillStyle = "rgba(230,230,230,0.8)";
        ctx.beginPath();
        ctx.arc(34, 0, 10 * k, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
      ctx.fillStyle = "#5b3418";
      ctx.strokeStyle = "#01121e";
      ctx.beginPath();
      ctx.arc(x - 4, y + 14, 5, 0, Math.PI * 2);
      ctx.arc(x + 8, y + 14, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      break;
    }
  }
  // Nível: estrelinhas douradas no pé.
  for (let n = 0; n <= nivel; n++) {
    const sx = x - nivel * 5 + n * 10;
    ctx.fillStyle = "#ffd95a";
    ctx.strokeStyle = "#01121e";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let p = 0; p < 10; p++) {
      const a = -Math.PI / 2 + (p * Math.PI) / 5;
      const rr = p % 2 ? 2 : 4.5;
      ctx.lineTo(sx + Math.cos(a) * rr, y + 25 + Math.sin(a) * rr);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
}

const TAM: Record<Inim["tipo"], number> = { recruta: 11, cabo: 9, sargento: 13, capitao: 17 };

function desenharInim(ctx: CanvasRenderingContext2D, i: Inim, tempo: number) {
  const r = TAM[i.tipo];
  const passo = Math.sin(tempo * (i.tipo === "cabo" ? 22 : 12) + i.id) * 2;
  const x = i.x;
  const y = i.y - 4 + passo;
  const roupa = i.ferido > 0 ? "#ffb3a8" : "#f3f5f7";

  if (i.tipo === "capitao") {
    // Casaco esvoaçando.
    ctx.fillStyle = "#f3f5f7";
    ctx.strokeStyle = "#01121e";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x - r - 2, y - 4);
    ctx.lineTo(x - r - 8 - Math.cos(i.ang) * 6, y + r + 8);
    ctx.lineTo(x + r + 8 - Math.cos(i.ang) * 6, y + r + 8);
    ctx.lineTo(x + r + 2, y - 4);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
  if (i.tipo === "cabo") {
    ctx.strokeStyle = "rgba(255,255,255,0.5)";
    ctx.lineWidth = 2;
    for (let k = 0; k < 3; k++) {
      const bx = x - Math.cos(i.ang) * (r + 6 + k * 3);
      const by = y - Math.sin(i.ang) * (r + 6) + (k - 1) * 5;
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.lineTo(bx - Math.cos(i.ang) * 8, by - Math.sin(i.ang) * 8);
      ctx.stroke();
    }
  }
  corpo(ctx, x, y, roupa, r);
  // Gola de marinheiro.
  ctx.fillStyle = "#1d4fa0";
  ctx.beginPath();
  ctx.moveTo(x - r * 0.7, y - 4);
  ctx.lineTo(x, y + r * 0.5);
  ctx.lineTo(x + r * 0.7, y - 4);
  ctx.closePath();
  ctx.fill();
  if (i.tipo === "capitao") {
    ctx.fillStyle = "#e0a526";
    ctx.fillRect(x - r - 2, y - 5, 8, 4);
    ctx.fillRect(x + r - 6, y - 5, 8, 4);
  }
  const rc = Math.max(8, r * 0.7);
  cabeca(ctx, x, y, i.ang, rc);
  // Quepe.
  ctx.fillStyle = i.tipo === "capitao" ? "#1d3557" : i.tipo === "cabo" ? "#1d4fa0" : "#ffffff";
  ctx.strokeStyle = "#01121e";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(x, y - 10 - rc * 0.75, rc + 2, rc * 0.55, 0, Math.PI, 0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = i.tipo === "capitao" ? "#e0a526" : "#1d3557";
  ctx.fillRect(x - rc - 1, y - 11 - rc * 0.75, (rc + 1) * 2, 3);
  if (i.tipo === "capitao") {
    ctx.strokeStyle = "#01121e";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x - 6, y - 5);
    ctx.quadraticCurveTo(x, y - 9, x + 6, y - 5);
    ctx.stroke();
  }
  if (i.tipo === "sargento") {
    ctx.save();
    ctx.translate(x + Math.cos(i.ang) * (r + 2), y + 4 + Math.sin(i.ang) * 4);
    ctx.rotate(i.ang);
    ctx.fillStyle = "#8d99ae";
    ctx.strokeStyle = "#01121e";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(-3, -12, 7, 24, 3);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#1d4fa0";
    ctx.fillRect(-1, -2, 3, 4);
    ctx.restore();
  }

  // Lento: nuvem de chuva em cima.
  if (i.lento > 0) {
    const cy = y - 10 - rc - 14;
    ctx.fillStyle = "rgba(170,190,215,0.9)";
    ctx.beginPath();
    ctx.arc(x - 5, cy, 5, 0, Math.PI * 2);
    ctx.arc(x + 3, cy - 2, 6, 0, Math.PI * 2);
    ctx.arc(x + 9, cy + 1, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(120,180,255,0.9)";
    ctx.lineWidth = 1.5;
    for (let k = 0; k < 3; k++) {
      const gy = cy + 6 + ((tempo * 40 + k * 5) % 10);
      ctx.beginPath();
      ctx.moveTo(x - 5 + k * 6, gy);
      ctx.lineTo(x - 6 + k * 6, gy + 3);
      ctx.stroke();
    }
  }

  // Vida.
  if (i.vida < i.vidaMax) {
    const bw = r * 2 + 6;
    const by = y - 10 - rc * 2 - 6;
    ctx.fillStyle = "#01121e";
    ctx.fillRect(x - bw / 2 - 1, by - 1, bw + 2, 6);
    ctx.fillStyle = "#ab392f";
    ctx.fillRect(x - bw / 2, by, bw, 4);
    ctx.fillStyle = "#74b53c";
    ctx.fillRect(x - bw / 2, by, bw * Math.max(0, i.vida / i.vidaMax), 4);
  }
}

function desenharProj(ctx: CanvasRenderingContext2D, p: Proj, tempo: number) {
  const k = Math.min(1, p.t / p.dur);
  const x = p.ox + (p.tx - p.ox) * k;
  const yChao = p.oy + (p.ty - p.oy) * k;
  if (p.tipo === "bala") {
    ctx.strokeStyle = "rgba(255,240,200,0.6)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x - (p.tx - p.ox) * 0.08, yChao - (p.ty - p.oy) * 0.08);
    ctx.lineTo(x, yChao);
    ctx.stroke();
    ctx.fillStyle = "#2b2f33";
    ctx.beginPath();
    ctx.arc(x, yChao, 3, 0, Math.PI * 2);
    ctx.fill();
    return;
  }
  const alto = Math.sin(Math.PI * k) * (p.tipo === "panela" ? 40 : 70);
  const y = yChao - alto;
  ctx.fillStyle = "rgba(0,0,0,0.2)";
  ctx.beginPath();
  ctx.ellipse(x, yChao + 6, 7, 3, 0, 0, Math.PI * 2);
  ctx.fill();
  if (p.tipo === "panela") {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(tempo * 12);
    ctx.fillStyle = "#3a3f44";
    ctx.fillRect(4, -2, 10, 4);
    ctx.beginPath();
    ctx.arc(0, 0, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#e8742a";
    ctx.beginPath();
    ctx.arc(0, 0, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  } else {
    ctx.fillStyle = "#15181b";
    ctx.beginPath();
    ctx.arc(x, y, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.4)";
    ctx.beginPath();
    ctx.arc(x - 2, y - 2, 2, 0, Math.PI * 2);
    ctx.fill();
  }
}

function desenharEfeito(ctx: CanvasRenderingContext2D, f: Efeito, fonte: string) {
  const k = f.t / f.dur;
  const a = Math.max(0, 1 - k);
  switch (f.tipo) {
    case "corte":
      ctx.strokeStyle = `rgba(255,255,255,${a})`;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(f.x, f.y, 18, (f.ang ?? 0) - 1 + k * 0.6, (f.ang ?? 0) + 0.4 + k * 0.6);
      ctx.stroke();
      break;
    case "explosao": {
      const r = (f.raio ?? 40) * (0.4 + 0.6 * k);
      ctx.fillStyle = `rgba(255,150,40,${a * 0.55})`;
      ctx.beginPath();
      ctx.arc(f.x, f.y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = `rgba(255,220,120,${a})`;
      ctx.lineWidth = 3;
      ctx.stroke();
      break;
    }
    case "tempestade":
      ctx.strokeStyle = `rgba(150,205,255,${a * 0.7})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(f.x, f.y, 20 + ((f.raio ?? 100) - 20) * k, 0, Math.PI * 2);
      ctx.stroke();
      break;
    case "raio": {
      const x2 = f.x2 ?? f.x;
      const y2 = f.y2 ?? f.y;
      ctx.strokeStyle = `rgba(255,240,140,${a})`;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(f.x, f.y);
      for (let s = 1; s < 5; s++) {
        const px = f.x + ((x2 - f.x) * s) / 5 + (s % 2 ? 6 : -6);
        const py = f.y + ((y2 - f.y) * s) / 5;
        ctx.lineTo(px, py);
      }
      ctx.lineTo(x2, y2);
      ctx.stroke();
      break;
    }
    case "moeda":
      ctx.globalAlpha = a;
      ctx.font = `700 15px ${fonte}`;
      ctx.textAlign = "center";
      ctx.lineWidth = 3;
      ctx.strokeStyle = "#01121e";
      ctx.strokeText(`+${f.valor}`, f.x, f.y - k * 26);
      ctx.fillStyle = "#ffd95a";
      ctx.fillText(`+${f.valor}`, f.x, f.y - k * 26);
      ctx.globalAlpha = 1;
      break;
  }
}

function pilula(ctx: CanvasRenderingContext2D, x: number, y: number, texto: string, fonte: string, icone: (cx: number, cy: number) => void) {
  ctx.font = `700 17px ${fonte}`;
  const w = ctx.measureText(texto).width + 44;
  ctx.fillStyle = "rgba(1,18,30,0.78)";
  ctx.beginPath();
  ctx.roundRect(x, y, w, 32, 16);
  ctx.fill();
  icone(x + 18, y + 16);
  ctx.fillStyle = "#ece3be";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(texto, x + 32, y + 17);
  ctx.textBaseline = "alphabetic";
  return x + w + 8;
}

function hud(ctx: CanvasRenderingContext2D, e: Estado, fonte: string) {
  let x = 12;
  x = pilula(ctx, x, 14, `Onda ${e.onda}/${ONDAS.length}`, fonte, (cx, cy) => {
    ctx.fillStyle = "#d6deec";
    ctx.beginPath();
    ctx.moveTo(cx - 7, cy + 5);
    ctx.lineTo(cx, cy - 7);
    ctx.lineTo(cx, cy + 5);
    ctx.fill();
    ctx.fillRect(cx - 8, cy + 5, 16, 3);
  });
  x = pilula(ctx, x, 14, `${e.vidas}`, fonte, (cx, cy) => {
    ctx.fillStyle = "#e0a526";
    ctx.fillRect(cx - 7, cy - 4, 14, 10);
    ctx.fillStyle = "#8b4a1c";
    ctx.fillRect(cx - 7, cy - 1, 14, 2);
    ctx.fillStyle = "#ffd95a";
    ctx.beginPath();
    ctx.arc(cx, cy - 4, 7, Math.PI, 0);
    ctx.fill();
  });
  pilula(ctx, x, 14, `${e.moedas}`, fonte, (cx, cy) => {
    ctx.fillStyle = "#ffd95a";
    ctx.strokeStyle = "#a8741a";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  });
}

function aviso(ctx: CanvasRenderingContext2D, texto: string, fonte: string, alpha = 1) {
  ctx.globalAlpha = alpha;
  ctx.font = `700 17px ${fonte}`;
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  const w = ctx.measureText(texto).width + 28;
  ctx.fillStyle = "rgba(221,93,5,0.92)";
  ctx.beginPath();
  ctx.roundRect(W - 12 - w, 14, w, 32, 16);
  ctx.fill();
  ctx.fillStyle = "#01121e";
  ctx.fillText(texto, W - 26, 31);
  ctx.textBaseline = "alphabetic";
  ctx.globalAlpha = 1;
}

// ---------- ícone dos botões ----------

function IconeTrip({ tipo }: { tipo: TipoTrip }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current!;
    const ctx = c.getContext("2d")!;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    c.width = 56 * dpr;
    c.height = 56 * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    desenharTrip(ctx, tipo, 28, 30, 0, 0, -1, 0);
  }, [tipo]);
  return <canvas ref={ref} className="h-14 w-14 shrink-0" aria-hidden />;
}

// ---------- componente ----------

type Ui = { moedas: number; vidas: number; onda: number; emOnda: boolean; fim: Estado["fim"]; estrelas: number };
type Escolhido = { id: number; tipo: TipoTrip; nivel: number; melhoria: number | null; venda: number };

function foto(e: Estado): Ui {
  return { moedas: e.moedas, vidas: e.vidas, onda: e.onda, emOnda: e.emOnda, fim: e.fim, estrelas: estrelas(e) };
}

const PLURAL: Record<keyof typeof INIMIGOS, [string, string]> = {
  recruta: ["recruta", "recrutas"],
  cabo: ["cabo ligeiro", "cabos ligeiros"],
  sargento: ["sargento de escudo", "sargentos de escudo"],
  capitao: ["capitão", "capitães"],
};

function descreverOnda(n: number) {
  const grupos = ONDAS[n - 1];
  if (!grupos) return "";
  return grupos.map(([tipo, qtd]) => `${qtd} ${PLURAL[tipo][qtd > 1 ? 1 : 0]}`).join(", ");
}

export function DefendaONavio() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const estado = useRef<Estado>(novoEstado());
  const fase = useRef<Fase>("menu");
  const escolhaRef = useRef<TipoTrip | null>(null);
  const selRef = useRef<number | null>(null);
  const hover = useRef<Casa | null>(null);
  const velRef = useRef(1);
  const pausaRef = useRef(false);
  const bonusAte = useRef(0);
  const recorde = useRef(0);

  const [faseUi, setFaseUi] = useState<Fase>("menu");
  const [ui, setUi] = useState<Ui>(() => foto(novoEstado()));
  const [escolha, setEscolhaUi] = useState<TipoTrip | null>(null);
  const [escolhido, setEscolhido] = useState<Escolhido | null>(null);
  const [vel, setVel] = useState(1);
  const [pausado, setPausado] = useState(false);
  const [recordeUi, setRecordeUi] = useState(0);

  const sincronizar = useCallback(() => {
    const e = estado.current;
    setUi(foto(e));
    const t = e.tripulantes.find((x) => x.id === selRef.current);
    if (!t) {
      selRef.current = null;
      setEscolhido(null);
    } else {
      setEscolhido({ id: t.id, tipo: t.tipo, nivel: t.nivel, melhoria: custoMelhoria(t), venda: valorVenda(t) });
    }
  }, []);

  const escolher = useCallback((tipo: TipoTrip | null) => {
    escolhaRef.current = tipo;
    setEscolhaUi(tipo);
    if (tipo) {
      selRef.current = null;
      setEscolhido(null);
    }
  }, []);

  const selecionar = useCallback(
    (id: number | null) => {
      selRef.current = id;
      if (id !== null) escolher(null);
      sincronizar();
    },
    [escolher, sincronizar],
  );

  const comecar = useCallback(() => {
    estado.current = novoEstado();
    fase.current = "jogando";
    setFaseUi("jogando");
    pausaRef.current = false;
    setPausado(false);
    bonusAte.current = 0;
    escolher("espadachim");
    sincronizar();
  }, [escolher, sincronizar]);

  const proximaOnda = useCallback(() => {
    if (fase.current !== "jogando") return;
    if (iniciarOnda(estado.current)) {
      pausaRef.current = false;
      setPausado(false);
      sincronizar();
    }
  }, [sincronizar]);

  const alternarPausa = useCallback(() => {
    if (fase.current !== "jogando" || estado.current.fim) return;
    pausaRef.current = !pausaRef.current;
    setPausado(pausaRef.current);
  }, []);

  const alternarVel = useCallback(() => {
    velRef.current = velRef.current === 1 ? 2 : 1;
    setVel(velRef.current);
  }, []);

  const tocarCasa = useCallback(
    (x: number, y: number) => {
      if (fase.current !== "jogando") return;
      const e = estado.current;
      const casa = casaEm(x, y);
      if (!casa) {
        selecionar(null);
        return;
      }
      const ali = e.tripulantes.find((t) => t.col === casa.col && t.row === casa.row);
      if (ali) {
        selecionar(ali.id === selRef.current ? null : ali.id);
        return;
      }
      const tipo = escolhaRef.current;
      if (tipo && livre(e, casa.col, casa.row)) {
        if (colocar(e, tipo, casa.col, casa.row)) {
          if (e.moedas < TRIPULANTES[tipo].custo) escolher(null);
          sincronizar();
        }
        return;
      }
      selecionar(null);
    },
    [escolher, selecionar, sincronizar],
  );

  useEffect(() => {
    recorde.current = lerRecorde();
    setRecordeUi(recorde.current);
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    const fonte = getComputedStyle(document.body).getPropertyValue("--font-fredoka").trim() || "system-ui";

    let raf = 0;
    let antes = performance.now();
    let visual = 0; // relógio das animações do cenário
    let ultima = foto(estado.current);

    const frame = (agora: number) => {
      const dt = Math.min(1 / 20, (agora - antes) / 1000);
      antes = agora;
      const e = estado.current;
      const jogando = fase.current === "jogando";
      const parado = !jogando || pausaRef.current || !!e.fim;

      if (!parado) {
        let resto = dt * velRef.current;
        while (resto > 0 && !e.fim) {
          const passo = Math.min(resto, 1 / 60);
          const ondaAntes = e.emOnda;
          step(e, passo);
          if (ondaAntes && !e.emOnda && !e.fim) bonusAte.current = visual + 2.5;
          resto -= passo;
        }
        visual += dt;
      } else if (!pausaRef.current) {
        visual += dt;
      }

      const agoraUi = foto(e);
      if (
        agoraUi.moedas !== ultima.moedas ||
        agoraUi.vidas !== ultima.vidas ||
        agoraUi.onda !== ultima.onda ||
        agoraUi.emOnda !== ultima.emOnda ||
        agoraUi.fim !== ultima.fim
      ) {
        if (agoraUi.fim && !ultima.fim) {
          const marca = agoraUi.fim === "vitoria" ? ONDAS.length + 1 : agoraUi.onda;
          if (marca > recorde.current) {
            recorde.current = marca;
            salvarRecorde(marca);
            setRecordeUi(marca);
          }
        }
        ultima = agoraUi;
        sincronizar();
      }

      // ----- desenho -----
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      mar(ctx, visual);
      conves(ctx);
      cabine(ctx, visual, e.vidas);

      const escolha = escolhaRef.current;
      if (jogando && escolha) {
        // Casas livres marcadas.
        ctx.strokeStyle = "rgba(255,255,255,0.22)";
        ctx.lineWidth = 1.5;
        for (let c = 0; c < COLS; c++)
          for (let r = 0; r < ROWS; r++)
            if (livre(e, c, r)) {
              ctx.beginPath();
              ctx.roundRect(GX + c * CELL + 4, GY + r * CELL + 4, CELL - 8, CELL - 8, 8);
              ctx.stroke();
            }
      }

      const sel = e.tripulantes.find((t) => t.id === selRef.current);
      const alcance = (x: number, y: number, raio: number, minimo = 0) => {
        ctx.fillStyle = "rgba(255,255,255,0.12)";
        ctx.strokeStyle = "rgba(255,255,255,0.7)";
        ctx.setLineDash([6, 6]);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x, y, raio, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        if (minimo) {
          ctx.strokeStyle = "rgba(171,57,47,0.8)";
          ctx.beginPath();
          ctx.arc(x, y, minimo, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.setLineDash([]);
      };
      if (sel) {
        const info = TRIPULANTES[sel.tipo];
        alcance(sel.x, sel.y, info.niveis[sel.nivel].alcance, info.minimo);
      }

      // Fantasma de onde vai ficar.
      const h = hover.current;
      if (jogando && escolha && h) {
        const ok = livre(e, h.col, h.row);
        const p = centro(h.col, h.row);
        ctx.fillStyle = ok ? "rgba(116,181,60,0.35)" : "rgba(171,57,47,0.4)";
        ctx.beginPath();
        ctx.roundRect(GX + h.col * CELL + 2, GY + h.row * CELL + 2, CELL - 4, CELL - 4, 10);
        ctx.fill();
        if (ok) {
          const info = TRIPULANTES[escolha];
          alcance(p.x, p.y, info.niveis[0].alcance, info.minimo);
          ctx.globalAlpha = 0.65;
          desenharTrip(ctx, escolha, p.x, p.y, 0, 0, 0, visual);
          ctx.globalAlpha = 1;
        }
      }

      // Personagens de cima pra baixo, pra quem está na frente cobrir quem está atrás.
      const atores: { y: number; draw: () => void }[] = [];
      for (const t of e.tripulantes) {
        atores.push({
          y: t.y,
          draw: () => {
            if (t.id === selRef.current) {
              ctx.strokeStyle = "#ffd95a";
              ctx.lineWidth = 3;
              ctx.beginPath();
              ctx.ellipse(t.x, t.y + 17, 20, 8, 0, 0, Math.PI * 2);
              ctx.stroke();
            }
            desenharTrip(ctx, t.tipo, t.x, t.y, t.ang, t.golpe, t.nivel, visual);
          },
        });
      }
      for (const i of e.inimigos) atores.push({ y: i.y, draw: () => desenharInim(ctx, i, visual) });
      atores.sort((a, b) => a.y - b.y);
      for (const a of atores) a.draw();

      for (const p of e.projeteis) desenharProj(ctx, p, visual);
      for (const f of e.efeitos) desenharEfeito(ctx, f, fonte);

      if (jogando) {
        hud(ctx, e, fonte);
        if (bonusAte.current > visual) {
          aviso(ctx, `Onda vencida! +${e.ultimoBonus} de bônus`, fonte, Math.min(1, bonusAte.current - visual));
        } else if (!e.emOnda && !e.fim) {
          aviso(ctx, e.onda === 0 ? "Monte a defesa e chame a onda 1" : `Pronto pra onda ${e.onda + 1}`, fonte);
        }
      }

      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    const onKey = (ev: KeyboardEvent) => {
      const alvo = ev.target as HTMLElement | null;
      if (alvo && ["INPUT", "TEXTAREA", "SELECT"].includes(alvo.tagName)) return;
      if (fase.current !== "jogando") return;
      const n = Number(ev.key);
      if (n >= 1 && n <= TIPOS_TRIP.length) {
        escolher(TIPOS_TRIP[n - 1]);
      } else if (ev.key === "Escape") {
        escolher(null);
        selecionar(null);
      } else if (ev.code === "Space" && alvo?.tagName !== "BUTTON") {
        ev.preventDefault();
        proximaOnda();
      } else if (ev.key.toLowerCase() === "p") {
        alternarPausa();
      }
    };
    const onVis = () => {
      if (document.hidden && fase.current === "jogando" && estado.current.emOnda && !pausaRef.current) {
        pausaRef.current = true;
        setPausado(true);
      }
    };
    window.addEventListener("keydown", onKey);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [alternarPausa, escolher, proximaOnda, selecionar, sincronizar]);

  const ponto = (ev: PointerEvent<HTMLCanvasElement>) => {
    const r = ev.currentTarget.getBoundingClientRect();
    return { x: ((ev.clientX - r.left) * W) / r.width, y: ((ev.clientY - r.top) * H) / r.height };
  };

  const fim = ui.fim;
  const nEstrelas = ui.estrelas;
  const infoEscolhida = escolhido ? TRIPULANTES[escolhido.tipo] : escolha ? TRIPULANTES[escolha] : null;

  return (
    <div className="flex flex-col gap-4">
      <div
        className="relative w-full select-none overflow-hidden rounded-lg border-[6px] border-creme bg-noite shadow-[0_10px_30px_rgb(0_0_0/0.35)]"
        style={{ aspectRatio: `${W} / ${H}` }}
      >
        <canvas
          ref={canvasRef}
          className="block h-full w-full cursor-pointer"
          style={{ touchAction: "manipulation" }}
          aria-label="Defenda o Navio: tower defense no convés"
          onPointerMove={(ev) => {
            const { x, y } = ponto(ev);
            hover.current = ev.pointerType === "mouse" ? casaEm(x, y) : null;
          }}
          onPointerLeave={() => {
            hover.current = null;
          }}
          onPointerDown={(ev) => {
            const { x, y } = ponto(ev);
            tocarCasa(x, y);
          }}
          onContextMenu={(ev) => {
            ev.preventDefault();
            escolher(null);
            selecionar(null);
          }}
        />

        {faseUi === "menu" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-noite/60 p-5 text-center">
            <h2 className="font-titulo text-4xl font-bold leading-none text-creme sm:text-6xl" style={{ textShadow: "3px 3px 0 #01121e" }}>
              Defenda o Navio
            </h2>
            <p className="max-w-md text-sm text-creme sm:text-base">
              A marinha sobe pela prancha e marcha até a cabine. <strong>Coloque tripulantes no convés</strong>, cada um luta de um
              jeito. Se chegarem no baú, levam o tesouro.
            </p>
            <button type="button" onClick={comecar} className="btn bg-laranja text-noite !px-6 !py-2.5 !text-lg">
              Zarpar
            </button>
            {recordeUi > 0 && (
              <p className="etiqueta text-[11px] text-creme/80">
                {recordeUi > ONDAS.length ? "você já venceu as 12 ondas" : `recorde: onda ${recordeUi}`}
              </p>
            )}
          </div>
        )}

        {faseUi === "jogando" && pausado && !fim && (
          <button
            type="button"
            onClick={alternarPausa}
            className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-noite/60 text-center"
          >
            <span className="font-titulo text-4xl font-bold text-creme">Pausado</span>
            <span className="text-creme">Toca aqui ou aperta P pra continuar.</span>
          </button>
        )}

        {fim && (
          <div className="absolute inset-0 flex items-center justify-center bg-noite/60 p-3">
            <div className="card flex w-full max-w-sm flex-col items-center gap-2 !p-5 text-center sm:!p-6">
              {fim === "vitoria" ? (
                <>
                  <span className="etiqueta text-[11px] text-estrela">Navio salvo</span>
                  <p className="font-titulo text-4xl font-bold leading-none text-azul sm:text-5xl">Vitória!</p>
                  <p className="text-3xl tracking-widest text-laranja" aria-label={`${nEstrelas} de 3 estrelas`}>
                    {"★".repeat(nEstrelas)}
                    <span className="text-neutro/40">{"★".repeat(3 - nEstrelas)}</span>
                  </p>
                  <p className="text-sm text-tinta">
                    As 12 ondas voltaram nadando. Sobraram {ui.vidas} de 20 baús de tesouro.
                  </p>
                </>
              ) : (
                <>
                  <span className="etiqueta text-[11px] text-estrela">Tesouro perdido</span>
                  <p className="font-titulo text-4xl font-bold leading-none text-azul sm:text-5xl">Onda {ui.onda}</p>
                  <p className="text-sm text-tinta">
                    A marinha levou o último baú. Tenta misturar a tripulação: cada tipo de marinheiro tem um ponto fraco.
                  </p>
                </>
              )}
              <button type="button" onClick={comecar} className="btn mt-1 bg-laranja text-noite !px-5 !py-2 !text-base">
                Jogar de novo
              </button>
            </div>
          </div>
        )}
      </div>

      {faseUi === "jogando" && (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={proximaOnda}
              disabled={ui.emOnda || !!fim}
              className="btn bg-laranja text-noite !px-5 !py-2 !text-base disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:transform-none"
            >
              {ui.emOnda ? `Onda ${ui.onda} em andamento` : `Chamar onda ${ui.onda + 1}`}
            </button>
            <button type="button" onClick={alternarVel} className="btn bg-creme-claro text-noite !px-4 !py-2 !text-base" aria-pressed={vel === 2}>
              Velocidade {vel}x
            </button>
            <button type="button" onClick={alternarPausa} className="btn bg-creme-claro text-noite !px-4 !py-2 !text-base" disabled={!!fim}>
              {pausado ? "Continuar" : "Pausar"}
            </button>
            {!ui.emOnda && !fim && (
              <p className="text-sm text-tinta">
                <span className="etiqueta text-[11px] text-azul">próxima:</span> {descreverOnda(ui.onda + 1)}
              </p>
            )}
          </div>

          <ul className="grid list-none grid-cols-2 gap-2 p-0 sm:grid-cols-3 lg:grid-cols-5">
            {TIPOS_TRIP.map((tipo, idx) => {
              const info = TRIPULANTES[tipo];
              const pode = ui.moedas >= info.custo;
              const ativo = escolha === tipo;
              return (
                <li key={tipo}>
                  <button
                    type="button"
                    onClick={() => escolher(ativo ? null : tipo)}
                    aria-pressed={ativo}
                    className={`flex w-full items-center gap-2 rounded-xl border-2 border-noite p-2 text-left transition-colors ${
                      ativo ? "bg-laranja-claro shadow-duro-sm" : "bg-creme-claro hover:bg-creme-escuro"
                    } ${pode ? "" : "opacity-55"}`}
                  >
                    <IconeTrip tipo={tipo} />
                    <span className="flex min-w-0 flex-col">
                      <span className="font-titulo text-base font-bold leading-tight">{info.nome}</span>
                      <span className="text-sm text-tinta">
                        {info.custo} moedas <span className="hidden text-neutro lg:inline">· tecla {idx + 1}</span>
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>

          {infoEscolhida && (
            <div className="card flex flex-col gap-2 !p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-col gap-0.5">
                <p className="font-titulo text-lg font-bold leading-tight">
                  {infoEscolhida.nome}
                  {escolhido && <span className="etiqueta ml-2 text-[11px] text-azul">nível {escolhido.nivel + 1}</span>}
                </p>
                <p className="text-sm text-tinta">{infoEscolhida.jeito}</p>
                {!escolhido && <p className="text-sm text-neutro">Toque numa casa livre do convés pra posicionar.</p>}
              </div>
              {escolhido && (
                <div className="flex shrink-0 flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      melhorar(estado.current, escolhido.id);
                      sincronizar();
                    }}
                    disabled={escolhido.melhoria === null || ui.moedas < escolhido.melhoria || !!fim}
                    className="btn bg-laranja text-noite !px-4 !py-1.5 !text-base disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {escolhido.melhoria === null ? "Nível máximo" : `Melhorar (${escolhido.melhoria})`}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      vender(estado.current, escolhido.id);
                      sincronizar();
                    }}
                    disabled={!!fim}
                    className="btn bg-creme-claro text-noite !px-4 !py-1.5 !text-base disabled:opacity-50"
                  >
                    Dispensar (+{escolhido.venda})
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
