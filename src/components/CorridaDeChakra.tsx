"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  FASES,
  H,
  VIDAS,
  W,
  apertar as apertarLogica,
  cancelar,
  multiplicador,
  novoEstado,
  rank,
  soltar as soltarLogica,
  step,
  zona,
  type Estado,
  type Status,
} from "@/lib/chakra";

type Ui = "menu" | Status;
type Faisca = { x: number; y: number; vx: number; vy: number; vida: number; cor: string; r: number; g: number };
type Onda = { x: number; y: number; em: number };

const CHAVE_RECORDE = "corrida-de-chakra:recorde";
const AZUL = "#4fc3ff";
const NOITE = "#01121e";
const CREME = "#ece3be";
const LARANJA = "#dd5d05";

function lerRecorde() {
  try {
    return Number(localStorage.getItem(CHAVE_RECORDE)) || 0;
  } catch {
    return 0;
  }
}

function salvarRecorde(n: number) {
  try {
    localStorage.setItem(CHAVE_RECORDE, String(n));
  } catch {
    // Sem storage: o recorde vale só nesta visita.
  }
}

// ---------- onde o ninja fica em cada fase ----------

type Pose = { x: number; y: number; rot: number; s: number; ax: number; ay: number };

function pose(fase: number, prog: number, falha: number): Pose {
  if (fase === 0) {
    // De lado no tronco, andando pra cima. Falha: escorrega um pouco.
    const y = 382 - prog * 64 + falha * 22;
    return { x: 250, y, rot: -Math.PI / 2, s: 1.1, ax: 214, ay: y };
  }
  if (fase === 1) {
    // Andando sobre o lago. Falha: afunda e volta.
    const x = 90 + prog * 95;
    const y = 300 + falha * 30;
    return { x, y, rot: 0, s: 1.1, ax: x, ay: y - 36 };
  }
  return { x: 190, y: 384, rot: 0, s: 1.5, ax: 190, ay: 384 - 54 };
}

// ---------- desenho ----------

function ceu(ctx: CanvasRenderingContext2D, fase: number) {
  const cores = [
    ["#0b2340", "#1f4a3c"],
    ["#07152b", "#1d3b66"],
    ["#160f38", "#3d2a5e"],
  ][fase];
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, cores[0]);
  g.addColorStop(1, cores[1]);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = CREME;
  for (let i = 0; i < 28; i++) {
    const x = (i * 137.5) % 640;
    const y = (i * 71.3) % 220;
    ctx.globalAlpha = 0.25 + ((i * 7) % 5) * 0.1;
    ctx.fillRect(x, y, 2, 2);
  }
  ctx.globalAlpha = 1;
}

function cenaArvore(ctx: CanvasRenderingContext2D, passo: number, total: number) {
  // Mata ao fundo
  ctx.fillStyle = "#123326";
  for (let i = 0; i < 9; i++) {
    const x = i * 80 - 20;
    const h = 150 + ((i * 53) % 90);
    ctx.beginPath();
    ctx.moveTo(x, 420);
    ctx.lineTo(x + 40, 420 - h);
    ctx.lineTo(x + 80, 420);
    ctx.fill();
  }
  // Chão
  ctx.fillStyle = "#1b3a22";
  ctx.fillRect(0, 410, 640, 40);
  // Tronco
  const g = ctx.createLinearGradient(250, 0, 370, 0);
  g.addColorStop(0, "#6b4426");
  g.addColorStop(0.5, "#8a5a33");
  g.addColorStop(1, "#4d2f1a");
  ctx.fillStyle = g;
  ctx.fillRect(250, 0, 120, 412);
  ctx.strokeStyle = NOITE;
  ctx.lineWidth = 3;
  ctx.strokeRect(250, -4, 120, 416);
  // Casca
  ctx.strokeStyle = "rgba(1,18,30,0.35)";
  ctx.lineWidth = 2;
  for (let i = 0; i < 14; i++) {
    const x = 262 + ((i * 37) % 96);
    const y = (i * 61) % 400;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + 4, y + 18, x, y + 34);
    ctx.stroke();
  }
  // Galho e copa lá em cima
  ctx.fillStyle = "#2c5a2e";
  ctx.beginPath();
  ctx.arc(310, -10, 110, 0, Math.PI);
  ctx.fill();
  // Marcas de kunai: cada passo é um risco no tronco
  for (let k = 1; k <= total; k++) {
    const y = 382 - k * 64;
    ctx.strokeStyle = k <= passo ? "#f2a66e" : "rgba(236,227,190,0.25)";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(254, y);
    ctx.lineTo(282, y - 6);
    ctx.stroke();
  }
}

function cenaAgua(ctx: CanvasRenderingContext2D, t: number, ondas: Onda[], passo: number, total: number) {
  // Lua
  ctx.fillStyle = "#f6f0d6";
  ctx.beginPath();
  ctx.arc(520, 86, 34, 0, Math.PI * 2);
  ctx.fill();
  // Margem do outro lado
  ctx.fillStyle = "#0d2238";
  ctx.beginPath();
  ctx.moveTo(0, 300);
  for (let x = 0; x <= 640; x += 40) ctx.lineTo(x, 286 - Math.abs(Math.sin(x * 0.02)) * 26);
  ctx.lineTo(640, 300);
  ctx.fill();
  // Lago
  const g = ctx.createLinearGradient(0, 300, 0, H);
  g.addColorStop(0, "#1d4a7a");
  g.addColorStop(1, "#08203f");
  ctx.fillStyle = g;
  ctx.fillRect(0, 300, 640, 150);
  // Reflexo da lua
  ctx.fillStyle = "rgba(246,240,214,0.18)";
  for (let i = 0; i < 6; i++) {
    const y = 316 + i * 20;
    const w = 50 - i * 5 + Math.sin(t * 2 + i) * 8;
    ctx.fillRect(520 - w / 2, y, w, 3);
  }
  // Linhas de onda
  ctx.strokeStyle = "rgba(160,210,255,0.18)";
  ctx.lineWidth = 2;
  for (let i = 0; i < 5; i++) {
    const y = 330 + i * 24;
    ctx.beginPath();
    for (let x = 0; x <= 640; x += 16) ctx.lineTo(x, y + Math.sin(x * 0.04 + t * 1.5 + i) * 3);
    ctx.stroke();
  }
  // Pedra de chegada
  ctx.fillStyle = "#3a4a5a";
  ctx.beginPath();
  ctx.ellipse(90 + total * 95 + 30, 304, 34, 12, 0, Math.PI, 0);
  ctx.fill();
  // Pegadas de chakra nos passos já dados
  ctx.fillStyle = "rgba(79,195,255,0.35)";
  for (let k = 1; k <= passo; k++) {
    ctx.beginPath();
    ctx.ellipse(90 + k * 95, 302, 10, 3, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // Ondinhas dos passos
  for (const o of ondas) {
    const idade = t - o.em;
    if (idade < 0 || idade > 1.4) continue;
    ctx.strokeStyle = `rgba(200,235,255,${0.6 * (1 - idade / 1.4)})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(o.x, o.y, 10 + idade * 50, 3 + idade * 10, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function cenaRasengan(ctx: CanvasRenderingContext2D, passo: number) {
  // Campo de treino
  ctx.fillStyle = "#241a3e";
  ctx.beginPath();
  ctx.moveTo(0, 384);
  for (let x = 0; x <= 640; x += 32) ctx.lineTo(x, 330 - Math.abs(Math.sin(x * 0.013)) * 60);
  ctx.lineTo(640, 384);
  ctx.fill();
  ctx.fillStyle = "#2e3b2a";
  ctx.fillRect(0, 384, 640, 66);
  // Postes de treino
  ctx.fillStyle = "#6b4426";
  for (const x of [60, 600]) ctx.fillRect(x, 320, 14, 66);
  // Pedra alvo, rachando a cada acerto
  ctx.fillStyle = "#6a6a78";
  ctx.strokeStyle = NOITE;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(430, 386);
  ctx.lineTo(444, 300);
  ctx.lineTo(500, 276);
  ctx.lineTo(556, 300);
  ctx.lineTo(570, 386);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  const rachas = [
    [[470, 300], [486, 330], [478, 356]],
    [[530, 296], [516, 326], [528, 360]],
    [[452, 340], [482, 344], [500, 372]],
    [[498, 282], [500, 318], [520, 340]],
  ];
  ctx.lineWidth = 2.5;
  for (let i = 0; i < Math.min(passo, rachas.length); i++) {
    ctx.beginPath();
    rachas[i].forEach(([x, y], j) => (j ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.stroke();
  }
}

function esfera(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, t: number) {
  if (r <= 0.5) return;
  const g = ctx.createRadialGradient(x, y, 0, x, y, r * 1.8);
  g.addColorStop(0, "rgba(255,255,255,0.95)");
  g.addColorStop(0.35, "rgba(140,220,255,0.9)");
  g.addColorStop(0.6, "rgba(79,195,255,0.45)");
  g.addColorStop(1, "rgba(79,195,255,0)");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r * 1.8, 0, Math.PI * 2);
  ctx.fill();
  // Espirais girando
  ctx.strokeStyle = "rgba(255,255,255,0.8)";
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 3; i++) {
    const a0 = t * 9 + (i * Math.PI * 2) / 3;
    ctx.beginPath();
    for (let k = 0; k <= 12; k++) {
      const a = a0 + k * 0.32;
      const rr = (r * k) / 12;
      ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr * 0.8);
    }
    ctx.stroke();
  }
}

// Ninja de lado, virado pra direita, com os pés em (0,0).
function ninja(ctx: CanvasRenderingContext2D, p: Pose, t: number, anda: number, bracoFrente: boolean) {
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(p.rot);
  ctx.scale(p.s, p.s);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  const sw = Math.sin(t * 10) * 0.5 * anda;
  const vento = Math.sin(t * 6);

  // Pernas
  ctx.strokeStyle = "#14213d";
  ctx.lineWidth = 6;
  for (const lado of [1, -1]) {
    const a = sw * lado;
    ctx.beginPath();
    ctx.moveTo(0, -24);
    ctx.lineTo(Math.sin(a) * 22, -24 + Math.cos(a) * 24);
    ctx.stroke();
  }
  // Fitas da bandana, voando pra trás
  ctx.strokeStyle = "#2f4f8a";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-10, -63);
  ctx.quadraticCurveTo(-20, -62 + vento * 3, -28, -58 + vento * 5);
  ctx.moveTo(-10, -62);
  ctx.quadraticCurveTo(-18, -58 + vento * 2, -24, -52 + vento * 4);
  ctx.stroke();
  // Corpo
  ctx.fillStyle = "#1d3557";
  ctx.strokeStyle = NOITE;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.roundRect(-9, -48, 18, 27, 5);
  ctx.fill();
  ctx.stroke();
  // Cachecol
  ctx.fillStyle = LARANJA;
  ctx.beginPath();
  ctx.roundRect(-10, -49, 20, 6, 3);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-8, -46);
  ctx.quadraticCurveTo(-18, -44 + vento * 3, -24, -38 + vento * 4);
  ctx.lineTo(-20, -36 + vento * 4);
  ctx.quadraticCurveTo(-14, -42, -6, -43);
  ctx.fill();
  // Braço
  ctx.strokeStyle = "#1d3557";
  ctx.lineWidth = 5.5;
  ctx.beginPath();
  ctx.moveTo(0, -43);
  if (bracoFrente) ctx.lineTo(19, -40);
  else ctx.lineTo(-Math.sin(sw) * 12, -27);
  ctx.stroke();
  // Cabeça
  ctx.fillStyle = "#f1c79a";
  ctx.strokeStyle = NOITE;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(0, -58, 11, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  // Cabelo espetado
  ctx.fillStyle = "#2a2a2a";
  ctx.beginPath();
  ctx.moveTo(-12, -60);
  ctx.lineTo(-16, -70);
  ctx.lineTo(-8, -68);
  ctx.lineTo(-6, -78);
  ctx.lineTo(1, -70);
  ctx.lineTo(7, -76);
  ctx.lineTo(9, -67);
  ctx.lineTo(12, -62);
  ctx.closePath();
  ctx.fill();
  // Bandana com placa lisa
  ctx.fillStyle = "#2f4f8a";
  ctx.fillRect(-11, -66, 22, 5);
  ctx.fillStyle = "#c9ccd6";
  ctx.fillRect(-2, -67.5, 11, 7);
  // Olho
  ctx.fillStyle = NOITE;
  ctx.beginPath();
  ctx.arc(6, -56, 1.8, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function aura(ctx: CanvasRenderingContext2D, x: number, y: number, forca: number, passou: boolean, t: number) {
  if (forca <= 0.01) return;
  const r = 30 + forca * 34 + Math.sin(t * 18) * 3;
  const cor = passou ? "255,120,80" : "79,195,255";
  const g = ctx.createRadialGradient(x, y, 4, x, y, r);
  g.addColorStop(0, `rgba(${cor},${0.15 + forca * 0.35})`);
  g.addColorStop(1, `rgba(${cor},0)`);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

function barra(ctx: CanvasRenderingContext2D, e: Estado, fonte: string) {
  ctx.fillStyle = "rgba(1,18,30,0.55)";
  ctx.fillRect(640, 0, 160, H);
  const x = 690;
  const y0 = 64;
  const h = 330;
  const w = 60;
  const yDe = (v: number) => y0 + h * (1 - v);

  ctx.font = `700 15px ${fonte}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = CREME;
  ctx.fillText("CHAKRA", x + w / 2, 40);

  ctx.fillStyle = "#0b1a2a";
  ctx.beginPath();
  ctx.roundRect(x, y0, w, h, 8);
  ctx.fill();

  // Faixa certa e o miolo "perfeito"
  const z = zona(e);
  const mostra = e.status === "pronto" || e.status === "carregando" || e.status === "resultado";
  if (mostra) {
    ctx.fillStyle = "rgba(124,194,67,0.45)";
    ctx.fillRect(x, yDe(z.centro + z.largura / 2), w, h * z.largura);
    ctx.fillStyle = "rgba(200,240,140,0.85)";
    const miolo = z.largura * 0.35;
    ctx.fillRect(x, yDe(z.centro + miolo / 2), w, h * miolo);
  }

  // Carga
  if (e.carga > 0) {
    const passou = e.carga > z.centro + z.largura / 2;
    const g = ctx.createLinearGradient(0, y0 + h, 0, y0);
    g.addColorStop(0, "#1a6fb0");
    g.addColorStop(1, passou ? "#ff7a50" : AZUL);
    ctx.fillStyle = g;
    ctx.globalAlpha = 0.85;
    ctx.fillRect(x + 8, yDe(e.carga), w - 16, h * e.carga);
    ctx.globalAlpha = 1;
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x - 6, yDe(e.carga));
    ctx.lineTo(x + w + 6, yDe(e.carga));
    ctx.stroke();
  }

  // Topo da barra: daqui estoura
  ctx.fillStyle = "#ab392f";
  ctx.fillRect(x, y0, w, 6);
  ctx.strokeStyle = CREME;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(x, y0, w, h, 8);
  ctx.stroke();
}

function texto(ctx: CanvasRenderingContext2D, s: string, x: number, y: number, cor: string) {
  ctx.strokeText(s, x, y);
  ctx.fillStyle = cor;
  ctx.fillText(s, x, y);
}

function hud(ctx: CanvasRenderingContext2D, e: Estado, recorde: number, fonte: string) {
  const f = FASES[e.fase];
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.lineJoin = "round";
  ctx.strokeStyle = NOITE;
  ctx.lineWidth = 5;
  ctx.font = `700 20px ${fonte}`;
  texto(ctx, `Fase ${e.fase + 1}/3 · ${f.nome}`, 16, 14, CREME);
  ctx.font = `700 16px ${fonte}`;
  const combo = e.combo > 0 ? `  combo x${multiplicador(e.combo).toFixed(1)}` : "";
  texto(ctx, `${e.pontos} pts${combo}`, 16, 42, "#f2a66e");
  if (recorde > 0) texto(ctx, `recorde ${recorde}`, 16, 64, "rgba(236,227,190,0.7)");

  // Passos da fase
  for (let k = 0; k < f.passos; k++) {
    ctx.beginPath();
    ctx.arc(26 + k * 20, 98, 6, 0, Math.PI * 2);
    ctx.fillStyle = k < e.passo ? AZUL : "rgba(236,227,190,0.2)";
    ctx.fill();
    ctx.strokeStyle = NOITE;
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  // Vidas: gotinhas de chakra
  for (let k = 0; k < VIDAS; k++) {
    const x = 26 + k * 22;
    const y = 124;
    ctx.beginPath();
    ctx.moveTo(x, y - 9);
    ctx.quadraticCurveTo(x + 8, y, x, y + 7);
    ctx.quadraticCurveTo(x - 8, y, x, y - 9);
    ctx.fillStyle = k < e.vidas ? "#ff6b6b" : "rgba(236,227,190,0.15)";
    ctx.fill();
    ctx.stroke();
  }
}

function aviso(ctx: CanvasRenderingContext2D, e: Estado, fonte: string) {
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.strokeStyle = NOITE;
  ctx.lineJoin = "round";
  const u = e.ultima;
  if (u && e.status === "resultado") {
    const idade = e.t - u.em;
    const esc = 0.8 + 0.2 * Math.min(1, idade / 0.12);
    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, (0.9 - idade) / 0.25));
    ctx.translate(320, 190 - idade * 20);
    ctx.scale(esc, esc);
    ctx.lineWidth = 8;
    ctx.font = `700 48px ${fonte}`;
    const f = FASES[e.fase];
    const [txt, cor] =
      u.nota === "perfeito" ? ["Perfeito!", "#c8f0ff"] : u.nota === "bom" ? ["Boa!", CREME] : [f.falhas[u.nota], "#ff8a6e"];
    texto(ctx, txt, 0, 0, cor);
    if (u.pontos > 0) {
      ctx.lineWidth = 5;
      ctx.font = `700 22px ${fonte}`;
      texto(ctx, `+${u.pontos}`, 0, 40, "#f2a66e");
    }
    ctx.restore();
  }
  if (e.status === "pronto") {
    ctx.globalAlpha = 0.6 + 0.4 * Math.sin(e.t * 5);
    ctx.lineWidth = 5;
    ctx.font = `700 20px ${fonte}`;
    texto(ctx, "Segura pra concentrar chakra", 320, 432, CREME);
    ctx.globalAlpha = 1;
  }
}

// ---------- componente ----------

export function CorridaDeChakra() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // Rand fixo na renderização; cada partida sorteia o seu.
  const estado = useRef<Estado>(novoEstado(() => 0.5));
  const ui = useRef<Ui>("menu");
  const recorde = useRef(0);
  const [uiState, setUiState] = useState<Ui>("menu");
  const [faseUi, setFaseUi] = useState(0);
  const [fim, setFim] = useState<{ pontos: number; novo: boolean; recorde: number; acertos: number; perfeitos: number; venceu: boolean } | null>(null);

  const mudarUi = useCallback((u: Ui) => {
    ui.current = u;
    setUiState(u);
    setFaseUi(estado.current.fase);
  }, []);

  const comecar = useCallback(() => {
    estado.current = novoEstado();
    setFim(null);
    mudarUi("intro");
  }, [mudarUi]);

  const apertar = useCallback(() => {
    const u = ui.current;
    if (u === "menu") comecar();
    else if (u !== "fim" && u !== "vitoria") apertarLogica(estado.current);
  }, [comecar]);

  const soltar = useCallback(() => {
    soltarLogica(estado.current);
  }, []);

  const comecarFase = useCallback(() => {
    if (estado.current.status === "intro") apertarLogica(estado.current);
  }, []);

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
    let prog = 0; // passo animado, anda atrás do passo de verdade
    let faseVista = 0;
    let falhaEm = -99;
    let ultimaVista: number | null = null;
    let relogio = 0;
    let faiscas: Faisca[] = [];
    let ondas: Onda[] = [];
    let sacode = 0;

    const espalhar = (x: number, y: number, n: number, cor: string, vel: number, gravidade = 300) => {
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2;
        const v = vel * (0.4 + Math.random() * 0.8);
        faiscas.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, vida: 0.6 + Math.random() * 0.4, cor, r: 2 + Math.random() * 2, g: gravidade });
      }
    };

    const frame = (agora: number) => {
      const dt = Math.min(1 / 30, (agora - antes) / 1000);
      antes = agora;
      relogio += dt;
      const e = estado.current;
      const emJogo = ui.current !== "menu";

      if (emJogo) {
        step(e, dt);
        if (e.status !== ui.current) {
          if (e.status === "fim" || e.status === "vitoria") {
            const novo = e.pontos > recorde.current;
            if (novo) {
              recorde.current = e.pontos;
              salvarRecorde(e.pontos);
            }
            setFim({ pontos: e.pontos, novo, recorde: recorde.current, acertos: e.acertos, perfeitos: e.perfeitos, venceu: e.status === "vitoria" });
          }
          mudarUi(e.status);
        }
      }

      if (e.fase !== faseVista) {
        faseVista = e.fase;
        prog = 0;
        ondas = [];
      }
      prog += (e.passo - prog) * Math.min(1, dt * 8);

      // Reação ao último passo (uma vez por passo)
      const p0 = pose(e.fase, prog, 0);
      if (e.ultima && e.ultima.em !== ultimaVista) {
        ultimaVista = e.ultima.em;
        const acerto = e.ultima.nota === "perfeito" || e.ultima.nota === "bom";
        if (acerto) {
          espalhar(p0.ax, p0.ay, e.ultima.nota === "perfeito" ? 26 : 14, AZUL, 220, 0);
          if (e.fase === 1) ondas.push({ x: 90 + e.passo * 95, y: 302, em: relogio });
        } else {
          falhaEm = relogio;
          sacode = 0.3;
          const cor = e.fase === 0 ? "#8a5a33" : e.fase === 1 ? "#bfe6ff" : AZUL;
          espalhar(e.fase === 2 ? 240 : p0.ax, e.fase === 2 ? 320 : p0.ay, 22, cor, 260, e.fase === 2 ? 0 : 500);
          if (e.fase === 1) ondas.push({ x: p0.x, y: 304, em: relogio });
        }
      }
      const idadeFalha = relogio - falhaEm;
      const falha = idadeFalha < 0.7 ? Math.sin((idadeFalha / 0.7) * Math.PI) : 0;
      const p = pose(e.fase, prog, falha);

      // Fagulhas de chakra subindo enquanto segura
      if (e.status === "carregando" && Math.random() < 0.6) {
        faiscas.push({
          x: p.ax + (Math.random() - 0.5) * 40,
          y: p.ay + 20,
          vx: (Math.random() - 0.5) * 30,
          vy: -60 - Math.random() * 80 * (1 + e.carga),
          vida: 0.6,
          cor: AZUL,
          r: 2,
          g: 0,
        });
      }
      for (const f of faiscas) {
        f.x += f.vx * dt;
        f.y += f.vy * dt;
        f.vy += f.g * dt;
        f.vida -= dt;
      }
      faiscas = faiscas.filter((f) => f.vida > 0);
      sacode = Math.max(0, sacode - dt);

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (sacode > 0) ctx.translate((Math.random() - 0.5) * 30 * sacode, (Math.random() - 0.5) * 30 * sacode);
      ceu(ctx, e.fase);
      const f = FASES[e.fase];
      if (e.fase === 0) cenaArvore(ctx, e.passo, f.passos);
      else if (e.fase === 1) cenaAgua(ctx, relogio, ondas, e.passo, f.passos);
      else cenaRasengan(ctx, e.passo);

      const z = zona(e);
      aura(ctx, p.ax, p.ay, e.status === "carregando" ? e.carga : 0, e.carga > z.centro + z.largura / 2, relogio);
      const andando = e.fase !== 2 && Math.abs(e.passo - prog) > 0.05 ? 1 : 0;
      const parado = !emJogo && e.fase !== 2 ? 0.25 : 0; // no menu ele "marcha" de leve
      ninja(ctx, p, relogio, Math.max(andando, parado), e.fase === 2);

      if (e.fase === 2) {
        // A esfera cresce a cada acerto e incha enquanto segura
        const base = 6 + prog * 7;
        const extra = e.status === "carregando" ? e.carga * 12 : 0;
        const r = falha > 0 ? base * (1 - falha * 0.6) : base + extra;
        esfera(ctx, p.x + 19 * p.s + r * 0.6, p.y - 40 * p.s, r, relogio);
      }

      for (const fa of faiscas) {
        ctx.globalAlpha = Math.max(0, Math.min(1, fa.vida * 2));
        ctx.fillStyle = fa.cor;
        ctx.beginPath();
        ctx.arc(fa.x, fa.y, fa.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      if (emJogo) {
        barra(ctx, e, fonte);
        hud(ctx, e, recorde.current, fonte);
        aviso(ctx, e, fonte);
      }

      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    const teclas = ["Space", "ArrowUp", "KeyW", "Enter"];
    const onKeyDown = (ev: KeyboardEvent) => {
      if (!teclas.includes(ev.code)) return;
      const alvo = ev.target as HTMLElement | null;
      if (alvo && ["INPUT", "TEXTAREA", "SELECT", "BUTTON", "A"].includes(alvo.tagName)) return;
      ev.preventDefault();
      if (!ev.repeat) apertar();
    };
    const onKeyUp = (ev: KeyboardEvent) => {
      if (teclas.includes(ev.code)) soltar();
    };
    // Trocou de aba segurando: joga fora a carga em vez de julgar.
    const onSumiu = () => cancelar(estado.current);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onSumiu);
    document.addEventListener("visibilitychange", onSumiu);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onSumiu);
      document.removeEventListener("visibilitychange", onSumiu);
    };
  }, [apertar, soltar, mudarUi]);

  const fase = FASES[faseUi];
  const r = fim ? rank(fim.pontos, fim.venceu) : null;

  return (
    <div
      className="relative w-full select-none overflow-hidden rounded-lg border-[6px] border-creme bg-noite shadow-[0_10px_30px_rgb(0_0_0/0.35)]"
      style={{ aspectRatio: `${W} / ${H}`, touchAction: "none", WebkitTouchCallout: "none" }}
      onPointerDown={(ev) => {
        if ((ev.target as HTMLElement).closest("button")) return;
        ev.currentTarget.setPointerCapture(ev.pointerId);
        apertar();
      }}
      onPointerUp={soltar}
      onPointerCancel={() => cancelar(estado.current)}
      onContextMenu={(ev) => ev.preventDefault()}
    >
      <canvas ref={canvasRef} className="block h-full w-full" aria-label="Corrida de Chakra: jogo de segurar e soltar na hora certa" />

      {uiState === "menu" && (
        <div className="absolute inset-0 flex flex-col items-center justify-end gap-3 bg-gradient-to-t from-noite/85 via-noite/20 to-transparent p-5 text-center sm:justify-center sm:bg-noite/45">
          <h2 className="font-titulo text-4xl font-bold leading-none text-creme sm:text-6xl" style={{ textShadow: "3px 3px 0 #01121e" }}>
            Corrida de Chakra
          </h2>
          <p className="max-w-md text-sm text-creme sm:text-base">
            <strong>Segura</strong> pra concentrar chakra, <strong>solta</strong> quando a barra estiver na faixa verde.
          </p>
          <button type="button" onClick={comecar} className="btn bg-laranja text-noite !px-6 !py-2.5 !text-lg">
            Jogar
          </button>
        </div>
      )}

      {uiState === "intro" && (
        <div className="absolute inset-0 flex items-center justify-center bg-noite/45 p-3">
          <div className="card flex w-full max-w-sm flex-col items-center gap-1.5 !p-4 text-center sm:gap-2 sm:!p-6">
            <span className="etiqueta text-[11px] text-estrela">Fase {faseUi + 1} de {FASES.length}</span>
            <p className="font-titulo text-3xl font-bold leading-none text-azul sm:text-4xl">{fase.nome}</p>
            <p className="text-sm leading-snug text-tinta sm:text-base">{fase.dica}</p>
            <p className="etiqueta text-[11px] text-neutro">{fase.passos} acertos pra passar</p>
            <button type="button" onClick={comecarFase} className="btn mt-1 bg-laranja text-noite !px-5 !py-2 !text-base">
              Começar
            </button>
          </div>
        </div>
      )}

      {(uiState === "fim" || uiState === "vitoria") && fim && r && (
        <div className="absolute inset-0 flex items-center justify-center bg-noite/55 p-3">
          <div className="card flex w-full max-w-sm flex-col items-center gap-1.5 !p-4 text-center sm:gap-2 sm:!p-6">
            <span className="etiqueta text-[11px] text-estrela">{fim.novo ? "Novo recorde!" : `recorde ${fim.recorde} pontos`}</span>
            <p className="font-titulo text-4xl font-bold leading-none text-azul sm:text-5xl">{fim.pontos} pts</p>
            <p className="etiqueta text-[11px] text-azul">
              {fim.venceu ? "passou pelas 3 fases" : `parou em ${fase.nome.toLowerCase()}`} · {fim.acertos} acertos · {fim.perfeitos} perfeitos
            </p>
            <p className="font-titulo text-lg font-bold leading-tight sm:text-xl">{r.titulo}</p>
            <p className="text-sm text-tinta">{r.texto}</p>
            <button type="button" onClick={comecar} className="btn mt-1 bg-laranja text-noite !px-5 !py-2 !text-base">
              Jogar de novo
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
