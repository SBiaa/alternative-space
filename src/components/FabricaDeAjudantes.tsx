"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  BANCADA,
  CAIXA,
  H,
  IDS,
  MELHORIAS,
  W,
  acalmar,
  apertar,
  apertosPorSeg,
  caos,
  capacidade,
  carregar,
  comprar,
  custo,
  desistir,
  emPane,
  formatar,
  novoEstado,
  paciencia,
  paraSalvar,
  porAperto,
  step,
  titulo,
  type Ajudante,
  type Estado,
  type MelhoriaId,
} from "@/lib/ajudantes";

const CHAVE = "fabrica-de-ajudantes:v1";
const NOITE = "#01121e";

type Particula = { x: number; y: number; vx: number; vy: number; vida: number; max: number; r: number; cor: string };
type Texto = { x: number; y: number; texto: string; cor: string; vida: number; grande?: boolean };

type Ui = {
  favores: number;
  cumpridos: number;
  pedido: Estado["pedido"];
  melhorias: Estado["melhorias"];
  bloqueados: MelhoriaId[];
  ajudantes: number;
  pane: number;
  caos: number;
};

function fotografar(e: Estado): Ui {
  return {
    favores: e.favores,
    cumpridos: e.cumpridos,
    pedido: { ...e.pedido },
    melhorias: { ...e.melhorias },
    bloqueados: [...e.bloqueados],
    ajudantes: e.ajudantes.length,
    pane: emPane(e),
    caos: caos(e),
  };
}

function lerSalvo(): unknown {
  try {
    const s = localStorage.getItem(CHAVE);
    return s ? JSON.parse(s) : null;
  } catch {
    return null;
  }
}

function salvar(e: Estado) {
  try {
    localStorage.setItem(CHAVE, JSON.stringify(paraSalvar(e)));
  } catch {
    // Sem storage (aba anônima, bloqueado): o progresso vale só nesta visita.
  }
}

// ---------- desenho ----------

function misturar(a: string, b: string, t: number) {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  return `rgb(${pa.map((v, i) => Math.round(v + (pb[i] - v) * t)).join(",")})`;
}

function cenario(ctx: CanvasRenderingContext2D, semPane: number, fonte: string) {
  // Parede
  ctx.fillStyle = "#d6deec";
  ctx.fillRect(0, 0, W, 96);
  ctx.fillStyle = "rgba(9,63,122,0.06)";
  for (let x = 0; x < W; x += 40) ctx.fillRect(x, 0, 20, 96);
  // Chão
  ctx.fillStyle = "#efe6c4";
  ctx.fillRect(0, 96, W, H - 96);
  ctx.strokeStyle = "rgba(1,18,30,0.07)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let x = 0; x < W; x += 64) {
    ctx.moveTo(x, 96);
    ctx.lineTo(x - 30, H);
  }
  for (let y = 140; y < H; y += 56) {
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
  }
  ctx.stroke();
  ctx.fillStyle = NOITE;
  ctx.fillRect(0, 94, W, 4);

  // Faixa zebrada em volta da caixa
  ctx.save();
  ctx.beginPath();
  ctx.rect(CAIXA.x - 62, CAIXA.y - 50, 124, 100);
  ctx.clip();
  for (let i = -10; i < 20; i++) {
    ctx.fillStyle = i % 2 ? "#f2c230" : NOITE;
    ctx.beginPath();
    ctx.moveTo(CAIXA.x - 62 + i * 14, CAIXA.y + 50);
    ctx.lineTo(CAIXA.x - 62 + i * 14 + 14, CAIXA.y + 50);
    ctx.lineTo(CAIXA.x - 62 + i * 14 + 114, CAIXA.y - 50);
    ctx.lineTo(CAIXA.x - 62 + i * 14 + 100, CAIXA.y - 50);
    ctx.fill();
  }
  ctx.restore();
  ctx.fillStyle = "#efe6c4";
  ctx.fillRect(CAIXA.x - 54, CAIXA.y - 42, 108, 84);

  // Placa de segurança do trabalho
  ctx.fillStyle = "#fff";
  ctx.strokeStyle = NOITE;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(W - 268, 16, 248, 62, 8);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = NOITE;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `700 13px ${fonte}`;
  ctx.fillText("ESTAMOS HÁ", W - 144, 32);
  ctx.font = `700 24px ${fonte}`;
  ctx.fillStyle = semPane < 5 ? "#ab392f" : "#093f7a";
  const s = Math.floor(semPane);
  ctx.fillText(`${s} segundo${s === 1 ? "" : "s"}`, W - 144, 52);
  ctx.font = `700 11px ${fonte}`;
  ctx.fillStyle = NOITE;
  ctx.fillText("SEM NENHUMA PANE", W - 144, 69);
}

function caixa(ctx: CanvasRenderingContext2D, pulo: number, fonte: string) {
  const { x, y } = CAIXA;
  const l = Math.sin(Math.min(1, pulo) * Math.PI) * 14;
  ctx.lineWidth = 3;
  ctx.strokeStyle = NOITE;
  ctx.fillStyle = "#2f78c4";
  ctx.beginPath();
  ctx.roundRect(x - 36, y - 26, 72, 54, 6);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#fff";
  ctx.font = `700 10px ${fonte}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("AJUDANTES", x, y + 8);
  // Tampa
  ctx.fillStyle = "#3d8ad6";
  ctx.beginPath();
  ctx.roundRect(x - 40, y - 36 - l, 80, 12, 4);
  ctx.fill();
  ctx.stroke();
  // Botão
  ctx.fillStyle = "#dd5d05";
  ctx.beginPath();
  ctx.ellipse(x, y - 39 - l + pulo * 2, 12, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
}

function bancada(ctx: CanvasRenderingContext2D, progresso: number, absurdo: boolean, t: number) {
  const { x, y } = BANCADA;
  ctx.lineWidth = 3;
  ctx.strokeStyle = NOITE;
  // Pernas
  ctx.fillStyle = "#8a5a2b";
  ctx.fillRect(x - 64, y - 4, 8, 34);
  ctx.fillRect(x + 56, y - 4, 8, 34);
  ctx.strokeRect(x - 64, y - 4, 8, 34);
  ctx.strokeRect(x + 56, y - 4, 8, 34);
  // Tampo
  ctx.fillStyle = "#b07a43";
  ctx.beginPath();
  ctx.roundRect(x - 76, y - 14, 152, 14, 4);
  ctx.fill();
  ctx.stroke();
  // O "pedido": uma caixa de papelão que vai ficando arrumada
  const balanco = absurdo ? Math.sin(t * 6) * 0.08 : 0;
  ctx.save();
  ctx.translate(x, y - 14);
  ctx.rotate(balanco);
  ctx.fillStyle = absurdo ? "#f2a66e" : "#d9b77e";
  ctx.beginPath();
  ctx.roundRect(-24, -40, 48, 40, 3);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = NOITE;
  ctx.font = "700 22px system-ui";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(absurdo ? "?!" : "?", 0, -20);
  ctx.restore();
  // Barra de progresso em cima
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.roundRect(x - 50, y - 76, 100, 12, 6);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = absurdo ? "#dd5d05" : "#2f78c4";
  ctx.beginPath();
  ctx.roundRect(x - 48, y - 74, 96 * Math.min(1, progresso), 8, 4);
  ctx.fill();
}

function boneco(ctx: CanvasRenderingContext2D, a: Ajudante, pac: number, t: number) {
  const stress = Math.min(1, a.idade / pac);
  const nasc = Math.min(1, a.idade / 0.25);
  const andando = Math.abs(a.vx) + Math.abs(a.vy) > 15;
  const jit = a.pane ? Math.sin(t * 70 + a.id) * 2 : 0;
  ctx.save();
  ctx.translate(a.x + jit, a.y);
  ctx.scale(nasc * (a.vx < -5 ? -1 : 1), nasc);

  ctx.fillStyle = "rgba(1,18,30,0.18)";
  ctx.beginPath();
  ctx.ellipse(0, 0, 14, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  const cor = a.pane ? (Math.sin(t * 20 + a.id) > 0 ? "#3d7be0" : "#5b8fe8") : misturar("#86cdf6", "#4f9be6", stress);
  const passo = a.pane ? Math.sin(t * 28 + a.id) * 6 : andando ? Math.sin(t * 14 + a.id) * 4 : 0;
  ctx.strokeStyle = NOITE;
  ctx.lineCap = "round";
  ctx.lineWidth = 3;

  // Pernas
  ctx.beginPath();
  ctx.moveTo(-5, -16);
  ctx.lineTo(-5 + passo, 0);
  ctx.moveTo(5, -16);
  ctx.lineTo(5 - passo, 0);
  ctx.stroke();

  // Braços (atrás do corpo)
  const trab = !a.pane && !andando ? Math.sin(t * 12 + a.id) * 6 : 0;
  ctx.lineWidth = 3;
  ctx.beginPath();
  if (a.pane) {
    ctx.moveTo(-8, -34);
    ctx.lineTo(-18, -56 + Math.sin(t * 30 + a.id) * 5);
    ctx.moveTo(8, -34);
    ctx.lineTo(18, -56 + Math.cos(t * 30 + a.id) * 5);
  } else {
    ctx.moveTo(-8, -34);
    ctx.lineTo(-17, -22 + trab);
    ctx.moveTo(8, -34);
    ctx.lineTo(19, -28 - trab);
  }
  ctx.stroke();

  // Corpo
  ctx.fillStyle = cor;
  ctx.beginPath();
  ctx.roundRect(-10, -42, 20, 28, 9);
  ctx.fill();
  ctx.stroke();

  // Cabeça
  ctx.beginPath();
  ctx.arc(0, -52, 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Olhos
  const rOlho = a.pane ? 5 : 4;
  for (const ox of [-4.5, 4.5]) {
    ctx.fillStyle = "#fff";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(ox, -55, rOlho, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = NOITE;
    ctx.beginPath();
    ctx.arc(ox + (a.pane ? Math.sin(t * 40 + ox) * 1.5 : 1), -55, a.pane ? 1.2 : 1.8, 0, Math.PI * 2);
    ctx.fill();
  }

  // Boca
  ctx.lineWidth = 2;
  ctx.beginPath();
  if (a.pane) {
    ctx.fillStyle = NOITE;
    ctx.ellipse(0, -45, 4, 3.5 + Math.abs(Math.sin(t * 25)) * 1.5, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (stress > 0.65) {
    ctx.moveTo(-4, -45);
    ctx.lineTo(-1, -46.5);
    ctx.lineTo(2, -45);
    ctx.lineTo(4, -46);
    ctx.stroke();
  } else {
    ctx.arc(0, -48, 4, 0.2 * Math.PI, 0.8 * Math.PI);
    ctx.stroke();
  }

  // Suor quando a paciência está acabando
  if (!a.pane && stress > 0.6) {
    const gy = -60 + ((t * 30 + a.id * 7) % 14);
    ctx.fillStyle = "#bfe6ff";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(14, gy - 5);
    ctx.quadraticCurveTo(18, gy + 1, 14, gy + 3);
    ctx.quadraticCurveTo(10, gy + 1, 14, gy - 5);
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();

  // Barrinha de paciência em cima da cabeça: esvazia até a pane.
  if (!a.pane && nasc >= 1) {
    const resta = 1 - stress;
    const bx = a.x - 14;
    const by = a.y - 76;
    ctx.fillStyle = "#fff";
    ctx.strokeStyle = NOITE;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(bx, by, 28, 6, 3);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = resta > 0.5 ? "#4caf50" : resta > 0.25 ? "#f2c230" : "#ab392f";
    ctx.beginPath();
    ctx.roundRect(bx + 1, by + 1, 26 * resta, 4, 2);
    ctx.fill();
  }
}

function balao(ctx: CanvasRenderingContext2D, a: Ajudante, fonte: string) {
  if (!a.fala) return;
  ctx.font = `700 12px ${fonte}`;
  const w = Math.min(220, ctx.measureText(a.fala.texto).width + 16);
  const x = Math.max(8, Math.min(W - w - 8, a.x - w / 2));
  const y = Math.max(8, a.y - 100);
  ctx.fillStyle = a.pane ? "#fff1ec" : "#fff";
  ctx.strokeStyle = a.pane ? "#ab392f" : NOITE;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(x, y, w, 24, 8);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(a.x - 5, y + 24);
  ctx.lineTo(a.x, y + 32);
  ctx.lineTo(a.x + 5, y + 24);
  ctx.fill();
  ctx.fillStyle = a.pane ? "#ab392f" : NOITE;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(a.fala.texto, x + w / 2, y + 12.5, w - 10);
}

// ---------- componente ----------

export function FabricaDeAjudantes() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const tremeRef = useRef<HTMLDivElement>(null);
  // Rand fixo na renderização (o Next não aceita Math.random() aqui); o estado real vem no efeito.
  const estado = useRef<Estado>(novoEstado(() => 0.5));
  const particulas = useRef<Particula[]>([]);
  const textos = useRef<Texto[]>([]);
  const tremor = useRef(0);
  const pulo = useRef(0);
  const semPane = useRef(0);
  const [ui, setUi] = useState<Ui>(() => fotografar(novoEstado(() => 0.5)));
  const [aviso, setAviso] = useState<{ texto: string; cor: "azul" | "vermelho"; id: number } | null>(null);

  const avisar = useCallback((texto: string, cor: "azul" | "vermelho") => {
    setAviso({ texto, cor, id: Date.now() + Math.random() });
  }, []);

  const apertarCaixa = useCallback(() => {
    apertar(estado.current);
    pulo.current = 1;
  }, []);

  useEffect(() => {
    if (!aviso) return;
    const t = setTimeout(() => setAviso(null), 2600);
    return () => clearTimeout(t);
  }, [aviso]);

  useEffect(() => {
    estado.current = carregar(lerSalvo());
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    const fonte = getComputedStyle(document.body).getPropertyValue("--font-fredoka").trim() || "system-ui";

    let raf = 0;
    let antes = performance.now();
    let ultimaUi = 0;
    let ultimoSave = performance.now();

    const nuvem = (x: number, y: number, n: number, cor: string) => {
      for (let i = 0; i < n; i++) {
        const ang = Math.random() * Math.PI * 2;
        const v = 30 + Math.random() * 90;
        const vida = 0.4 + Math.random() * 0.3;
        particulas.current.push({ x, y: y - 30, vx: Math.cos(ang) * v, vy: Math.sin(ang) * v - 20, vida, max: vida, r: 5 + Math.random() * 7, cor });
      }
    };
    const flutuar = (x: number, y: number, texto: string, cor: string, grande = false) => {
      textos.current.push({ x, y, texto, cor, vida: grande ? 1.6 : 1.1, grande });
    };

    const tick = (agora: number) => {
      // O jogo anda em tempo real mesmo se o navegador engasgar: o tempo passado
      // (até 1s) é simulado em passos pequenos. Efeitos visuais usam o dt curto.
      const passou = Math.min(1, Math.max(0, (agora - antes) / 1000));
      antes = agora;
      const dt = Math.min(0.1, passou);
      const e = estado.current;
      const passos = Math.ceil(passou / (1 / 30));
      for (let i = 0; i < passos; i++) step(e, passou / passos);

      for (const ev of e.eventos) {
        if (ev.tipo === "poof") nuvem(ev.x, ev.y, 6, "#ffffff");
        else if (ev.tipo === "nasceu") nuvem(ev.x, ev.y + 20, 3, "#bfe6ff");
        else if (ev.tipo === "cumprido") {
          flutuar(BANCADA.x, BANCADA.y - 90, `+${formatar(ev.recompensa)} favores`, "#093f7a", true);
          for (let i = 0; i < 20; i++) nuvem(BANCADA.x, BANCADA.y - 20, 1, ["#f2c230", "#86cdf6", "#dd5d05"][i % 3]);
          avisar(`Pedido cumprido: ${ev.texto}`, "azul");
        } else if (ev.tipo === "pane") {
          tremor.current = Math.min(1, tremor.current + 0.25);
          semPane.current = 0;
          flutuar(ev.x, ev.y - 70, "PANE!", "#ab392f");
        } else if (ev.tipo === "roubo") {
          tremor.current = Math.min(1, tremor.current + 0.3);
          flutuar(ev.x, ev.y - 70, `-${formatar(ev.valor)}`, "#ab392f");
          avisar(`Um ajudante em pane derrubou o cofrinho: -${formatar(ev.valor)} favores`, "vermelho");
        } else if (ev.tipo === "contagio") flutuar(ev.x, ev.y - 70, "!!", "#dd5d05");
        else if (ev.tipo === "apertou") {
          pulo.current = 1;
          flutuar(ev.x, ev.y - 70, "aperta, aperta!", "#ab392f");
        } else if (ev.tipo === "sentou") {
          tremor.current = Math.min(1, tremor.current + 0.4);
          avisar(`Um ajudante sentou em cima de "${MELHORIAS[ev.id].nome}"!`, "vermelho");
        } else if (ev.tipo === "ajuda") flutuar(BANCADA.x + (Math.random() - 0.5) * 60, BANCADA.y - 40, "+", "#2f78c4");
      }
      e.eventos = [];

      semPane.current += dt;
      if (emPane(e) > 0) semPane.current = 0;
      const c = caos(e);
      tremor.current = Math.max(c * 0.35, tremor.current - dt * 1.5);
      pulo.current = Math.max(0, pulo.current - dt * 5);
      for (const p of particulas.current) {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vx *= 1 - dt * 3;
        p.vy *= 1 - dt * 3;
        p.vida -= dt;
      }
      particulas.current = particulas.current.filter((p) => p.vida > 0);
      for (const tx of textos.current) {
        tx.y -= dt * 40;
        tx.vida -= dt;
      }
      textos.current = textos.current.filter((tx) => tx.vida > 0);

      // Tremedeira da tela inteira do jogo, não só do canvas.
      const tr = tremor.current;
      if (tremeRef.current) {
        tremeRef.current.style.transform =
          tr > 0.02
            ? `translate(${(Math.random() - 0.5) * 10 * tr}px, ${(Math.random() - 0.5) * 8 * tr}px) rotate(${(Math.random() - 0.5) * 1.6 * tr}deg)`
            : "";
      }

      // ---- desenho ----
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cenario(ctx, semPane.current, fonte);
      caixa(ctx, pulo.current, fonte);
      bancada(ctx, e.pedido.feito / e.pedido.trabalho, e.pedido.absurdo, e.tempo);
      const pac = paciencia(e.melhorias);
      const ordem = [...e.ajudantes].sort((a, b) => a.y - b.y);
      for (const a of ordem) boneco(ctx, a, pac, e.tempo);
      for (const p of particulas.current) {
        ctx.globalAlpha = Math.max(0, p.vida / p.max);
        ctx.fillStyle = p.cor;
        ctx.strokeStyle = "rgba(1,18,30,0.25)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * (1.4 - p.vida / p.max * 0.4), 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      // Balões: os de pane primeiro, no máximo 4 na tela.
      const falando = ordem.filter((a) => a.fala).sort((a, b) => Number(b.pane) - Number(a.pane)).slice(0, 4);
      for (const a of falando) balao(ctx, a, fonte);
      for (const tx of textos.current) {
        ctx.globalAlpha = Math.min(1, tx.vida * 2);
        ctx.font = `700 ${tx.grande ? 26 : 16}px ${fonte}`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.lineWidth = 4;
        ctx.strokeStyle = "#fff";
        ctx.strokeText(tx.texto, tx.x, tx.y);
        ctx.fillStyle = tx.cor;
        ctx.fillText(tx.texto, tx.x, tx.y);
      }
      ctx.globalAlpha = 1;

      if (e.ajudantes.length === 0 && e.cumpridos === 0) {
        ctx.font = `700 20px ${fonte}`;
        ctx.textAlign = "left";
        ctx.fillStyle = NOITE;
        const b = Math.sin(e.tempo * 5) * 4;
        ctx.fillText("← aperta a caixa!", CAIXA.x + 54 + b, CAIXA.y - 34);
      }

      // Vinheta vermelha pulsando quando a fábrica está em pane.
      if (c > 0) {
        const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, W * 0.65);
        g.addColorStop(0, "rgba(171,57,47,0)");
        g.addColorStop(1, `rgba(171,57,47,${c * (0.35 + 0.15 * Math.sin(e.tempo * 8))})`);
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H);
      }

      if (agora - ultimaUi > 100) {
        ultimaUi = agora;
        setUi(fotografar(e));
      }
      if (agora - ultimoSave > 5000) {
        ultimoSave = agora;
        salvar(e);
      }
    };
    const loop = (agora: number) => {
      tick(agora);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    // Reserva: se o navegador parar de animar com a página visível (janela
    // estrangulada, painel embutido), o jogo continua andando. Aba escondida
    // de verdade fica pausada, pra ninguém voltar e achar a fábrica em pane.
    const reserva = setInterval(() => {
      if (document.hidden) return;
      const agora = performance.now();
      if (agora - antes > 250) tick(agora);
    }, 250);

    const onKey = (ev: KeyboardEvent) => {
      if (ev.code !== "Space" || ev.repeat) return;
      const alvo = ev.target as HTMLElement | null;
      if (alvo && ["INPUT", "TEXTAREA", "SELECT", "BUTTON", "A"].includes(alvo.tagName)) return;
      ev.preventDefault();
      apertar(estado.current);
      pulo.current = 1;
    };
    const onSair = () => salvar(estado.current);
    window.addEventListener("keydown", onKey);
    window.addEventListener("pagehide", onSair);
    return () => {
      cancelAnimationFrame(raf);
      clearInterval(reserva);
      salvar(estado.current);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pagehide", onSair);
    };
  }, [avisar]);

  const cliqueNoChao = (ev: React.PointerEvent<HTMLCanvasElement>) => {
    const r = ev.currentTarget.getBoundingClientRect();
    const x = ((ev.clientX - r.left) / r.width) * W;
    const y = ((ev.clientY - r.top) / r.height) * H;
    if (acalmar(estado.current, x, y)) return;
    if (Math.abs(x - CAIXA.x) < 50 && Math.abs(y - (CAIXA.y - 10)) < 50) apertarCaixa();
  };

  const clicarLoja = (id: MelhoriaId) => {
    const r = comprar(estado.current, id);
    if (r === "espantou") avisar("Xô! O ajudante desceu do botão.", "azul");
    setUi(fotografar(estado.current));
  };

  const recomecar = () => {
    if (!window.confirm("Apagar a fábrica e começar do zero?")) return;
    estado.current = novoEstado();
    salvar(estado.current);
    setUi(fotografar(estado.current));
  };

  const m = ui.melhorias;
  const p = ui.pedido;
  const pct = Math.min(100, (p.feito / p.trabalho) * 100);

  return (
    <div ref={tremeRef} className="flex flex-col gap-5 will-change-transform">
      <style>{`
        @keyframes fab-sentado { 0%,100% { transform: rotate(-3deg) } 50% { transform: rotate(3deg) } }
        @keyframes fab-pisca { 0%,100% { opacity: 1 } 50% { opacity: .35 } }
      `}</style>

      {/* Como jogar */}
      <details open className="card !p-4 sm:!p-5">
        <summary className="cursor-pointer font-titulo text-xl font-bold text-azul">Como jogar</summary>
        <ol className="mt-3 grid list-none gap-3 p-0 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["1", "Aperta a caixa", "Cada aperto cria um ajudante azul. Ele anda até a mesa e trabalha no pedido."],
            ["2", "Cumpre o pedido", "Quando a barra do pedido enche, todos somem e você ganha favores."],
            ["3", "Cuidado com a paciência", "A barrinha em cima de cada um vai esvaziando. Zerou: pane! Ele corre, rouba favores e senta nos botões."],
            ["4", "Clica nos que surtarem", "Clique num ajudante em pane pra ele sumir. Gaste favores na loja pra crescer."],
          ].map(([n, t, d]) => (
            <li key={n} className="flex gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-noite bg-[#86cdf6] font-titulo font-bold">{n}</span>
              <span className="text-sm leading-snug text-tinta">
                <strong className="block text-noite">{t}</strong>
                {d}
              </span>
            </li>
          ))}
        </ol>
      </details>

      {/* Pedido atual + favores */}
      <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
        <div className={`card flex flex-col gap-2 !p-5 ${p.absurdo ? "!bg-laranja-claro" : ""}`}>
          <div className="flex flex-wrap items-center gap-2">
            <span className="etiqueta text-[12px] text-azul">Pedido nº {p.n + 1}</span>
            {p.absurdo && <span className="etiqueta rounded-full border-2 border-noite bg-laranja px-2 text-[11px] text-noite">Absurdo · paga 3x</span>}
          </div>
          <p className="font-titulo text-2xl font-bold leading-tight text-noite sm:text-3xl">{p.texto}</p>
          <div className="h-4 overflow-hidden rounded-full border-2 border-noite bg-white" aria-label={`Progresso do pedido: ${Math.floor(pct)}%`}>
            <div className={`h-full transition-[width] duration-100 ${p.absurdo ? "bg-laranja" : "bg-[#2f78c4]"}`} style={{ width: `${pct}%` }} />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-tinta">
            <span>
              {formatar(p.feito)} / {formatar(p.trabalho)} de trabalho · paga <strong>{formatar(p.recompensa)} favores</strong>
            </span>
            <button
              type="button"
              onClick={() => {
                desistir(estado.current);
                setUi(fotografar(estado.current));
              }}
              className="etiqueta text-[11px] text-estrela underline hover:no-underline"
            >
              {p.absurdo ? "Pular esse absurdo" : "Desistir do pedido"}
            </button>
          </div>
        </div>
        <div className="card flex min-w-[200px] flex-col items-center justify-center gap-1 !p-5 text-center">
          <span className="etiqueta text-[12px] text-azul">Favores</span>
          <p className="font-titulo text-4xl font-bold leading-none text-noite">{formatar(ui.favores)}</p>
          <span className="text-sm text-neutro">
            {ui.cumpridos} {ui.cumpridos === 1 ? "pedido cumprido" : "pedidos cumpridos"}
          </span>
          <span className="etiqueta text-[11px] text-laranja">{titulo(ui.cumpridos)}</span>
        </div>
      </div>

      {/* Chão da fábrica */}
      <div className="relative w-full overflow-hidden rounded-2xl border-2 border-noite bg-creme shadow-duro" style={{ aspectRatio: `${W} / ${H}` }}>
        <canvas
          ref={canvasRef}
          className="block h-full w-full cursor-pointer"
          style={{ touchAction: "manipulation" }}
          onPointerDown={cliqueNoChao}
          aria-label="Chão da fábrica: clique nos ajudantes em pane pra fazer eles sumirem"
        />
        {ui.pane > 0 && (
          <div
            className="etiqueta pointer-events-none absolute left-3 top-3 rounded-lg border-2 border-noite bg-estrela px-3 py-1 text-[12px] text-white sm:text-[13px]"
            style={{ animation: "fab-pisca .6s infinite" }}
          >
            {ui.pane} em pane · clica neles!
          </div>
        )}
        {aviso && (
          <div
            key={aviso.id}
            role="status"
            className={`pointer-events-none absolute bottom-3 left-1/2 max-w-[92%] -translate-x-1/2 rounded-lg border-2 border-noite px-3 py-1.5 text-center text-sm font-bold ${
              aviso.cor === "vermelho" ? "bg-[#fff1ec] text-estrela" : "bg-white text-azul"
            }`}
          >
            {aviso.texto}
          </div>
        )}
      </div>

      {/* Caixa + loja */}
      <div className="grid gap-5 lg:grid-cols-[260px_1fr]">
        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={apertarCaixa}
            className="btn flex flex-col items-center gap-1 !rounded-2xl bg-[#2f78c4] !py-6 text-white active:translate-x-[3px] active:translate-y-[3px] active:shadow-none"
            style={{ transform: ui.caos > 0.3 ? `rotate(${Math.sin(ui.pane) * 4 * ui.caos}deg)` : undefined }}
          >
            <span className="font-titulo text-2xl font-bold">Apertar a caixa</span>
            <span className="text-sm opacity-90">+{porAperto(m)} ajudante{porAperto(m) > 1 ? "s" : ""} por aperto</span>
          </button>
          <dl className="card grid grid-cols-2 gap-x-3 gap-y-1 !p-4 text-sm">
            <dt className="text-neutro">Na fábrica</dt>
            <dd className="text-right font-bold">
              {ui.ajudantes} / {capacidade(m)}
            </dd>
            <dt className="text-neutro">Paciência</dt>
            <dd className="text-right font-bold">{paciencia(m)} s</dd>
            <dt className="text-neutro">Apertos sozinhos</dt>
            <dd className="text-right font-bold">{apertosPorSeg(m).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}/s</dd>
            <dt className="text-neutro">Em pane</dt>
            <dd className={`text-right font-bold ${ui.pane ? "text-estrela" : ""}`}>{ui.pane}</dd>
          </dl>
        </div>

        <ul className="grid list-none grid-cols-1 gap-3 p-0 sm:grid-cols-2 xl:grid-cols-3">
          {IDS.map((id, i) => {
            const info = MELHORIAS[id];
            const preco = custo(id, m[id]);
            const sentado = ui.bloqueados.includes(id);
            const pode = ui.favores >= preco;
            const torto = ui.caos > 0.2 && !sentado ? Math.sin(i * 7.3 + ui.pane) * 3 * ui.caos : 0;
            return (
              <li key={id}>
                <button
                  type="button"
                  onClick={() => clicarLoja(id)}
                  disabled={!sentado && !pode}
                  className={`flex h-full w-full flex-col gap-1 rounded-xl border-2 border-noite p-3 text-left shadow-duro-sm transition-transform disabled:cursor-not-allowed ${
                    sentado ? "bg-[#fff1ec]" : pode ? "bg-white hover:-translate-y-0.5" : "bg-creme-escuro opacity-70"
                  }`}
                  style={sentado ? { animation: "fab-sentado .35s infinite" } : torto ? { transform: `rotate(${torto}deg)` } : undefined}
                >
                  {sentado ? (
                    <>
                      <span className="font-titulo text-lg font-bold leading-tight text-estrela">Tem um ajudante sentado aqui!</span>
                      <span className="text-sm text-tinta">Clica pra espantar ele de cima de “{info.nome}”.</span>
                    </>
                  ) : (
                    <>
                      <span className="flex items-baseline justify-between gap-2">
                        <span className="font-titulo text-lg font-bold leading-tight text-noite">{info.nome}</span>
                        <span className="etiqueta shrink-0 text-[11px] text-azul">nv {m[id]}</span>
                      </span>
                      <span className="text-sm text-tinta">{info.texto}</span>
                      <span className={`mt-auto pt-1 font-bold ${pode ? "text-laranja" : "text-neutro"}`}>{formatar(preco)} favores</span>
                    </>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 text-[12px]">
        <p className="etiqueta text-neutro">Barra de espaço também aperta a caixa · o progresso fica salvo no seu navegador</p>
        <button type="button" onClick={recomecar} className="etiqueta text-neutro underline hover:text-estrela">
          Recomeçar do zero
        </button>
      </div>
    </div>
  );
}
