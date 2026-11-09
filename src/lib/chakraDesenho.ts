// Desenho da "Corrida de Chakra" no canvas: cenários, ninja, barra e HUD.
// Só pinta: quem decide o que acontece é chakra.ts, quem anima é o componente.

import { FASES, H, VIDAS, multiplicador, zona, type Estado } from "./chakra";

export const AZUL = "#4fc3ff";
export const NOITE = "#01121e";
const CREME = "#ece3be";
const LARANJA = "#dd5d05";
const LARANJA_CLARO = "#f2a66e";
const VERDE_FAIXA = "#b6f08a";

// A cena ocupa a esquerda; à direita fica o painel da barra.
export const CENA_W = 624;

type Ctx = CanvasRenderingContext2D;

// Número "aleatório" fixo por índice: o cenário sai igual em todo frame.
const rnd = (i: number) => {
  const s = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};

// ---------- onde o ninja fica ----------

const PASSO_ARVORE = 86;
const BASE_ARVORE = 340;
const TRONCO_X = 300;
const TRONCO_W = 132;

export type Pose = {
  x: number; // pés, já na tela
  y: number;
  rot: number;
  s: number;
  ax: number; // centro do corpo (aura, fagulhas)
  ay: number;
  cam: number; // quanto o mundo da árvore desceu
};

export function pose(fase: number, prog: number, falha: number): Pose {
  if (fase === 0) {
    // De lado no tronco, a câmera sobe junto. Falha: escorrega um pouco.
    const mundo = BASE_ARVORE - prog * PASSO_ARVORE;
    const cam = Math.min(0, mundo - 270);
    const y = mundo + falha * 26 - cam;
    return { x: TRONCO_X, y, rot: -Math.PI / 2, s: 1.35, ax: TRONCO_X - 48, ay: y, cam };
  }
  if (fase === 1) {
    const x = 70 + prog * 96;
    const y = 334 + falha * 34;
    return { x, y, rot: 0, s: 1.3, ax: x, ay: y - 46, cam: 0 };
  }
  return { x: 165, y: 386, rot: 0, s: 1.75, ax: 165, ay: 386 - 62, cam: 0 };
}

// ---------- peças de cenário ----------

function ceu(ctx: Ctx, cores: [number, string][], ate: number) {
  const g = ctx.createLinearGradient(0, 0, 0, ate);
  for (const [p, c] of cores) g.addColorStop(p, c);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, CENA_W, H);
}

function estrelas(ctx: Ctx, t: number, ate: number) {
  ctx.fillStyle = CREME;
  for (let i = 0; i < 40; i++) {
    const x = rnd(i) * CENA_W;
    const y = rnd(i + 50) * ate;
    ctx.globalAlpha = (0.25 + rnd(i + 99) * 0.5) * (0.7 + 0.3 * Math.sin(t * 2 + i));
    const r = rnd(i + 7) < 0.15 ? 1.6 : 1;
    ctx.fillRect(x, y, r, r);
  }
  ctx.globalAlpha = 1;
}

function lua(ctx: Ctx, x: number, y: number, r: number) {
  const halo = ctx.createRadialGradient(x, y, r * 0.8, x, y, r * 3.2);
  halo.addColorStop(0, "rgba(246,240,214,0.28)");
  halo.addColorStop(1, "rgba(246,240,214,0)");
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(x, y, r * 3.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#f6f0d6";
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(200,190,150,0.35)";
  for (const [dx, dy, rr] of [[-8, -6, 6], [9, 5, 4], [-2, 10, 3]]) {
    ctx.beginPath();
    ctx.arc(x + (dx * r) / 30, y + (dy * r) / 30, (rr * r) / 30, 0, Math.PI * 2);
    ctx.fill();
  }
}

function serra(ctx: Ctx, base: number, amp: number, cor: string, seed: number, freq: number) {
  ctx.fillStyle = cor;
  ctx.beginPath();
  ctx.moveTo(0, H + 400);
  for (let x = 0; x <= CENA_W; x += 8) {
    const y = base - amp * (0.55 * Math.abs(Math.sin(x * freq + seed)) + 0.45 * Math.abs(Math.sin(x * freq * 2.3 + seed * 1.7)));
    ctx.lineTo(x, y);
  }
  ctx.lineTo(CENA_W, H + 400);
  ctx.fill();
}

function pinheiro(ctx: Ctx, x: number, base: number, h: number, w: number) {
  const camadas = 4;
  const ys = Array.from({ length: camadas + 1 }, (_, k) => base - h + (h * 0.88 * k) / camadas);
  const ws = Array.from({ length: camadas + 1 }, (_, k) => w * (0.35 + (0.65 * k) / camadas));
  ctx.beginPath();
  ctx.moveTo(x, base - h);
  for (let k = 1; k <= camadas; k++) {
    ctx.lineTo(x - ws[k], ys[k]);
    if (k < camadas) ctx.lineTo(x - ws[k] * 0.45, ys[k] - h * 0.04);
  }
  ctx.lineTo(x - w * 0.1, ys[camadas]);
  ctx.lineTo(x - w * 0.1, base);
  ctx.lineTo(x + w * 0.1, base);
  ctx.lineTo(x + w * 0.1, ys[camadas]);
  for (let k = camadas; k >= 1; k--) {
    if (k < camadas) ctx.lineTo(x + ws[k] * 0.45, ys[k] - h * 0.04);
    ctx.lineTo(x + ws[k], ys[k]);
  }
  ctx.closePath();
  ctx.fill();
}

function mata(ctx: Ctx, base: number, cor: string, esc: number, seed: number, passo: number) {
  ctx.fillStyle = cor;
  ctx.fillRect(0, base - 2, CENA_W, 600);
  let i = 0;
  for (let x = -30; x < CENA_W + 40; x += passo * (0.7 + rnd(seed + i) * 0.6)) {
    const h = (90 + rnd(seed + i + 31) * 80) * esc;
    pinheiro(ctx, x, base, h, h * 0.32);
    i++;
  }
}

function neblina(ctx: Ctx, y: number, alfa: number) {
  const g = ctx.createLinearGradient(0, y - 50, 0, y + 50);
  g.addColorStop(0, "rgba(170,200,225,0)");
  g.addColorStop(0.5, `rgba(170,200,225,${alfa})`);
  g.addColorStop(1, "rgba(170,200,225,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, y - 50, CENA_W, 100);
}

function moita(ctx: Ctx, x: number, y: number, r: number, cores: string[]) {
  cores.forEach((c, k) => {
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.arc(x - k * r * 0.12, y - k * r * 0.14, r * (1 - k * 0.22), 0, Math.PI * 2);
    ctx.fill();
  });
}

// ---------- fase 1: árvore ----------

function cenaArvore(ctx: Ctx, t: number, cam: number, passo: number, total: number) {
  ceu(ctx, [[0, "#06142b"], [0.6, "#12324a"], [1, "#1c4a4a"]], H);
  estrelas(ctx, t, 240);
  lua(ctx, 196, 150 - cam * 0.03, 22);

  // Camadas de fundo, cada uma andando num ritmo (parallax)
  serra(ctx, 300 - cam * 0.08, 90, "#0f2640", 1.3, 0.011);
  mata(ctx, 400 - cam * 0.18, "#10302f", 0.65, 10, 34);
  neblina(ctx, 380 - cam * 0.18, 0.12);
  mata(ctx, 440 - cam * 0.35, "#0b2524", 0.95, 40, 58);
  neblina(ctx, 430 - cam * 0.35, 0.08);

  ctx.save();
  ctx.translate(0, -cam);

  // Chão
  const chao = ctx.createLinearGradient(0, 400, 0, 470);
  chao.addColorStop(0, "#1f4a2a");
  chao.addColorStop(1, "#0f2616");
  ctx.fillStyle = chao;
  ctx.fillRect(0, 400, CENA_W, 140);
  ctx.fillStyle = "#2f6a38";
  for (let i = 0; i < 40; i++) {
    const x = rnd(i + 300) * CENA_W;
    ctx.beginPath();
    ctx.moveTo(x - 4, 404);
    ctx.lineTo(x, 392 - rnd(i) * 8);
    ctx.lineTo(x + 4, 404);
    ctx.fill();
  }

  // Galhos (do lado direito, longe do caminho do ninja)
  ctx.fillStyle = "#5a3820";
  ctx.strokeStyle = NOITE;
  ctx.lineWidth = 3;
  for (const [y, fim, ponta] of [[236, 572, 178], [40, 552, -4]] as const) {
    ctx.beginPath();
    ctx.moveTo(TRONCO_X + TRONCO_W - 4, y);
    ctx.quadraticCurveTo((TRONCO_X + TRONCO_W + fim) / 2, y - 10, fim, ponta);
    ctx.lineTo(fim + 2, ponta + 8);
    ctx.quadraticCurveTo((TRONCO_X + TRONCO_W + fim) / 2, y + 8, TRONCO_X + TRONCO_W - 4, y + 22);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    moita(ctx, fim + 6, ponta - 6, 40, ["#163e26", "#22573a", "#2f7148"]);
  }

  // Tronco
  const top = -330;
  const g = ctx.createLinearGradient(TRONCO_X, 0, TRONCO_X + TRONCO_W, 0);
  g.addColorStop(0, "#3e2614");
  g.addColorStop(0.3, "#7a4c2a");
  g.addColorStop(0.5, "#8f5e34");
  g.addColorStop(0.8, "#5a3820");
  g.addColorStop(1, "#2f1c10");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(TRONCO_X, top);
  ctx.lineTo(TRONCO_X, 380);
  ctx.quadraticCurveTo(TRONCO_X - 6, 398, TRONCO_X - 34, 406);
  ctx.lineTo(TRONCO_X + TRONCO_W + 34, 406);
  ctx.quadraticCurveTo(TRONCO_X + TRONCO_W + 6, 398, TRONCO_X + TRONCO_W, 380);
  ctx.lineTo(TRONCO_X + TRONCO_W, top);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = NOITE;
  ctx.lineWidth = 3;
  ctx.stroke();
  // Sulcos da casca
  ctx.strokeStyle = "rgba(20,10,4,0.45)";
  ctx.lineWidth = 2.5;
  for (let i = 0; i < 9; i++) {
    const x = TRONCO_X + 14 + i * 13 + rnd(i) * 6;
    ctx.beginPath();
    for (let y = top; y < 400; y += 20) ctx.lineTo(x + Math.sin(y * 0.03 + i * 2) * 3, y);
    ctx.stroke();
  }
  // Nós e musgo
  for (const [x, y] of [[370, 300], [398, 120], [350, -80], [400, -240]]) {
    ctx.fillStyle = "#3a2312";
    ctx.beginPath();
    ctx.ellipse(x, y, 9, 14, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(143,94,52,0.7)";
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  ctx.fillStyle = "rgba(90,150,70,0.55)";
  for (const [y, h] of [[340, 40], [170, 30], [-30, 46], [-200, 34]]) {
    ctx.beginPath();
    ctx.ellipse(TRONCO_X + 6, y, 7, h / 2, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Marcas de kunai: cada passo é um risco no lado do tronco
  for (let k = 1; k <= total; k++) {
    const y = BASE_ARVORE - k * PASSO_ARVORE;
    const feita = k <= passo;
    const proxima = k === passo + 1;
    ctx.save();
    if (feita) {
      ctx.shadowColor = LARANJA;
      ctx.shadowBlur = 10;
    }
    ctx.strokeStyle = feita ? LARANJA_CLARO : proxima ? `rgba(79,195,255,${0.55 + 0.45 * Math.sin(t * 6)})` : "rgba(236,227,190,0.22)";
    ctx.lineWidth = proxima ? 3 : 3.5;
    ctx.lineCap = "round";
    if (proxima) ctx.setLineDash([6, 5]);
    ctx.beginPath();
    for (const dy of [-6, 0, 6]) {
      ctx.moveTo(TRONCO_X + 6, y + dy - 3);
      ctx.lineTo(TRONCO_X + 30, y + dy + 3);
    }
    ctx.stroke();
    ctx.restore();
    if (proxima) {
      ctx.fillStyle = `rgba(79,195,255,${0.6 + 0.4 * Math.sin(t * 6)})`;
      ctx.beginPath();
      ctx.moveTo(TRONCO_X - 6, y);
      ctx.lineTo(TRONCO_X - 16, y - 7);
      ctx.lineTo(TRONCO_X - 16, y + 7);
      ctx.fill();
    }
  }

  // Copa
  const copa: [number, number, number][] = [
    [366, -250, 110], [250, -170, 90], [486, -170, 95], [300, -110, 80], [440, -110, 85], [366, -150, 100],
  ];
  for (const [cor, dx, dy, f] of [["#123520", 0, 0, 1], ["#1d4a2c", -8, -10, 0.86], ["#2a6a3a", -16, -20, 0.6], ["#3d8a48", -22, -30, 0.3]] as const) {
    ctx.fillStyle = cor;
    for (const [x, y, r] of copa) {
      ctx.beginPath();
      ctx.arc(x + dx, y + dy, r * f, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

function frenteArvore(ctx: Ctx, t: number) {
  // Folhas caindo
  for (let i = 0; i < 12; i++) {
    const x = ((rnd(i) * 700 + t * (14 + rnd(i + 1) * 18)) % 680) - 30;
    const y = ((rnd(i + 3) * 520 + t * (26 + rnd(i + 5) * 22)) % 520) - 40;
    ctx.save();
    ctx.translate(x + Math.sin(t * 1.5 + i) * 12, y);
    ctx.rotate(Math.sin(t * 2 + i) * 1.2);
    ctx.fillStyle = i % 3 === 0 ? "#c9a33a" : "#3d8a48";
    ctx.beginPath();
    ctx.ellipse(0, 0, 6, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

// ---------- fase 2: água ----------

export type Onda = { x: number; y: number; em: number };

const HORIZONTE = 252;
const PE_AGUA = 334;

function cenaAgua(ctx: Ctx, t: number, ondas: Onda[], passo: number, total: number) {
  ceu(ctx, [[0, "#050d22"], [0.7, "#142a52"], [1, "#24406e"]], HORIZONTE);
  estrelas(ctx, t, 200);
  lua(ctx, 440, 92, 30);
  serra(ctx, HORIZONTE, 70, "#0f2142", 0.4, 0.012);
  serra(ctx, HORIZONTE, 34, "#0a1832", 2.2, 0.02);
  ctx.fillStyle = "#081429";
  for (let i = 0; i < 22; i++) pinheiro(ctx, rnd(i + 70) * CENA_W, HORIZONTE + 2, 22 + rnd(i) * 18, 8);

  // Lago
  const g = ctx.createLinearGradient(0, HORIZONTE, 0, H);
  g.addColorStop(0, "#1c3f6c");
  g.addColorStop(1, "#05132a");
  ctx.fillStyle = g;
  ctx.fillRect(0, HORIZONTE, CENA_W, H - HORIZONTE);
  neblina(ctx, HORIZONTE + 2, 0.18);

  // Reflexo da lua, tremendo
  for (let y = HORIZONTE + 6; y < H; y += 7) {
    const k = (y - HORIZONTE) / (H - HORIZONTE);
    const w = 44 * (1 - k * 0.5) * (0.6 + 0.4 * Math.sin(t * 3 + y * 0.3));
    ctx.fillStyle = `rgba(246,240,214,${0.32 * (1 - k * 0.6)})`;
    ctx.fillRect(440 - w / 2 + Math.sin(t * 2 + y) * 4, y, w, 2.5);
  }
  // Linhas de onda com perspectiva
  ctx.strokeStyle = "rgba(170,215,255,0.13)";
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 9; i++) {
    const y = HORIZONTE + 10 + i * i * 2.6;
    ctx.beginPath();
    for (let x = 0; x <= CENA_W; x += 12) ctx.lineTo(x, y + Math.sin(x * 0.05 + t * 1.6 + i) * (1 + i * 0.3));
    ctx.stroke();
  }
  // Vitórias-régias
  for (const [x, y, r] of [[38, 418, 18], [258, 438, 14], [520, 404, 16], [150, 384, 10]]) {
    ctx.fillStyle = "#1f5a3a";
    ctx.beginPath();
    ctx.ellipse(x, y, r, r * 0.4, 0, 0.3, Math.PI * 2 - 0.1);
    ctx.lineTo(x, y);
    ctx.fill();
  }
  ctx.fillStyle = "#f2a6c8";
  ctx.beginPath();
  ctx.ellipse(522, 398, 5, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  // Píer de chegada
  const px = 70 + total * 96 + 22;
  ctx.fillStyle = "#4a3220";
  ctx.strokeStyle = NOITE;
  ctx.lineWidth = 2.5;
  ctx.fillRect(px, PE_AGUA - 8, CENA_W - px + 4, 10);
  ctx.strokeRect(px, PE_AGUA - 8, CENA_W - px + 4, 10);
  for (const x of [px + 6, px + 36]) {
    ctx.fillRect(x, PE_AGUA - 18, 8, 44);
    ctx.strokeRect(x, PE_AGUA - 18, 8, 44);
  }

  // Pegadas de chakra nos passos dados e o alvo do próximo
  for (let k = 1; k <= passo; k++) {
    ctx.fillStyle = "rgba(79,195,255,0.3)";
    ctx.beginPath();
    ctx.ellipse(70 + k * 96, PE_AGUA + 2, 13, 4, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  if (passo < total) {
    const x = 70 + (passo + 1) * 96;
    const pulso = (t * 1.2) % 1;
    ctx.strokeStyle = `rgba(79,195,255,${0.8 * (1 - pulso)})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(x, PE_AGUA + 2, 10 + pulso * 16, 3 + pulso * 5, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  for (const o of ondas) {
    const idade = t - o.em;
    if (idade < 0 || idade > 1.4) continue;
    ctx.strokeStyle = `rgba(200,235,255,${0.7 * (1 - idade / 1.4)})`;
    ctx.lineWidth = 2;
    for (const atraso of [0, 0.25]) {
      const i2 = Math.max(0, idade - atraso);
      ctx.beginPath();
      ctx.ellipse(o.x, o.y, 10 + i2 * 55, 3 + i2 * 11, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
}

function frenteAgua(ctx: Ctx, t: number) {
  // Vaga-lumes
  for (let i = 0; i < 9; i++) {
    const x = rnd(i + 200) * CENA_W + Math.sin(t * 0.7 + i) * 20;
    const y = 200 + rnd(i + 210) * 120 + Math.cos(t * 0.9 + i * 2) * 12;
    const a = 0.4 + 0.6 * Math.max(0, Math.sin(t * 2.2 + i * 1.7));
    ctx.fillStyle = `rgba(214,255,140,${a * 0.25})`;
    ctx.beginPath();
    ctx.arc(x, y, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = `rgba(234,255,180,${a})`;
    ctx.beginPath();
    ctx.arc(x, y, 1.8, 0, Math.PI * 2);
    ctx.fill();
  }
  // Juncos na frente
  ctx.strokeStyle = "#020c18";
  ctx.fillStyle = "#020c18";
  ctx.lineWidth = 3;
  ctx.lineCap = "round";
  for (let i = 0; i < 14; i++) {
    const esquerda = i < 7;
    const x = esquerda ? 4 + i * 9 : CENA_W - 4 - (i - 7) * 9;
    const h = 60 + rnd(i + 400) * 70;
    const curva = Math.sin(t * 1.2 + i) * 6 + (esquerda ? 10 : -10);
    ctx.beginPath();
    ctx.moveTo(x, H + 4);
    ctx.quadraticCurveTo(x + curva * 0.3, H - h / 2, x + curva, H - h);
    ctx.stroke();
    if (i % 3 === 0) {
      ctx.beginPath();
      ctx.ellipse(x + curva, H - h + 8, 3.5, 10, curva * 0.02, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

// O ninja de cabeça pra baixo na água, apagadinho.
export function reflexo(ctx: Ctx, p: Pose, desenhar: () => void) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, p.y, CENA_W, H - p.y);
  ctx.clip();
  ctx.translate(0, p.y * 2 + 4);
  ctx.scale(1, -1);
  ctx.globalAlpha = 0.22;
  desenhar();
  ctx.restore();
}

// ---------- fase 3: Rasengan ----------

function cenaRasengan(ctx: Ctx, t: number, passo: number, total: number) {
  ceu(ctx, [[0, "#1b1238"], [0.45, "#55295e"], [0.75, "#b9506a"], [1, "#f2a66e"]], 340);
  ctx.fillStyle = "#f2a66e";
  ctx.fillRect(0, 340, CENA_W, H);
  estrelas(ctx, t, 90);
  // Sol baixo
  const sol = ctx.createRadialGradient(470, 318, 10, 470, 318, 120);
  sol.addColorStop(0, "rgba(255,226,160,0.9)");
  sol.addColorStop(0.4, "rgba(255,180,120,0.35)");
  sol.addColorStop(1, "rgba(255,180,120,0)");
  ctx.fillStyle = sol;
  ctx.fillRect(330, 190, 280, 260);
  ctx.fillStyle = "#ffe2a0";
  ctx.beginPath();
  ctx.arc(470, 318, 40, 0, Math.PI * 2);
  ctx.fill();
  // Nuvens compridas
  ctx.fillStyle = "rgba(255,190,200,0.22)";
  for (const [x, y, w] of [[60, 120, 180], [330, 80, 220], [200, 190, 160], [470, 230, 140]]) {
    const dx = ((x + t * 6) % (CENA_W + w)) - w / 2;
    ctx.beginPath();
    ctx.roundRect(dx, y, w, 10, 5);
    ctx.fill();
  }
  serra(ctx, 340, 80, "#4a2a5a", 0.7, 0.01);
  serra(ctx, 362, 46, "#2e1d44", 2.9, 0.018);
  ctx.fillStyle = "#221636";
  for (let i = 0; i < 16; i++) pinheiro(ctx, rnd(i + 90) * CENA_W, 372, 30 + rnd(i + 5) * 24, 10);

  // Chão
  const chao = ctx.createLinearGradient(0, 380, 0, H);
  chao.addColorStop(0, "#4a5a3a");
  chao.addColorStop(0.15, "#2f3b2a");
  chao.addColorStop(1, "#141c14");
  ctx.fillStyle = chao;
  ctx.fillRect(0, 380, CENA_W, H - 380);

  // Postes de treino
  for (const x of [44, 598]) {
    ctx.fillStyle = "#7a4c2a";
    ctx.strokeStyle = NOITE;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.roundRect(x - 9, 318, 18, 68, 4);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#c9b48a";
    ctx.fillRect(x - 9, 336, 18, 6);
    ctx.fillRect(x - 9, 360, 18, 6);
    ctx.fillStyle = "#a0683a";
    ctx.beginPath();
    ctx.ellipse(x, 318, 9, 3.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  // Pedra alvo
  const venceu = passo >= total;
  ctx.strokeStyle = NOITE;
  ctx.lineWidth = 3;
  if (venceu) {
    // Despedaçada
    const pedacos: [number, number, number][] = [[440, 372, 0.4], [480, 380, -0.3], [520, 368, 0.8], [556, 382, -0.6], [500, 360, 1.2]];
    for (const [x, y, a] of pedacos) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(a);
      ctx.fillStyle = "#6e6a80";
      ctx.beginPath();
      ctx.moveTo(-16, 10);
      ctx.lineTo(-10, -12);
      ctx.lineTo(12, -8);
      ctx.lineTo(16, 10);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
  } else {
    const pts: [number, number][] = [[424, 388], [440, 300], [500, 270], [560, 296], [576, 388]];
    ctx.fillStyle = "#6e6a80";
    ctx.beginPath();
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.closePath();
    ctx.fill();
    // luz do sol de um lado, sombra do outro
    ctx.fillStyle = "#9a90a8";
    ctx.beginPath();
    ctx.moveTo(500, 270);
    ctx.lineTo(560, 296);
    ctx.lineTo(576, 388);
    ctx.lineTo(540, 388);
    ctx.lineTo(530, 300);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#4a465a";
    ctx.beginPath();
    ctx.moveTo(424, 388);
    ctx.lineTo(440, 300);
    ctx.lineTo(462, 290);
    ctx.lineTo(452, 388);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#4f7a3e";
    ctx.beginPath();
    ctx.ellipse(500, 274, 26, 6, 0.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.closePath();
    ctx.stroke();
    // Rachaduras brilhando de chakra
    const rachas = [
      [[470, 296], [486, 330], [476, 358], [484, 384]],
      [[540, 294], [522, 326], [534, 360]],
      [[446, 340], [480, 344], [498, 374]],
      [[500, 274], [502, 314], [524, 340], [520, 386]],
    ];
    ctx.save();
    ctx.shadowColor = AZUL;
    ctx.shadowBlur = 10;
    ctx.strokeStyle = "#bdf0ff";
    ctx.lineWidth = 2.5;
    for (let i = 0; i < Math.min(passo, rachas.length); i++) {
      ctx.beginPath();
      rachas[i].forEach(([x, y], j) => (j ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      ctx.stroke();
    }
    ctx.restore();
  }
}

function frenteRasengan(ctx: Ctx, t: number) {
  ctx.fillStyle = "#101810";
  for (let i = 0; i < 30; i++) {
    const x = rnd(i + 600) * CENA_W;
    const h = 8 + rnd(i + 610) * 14;
    const v = Math.sin(t * 2 + i) * 3;
    ctx.beginPath();
    ctx.moveTo(x - 5, H);
    ctx.quadraticCurveTo(x - 2 + v, H - h, x + v, H - h - 4);
    ctx.quadraticCurveTo(x + 2 + v, H - h, x + 5, H);
    ctx.fill();
  }
}

export function esfera(ctx: Ctx, x: number, y: number, r: number, t: number, instavel: boolean) {
  if (r <= 0.5) return;
  if (instavel) {
    x += Math.sin(t * 70) * 2;
    y += Math.cos(t * 63) * 2;
  }
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  const halo = ctx.createRadialGradient(x, y, r * 0.6, x, y, r * 2.2);
  halo.addColorStop(0, "rgba(79,195,255,0.35)");
  halo.addColorStop(1, "rgba(79,195,255,0)");
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(x, y, r * 2.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalCompositeOperation = "source-over";
  const casca = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, 0, x, y, r);
  casca.addColorStop(0, "#e8fbff");
  casca.addColorStop(0.3, "#8fdcff");
  casca.addColorStop(0.75, "#2f9be0");
  casca.addColorStop(1, "#1a5fae");
  ctx.fillStyle = casca;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(220,248,255,0.8)";
  ctx.lineWidth = Math.max(1, r * 0.05);
  ctx.stroke();
  // Fios girando dentro
  ctx.lineCap = "round";
  for (let i = 0; i < 5; i++) {
    const rr = r * (0.35 + i * 0.13);
    const a = t * (10 + i * 2) + i * 1.3;
    ctx.strokeStyle = `rgba(255,255,255,${0.9 - i * 0.12})`;
    ctx.lineWidth = Math.max(1.2, r * 0.07);
    ctx.beginPath();
    ctx.ellipse(x, y, rr, rr * 0.55, a * 0.15 + i, a, a + 2.2);
    ctx.stroke();
  }
  // Fagulhas em órbita
  ctx.fillStyle = "#e8fbff";
  for (let i = 0; i < 6; i++) {
    const a = t * 7 + (i * Math.PI) / 3;
    ctx.beginPath();
    ctx.arc(x + Math.cos(a) * r * 1.2, y + Math.sin(a) * r * 0.5, Math.max(1, r * 0.07), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

// ---------- cena inteira ----------

export function cena(ctx: Ctx, fase: number, t: number, cam: number, passo: number, ondas: Onda[]) {
  const total = FASES[fase].passos;
  if (fase === 0) cenaArvore(ctx, t, cam, passo, total);
  else if (fase === 1) cenaAgua(ctx, t, ondas, passo, total);
  else cenaRasengan(ctx, t, passo, total);
}

export function frente(ctx: Ctx, fase: number, t: number) {
  if (fase === 0) frenteArvore(ctx, t);
  else if (fase === 1) frenteAgua(ctx, t);
  else frenteRasengan(ctx, t);
}

export function vinheta(ctx: Ctx) {
  const g = ctx.createRadialGradient(CENA_W / 2, H / 2, 180, CENA_W / 2, H / 2, 480);
  g.addColorStop(0, "rgba(1,8,18,0)");
  g.addColorStop(1, "rgba(1,8,18,0.6)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, CENA_W, H);
}

// ---------- ninja ----------

const PELE = "#f3c9a0";
const CABELO = "#24212c";
const ROUPA = "#1d3557";
const COLETE = "#2b4c78";
const CALCA = "#15233d";
const BANDANA = "#2f4f8a";

export type Modo = "normal" | "selo" | "esfera";

function membro(ctx: Ctx, de: [number, number], ate: [number, number], cor: string, larg: number, ponta?: string) {
  ctx.lineCap = "round";
  ctx.strokeStyle = NOITE;
  ctx.lineWidth = larg + 3;
  ctx.beginPath();
  ctx.moveTo(...de);
  ctx.lineTo(...ate);
  ctx.stroke();
  ctx.strokeStyle = cor;
  ctx.lineWidth = larg;
  ctx.beginPath();
  ctx.moveTo(...de);
  ctx.lineTo(...ate);
  ctx.stroke();
  if (ponta) {
    ctx.fillStyle = ponta;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(ate[0], ate[1], larg * 0.55, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
}

// Ninja de lado, virado pra direita, pés em (0,0). anda: 0 parado, 1 correndo.
export function ninja(ctx: Ctx, p: Pose, t: number, anda: number, modo: Modo, concentrado: boolean) {
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(p.rot);
  ctx.scale(p.s, p.s);
  ctx.lineJoin = "round";
  const sw = Math.sin(t * 11) * 0.6 * anda;
  const resp = anda > 0 ? Math.abs(Math.sin(t * 11)) * -1.5 : Math.sin(t * 3) * 0.8;
  const vento = Math.sin(t * 6);
  const quadril: [number, number] = [0, -25];
  const pe = (a: number): [number, number] => [Math.sin(a) * 20, -25 + Math.cos(a) * 25];

  // Perna e braço de trás (mais escuros)
  membro(ctx, quadril, pe(-sw), "#0e1a30", 6.5, "#2a2a2a");
  const ombro: [number, number] = [1, -45 + resp];
  const maoTras: [number, number] =
    modo === "selo" ? [11, -38 + resp] : modo === "esfera" ? [19, -38 + resp] : [Math.sin(sw) * 13, -30 + resp];
  membro(ctx, ombro, maoTras, "#14284a", 5.5, "#d9ab80");

  ctx.translate(0, resp);
  // Ponta do cachecol voando
  ctx.fillStyle = "#b84a04";
  ctx.strokeStyle = NOITE;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-6, -49);
  ctx.quadraticCurveTo(-18, -48 + vento * 3, -30, -42 + vento * 6);
  ctx.lineTo(-27, -36 + vento * 6);
  ctx.quadraticCurveTo(-16, -40 + vento * 2, -4, -44);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Tronco
  ctx.fillStyle = ROUPA;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.roundRect(-10, -51, 20, 28, 6);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = COLETE;
  ctx.beginPath();
  ctx.roundRect(-8, -48, 7, 18, 2);
  ctx.roundRect(1, -48, 7, 18, 2);
  ctx.fill();
  ctx.fillStyle = "#3b2a1a";
  ctx.fillRect(-10, -27, 20, 4);
  // Cachecol
  ctx.fillStyle = LARANJA;
  ctx.beginPath();
  ctx.roundRect(-11, -54, 22, 7, 3.5);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "rgba(255,255,255,0.25)";
  ctx.fillRect(-8, -53, 14, 2);

  // Fitas da bandana
  ctx.strokeStyle = BANDANA;
  ctx.lineWidth = 3.5;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-11, -71);
  ctx.quadraticCurveTo(-22, -70 + vento * 3, -32, -64 + vento * 6);
  ctx.moveTo(-11, -70);
  ctx.quadraticCurveTo(-20, -64 + vento * 2, -27, -57 + vento * 5);
  ctx.stroke();

  // Cabeça
  ctx.fillStyle = PELE;
  ctx.strokeStyle = NOITE;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(2, -65, 14, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  // Cabelo espetado
  ctx.fillStyle = CABELO;
  ctx.beginPath();
  ctx.moveTo(-12, -60);
  ctx.lineTo(-20, -66);
  ctx.lineTo(-12, -70);
  ctx.lineTo(-17, -80);
  ctx.lineTo(-6, -77);
  ctx.lineTo(-4, -88);
  ctx.lineTo(4, -79);
  ctx.lineTo(12, -86);
  ctx.lineTo(13, -76);
  ctx.lineTo(19, -74);
  ctx.lineTo(15, -68);
  ctx.lineTo(-4, -70);
  ctx.lineTo(-9, -60);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = "#4a5a7a";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(-8, -76);
  ctx.lineTo(-3, -82);
  ctx.moveTo(4, -76);
  ctx.lineTo(9, -81);
  ctx.stroke();
  // Bandana com placa lisa
  ctx.fillStyle = BANDANA;
  ctx.strokeStyle = NOITE;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(-12, -74, 28, 6, 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#cfd3dd";
  ctx.beginPath();
  ctx.roundRect(3, -75.5, 12, 9, 2);
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = "rgba(255,255,255,0.8)";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(5, -73.5);
  ctx.lineTo(8, -73.5);
  ctx.stroke();
  // Rosto
  ctx.strokeStyle = NOITE;
  if (concentrado) {
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(10, -63, 3, 0.2, Math.PI - 0.2);
    ctx.stroke();
  } else {
    ctx.fillStyle = "#fff";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(10, -63, 3, 3.6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#1d3557";
    ctx.beginPath();
    ctx.arc(11, -62.5, 1.7, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(6, -68.5);
  ctx.lineTo(13, -67);
  ctx.stroke();
  ctx.fillStyle = "#e9a888";
  ctx.beginPath();
  ctx.arc(9, -57, 2.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(11, -55);
  ctx.lineTo(14, -55.5);
  ctx.stroke();
  ctx.translate(0, -resp);

  // Perna e braço da frente
  membro(ctx, quadril, pe(sw), CALCA, 6.5, "#2a2a2a");
  const maoFrente: [number, number] =
    modo === "selo" ? [12, -40 + resp] : modo === "esfera" ? [24, -43 + resp] : [-Math.sin(sw) * 13, -30 + resp];
  membro(ctx, ombro, maoFrente, ROUPA, 5.5, PELE);
  ctx.restore();
}

// Chamas de chakra em volta do corpo enquanto segura.
export function aura(ctx: Ctx, x: number, y: number, s: number, forca: number, passou: boolean, t: number) {
  if (forca <= 0.01) return;
  const cor = passou ? "255,120,80" : "79,195,255";
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  const r = (34 + forca * 30) * (s / 1.35);
  const g = ctx.createRadialGradient(x, y, 4, x, y, r * 1.4);
  g.addColorStop(0, `rgba(${cor},${0.18 + forca * 0.3})`);
  g.addColorStop(1, `rgba(${cor},0)`);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r * 1.4, 0, Math.PI * 2);
  ctx.fill();
  for (let i = 0; i < 9; i++) {
    const ang = (i / 9) * Math.PI * 2 + t * 0.6;
    const bx = x + Math.cos(ang) * r * 0.6;
    const by = y + Math.abs(Math.sin(ang)) * r * 0.5;
    const alt = r * (0.5 + 0.5 * Math.abs(Math.sin(t * 7 + i * 1.7))) * (0.6 + forca);
    ctx.fillStyle = `rgba(${cor},${0.12 + forca * 0.18})`;
    ctx.beginPath();
    ctx.moveTo(bx - 7, by);
    ctx.quadraticCurveTo(bx - 4, by - alt * 0.6, bx + Math.sin(t * 9 + i) * 5, by - alt);
    ctx.quadraticCurveTo(bx + 4, by - alt * 0.6, bx + 7, by);
    ctx.fill();
  }
  ctx.restore();
}

// Anel que abre em volta do ninja num acerto perfeito.
export function anel(ctx: Ctx, x: number, y: number, idade: number) {
  if (idade < 0 || idade > 0.5) return;
  const k = idade / 0.5;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.strokeStyle = `rgba(190,240,255,${1 - k})`;
  ctx.lineWidth = 6 * (1 - k) + 1;
  ctx.beginPath();
  ctx.arc(x, y, 20 + k * 90, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

// ---------- barra de chakra ----------

export function barra(ctx: Ctx, e: Estado, t: number, fonte: string) {
  // Painel
  const pg = ctx.createLinearGradient(0, 0, 0, H);
  pg.addColorStop(0, "rgba(6,18,36,0.92)");
  pg.addColorStop(1, "rgba(12,32,62,0.92)");
  ctx.fillStyle = pg;
  ctx.fillRect(CENA_W, 0, 800 - CENA_W, H);
  ctx.strokeStyle = "rgba(236,227,190,0.14)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(CENA_W + 1, 0);
  ctx.lineTo(CENA_W + 1, H);
  ctx.stroke();

  const z = zona(e);
  const tremor = e.status === "carregando" && e.carga > 0.85 ? Math.sin(t * 60) * 3 * ((e.carga - 0.85) / 0.15) : 0;
  const x = 686 + tremor;
  const w = 52;
  const y0 = 62;
  const h = 330;
  const yDe = (v: number) => y0 + h * (1 - v);

  ctx.font = `700 13px ${fonte}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = LARANJA_CLARO;
  ctx.fillText("C H A K R A", 712, 34);

  // Régua
  ctx.strokeStyle = "rgba(236,227,190,0.3)";
  ctx.lineWidth = 1.5;
  for (let i = 1; i < 10; i++) {
    const y = yDe(i / 10);
    const longo = i % 5 === 0;
    ctx.beginPath();
    ctx.moveTo(x - (longo ? 14 : 9), y);
    ctx.lineTo(x - 4, y);
    ctx.stroke();
  }

  // Fundo de vidro
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(x, y0, w, h, 14);
  ctx.clip();
  const vidro = ctx.createLinearGradient(x, 0, x + w, 0);
  vidro.addColorStop(0, "#030b16");
  vidro.addColorStop(0.5, "#0b1b30");
  vidro.addColorStop(1, "#030b16");
  ctx.fillStyle = vidro;
  ctx.fillRect(x, y0, w, h);

  // Faixa certa e o miolo "perfeito"
  const mostra = e.status === "pronto" || e.status === "carregando" || e.status === "resultado";
  if (mostra) {
    const pulso = 0.75 + 0.25 * Math.sin(t * 6);
    const topo = yDe(z.centro + z.largura / 2);
    ctx.fillStyle = `rgba(120,210,110,${0.3 * pulso})`;
    ctx.fillRect(x, topo, w, h * z.largura);
    ctx.fillStyle = `rgba(200,250,150,${0.75 * pulso})`;
    const miolo = z.largura * 0.35;
    ctx.fillRect(x, yDe(z.centro + miolo / 2), w, h * miolo);
    ctx.strokeStyle = VERDE_FAIXA;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, topo);
    ctx.lineTo(x + w, topo);
    ctx.moveTo(x, topo + h * z.largura);
    ctx.lineTo(x + w, topo + h * z.largura);
    ctx.stroke();
  }

  // Líquido de chakra com a superfície balançando
  if (e.carga > 0) {
    const passou = e.carga > z.centro + z.largura / 2;
    const perto = Math.abs(e.carga - z.centro) < z.largura / 2;
    const yTopo = yDe(e.carga);
    const liq = ctx.createLinearGradient(0, y0 + h, 0, yTopo);
    liq.addColorStop(0, "#0f3f80");
    liq.addColorStop(1, passou ? "#ff7a50" : perto ? "#c9f3ff" : AZUL);
    ctx.fillStyle = liq;
    ctx.globalAlpha = 0.9;
    ctx.beginPath();
    ctx.moveTo(x, y0 + h);
    for (let px = 0; px <= w; px += 4) ctx.lineTo(x + px, yTopo + Math.sin(px * 0.25 + t * 9) * 2.5);
    ctx.lineTo(x + w, y0 + h);
    ctx.fill();
    ctx.globalAlpha = 1;
    // Bolhas subindo
    ctx.fillStyle = "rgba(220,245,255,0.5)";
    for (let i = 0; i < 7; i++) {
      const by = y0 + h - ((t * (40 + i * 9) + i * 50) % (y0 + h - yTopo));
      if (by < yTopo + 4) continue;
      ctx.beginPath();
      ctx.arc(x + 10 + rnd(i) * (w - 20), by, 1.5 + rnd(i + 3) * 2, 0, Math.PI * 2);
      ctx.fill();
    }
    // Linha do nível
    ctx.save();
    ctx.shadowColor = passou ? "#ff7a50" : AZUL;
    ctx.shadowBlur = 12;
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x, yTopo);
    ctx.lineTo(x + w, yTopo);
    ctx.stroke();
    ctx.restore();
  }

  // Topo listrado: daqui estoura
  const perigo = 0.35 + (e.status === "carregando" ? Math.max(0, e.carga - 0.6) * 1.6 : 0);
  ctx.fillStyle = `rgba(171,57,47,${Math.min(1, perigo)})`;
  ctx.fillRect(x, y0, w, 18);
  ctx.strokeStyle = `rgba(1,18,30,${Math.min(0.8, perigo)})`;
  ctx.lineWidth = 4;
  for (let i = -2; i < 6; i++) {
    ctx.beginPath();
    ctx.moveTo(x + i * 14, y0 + 18);
    ctx.lineTo(x + i * 14 + 18, y0);
    ctx.stroke();
  }
  // Brilho do vidro
  ctx.fillStyle = "rgba(255,255,255,0.07)";
  ctx.fillRect(x + 6, y0, 8, h);
  ctx.restore();

  ctx.strokeStyle = CREME;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(x, y0, w, h, 14);
  ctx.stroke();

  // Setas apontando pro ponto perfeito
  if (mostra) {
    const y = yDe(z.centro);
    ctx.fillStyle = VERDE_FAIXA;
    ctx.strokeStyle = NOITE;
    ctx.lineWidth = 2;
    for (const lado of [-1, 1]) {
      const bx = lado < 0 ? x - 4 : x + w + 4;
      ctx.beginPath();
      ctx.moveTo(bx, y);
      ctx.lineTo(bx + lado * 12, y - 8);
      ctx.lineTo(bx + lado * 12, y + 8);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
  }

  // Legenda
  ctx.font = `600 11px ${fonte}`;
  ctx.textAlign = "left";
  ctx.fillStyle = "rgba(120,210,110,0.7)";
  ctx.fillRect(664, 412, 12, 10);
  ctx.fillStyle = CREME;
  ctx.fillText("boa", 680, 418);
  ctx.fillStyle = "rgba(200,250,150,0.95)";
  ctx.fillRect(716, 412, 12, 10);
  ctx.fillStyle = CREME;
  ctx.fillText("perfeito", 732, 418);
}

// ---------- HUD ----------

function texto(ctx: Ctx, s: string, x: number, y: number, cor: string) {
  ctx.strokeText(s, x, y);
  ctx.fillStyle = cor;
  ctx.fillText(s, x, y);
}

function coracao(ctx: Ctx, x: number, y: number, cheio: boolean) {
  ctx.beginPath();
  ctx.moveTo(x, y + 6);
  ctx.bezierCurveTo(x - 10, y - 1, x - 6, y - 9, x, y - 4);
  ctx.bezierCurveTo(x + 6, y - 9, x + 10, y - 1, x, y + 6);
  ctx.fillStyle = cheio ? "#ff5d6c" : "rgba(236,227,190,0.12)";
  ctx.fill();
  ctx.strokeStyle = cheio ? NOITE : "rgba(236,227,190,0.35)";
  ctx.lineWidth = 1.8;
  ctx.stroke();
}

export function hud(ctx: Ctx, e: Estado, recorde: number, fonte: string) {
  const f = FASES[e.fase];
  ctx.lineJoin = "round";

  // Cartão da fase
  ctx.fillStyle = "rgba(1,18,30,0.62)";
  ctx.strokeStyle = "rgba(236,227,190,0.16)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(12, 12, 232, 78, 12);
  ctx.fill();
  ctx.stroke();
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.font = `700 11px ${fonte}`;
  ctx.fillStyle = LARANJA_CLARO;
  ctx.fillText(`FASE ${e.fase + 1} DE ${FASES.length}`, 26, 30);
  ctx.font = `700 21px ${fonte}`;
  ctx.fillStyle = CREME;
  ctx.fillText(f.nome, 26, 52);
  // Passos: losangos
  for (let k = 0; k < f.passos; k++) {
    const cx = 32 + k * 18;
    const cy = 76;
    const feito = k < e.passo;
    ctx.save();
    if (feito) {
      ctx.shadowColor = AZUL;
      ctx.shadowBlur = 8;
    }
    ctx.beginPath();
    ctx.moveTo(cx, cy - 6);
    ctx.lineTo(cx + 6, cy);
    ctx.lineTo(cx, cy + 6);
    ctx.lineTo(cx - 6, cy);
    ctx.closePath();
    ctx.fillStyle = feito ? AZUL : "rgba(236,227,190,0.1)";
    ctx.fill();
    ctx.strokeStyle = feito ? "#c9f3ff" : "rgba(236,227,190,0.35)";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();
  }
  for (let k = 0; k < VIDAS; k++) coracao(ctx, 226 - (VIDAS - 1 - k) * 22, 76, k < e.vidas);

  // Pontos e combo, no canto direito da cena
  ctx.textAlign = "right";
  ctx.strokeStyle = NOITE;
  ctx.lineWidth = 6;
  ctx.font = `700 30px ${fonte}`;
  texto(ctx, `${e.pontos}`, CENA_W - 16, 32, CREME);
  ctx.font = `700 11px ${fonte}`;
  ctx.lineWidth = 4;
  texto(ctx, recorde > 0 ? `PONTOS · RECORDE ${recorde}` : "PONTOS", CENA_W - 16, 56, "rgba(236,227,190,0.75)");
  if (e.combo > 0) {
    const desde = e.ultima ? e.t - e.ultima.em : 9;
    const pula = desde < 0.25 ? 1 + 0.25 * Math.sin((desde / 0.25) * Math.PI) : 1;
    const txt = `COMBO x${multiplicador(e.combo).toFixed(1)}`;
    ctx.font = `700 13px ${fonte}`;
    const w = ctx.measureText(txt).width + 20;
    ctx.save();
    ctx.translate(CENA_W - 16 - w / 2, 80);
    ctx.scale(pula, pula);
    ctx.fillStyle = LARANJA;
    ctx.strokeStyle = NOITE;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(-w / 2, -11, w, 22, 11);
    ctx.fill();
    ctx.stroke();
    ctx.textAlign = "center";
    ctx.fillStyle = NOITE;
    ctx.fillText(txt, 0, 1);
    ctx.restore();
  }
}

// pilula: o lembrete "Segura pra concentrar chakra" no pé da cena (com o celular em pé, quem avisa é o botão).
export function aviso(ctx: Ctx, e: Estado, fonte: string, pilula = true) {
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.strokeStyle = NOITE;
  ctx.lineJoin = "round";
  const u = e.ultima;
  if (u && e.status === "resultado") {
    const idade = e.t - u.em;
    const entra = Math.min(1, idade / 0.12);
    const esc = 0.6 + 0.4 * entra + (u.nota === "perfeito" ? 0.08 * Math.sin(Math.min(1, idade / 0.3) * Math.PI) : 0);
    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, (0.9 - idade) / 0.25));
    ctx.translate(CENA_W / 2, 176 - idade * 18);
    ctx.scale(esc, esc);
    const f = FASES[e.fase];
    const [txt, cor, brilho] =
      u.nota === "perfeito"
        ? ["PERFEITO!", "#d6f6ff", AZUL]
        : u.nota === "bom"
          ? ["Boa!", CREME, "rgba(236,227,190,0.6)"]
          : [f.falhas[u.nota], "#ff9a7e", "#ab392f"];
    ctx.font = `700 52px ${fonte}`;
    ctx.lineWidth = 10;
    ctx.strokeText(txt, 0, 0);
    ctx.shadowColor = brilho;
    ctx.shadowBlur = 20;
    ctx.fillStyle = cor;
    ctx.fillText(txt, 0, 0);
    ctx.shadowBlur = 0;
    if (u.pontos > 0) {
      ctx.lineWidth = 6;
      ctx.font = `700 24px ${fonte}`;
      texto(ctx, `+${u.pontos}`, 0, 44, LARANJA_CLARO);
    } else {
      ctx.lineWidth = 5;
      ctx.font = `700 16px ${fonte}`;
      texto(ctx, u.nota === "pouco" ? "faltou chakra" : "chakra demais", 0, 40, CREME);
    }
    ctx.restore();
  }
  if (pilula && e.status === "pronto") {
    const txt = "Segura pra concentrar chakra";
    ctx.font = `700 17px ${fonte}`;
    const w = ctx.measureText(txt).width + 36;
    ctx.globalAlpha = 0.75 + 0.25 * Math.sin(e.t * 5);
    ctx.fillStyle = "rgba(1,18,30,0.7)";
    ctx.strokeStyle = "rgba(79,195,255,0.6)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(CENA_W / 2 - w / 2, 412, w, 30, 15);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = CREME;
    ctx.fillText(txt, CENA_W / 2, 428);
    ctx.globalAlpha = 1;
  }
}
