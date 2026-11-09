// Desenho do "Duelo Pirata" e do "Duelo Ninja": cenários, lutadores (tudo vetorial, sem imagens), golpes, partículas e HUD.
import { CHAO, H, W, type Luta, type Lutador, type Projetil, type Visual } from "./luta";

type P = { x: number; y: number };
const CONTORNO = "#01121e";

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const lp = (a: P, b: P, t: number): P => ({ x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t) });
const c01 = (n: number) => Math.max(0, Math.min(1, n));

function escurecer(hex: string, k: number) {
  let h = hex.replace("#", "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const n = parseInt(h, 16);
  const r = Math.round(((n >> 16) & 255) * k);
  const g = Math.round(((n >> 8) & 255) * k);
  const b = Math.round((n & 255) * k);
  return `rgb(${r},${g},${b})`;
}

// ---------- pose ----------

export type Esqueleto = {
  quadril: P;
  ombro: P;
  cabeca: P;
  maoF: P;
  maoT: P;
  peF: P;
  peT: P;
  giro: number;
  arma: number | null; // ângulo da arma na mão da frente
  armaT: number | null;
  rastro: { de: number; ate: number } | null; // arco do corte
  rajada: boolean;
  fogo: boolean;
  esfera: number; // 0 a 1: tamanho do Rasengan/Chidori na mão
  selos: boolean;
  shuriken: boolean; // shuriken na mão, antes de lançar
};

function base(bob: number): Esqueleto {
  return {
    quadril: { x: 0, y: -72 },
    ombro: { x: 4, y: -124 + bob },
    cabeca: { x: 8, y: -149 + bob },
    maoF: { x: 34, y: -104 + bob },
    maoT: { x: 22, y: -112 + bob },
    peF: { x: 18, y: 0 },
    peT: { x: -20, y: 0 },
    giro: 0,
    arma: null,
    armaT: null,
    rastro: null,
    rajada: false,
    fogo: false,
    esfera: 0,
    selos: false,
    shuriken: false,
  };
}

const AGACHADO = { quadril: { x: 0, y: -40 }, ombro: { x: 10, y: -86 }, cabeca: { x: 14, y: -110 }, maoF: { x: 38, y: -76 }, maoT: { x: 28, y: -82 }, peF: { x: 30, y: 0 }, peT: { x: -26, y: 0 } };
const DEITADO = { quadril: { x: -6, y: -14 }, ombro: { x: -56, y: -18 }, cabeca: { x: -82, y: -20 }, maoF: { x: -40, y: -6 }, maoT: { x: -72, y: -4 }, peF: { x: 44, y: -8 }, peT: { x: 40, y: -3 } };

export function pose(f: Lutador, tempo: number): Esqueleto {
  const bob = Math.sin(tempo * 5 + (f.face === 1 ? 0 : 1.7)) * 2;
  const e = base(bob);
  const noAr = f.y < CHAO - 1;
  if (f.p.visual.estilo === "nami") e.arma = -1.1;

  switch (f.estado) {
    case "livre":
      if (noAr) {
        Object.assign(e, { quadril: { x: 0, y: -86 }, ombro: { x: 4, y: -134 }, cabeca: { x: 8, y: -158 }, peF: { x: 18, y: -38 }, peT: { x: -14, y: -32 }, maoF: { x: 30, y: -126 }, maoT: { x: -18, y: -120 } });
      } else if (f.agachado) Object.assign(e, AGACHADO);
      else if (f.andando) {
        const ph = tempo * 12 * f.andando;
        e.peF = { x: 18 + Math.sin(ph) * 18, y: -Math.max(0, Math.cos(ph)) * 9 };
        e.peT = { x: -20 - Math.sin(ph) * 18, y: -Math.max(0, -Math.cos(ph)) * 9 };
        const sobe = Math.abs(Math.sin(ph)) * 3;
        e.ombro.y -= sobe;
        e.cabeca.y -= sobe;
        e.maoT.x -= Math.sin(ph) * 8;
      }
      break;
    case "bloqueio":
      Object.assign(e, { ombro: { x: -2, y: -122 }, cabeca: { x: 0, y: -146 }, maoF: { x: 24, y: -132 }, maoT: { x: 28, y: -112 }, peT: { x: -28, y: 0 } });
      if (f.agachado) Object.assign(e, AGACHADO, { maoF: { x: 26, y: -96 }, maoT: { x: 30, y: -80 } });
      break;
    case "atingido":
      Object.assign(e, { ombro: { x: -14, y: -118 }, cabeca: { x: -20, y: -140 }, maoF: { x: -30, y: -134 }, maoT: { x: -42, y: -102 }, peF: { x: 26, y: 0 } });
      if (noAr) e.giro = -0.35;
      break;
    case "caido":
      if (noAr) e.giro = -Math.min(1.45, f.t * 6);
      else {
        // Deitado; perto de levantar, vai se agachando.
        const sobe = c01((f.t - 0.75) / 0.35);
        const deitado = f.vida <= 0 ? 0 : sobe;
        for (const k of Object.keys(DEITADO) as (keyof typeof DEITADO)[]) e[k] = lp(DEITADO[k], AGACHADO[k], deitado);
      }
      break;
    case "vitoria":
      e.maoF = { x: 12, y: -198 + bob * 2 };
      e.maoT = { x: -22, y: -84 };
      e.cabeca.x = 4;
      break;
    case "golpe":
      golpePose(e, f, tempo);
      break;
  }
  return e;
}

function golpePose(e: Esqueleto, f: Lutador, tempo: number) {
  const g = f.p.golpes[f.golpe!];
  const t = f.t;
  const wu = c01(t / g.inicio);
  const at = c01((t - g.inicio) / g.ativo);
  const rec = c01((t - g.inicio - g.ativo) / g.fim);
  const ext = t < g.inicio ? 0 : t < g.inicio + g.ativo ? 1 : 1 - rec;
  const ativo = t >= g.inicio && t < g.inicio + g.ativo;
  const estica = f.p.visual.esticar;
  const c = g.caixa ?? { dx: 20, alt: 100, w: 60, h: 40 };

  switch (g.pose) {
    case "soco": {
      const alvo = { x: estica ? c.dx + c.w : 74, y: -c.alt };
      const recuo = { x: -6, y: -114 };
      e.ombro = { x: 4 + 10 * ext, y: -122 };
      e.cabeca = { x: 10 + 8 * ext, y: -147 };
      e.maoF = t < g.inicio ? lp({ x: 34, y: -104 }, recuo, wu) : lp(recuo, alvo, ext);
      e.maoT = { x: 16, y: -108 };
      e.peF = { x: 30, y: 0 };
      e.peT = { x: -28, y: 0 };
      break;
    }
    case "rajada": {
      Object.assign(e, { quadril: { x: 2, y: -68 }, ombro: { x: 14, y: -120 }, cabeca: { x: 20, y: -145 }, peF: { x: 38, y: 0 }, peT: { x: -32, y: 0 } });
      if (ativo) {
        e.rajada = true;
        e.maoF = { x: c.dx + c.w * (0.6 + 0.4 * Math.abs(Math.sin(tempo * 40))), y: -c.alt + Math.sin(tempo * 33) * 26 };
        e.maoT = { x: c.dx + c.w * (0.6 + 0.4 * Math.abs(Math.cos(tempo * 37))), y: -c.alt + Math.cos(tempo * 29) * 26 };
      } else {
        e.maoF = { x: -10, y: -114 };
        e.maoT = { x: -16, y: -104 };
      }
      break;
    }
    case "chute":
    case "chuteAlto": {
      const alto = g.pose === "chuteAlto";
      e.quadril = { x: -4, y: -76 };
      e.ombro = { x: alto ? -22 : -12, y: alto ? -116 : -122 };
      e.cabeca = { x: alto ? -26 : -12, y: alto ? -139 : -146 };
      const alvo = { x: c.dx + c.w * 0.8, y: -c.alt };
      const dobrado = { x: 22, y: -62 };
      e.peF = t < g.inicio ? lp({ x: 18, y: 0 }, dobrado, wu) : lp(dobrado, alvo, ext);
      e.peT = { x: -14, y: 0 };
      e.maoF = { x: 8, y: -110 };
      e.maoT = { x: -38, y: -98 };
      break;
    }
    case "rasteira": {
      Object.assign(e, { quadril: { x: -4, y: -44 }, ombro: { x: -14, y: -88 }, cabeca: { x: -14, y: -112 }, maoF: { x: 12, y: -62 }, maoT: { x: -34, y: -28 }, peT: { x: -30, y: 0 } });
      const alvo = { x: estica ? c.dx + c.w : 100, y: -c.alt };
      const dobrado = { x: 26, y: -12 };
      e.peF = t < g.inicio ? lp({ x: 30, y: 0 }, dobrado, wu) : lp(dobrado, alvo, ext);
      break;
    }
    case "corte":
    case "corteBaixo": {
      const baixo = g.pose === "corteBaixo";
      const a0 = baixo ? -2.5 : -2.1;
      const a1 = baixo ? 1.15 : 0.75;
      let ang = t < g.inicio ? lerp(-0.6, a0, wu) : lerp(a0, a1, ativo ? at : 1);
      if (rec > 0) ang = lerp(a1, -0.6, rec);
      e.ombro = { x: ativo || rec > 0 ? 14 : 4, y: baixo ? -116 : -122 };
      e.cabeca = { x: e.ombro.x + 4, y: e.ombro.y - 25 };
      if (baixo) e.quadril = { x: 0, y: -64 };
      const r = 50;
      e.maoF = { x: e.ombro.x + Math.cos(ang) * r, y: e.ombro.y + Math.sin(ang) * r };
      e.maoT = { x: e.ombro.x + Math.cos(ang - 0.35) * r * 0.9, y: e.ombro.y + Math.sin(ang - 0.35) * r * 0.9 };
      e.arma = ang;
      e.armaT = f.p.visual.estilo === "zoro" ? ang - 0.35 : null;
      e.peF = { x: 32, y: 0 };
      e.peT = { x: -30, y: 0 };
      if (ativo || (rec > 0 && rec < 0.3)) e.rastro = { de: a0, ate: ang };
      break;
    }
    case "chuteFogo": {
      const voo = { quadril: { x: 0, y: -84 }, ombro: { x: -34, y: -108 }, cabeca: { x: -50, y: -118 }, peF: { x: 72, y: -86 }, peT: { x: -6, y: -42 }, maoF: { x: -22, y: -70 }, maoT: { x: -62, y: -94 } };
      const k = t < g.inicio ? 0 : ext;
      const ini = t < g.inicio ? AGACHADO : base(0);
      for (const key of Object.keys(voo) as (keyof typeof voo)[]) e[key] = lp(ini[key], voo[key], k);
      e.fogo = true;
      break;
    }
    case "bastao": {
      e.arma = lerp(-1.1, 0, t < g.inicio ? wu : ext);
      e.maoF = t < g.inicio ? lp({ x: 34, y: -104 }, { x: 4, y: -108 }, wu) : lp({ x: 4, y: -108 }, { x: c.dx + c.w - 80, y: -c.alt }, ext);
      e.ombro.x = 4 + 8 * ext;
      e.peF = { x: 30, y: 0 };
      e.peT = { x: -28, y: 0 };
      break;
    }
    case "raio": {
      const k = t < g.inicio ? wu : ext;
      e.maoF = lp({ x: 34, y: -104 }, { x: 16, y: -194 }, k);
      e.maoT = lp({ x: 22, y: -112 }, { x: -24, y: -124 }, k);
      e.arma = lerp(-1.1, -1.57, k);
      break;
    }
    case "esfera": {
      // Junta chakra na mão, abaixado, e depois dispara pra frente.
      if (t < g.inicio) {
        Object.assign(e, { quadril: { x: -2, y: -62 }, ombro: { x: -4, y: -112 }, cabeca: { x: 0, y: -137 }, maoF: { x: -14, y: -78 }, maoT: { x: 2, y: -84 }, peF: { x: 30, y: 0 }, peT: { x: -30, y: 0 } });
        e.esfera = 0.3 + 0.7 * wu;
      } else {
        const k = ativo ? 1 : 1 - rec;
        e.quadril = { x: 6 * k, y: -66 };
        e.ombro = { x: 4 + 22 * k, y: -116 };
        e.cabeca = { x: 10 + 26 * k, y: -138 };
        e.maoF = lp({ x: 34, y: -104 }, { x: c.dx + c.w * 0.75, y: -c.alt }, k);
        e.maoT = { x: -26 * k, y: -96 };
        e.peF = { x: 40, y: 0 };
        e.peT = { x: -40, y: -6 * k };
        e.esfera = k;
      }
      break;
    }
    case "selos": {
      // Mãos juntas fazendo os selos, depois sopra o fogo.
      const solta = t >= g.inicio;
      const tremido = solta ? 0 : Math.sin(tempo * 40) * 2;
      e.selos = !solta;
      e.maoF = { x: 24 + tremido, y: -118 };
      e.maoT = { x: 20 - tremido, y: -116 };
      if (solta) {
        e.ombro = { x: 0, y: -122 };
        e.cabeca = { x: 12, y: -146 };
        e.maoF = { x: 18, y: -138 };
        e.maoT = { x: 14, y: -132 };
      }
      e.peF = { x: 28, y: 0 };
      e.peT = { x: -28, y: 0 };
      break;
    }
    case "arremesso": {
      const atras = { x: -24, y: -134 };
      e.shuriken = t < g.inicio;
      e.maoF = t < g.inicio ? lp({ x: 34, y: -104 }, atras, wu) : lp(atras, { x: 60, y: -112 }, Math.min(1, (t - g.inicio) / 0.08));
      e.ombro.x = t < g.inicio ? -4 : 10;
      e.cabeca.x = e.ombro.x + 4;
      e.peF = { x: 30, y: 0 };
      e.peT = { x: -30, y: 0 };
      break;
    }
    case "socoChao": {
      if (t < g.inicio) {
        // Punho lá em cima, juntando força.
        Object.assign(e, { ombro: { x: 0, y: -126 }, cabeca: { x: 4, y: -151 }, maoF: { x: 6, y: -196 }, maoT: { x: -20, y: -104 }, peF: { x: 26, y: 0 }, peT: { x: -26, y: 0 } });
      } else {
        const k = 1 - rec * 0.6;
        e.quadril = { x: 0, y: lerp(-72, -42, k) };
        e.ombro = { x: lerp(4, 24, k), y: lerp(-124, -88, k) };
        e.cabeca = { x: lerp(8, 34, k), y: lerp(-149, -108, k) };
        e.maoF = lp({ x: 34, y: -104 }, { x: 62, y: -6 }, k);
        e.maoT = { x: -18, y: -70 };
        e.peF = { x: 34, y: 0 };
        e.peT = { x: -34, y: 0 };
      }
      break;
    }
  }
}

/** Posição na tela de um ponto do esqueleto (sem giro). */
export const mundo = (f: Lutador, p: P): P => ({ x: f.x + f.face * p.x, y: f.y + p.y });

// ---------- membros ----------

function articulacao(a: P, b: P, len: number, dobra: number): P {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const d = Math.hypot(dx, dy) || 1;
  const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  if (d >= 2 * len) return mid;
  const h = Math.sqrt(len * len - (d / 2) ** 2);
  return { x: mid.x + (-dy / d) * h * dobra, y: mid.y + (dx / d) * h * dobra };
}

function alcancar(a: P, b: P, max: number): P {
  const d = Math.hypot(b.x - a.x, b.y - a.y);
  if (d <= max) return b;
  return { x: a.x + ((b.x - a.x) / d) * max, y: a.y + ((b.y - a.y) / d) * max };
}

function linha(ctx: CanvasRenderingContext2D, pts: P[], larg: number, cor: string) {
  ctx.lineWidth = larg;
  ctx.strokeStyle = cor;
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (const p of pts.slice(1)) ctx.lineTo(p.x, p.y);
  ctx.stroke();
}

function membro(ctx: CanvasRenderingContext2D, a: P, b: P, len: number, dobra: number, larg: number, cor1: string, cor2: string, estica: boolean) {
  const fim = estica ? b : alcancar(a, b, len * 2.05);
  const j = articulacao(a, fim, len, dobra);
  const esticado = Math.hypot(fim.x - a.x, fim.y - a.y) > len * 2.3;
  const l = esticado ? larg * 0.75 : larg;
  linha(ctx, [a, j, fim], l + 5, CONTORNO);
  linha(ctx, [a, j], l, cor1);
  linha(ctx, [j, fim], l * 0.92, cor2);
  return fim;
}

function bola(ctx: CanvasRenderingContext2D, p: P, r: number, cor: string) {
  ctx.beginPath();
  ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
  ctx.fillStyle = cor;
  ctx.fill();
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = CONTORNO;
  ctx.stroke();
}

function pe(ctx: CanvasRenderingContext2D, p: P, cor: string) {
  ctx.beginPath();
  ctx.ellipse(p.x + 5, p.y - 3, 11, 5.5, 0, 0, Math.PI * 2);
  ctx.fillStyle = cor;
  ctx.fill();
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = CONTORNO;
  ctx.stroke();
}

function poligono(ctx: CanvasRenderingContext2D, pts: P[], cor: string, contorno = true) {
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (const p of pts.slice(1)) ctx.lineTo(p.x, p.y);
  ctx.closePath();
  ctx.fillStyle = cor;
  ctx.fill();
  if (contorno) {
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = CONTORNO;
    ctx.stroke();
  }
}

// ---------- armas ----------

function katana(ctx: CanvasRenderingContext2D, mao: P, ang: number, comp = 76) {
  const dx = Math.cos(ang);
  const dy = Math.sin(ang);
  const cabo = { x: mao.x - dx * 12, y: mao.y - dy * 12 };
  const ponta = { x: mao.x + dx * comp, y: mao.y + dy * comp };
  ctx.lineCap = "round";
  linha(ctx, [mao, ponta], 7, CONTORNO);
  linha(ctx, [mao, ponta], 3.5, "#e9f1f5");
  linha(ctx, [cabo, mao], 7, "#2b2b33");
  // Guarda
  linha(ctx, [{ x: mao.x - dy * 6, y: mao.y + dx * 6 }, { x: mao.x + dy * 6, y: mao.y - dx * 6 }], 4, "#d9b23f");
}

function bastao(ctx: CanvasRenderingContext2D, mao: P, ang: number) {
  const dx = Math.cos(ang);
  const dy = Math.sin(ang);
  const a = { x: mao.x - dx * 22, y: mao.y - dy * 22 };
  const b = { x: mao.x + dx * 72, y: mao.y + dy * 72 };
  linha(ctx, [a, b], 9, CONTORNO);
  linha(ctx, [a, b], 5, "#5aa0d8");
  for (const k of [0.25, 0.55, 0.85]) bola(ctx, lp(a, b, k), 3.5, "#2b5d8a");
}

function kunai(ctx: CanvasRenderingContext2D, mao: P, ang: number) {
  const dx = Math.cos(ang);
  const dy = Math.sin(ang);
  const ponta = { x: mao.x + dx * 30, y: mao.y + dy * 30 };
  const base = { x: mao.x + dx * 6, y: mao.y + dy * 6 };
  poligono(ctx, [{ x: base.x - dy * 5, y: base.y + dx * 5 }, ponta, { x: base.x + dy * 5, y: base.y - dx * 5 }], "#aab6c2");
  linha(ctx, [{ x: mao.x - dx * 10, y: mao.y - dy * 10 }, base], 4, "#2b2b33");
  ctx.beginPath();
  ctx.arc(mao.x - dx * 14, mao.y - dy * 14, 3.5, 0, Math.PI * 2);
  ctx.lineWidth = 2;
  ctx.strokeStyle = CONTORNO;
  ctx.stroke();
}

function estrelaNinja(ctx: CanvasRenderingContext2D, c: P, r: number, giro: number) {
  const pts: P[] = [];
  for (let i = 0; i < 8; i++) {
    const a = giro + (i / 8) * Math.PI * 2;
    const rr = i % 2 ? r * 0.32 : r;
    pts.push({ x: c.x + Math.cos(a) * rr, y: c.y + Math.sin(a) * rr });
  }
  poligono(ctx, pts, "#9aa6b4");
  bola(ctx, c, r * 0.18, "#3a4250");
}

// Bandana ninja com a plaquinha de metal na testa. "torta" cobre o olho da frente.
function bandana(ctx: CanvasRenderingContext2D, c: P, pano: string, tempo: number, torta = false, pontas = true) {
  const dy = torta ? 7 : 0;
  if (pontas) {
    const b = Math.sin(tempo * 6) * 3;
    linha(ctx, [{ x: c.x - 15, y: c.y - 9 }, { x: c.x - 30, y: c.y - 4 + b }], 5, CONTORNO);
    linha(ctx, [{ x: c.x - 15, y: c.y - 9 }, { x: c.x - 30, y: c.y - 4 + b }], 3, pano);
    linha(ctx, [{ x: c.x - 15, y: c.y - 7 }, { x: c.x - 27, y: c.y + 4 + b }], 5, CONTORNO);
    linha(ctx, [{ x: c.x - 15, y: c.y - 7 }, { x: c.x - 27, y: c.y + 4 + b }], 3, pano);
  }
  poligono(ctx, [{ x: c.x - 17, y: c.y - 14 }, { x: c.x + 17, y: c.y - 14 + dy }, { x: c.x + 17, y: c.y - 5 + dy }, { x: c.x - 17, y: c.y - 6 }], pano);
  const m = (k: number, a: number): P => ({ x: c.x + k, y: c.y + a + (dy * (k + 17)) / 34 });
  poligono(ctx, [m(1, -15), m(17, -15), m(17, -4), m(1, -4)], "#c7d1da");
  // Rabisco em espiral na plaquinha
  const centro = m(9, -9.5);
  ctx.beginPath();
  ctx.arc(centro.x, centro.y, 3, 0.3, Math.PI * 1.8);
  ctx.lineTo(centro.x + 4.5, centro.y - 3.5);
  ctx.lineWidth = 1.4;
  ctx.strokeStyle = CONTORNO;
  ctx.stroke();
}

// ---------- cabeça ----------

function cabeca(ctx: CanvasRenderingContext2D, c: P, v: Visual, f: Lutador, tempo: number, comEspada: boolean) {
  const dor = f.estado === "atingido" || f.estado === "caido";
  // Cabelo comprido atrás (Nami)
  if (v.estilo === "nami") {
    const balanco = Math.sin(tempo * 3) * 3;
    poligono(ctx, [
      { x: c.x - 4, y: c.y - 18 },
      { x: c.x - 22, y: c.y - 6 },
      { x: c.x - 28 + balanco, y: c.y + 30 },
      { x: c.x - 16 + balanco, y: c.y + 46 },
      { x: c.x - 4, y: c.y + 24 },
      { x: c.x + 4, y: c.y + 10 },
    ], v.cabelo);
  }
  bola(ctx, c, 17, v.pele);

  // Rosto (olhando pra frente: +x)
  ctx.fillStyle = CONTORNO;
  ctx.strokeStyle = CONTORNO;
  ctx.lineWidth = 2;
  const olhoF = { x: c.x + 11, y: c.y - 1 };
  const olhoT = { x: c.x + 3, y: c.y - 1 };
  const olhos = v.estilo === "sanji" || v.estilo === "kakashi" ? [olhoT] : [olhoT, olhoF];
  // Olhos vermelhos do Sasuke no especial.
  const olhoVermelho = v.estilo === "sasuke" && f.estado === "golpe" && f.golpe === "especial";
  for (const o of olhos) {
    if (dor) {
      ctx.beginPath();
      ctx.moveTo(o.x - 3, o.y - 3);
      ctx.lineTo(o.x + 3, o.y + 3);
      ctx.moveTo(o.x + 3, o.y - 3);
      ctx.lineTo(o.x - 3, o.y + 3);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.ellipse(o.x, o.y, olhoVermelho ? 2.6 : 2, 3.2, 0, 0, Math.PI * 2);
      ctx.fillStyle = olhoVermelho ? "#d81e1e" : CONTORNO;
      ctx.fill();
      ctx.fillStyle = CONTORNO;
    }
  }
  // Boca
  ctx.beginPath();
  if (v.estilo === "kakashi") {
    // Máscara cobre a boca.
    ctx.arc(c.x, c.y, 17, -0.12, Math.PI + 0.12);
    ctx.closePath();
    ctx.fillStyle = "#26304a";
    ctx.fill();
    ctx.lineWidth = 2.5;
    ctx.stroke();
  } else if (f.estado === "vitoria" || (v.estilo === "luffy" && f.estado === "livre")) {
    ctx.arc(c.x + 9, c.y + 6, 5, 0.1, Math.PI - 0.1);
    ctx.fillStyle = "#fff";
    ctx.fill();
    ctx.stroke();
  } else if (dor || f.estado === "golpe") {
    ctx.ellipse(c.x + 10, c.y + 8, 3, 3.5, 0, 0, Math.PI * 2);
    ctx.fillStyle = "#7a1e1e";
    ctx.fill();
  } else {
    ctx.moveTo(c.x + 6, c.y + 8);
    ctx.lineTo(c.x + 13, c.y + 8);
    ctx.stroke();
  }

  switch (v.estilo) {
    case "luffy": {
      // Cicatriz embaixo do olho
      ctx.beginPath();
      ctx.moveTo(olhoF.x - 3, olhoF.y + 6);
      ctx.lineTo(olhoF.x + 3, olhoF.y + 6);
      ctx.moveTo(olhoF.x - 1, olhoF.y + 4);
      ctx.lineTo(olhoF.x - 1, olhoF.y + 8);
      ctx.moveTo(olhoF.x + 1.5, olhoF.y + 4);
      ctx.lineTo(olhoF.x + 1.5, olhoF.y + 8);
      ctx.lineWidth = 1.2;
      ctx.stroke();
      // Cabelo espetado
      poligono(ctx, [
        { x: c.x - 17, y: c.y - 4 },
        { x: c.x - 20, y: c.y + 6 },
        { x: c.x - 12, y: c.y + 2 },
        { x: c.x - 8, y: c.y + 10 },
        { x: c.x - 4, y: c.y - 2 },
        { x: c.x + 4, y: c.y - 8 },
        { x: c.x + 14, y: c.y - 6 },
        { x: c.x + 17, y: c.y - 12 },
        { x: c.x, y: c.y - 18 },
      ], v.cabelo);
      // Chapéu de palha
      const palha = "#e8c25a";
      ctx.beginPath();
      ctx.arc(c.x, c.y - 13, 16, Math.PI, 0);
      ctx.closePath();
      ctx.fillStyle = palha;
      ctx.fill();
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = CONTORNO;
      ctx.stroke();
      ctx.fillStyle = "#c8302b";
      ctx.fillRect(c.x - 16, c.y - 19, 32, 6);
      ctx.strokeRect(c.x - 16, c.y - 19, 32, 6);
      ctx.beginPath();
      ctx.ellipse(c.x, c.y - 13, 31, 6.5, 0, 0, Math.PI * 2);
      ctx.fillStyle = palha;
      ctx.fill();
      ctx.stroke();
      break;
    }
    case "zoro": {
      poligono(ctx, [
        { x: c.x - 18, y: c.y + 2 },
        { x: c.x - 17, y: c.y - 10 },
        { x: c.x - 8, y: c.y - 19 },
        { x: c.x + 6, y: c.y - 19 },
        { x: c.x + 16, y: c.y - 10 },
        { x: c.x + 17, y: c.y - 5 },
        { x: c.x + 6, y: c.y - 9 },
        { x: c.x - 4, y: c.y - 8 },
        { x: c.x - 10, y: c.y + 4 },
      ], v.cabelo);
      // Brincos
      ctx.fillStyle = "#e3b93a";
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.arc(c.x - 9, c.y + 5 + i * 4, 1.8, 0, Math.PI * 2);
        ctx.fill();
      }
      // A terceira espada vai na boca.
      if (comEspada) katana(ctx, { x: c.x + 12, y: c.y + 8 }, 0.05, 58);
      break;
    }
    case "sanji": {
      // Sobrancelha enrolada
      ctx.beginPath();
      ctx.arc(olhoT.x - 1, olhoT.y - 6, 2.5, Math.PI, Math.PI * 2.6);
      ctx.lineWidth = 1.5;
      ctx.stroke();
      // Cabelo loiro com franja cobrindo o olho da frente
      poligono(ctx, [
        { x: c.x - 18, y: c.y + 6 },
        { x: c.x - 17, y: c.y - 10 },
        { x: c.x - 4, y: c.y - 19 },
        { x: c.x + 10, y: c.y - 16 },
        { x: c.x + 18, y: c.y - 6 },
        { x: c.x + 17, y: c.y + 6 },
        { x: c.x + 8, y: c.y + 4 },
        { x: c.x + 6, y: c.y - 8 },
        { x: c.x - 6, y: c.y - 10 },
        { x: c.x - 10, y: c.y + 6 },
      ], v.cabelo);
      // Cigarro
      if (!dor) {
        linha(ctx, [{ x: c.x + 13, y: c.y + 9 }, { x: c.x + 24, y: c.y + 7 }], 3, "#f4f1e8");
        bola(ctx, { x: c.x + 25, y: c.y + 7 }, 1.6, "#ff6a2a");
      }
      break;
    }
    case "nami": {
      poligono(ctx, [
        { x: c.x - 17, y: c.y + 4 },
        { x: c.x - 16, y: c.y - 10 },
        { x: c.x - 4, y: c.y - 19 },
        { x: c.x + 10, y: c.y - 17 },
        { x: c.x + 18, y: c.y - 6 },
        { x: c.x + 14, y: c.y - 4 },
        { x: c.x + 8, y: c.y - 10 },
        { x: c.x - 2, y: c.y - 9 },
        { x: c.x - 8, y: c.y + 2 },
      ], v.cabelo);
      break;
    }
    case "naruto": {
      // Marquinhas de bigode
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      for (const dy of [2, 5.5, 9]) {
        ctx.moveTo(c.x + 5, c.y + dy);
        ctx.lineTo(c.x + 12, c.y + dy - 1);
      }
      ctx.stroke();
      // Cabelo bem espetado
      poligono(ctx, [
        { x: c.x - 16, y: c.y + 4 },
        { x: c.x - 26, y: c.y - 2 },
        { x: c.x - 18, y: c.y - 10 },
        { x: c.x - 26, y: c.y - 20 },
        { x: c.x - 12, y: c.y - 19 },
        { x: c.x - 12, y: c.y - 32 },
        { x: c.x - 2, y: c.y - 22 },
        { x: c.x + 6, y: c.y - 33 },
        { x: c.x + 10, y: c.y - 21 },
        { x: c.x + 22, y: c.y - 25 },
        { x: c.x + 18, y: c.y - 13 },
        { x: c.x + 24, y: c.y - 6 },
        { x: c.x + 14, y: c.y - 6 },
        { x: c.x - 10, y: c.y - 6 },
      ], v.cabelo);
      bandana(ctx, c, "#2b4f9c", tempo);
      break;
    }
    case "sasuke": {
      // Cabelo escuro espetado pra trás
      poligono(ctx, [
        { x: c.x + 14, y: c.y + 8 },
        { x: c.x + 18, y: c.y - 8 },
        { x: c.x + 8, y: c.y - 19 },
        { x: c.x - 8, y: c.y - 21 },
        { x: c.x - 30, y: c.y - 28 },
        { x: c.x - 22, y: c.y - 16 },
        { x: c.x - 34, y: c.y - 12 },
        { x: c.x - 22, y: c.y - 4 },
        { x: c.x - 30, y: c.y + 4 },
        { x: c.x - 16, y: c.y + 4 },
        { x: c.x - 6, y: c.y - 6 },
        { x: c.x + 8, y: c.y - 6 },
      ], v.cabelo);
      bandana(ctx, c, "#2b4f9c", tempo, false, false);
      break;
    }
    case "sakura": {
      // Cabelo rosa na altura do queixo, com a bandana de tiara
      poligono(ctx, [
        { x: c.x + 16, y: c.y + 10 },
        { x: c.x + 19, y: c.y - 8 },
        { x: c.x + 8, y: c.y - 20 },
        { x: c.x - 10, y: c.y - 20 },
        { x: c.x - 20, y: c.y - 8 },
        { x: c.x - 22, y: c.y + 16 },
        { x: c.x - 10, y: c.y + 20 },
        { x: c.x - 6, y: c.y + 4 },
        { x: c.x + 2, y: c.y - 6 },
        { x: c.x + 10, y: c.y - 2 },
      ], v.cabelo);
      bandana(ctx, { x: c.x - 2, y: c.y - 5 }, "#c9302f", tempo, false, false);
      break;
    }
    case "kakashi": {
      // Cabelo prateado em pé, tombando pra trás
      poligono(ctx, [
        { x: c.x + 16, y: c.y - 8 },
        { x: c.x + 10, y: c.y - 24 },
        { x: c.x + 2, y: c.y - 20 },
        { x: c.x - 2, y: c.y - 40 },
        { x: c.x - 10, y: c.y - 24 },
        { x: c.x - 22, y: c.y - 38 },
        { x: c.x - 20, y: c.y - 20 },
        { x: c.x - 34, y: c.y - 24 },
        { x: c.x - 24, y: c.y - 10 },
        { x: c.x - 18, y: c.y + 2 },
        { x: c.x - 8, y: c.y - 8 },
      ], v.cabelo);
      bandana(ctx, c, "#26304a", tempo, true, false);
      break;
    }
  }
}

// ---------- tronco ----------

function tronco(ctx: CanvasRenderingContext2D, e: Esqueleto, v: Visual) {
  const q = e.quadril;
  const o = e.ombro;
  const d = Math.hypot(o.x - q.x, o.y - q.y) || 1;
  const n = { x: -(o.y - q.y) / d, y: (o.x - q.x) / d };
  const em = (k: number, lado: number, largO = 17, largQ = 13): P => {
    const base = lp(q, o, k);
    const larg = lerp(largQ, largO, k);
    return { x: base.x + n.x * larg * lado, y: base.y + n.y * larg * lado };
  };
  const faixa = (k0: number, k1: number, cor: string, contorno = true) => poligono(ctx, [em(k0, 1), em(k1, 1), em(k1, -1), em(k0, -1)], cor, contorno);

  // Quadril na cor da calça, emendando com as pernas
  bola(ctx, q, 14, v.calca);
  switch (v.estilo) {
    case "luffy":
      faixa(0, 1, v.pele);
      poligono(ctx, [em(1, 1), em(1, 0.35), em(0.2, 0.3), em(0.2, 1)], v.camisa);
      poligono(ctx, [em(1, -1), em(1, -0.35), em(0.2, -0.3), em(0.2, -1)], v.camisa);
      faixa(0.05, 0.2, "#e9c23a");
      break;
    case "zoro":
      faixa(0, 1, v.camisa);
      faixa(0.02, 0.32, "#2e7d4b");
      break;
    case "sanji":
      faixa(0, 1, v.camisa);
      poligono(ctx, [em(1, 0.3), em(1, -0.3), em(0.45, -0.05), em(0.45, 0.05)], "#7fb3e6", false);
      linha(ctx, [em(0.98, 0), em(0.55, 0)], 3, "#14161f");
      break;
    case "nami":
      faixa(0, 0.55, v.pele);
      faixa(0.55, 1, "#ffffff");
      for (const k of [0.62, 0.76, 0.9]) linha(ctx, [em(k, 1), em(k, -1)], 4, v.camisa);
      faixa(0, 0.12, v.calca);
      break;
    case "naruto":
      faixa(0, 1, v.camisa);
      faixa(0.78, 1, "#2b3550");
      linha(ctx, [em(0.97, 0.25), em(0.15, 0.25)], 2.5, "#f4f1e8");
      break;
    case "sasuke":
      faixa(0, 1, v.camisa);
      faixa(0.88, 1.05, escurecer(v.camisa, 0.8));
      faixa(0, 0.14, v.calca);
      break;
    case "sakura":
      faixa(0, 1, v.camisa);
      linha(ctx, [em(0.98, 0.15), em(0.35, 0.15)], 2.5, "#f4f1e8");
      faixa(0, 0.14, v.calca);
      break;
    case "kakashi":
      faixa(0, 1, "#26304a");
      poligono(ctx, [em(1, 1), em(1, 0.2), em(0.08, 0.2), em(0.08, 1)], v.camisa);
      poligono(ctx, [em(1, -1), em(1, -0.2), em(0.08, -0.2), em(0.08, -1)], v.camisa);
      for (const k of [0.35, 0.6]) poligono(ctx, [em(k, 0.85), em(k + 0.16, 0.85), em(k + 0.16, 0.3), em(k, 0.3)], escurecer(v.camisa, 0.85));
      break;
  }
}

// ---------- jutsus na mão ----------

function esfera(ctx: CanvasRenderingContext2D, c: P, k: number, tipo: "rasengan" | "chidori", tempo: number) {
  const r = 6 + 14 * k;
  ctx.save();
  if (tipo === "rasengan") {
    ctx.shadowColor = "#7fd0ff";
    ctx.shadowBlur = 18;
    ctx.fillStyle = "rgba(120,200,255,0.55)";
    ctx.beginPath();
    ctx.arc(c.x, c.y, r * 1.25, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#d9f3ff";
    ctx.beginPath();
    ctx.arc(c.x, c.y, r * 0.75, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    // Redemoinho girando
    ctx.strokeStyle = "rgba(40,130,220,0.9)";
    ctx.lineWidth = 2;
    for (let i = 0; i < 3; i++) {
      const a = tempo * 14 + (i * Math.PI * 2) / 3;
      ctx.beginPath();
      ctx.arc(c.x, c.y, r * (0.5 + i * 0.22), a, a + 2.2);
      ctx.stroke();
    }
  } else {
    // Chidori: raios saindo da mão
    ctx.shadowColor = "#bfe6ff";
    ctx.shadowBlur = 20;
    ctx.fillStyle = "rgba(200,235,255,0.7)";
    ctx.beginPath();
    ctx.arc(c.x, c.y, r * 0.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineCap = "round";
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2 + Math.sin(tempo * 50 + i) * 0.6;
      const pts: P[] = [c];
      let x = c.x;
      let y = c.y;
      for (let j = 1; j <= 3; j++) {
        x += Math.cos(a) * r * 0.7 + Math.sin(tempo * 70 + i * 3 + j) * 6;
        y += Math.sin(a) * r * 0.7 + Math.cos(tempo * 60 + i * 2 + j) * 6;
        pts.push({ x, y });
      }
      linha(ctx, pts, 3, "rgba(150,210,255,0.8)");
      linha(ctx, pts, 1.2, "#ffffff");
    }
  }
  ctx.restore();
}

// ---------- lutador ----------

export function desenharLutador(ctx: CanvasRenderingContext2D, f: Lutador, tempo: number) {
  const v = f.p.visual;
  const e = pose(f, tempo);

  // Sombra
  const alt = CHAO - f.y;
  const s = Math.max(0.4, 1 - alt / 300);
  ctx.fillStyle = "rgba(1,18,30,0.3)";
  ctx.beginPath();
  ctx.ellipse(f.x, CHAO + 3, 36 * s, 7 * s, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.save();
  ctx.translate(f.x, f.y);
  ctx.scale(f.face, 1);
  if (e.giro) {
    ctx.translate(0, -60);
    ctx.rotate(e.giro);
    ctx.translate(0, 60);
  }
  if (f.piscar > 0) ctx.filter = "brightness(2.4)";
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  const zoroArmado = v.estilo === "zoro" && f.estado === "golpe";
  const estica = v.esticar;
  const mangaLonga = v.estilo === "sanji" || v.estilo === "naruto" || v.estilo === "kakashi";

  // Espadas na cintura (Zoro parado)
  if (v.estilo === "zoro" && !zoroArmado) {
    for (let i = 0; i < 3; i++) katana(ctx, { x: e.quadril.x - 6 + i * 3, y: e.quadril.y + 2 }, Math.PI + 0.5 + i * 0.12, 44);
  }

  // Lado de trás
  const tras = escurecer(v.pele, 0.82);
  membro(ctx, e.ombro, e.maoT, 30, 1, 10, escurecer(v.braco, 0.82), mangaLonga ? escurecer(v.braco, 0.82) : tras, estica);
  bola(ctx, e.maoT, 6.5, tras);
  if (e.armaT !== null) katana(ctx, e.maoT, e.armaT);
  const peT = membro(ctx, e.quadril, e.peT, 38, -1, 13, escurecer(v.calca, 0.8), escurecer(v.canela, 0.82), estica);
  pe(ctx, peT, escurecer(v.sapato, 0.8));

  tronco(ctx, e, v);

  // Perna da frente (com fogo no Diable Jambe)
  const corPerna = e.fogo && f.t >= f.p.golpes.especial.inicio ? "#ff5a1f" : v.calca;
  const peF = membro(ctx, e.quadril, e.peF, 38, -1, 13, corPerna, e.fogo ? "#ff8a2a" : v.canela, estica);
  pe(ctx, peF, v.sapato);
  if (e.fogo && f.t >= f.p.golpes.especial.inicio) {
    for (let i = 0; i < 6; i++) {
      const k = i / 5;
      const p = lp(e.quadril, peF, 0.4 + k * 0.6);
      const r = 7 + Math.sin(tempo * 30 + i * 2) * 3;
      ctx.fillStyle = i % 2 ? "rgba(255,210,60,0.85)" : "rgba(255,90,30,0.75)";
      ctx.beginPath();
      ctx.arc(p.x + Math.sin(tempo * 25 + i) * 3, p.y - r * 0.6, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  cabeca(ctx, e.cabeca, v, f, tempo, zoroArmado);

  // Rajada de braços (Gatling)
  if (e.rajada) {
    for (let i = 0; i < 5; i++) {
      const sx = Math.sin(tempo * 47 + i * 1.9);
      const sy = Math.cos(tempo * 41 + i * 2.7);
      const mao = { x: e.maoF.x - 30 + Math.abs(sx) * 50, y: e.maoF.y + sy * 34 };
      ctx.globalAlpha = 0.55;
      membro(ctx, e.ombro, mao, 30, 1, 8, v.braco, v.pele, true);
      bola(ctx, mao, 8, v.pele);
      ctx.globalAlpha = 1;
    }
    ctx.strokeStyle = "rgba(255,255,255,0.7)";
    ctx.lineWidth = 2;
    for (let i = 0; i < 6; i++) {
      const y = e.maoF.y - 40 + ((i * 17 + tempo * 400) % 80);
      ctx.beginPath();
      ctx.moveTo(e.ombro.x + 40, y);
      ctx.lineTo(e.ombro.x + 140, y);
      ctx.stroke();
    }
  }

  // Braço da frente
  membro(ctx, e.ombro, e.maoF, 30, 1, 10, v.braco, mangaLonga ? v.braco : v.pele, estica);
  bola(ctx, e.maoF, e.rajada ? 9 : 7, v.pele);
  if (e.arma !== null) {
    if (v.estilo === "nami") bastao(ctx, e.maoF, e.arma);
    else if (zoroArmado) katana(ctx, e.maoF, e.arma);
    else if (v.estilo === "sasuke") kunai(ctx, e.maoF, e.arma);
  }
  if (e.shuriken) estrelaNinja(ctx, e.maoF, 9, tempo * 4);
  if (e.selos) {
    // Brilho de chakra nas mãos
    ctx.fillStyle = `rgba(255,170,60,${0.35 + 0.25 * Math.sin(tempo * 30)})`;
    ctx.beginPath();
    ctx.arc(e.maoF.x - 2, e.maoF.y, 14, 0, Math.PI * 2);
    ctx.fill();
  }
  if (e.esfera > 0 && v.esfera) esfera(ctx, e.maoF, e.esfera, v.esfera, tempo);

  // Rastro do corte
  if (e.rastro) {
    const cor = v.estilo === "zoro" ? "rgba(200,255,215," : "rgba(160,215,255,";
    const r = v.estilo === "zoro" ? 118 : 104;
    const [a0, a1] = e.rastro.de < e.rastro.ate ? [e.rastro.de, e.rastro.ate] : [e.rastro.ate, e.rastro.de];
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.arc(e.ombro.x, e.ombro.y, r - i * 12, a0, a1);
      ctx.strokeStyle = `${cor}${0.75 - i * 0.22})`;
      ctx.lineWidth = 10 - i * 3;
      ctx.stroke();
    }
  }
  ctx.restore();
}

// ---------- projéteis ----------

export function desenharProjetil(ctx: CanvasRenderingContext2D, p: Projetil, tempo: number) {
  const y = CHAO - p.alt;
  if (p.tipo === "shuriken") {
    estrelaNinja(ctx, { x: p.x, y }, 13, tempo * 22 * p.face);
    return;
  }
  if (p.tipo === "fogo") {
    ctx.save();
    // Rastro de chamas atrás da bola
    for (let i = 5; i >= 1; i--) {
      const x = p.x - p.face * i * 16;
      const r = p.w * 0.5 * (1 - i * 0.13);
      ctx.fillStyle = i % 2 ? "rgba(255,120,30,0.5)" : "rgba(255,200,60,0.45)";
      ctx.beginPath();
      ctx.arc(x, y + Math.sin(tempo * 30 + i) * 5, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.shadowColor = "#ff8a2a";
    ctx.shadowBlur = 30;
    const pulsa = Math.sin(tempo * 25) * 3;
    ctx.fillStyle = "#ff5a1f";
    ctx.beginPath();
    ctx.arc(p.x, y, p.w / 2 + pulsa, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ffb02e";
    ctx.beginPath();
    ctx.arc(p.x + p.face * 6, y - 4, p.w / 2 - 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#fff2a8";
    ctx.beginPath();
    ctx.arc(p.x + p.face * 10, y - 6, p.w / 2 - 28, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return;
  }
  if (p.tipo === "tremor") {
    // Chão rachando e pedras pulando
    const k = c01(p.vida / 0.3);
    const x0 = p.x - p.face * (p.w / 2);
    ctx.save();
    ctx.globalAlpha = 0.5 + 0.5 * k;
    ctx.lineCap = "round";
    for (let i = 0; i < 5; i++) {
      const pts: P[] = [{ x: x0, y: CHAO - 2 }];
      for (let j = 1; j <= 5; j++) pts.push({ x: x0 + p.face * j * (p.w / 5), y: CHAO - 2 + Math.sin(i * 7.3 + j * 2.1) * (6 + i * 3) });
      linha(ctx, pts, 4, CONTORNO);
    }
    const sobe = (1 - k) * 90;
    for (let i = 0; i < 7; i++) {
      const x = x0 + p.face * ((i + 0.5) * (p.w / 7));
      const h = 20 + ((i * 37) % 30);
      const yy = CHAO - sobe * (0.5 + ((i * 13) % 10) / 20) - h * 0.3;
      poligono(ctx, [{ x: x - 12, y: yy + 8 }, { x: x - 6, y: yy - h * 0.4 }, { x: x + 8, y: yy - h * 0.3 }, { x: x + 12, y: yy + 8 }], i % 2 ? "#8a6a4a" : "#a5825c");
    }
    ctx.restore();
    return;
  }
  if (p.tipo === "corte") {
    ctx.save();
    ctx.translate(p.x, y);
    ctx.scale(p.face, 1);
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.arc(-18 - i * 16, 0, 46, -1.15, 1.15);
      ctx.strokeStyle = i === 0 ? "rgba(235,255,240,0.95)" : `rgba(120,230,150,${0.5 - i * 0.12})`;
      ctx.lineWidth = i === 0 ? 9 : 6;
      ctx.stroke();
    }
    ctx.restore();
    return;
  }
  // Raio: nuvem se formando, depois o relâmpago.
  const nuvemY = CHAO - 330;
  const forma = p.atraso > 0 ? 1 - p.atraso / 0.45 : 1;
  ctx.fillStyle = "#3b3f55";
  for (let i = -2; i <= 2; i++) {
    ctx.beginPath();
    ctx.arc(p.x + i * 20 * forma, nuvemY + Math.abs(i) * 4, (22 - Math.abs(i) * 3) * forma + 2, 0, Math.PI * 2);
    ctx.fill();
  }
  if (p.atraso > 0) return;
  ctx.save();
  ctx.shadowColor = "#fff27a";
  ctx.shadowBlur = 28;
  const seg = 9;
  const pts: P[] = [];
  for (let i = 0; i <= seg; i++) {
    const k = i / seg;
    const tremor = i === 0 || i === seg ? 0 : Math.sin(tempo * 90 + i * 3.1) * 22;
    pts.push({ x: p.x + tremor, y: lerp(nuvemY + 10, CHAO, k) });
  }
  linha(ctx, pts, 14, "rgba(255,240,120,0.55)");
  linha(ctx, pts, 5, "#fffbe0");
  ctx.restore();
  ctx.fillStyle = "rgba(255,245,170,0.35)";
  ctx.beginPath();
  ctx.ellipse(p.x, CHAO, 60, 12, 0, 0, Math.PI * 2);
  ctx.fill();
}

// ---------- partículas ----------

export type Particula = { x: number; y: number; vx: number; vy: number; vida: number; max: number; cor: string; tam: number; tipo: "faisca" | "anel" | "estrela" | "fumaca" };

export function efeitoAcerto(ps: Particula[], x: number, y: number, forte: boolean, rand: () => number = Math.random) {
  const n = forte ? 18 : 10;
  for (let i = 0; i < n; i++) {
    const a = rand() * Math.PI * 2;
    const v = 180 + rand() * (forte ? 420 : 260);
    ps.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 80, vida: 0.35 + rand() * 0.2, max: 0.55, cor: rand() < 0.5 ? "#fff6c2" : "#ffb02e", tam: 2 + rand() * 3, tipo: "faisca" });
  }
  ps.push({ x, y, vx: 0, vy: 0, vida: 0.22, max: 0.22, cor: "#ffffff", tam: forte ? 70 : 46, tipo: "anel" });
  ps.push({ x, y, vx: 0, vy: 0, vida: 0.1, max: 0.1, cor: "#fff6c2", tam: forte ? 46 : 30, tipo: "estrela" });
}

export function efeitoBloqueio(ps: Particula[], x: number, y: number, rand: () => number = Math.random) {
  for (let i = 0; i < 8; i++) {
    const a = rand() * Math.PI * 2;
    const v = 120 + rand() * 200;
    ps.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, vida: 0.25, max: 0.25, cor: "#9fd8ff", tam: 2.5, tipo: "faisca" });
  }
  ps.push({ x, y, vx: 0, vy: 0, vida: 0.18, max: 0.18, cor: "#9fd8ff", tam: 36, tipo: "anel" });
}

export function efeitoPoeira(ps: Particula[], x: number, rand: () => number = Math.random) {
  for (let i = 0; i < 10; i++)
    ps.push({ x: x + (rand() - 0.5) * 60, y: CHAO - 4, vx: (rand() - 0.5) * 160, vy: -rand() * 80, vida: 0.5, max: 0.5, cor: "rgba(210,180,140,0.6)", tam: 8 + rand() * 8, tipo: "fumaca" });
}

export function atualizarParticulas(ps: Particula[], dt: number) {
  for (const p of ps) {
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    if (p.tipo === "faisca") p.vy += 900 * dt;
    if (p.tipo === "fumaca") {
      p.vx *= 0.92;
      p.tam += 20 * dt;
    }
    p.vida -= dt;
  }
  let j = 0;
  for (const p of ps) if (p.vida > 0) ps[j++] = p;
  ps.length = j;
}

export function desenharParticulas(ctx: CanvasRenderingContext2D, ps: Particula[]) {
  for (const p of ps) {
    const k = c01(p.vida / p.max);
    ctx.globalAlpha = k;
    if (p.tipo === "faisca") {
      ctx.fillStyle = p.cor;
      ctx.fillRect(p.x - p.tam / 2, p.y - p.tam / 2, p.tam, p.tam);
    } else if (p.tipo === "anel") {
      ctx.strokeStyle = p.cor;
      ctx.lineWidth = 5 * k;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.tam * (1 - k * 0.7), 0, Math.PI * 2);
      ctx.stroke();
    } else if (p.tipo === "estrela") {
      ctx.fillStyle = p.cor;
      ctx.beginPath();
      for (let i = 0; i < 16; i++) {
        const r = i % 2 ? p.tam * 0.35 : p.tam;
        const a = (i / 16) * Math.PI * 2;
        ctx.lineTo(p.x + Math.cos(a) * r, p.y + Math.sin(a) * r);
      }
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.fillStyle = p.cor;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.tam, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
}

// ---------- cenário: convés de um navio no pôr do sol ----------

export function cenario(ctx: CanvasRenderingContext2D, tempo: number) {
  const ceu = ctx.createLinearGradient(0, 0, 0, 330);
  ceu.addColorStop(0, "#2a3d78");
  ceu.addColorStop(0.55, "#e9824d");
  ceu.addColorStop(1, "#ffd08a");
  ctx.fillStyle = ceu;
  ctx.fillRect(0, 0, W, 340);

  // Sol
  ctx.fillStyle = "rgba(255,240,190,0.35)";
  ctx.beginPath();
  ctx.arc(190, 290, 88, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#fff0b5";
  ctx.beginPath();
  ctx.arc(190, 290, 58, 0, Math.PI * 2);
  ctx.fill();

  // Nuvens
  ctx.fillStyle = "rgba(255,226,200,0.75)";
  for (let i = 0; i < 4; i++) {
    const x = ((i * 290 + tempo * (8 + i * 3)) % (W + 260)) - 130;
    const y = 60 + i * 38;
    for (const [ox, oy, r] of [[0, 0, 22], [24, -8, 26], [52, 0, 20], [26, 6, 22]]) {
      ctx.beginPath();
      ctx.arc(x + ox, y + oy, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Ilhas no horizonte
  ctx.fillStyle = "#6a4a6e";
  ctx.beginPath();
  ctx.moveTo(560, 330);
  ctx.quadraticCurveTo(640, 268, 720, 300);
  ctx.quadraticCurveTo(780, 286, 860, 330);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-10, 330);
  ctx.quadraticCurveTo(40, 300, 110, 330);
  ctx.fill();

  // Mar
  const mar = ctx.createLinearGradient(0, 330, 0, H);
  mar.addColorStop(0, "#3c7fb0");
  mar.addColorStop(1, "#163f69");
  ctx.fillStyle = mar;
  ctx.fillRect(0, 330, W, H - 330);
  ctx.strokeStyle = "rgba(255,230,190,0.45)";
  ctx.lineWidth = 2;
  for (let r = 0; r < 4; r++) {
    const y = 342 + r * 16;
    ctx.beginPath();
    for (let x = 0; x <= W; x += 12) ctx.lineTo(x, y + Math.sin(x * 0.03 + tempo * (1.5 + r * 0.4) + r) * 2.5);
    ctx.stroke();
  }

  // Gaivotas
  ctx.strokeStyle = CONTORNO;
  ctx.lineWidth = 2;
  for (let i = 0; i < 3; i++) {
    const x = ((i * 330 + tempo * 40) % (W + 100)) - 50;
    const y = 120 + i * 30 + Math.sin(tempo * 2 + i) * 8;
    const asa = Math.sin(tempo * 8 + i) * 4;
    ctx.beginPath();
    ctx.moveTo(x - 9, y - asa);
    ctx.quadraticCurveTo(x - 4, y - 6, x, y);
    ctx.quadraticCurveTo(x + 4, y - 6, x + 9, y - asa);
    ctx.stroke();
  }

  // Mastro e vela
  const mx = 480;
  ctx.fillStyle = "#6b4426";
  ctx.fillRect(mx - 11, 0, 22, 420);
  ctx.strokeStyle = CONTORNO;
  ctx.lineWidth = 3;
  ctx.strokeRect(mx - 11, -4, 22, 424);
  const ondula = Math.sin(tempo * 1.3) * 6;
  ctx.beginPath();
  ctx.moveTo(mx - 160, 40);
  ctx.lineTo(mx + 160, 40);
  ctx.quadraticCurveTo(mx + 175 + ondula, 140, mx + 160, 240);
  ctx.lineTo(mx - 160, 240);
  ctx.quadraticCurveTo(mx - 145 + ondula, 140, mx - 160, 40);
  ctx.fillStyle = "#f3ead2";
  ctx.fill();
  ctx.stroke();
  linha(ctx, [{ x: mx - 175, y: 38 }, { x: mx + 175, y: 38 }], 9, "#6b4426");
  // Caveira genérica de pirata com chapéu de palha
  const cx = mx + ondula * 0.5;
  ctx.lineCap = "round";
  linha(ctx, [{ x: cx - 52, y: 108 }, { x: cx + 52, y: 196 }], 14, CONTORNO);
  linha(ctx, [{ x: cx + 52, y: 108 }, { x: cx - 52, y: 196 }], 14, CONTORNO);
  linha(ctx, [{ x: cx - 52, y: 108 }, { x: cx + 52, y: 196 }], 8, "#f3ead2");
  linha(ctx, [{ x: cx + 52, y: 108 }, { x: cx - 52, y: 196 }], 8, "#f3ead2");
  bola(ctx, { x: cx, y: 146 }, 34, "#15151a");
  ctx.fillStyle = "#f3ead2";
  for (const ox of [-12, 12]) {
    ctx.beginPath();
    ctx.ellipse(cx + ox, 148, 8, 10, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillRect(cx - 12, 166, 24, 6);
  ctx.beginPath();
  ctx.ellipse(cx, 116, 48, 9, 0, 0, Math.PI * 2);
  ctx.fillStyle = "#e8c25a";
  ctx.fill();
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = CONTORNO;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx, 114, 24, Math.PI, 0);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#c8302b";
  ctx.fillRect(cx - 24, 106, 48, 7);

  // Amurada (parede de madeira do navio atrás dos lutadores)
  ctx.fillStyle = "#7a4c2a";
  ctx.fillRect(0, 386, W, CHAO - 386);
  ctx.strokeStyle = "rgba(1,18,30,0.35)";
  ctx.lineWidth = 2;
  for (let y = 400; y < CHAO; y += 16) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }
  ctx.fillStyle = "#5a361c";
  ctx.fillRect(0, 378, W, 12);
  ctx.strokeStyle = CONTORNO;
  ctx.lineWidth = 3;
  ctx.strokeRect(-4, 378, W + 8, 12);
  // Balaústres
  ctx.fillStyle = "#8f5c33";
  for (let x = 20; x < W; x += 60) {
    ctx.fillRect(x, 350, 8, 30);
    ctx.strokeRect(x, 350, 8, 30);
  }
  ctx.fillStyle = "#5a361c";
  ctx.fillRect(0, 344, W, 9);
  ctx.strokeRect(-4, 344, W + 8, 9);

  // Convés
  const conves = ctx.createLinearGradient(0, CHAO, 0, H);
  conves.addColorStop(0, "#b07a45");
  conves.addColorStop(1, "#7c5130");
  ctx.fillStyle = conves;
  ctx.fillRect(0, CHAO - 6, W, H - CHAO + 6);
  ctx.strokeStyle = "rgba(1,18,30,0.3)";
  ctx.lineWidth = 2;
  for (let y = CHAO + 8, i = 0; y < H; y += 16, i++) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
    for (let x = (i % 2) * 70; x < W; x += 140) {
      ctx.beginPath();
      ctx.moveTo(x, y - 16);
      ctx.lineTo(x, y);
      ctx.stroke();
    }
  }
  ctx.strokeStyle = CONTORNO;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, CHAO - 6);
  ctx.lineTo(W, CHAO - 6);
  ctx.stroke();
}

// ---------- cenário: campo de treino de uma vila ninja ----------

export function cenarioVila(ctx: CanvasRenderingContext2D, tempo: number) {
  const ceu = ctx.createLinearGradient(0, 0, 0, 330);
  ceu.addColorStop(0, "#4f8fd6");
  ceu.addColorStop(1, "#cfe8f5");
  ctx.fillStyle = ceu;
  ctx.fillRect(0, 0, W, 340);

  // Nuvens
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  for (let i = 0; i < 4; i++) {
    const x = ((i * 290 + tempo * (6 + i * 2)) % (W + 260)) - 130;
    const y = 50 + i * 30;
    for (const [ox, oy, r] of [[0, 0, 20], [24, -8, 26], [52, 0, 20], [26, 6, 22]]) {
      ctx.beginPath();
      ctx.arc(x + ox, y + oy, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Paredão de pedra no fundo
  ctx.fillStyle = "#b59a7a";
  ctx.beginPath();
  ctx.moveTo(-10, 300);
  for (const [x, y] of [[60, 150], [200, 120], [380, 130], [520, 110], [700, 140], [860, 120], [W + 10, 170], [W + 10, 300]]) ctx.lineTo(x, y);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "rgba(1,18,30,0.25)";
  ctx.lineWidth = 2;
  for (const [x, y, h] of [[150, 160, 60], [330, 150, 80], [560, 140, 70], [760, 160, 60]]) {
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + 14, y + h);
    ctx.stroke();
  }

  // Casas da vila
  const casas: [number, number, number, string][] = [
    [20, 250, 90, "#c1533a"], [120, 236, 70, "#2e7d6b"], [205, 256, 100, "#c1533a"], [320, 240, 80, "#d6873a"],
    [600, 246, 90, "#2e7d6b"], [700, 232, 70, "#c1533a"], [790, 252, 110, "#d6873a"],
  ];
  for (const [x, y, w, cor] of casas) {
    ctx.fillStyle = "#efe2c4";
    ctx.fillRect(x, y, w, 330 - y);
    ctx.strokeStyle = CONTORNO;
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, w, 330 - y);
    ctx.fillStyle = "#4b5a6e";
    for (let wx = x + 12; wx < x + w - 14; wx += 26) ctx.fillRect(wx, y + 18, 12, 12);
    poligono(ctx, [{ x: x - 8, y: y + 2 }, { x: x + w / 2, y: y - 22 }, { x: x + w + 8, y: y + 2 }], cor);
  }
  // Torre redonda no meio
  ctx.fillStyle = "#e9c88a";
  ctx.fillRect(430, 190, 120, 140);
  ctx.strokeStyle = CONTORNO;
  ctx.strokeRect(430, 190, 120, 140);
  ctx.beginPath();
  ctx.ellipse(490, 196, 76, 22, 0, Math.PI, 0);
  ctx.closePath();
  ctx.fillStyle = "#c1533a";
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#4b5a6e";
  for (const wx of [448, 482, 516]) ctx.fillRect(wx, 220, 16, 20);

  // Mato atrás da cerca (cobre a tela inteira até o chão: o canvas não é limpo entre um quadro e outro)
  ctx.fillStyle = "#2a5f33";
  ctx.fillRect(0, 330, W, CHAO - 330);

  // Copas das árvores
  ctx.fillStyle = "#3f8a4a";
  for (let x = -20; x < W + 40; x += 70) {
    const r = 44 + ((x * 7) % 18);
    ctx.beginPath();
    ctx.arc(x, 340 - r * 0.4, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = "#2f6e3a";
  for (let x = 15; x < W + 40; x += 90) {
    ctx.beginPath();
    ctx.arc(x, 372, 40, 0, Math.PI * 2);
    ctx.fill();
  }

  // Cerca de madeira
  ctx.fillStyle = "#8a5f36";
  ctx.strokeStyle = CONTORNO;
  ctx.lineWidth = 2.5;
  for (let x = 10; x < W; x += 48) {
    ctx.fillRect(x, 388, 12, CHAO - 388);
    ctx.strokeRect(x, 388, 12, CHAO - 388);
  }
  for (const y of [404, 432]) {
    ctx.fillRect(-4, y, W + 8, 9);
    ctx.strokeRect(-4, y, W + 8, 9);
  }

  // Três troncos de treino
  for (const x of [150, 480, 810]) {
    ctx.fillStyle = "#9b6a3d";
    ctx.fillRect(x - 14, 360, 28, CHAO - 360);
    ctx.strokeRect(x - 14, 360, 28, CHAO - 360);
    ctx.beginPath();
    ctx.ellipse(x, 360, 14, 5, 0, 0, Math.PI * 2);
    ctx.fillStyle = "#c79a64";
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#e9e1c8";
    ctx.fillRect(x - 14, 396, 28, 7);
  }

  // Chão de terra batida
  const chao = ctx.createLinearGradient(0, CHAO, 0, H);
  chao.addColorStop(0, "#9fbf6a");
  chao.addColorStop(0.25, "#c3a273");
  chao.addColorStop(1, "#8f6f48");
  ctx.fillStyle = chao;
  ctx.fillRect(0, CHAO - 6, W, H - CHAO + 6);
  ctx.fillStyle = "rgba(1,18,30,0.15)";
  for (let i = 0; i < 26; i++) {
    const x = (i * 137) % W;
    const y = CHAO + 12 + ((i * 53) % (H - CHAO - 16));
    ctx.beginPath();
    ctx.ellipse(x, y, 6 + (i % 3) * 3, 2.5, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.strokeStyle = CONTORNO;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, CHAO - 6);
  ctx.lineTo(W, CHAO - 6);
  ctx.stroke();

  // Folhas caindo
  for (let i = 0; i < 9; i++) {
    const x = ((i * 113 + tempo * (30 + i * 4)) % (W + 40)) - 20;
    const y = ((i * 71 + tempo * (40 + i * 5)) % (CHAO + 20)) - 10;
    ctx.save();
    ctx.translate(x + Math.sin(tempo * 2 + i) * 12, y);
    ctx.rotate(tempo * 2 + i);
    ctx.fillStyle = i % 3 ? "#6fb54a" : "#e2b33a";
    ctx.beginPath();
    ctx.ellipse(0, 0, 6, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

// ---------- HUD ----------

export type Faixa = { texto: string; quem: 0 | 1; vida: number };

function texto(ctx: CanvasRenderingContext2D, s: string, x: number, y: number, tam: number, cor: string, fonte: string, align: CanvasTextAlign = "center", borda = 6) {
  ctx.font = `700 ${tam}px ${fonte}`;
  ctx.textAlign = align;
  ctx.textBaseline = "middle";
  ctx.lineJoin = "round";
  ctx.lineWidth = borda;
  ctx.strokeStyle = CONTORNO;
  ctx.strokeText(s, x, y);
  ctx.fillStyle = cor;
  ctx.fillText(s, x, y);
}

export function hud(ctx: CanvasRenderingContext2D, l: Luta, rastro: [number, number], faixas: Faixa[], fonte: string, tempo: number, energia = "ESPECIAL") {
  const larg = 370;
  const lutadores = [l.a, l.b] as const;
  lutadores.forEach((f, i) => {
    const x0 = i === 0 ? 32 : W - 32 - larg;
    const y0 = 24;
    const k = f.vida / f.p.vida;
    const kr = rastro[i] / f.p.vida;
    ctx.fillStyle = CONTORNO;
    ctx.fillRect(x0 - 4, y0 - 4, larg + 8, 30);
    ctx.fillStyle = "#3a1414";
    ctx.fillRect(x0, y0, larg, 22);
    // Barra esvazia em direção ao relógio (centro)
    const barra = (kk: number, cor: string) => {
      const w = larg * Math.max(0, kk);
      ctx.fillStyle = cor;
      if (i === 0) ctx.fillRect(x0 + larg - w, y0, w, 22);
      else ctx.fillRect(x0, y0, w, 22);
    };
    barra(kr, "#ff4d3d");
    barra(k, k < 0.25 ? "#ffb02e" : "#f5d547");
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    ctx.fillRect(x0, y0 + 2, larg, 5);

    texto(ctx, f.p.nome.toUpperCase(), i === 0 ? x0 : x0 + larg, y0 + 44, 22, "#fff", fonte, i === 0 ? "left" : "right", 5);
    // Vitórias
    for (let v = 0; v < 2; v++) {
      const cx = i === 0 ? x0 + larg - 10 - v * 24 : x0 + 10 + v * 24;
      ctx.beginPath();
      ctx.arc(cx, y0 + 44, 8, 0, Math.PI * 2);
      ctx.fillStyle = v < f.vitorias ? "#f5d547" : "rgba(1,18,30,0.5)";
      ctx.fill();
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = CONTORNO;
      ctx.stroke();
    }

    // Energia
    const custo = f.p.golpes.especial.custo ?? 0;
    const ex = i === 0 ? 32 : W - 32 - 240;
    const ey = H - 34;
    ctx.fillStyle = CONTORNO;
    ctx.fillRect(ex - 3, ey - 3, 246, 20);
    ctx.fillStyle = "#16263a";
    ctx.fillRect(ex, ey, 240, 14);
    const pronto = f.energia >= custo;
    ctx.fillStyle = pronto ? (Math.sin(tempo * 10) > 0 ? "#57d6ff" : "#a8ecff") : "#2f7fb0";
    const we = 240 * (f.energia / 100);
    if (i === 0) ctx.fillRect(ex, ey, we, 14);
    else ctx.fillRect(ex + 240 - we, ey, we, 14);
    // Marca do custo do especial
    ctx.fillStyle = "#fff";
    const mx = i === 0 ? ex + 240 * (custo / 100) : ex + 240 - 240 * (custo / 100);
    ctx.fillRect(mx - 1, ey - 3, 2, 20);
    texto(ctx, pronto ? `${energia} PRONTO!` : energia, i === 0 ? ex : ex + 240, ey - 14, 14, pronto ? "#a8ecff" : "#d6deec", fonte, i === 0 ? "left" : "right", 4);
  });

  // Relógio
  ctx.fillStyle = CONTORNO;
  ctx.fillRect(W / 2 - 34, 14, 68, 54);
  ctx.fillStyle = "#093f7a";
  ctx.fillRect(W / 2 - 30, 18, 60, 46);
  texto(ctx, String(Math.ceil(l.relogio)), W / 2, 42, 34, l.relogio <= 10 ? "#ff7a5c" : "#fff", fonte, "center", 4);

  // Combo
  lutadores.forEach((f, i) => {
    const outro = lutadores[1 - i];
    if (f.combo >= 2 && (outro.estado === "atingido" || outro.estado === "caido") && outro.t < 0.6)
      texto(ctx, `${f.combo} HITS!`, i === 0 ? 40 : W - 40, 120, 30, "#ffb02e", fonte, i === 0 ? "left" : "right");
  });

  // Nome do especial
  for (const fx of faixas) {
    const a = c01(fx.vida / 0.3);
    ctx.globalAlpha = a;
    texto(ctx, fx.texto, fx.quem === 0 ? 40 : W - 40, 160, 28, "#fff", fonte, fx.quem === 0 ? "left" : "right");
    ctx.globalAlpha = 1;
  }

  // Avisos no centro
  if (l.fase === "intro") {
    if (l.t < 1.2) {
      const s = 1 + Math.max(0, 0.3 - l.t) * 2;
      texto(ctx, `ROUND ${l.round}`, W / 2, H / 2 - 60, 64 * s, "#f5d547", fonte, "center", 10);
    } else texto(ctx, "LUTA!", W / 2, H / 2 - 60, 84, "#ff6a3d", fonte, "center", 10);
  } else if (l.fase === "ko" || l.fase === "fim") {
    const primeiro = l.tempoEsgotado ? "TEMPO!" : "K.O.!";
    if (l.fase === "ko" && l.t < 1.3) {
      const s = 1 + Math.max(0, 0.25 - l.t) * 3;
      texto(ctx, primeiro, W / 2, H / 2 - 60, 96 * s, "#ff4d3d", fonte, "center", 12);
    } else {
      const venc = l.resultado === "empate" ? null : lutadores[l.resultado ?? 0];
      texto(ctx, venc ? `${venc.p.nome.toUpperCase()} VENCE!` : "EMPATE!", W / 2, H / 2 - 60, 60, "#f5d547", fonte, "center", 10);
    }
  }
}

