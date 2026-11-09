"use client";

import { mandarProRanking } from "@/lib/enviarRecorde";
import { useCallback, useEffect, useRef, useState } from "react";
import { H, NINJA_A, NINJA_L, NINJA_X, VIDAS, W, apertar as apertarLogica, novoEstado, pontos, rank, soltar as soltarLogica, step, type Estado } from "@/lib/akatsuki";

type Ui = "menu" | "jogando" | "fim";

const CHAVE_RECORDE = "fuga-da-akatsuki:recorde";
const NOITE = "#01121e";
const CREME = "#ece3be";
const LARANJA = "#dd5d05";
const VERMELHO = "#c0262d";

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
  mandarProRanking("fuga-da-akatsuki", n);
}

// ---------- desenho ----------

function ceu(ctx: CanvasRenderingContext2D, andado: number) {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, "#1a0b2e");
  g.addColorStop(0.6, "#4a1830");
  g.addColorStop(1, "#7a2a2a");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  // Lua vermelha
  ctx.fillStyle = "#e8584a";
  ctx.globalAlpha = 0.9;
  ctx.beginPath();
  ctx.arc(640, 90, 46, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  // Nuvens vermelhas passando devagar
  ctx.fillStyle = VERMELHO;
  for (let i = 0; i < 4; i++) {
    const x = ((i * 260 - andado * 0.08) % 1040 + 1040) % 1040 - 120;
    const y = 50 + ((i * 47) % 90);
    ctx.globalAlpha = 0.5;
    ctx.beginPath();
    ctx.ellipse(x, y, 40, 14, 0, 0, Math.PI * 2);
    ctx.ellipse(x + 30, y - 8, 26, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = CREME;
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  // Vila ao longe (paralaxe)
  ctx.fillStyle = "#2a1024";
  for (let i = 0; i < 14; i++) {
    const x = ((i * 90 - andado * 0.25) % 1260 + 1260) % 1260 - 100;
    const h = 90 + ((i * 37) % 70);
    ctx.fillRect(x, H - h - 40, 70, h + 40);
    ctx.beginPath();
    ctx.moveTo(x - 10, H - h - 40);
    ctx.lineTo(x + 35, H - h - 66);
    ctx.lineTo(x + 80, H - h - 40);
    ctx.fill();
  }
}

function telhados(ctx: CanvasRenderingContext2D, e: Estado) {
  for (const t of e.telhados) {
    // Parede
    ctx.fillStyle = "#5b3a2a";
    ctx.fillRect(t.x + 6, t.y + 10, t.w - 12, H - t.y);
    ctx.fillStyle = "#f2c46e";
    for (let wx = t.x + 26; wx < t.x + t.w - 30; wx += 56) {
      for (let wy = t.y + 40; wy < H; wy += 60) ctx.fillRect(wx, wy, 16, 22);
    }
    // Telhado
    ctx.fillStyle = "#2f4a6b";
    ctx.beginPath();
    ctx.moveTo(t.x - 8, t.y + 14);
    ctx.lineTo(t.x + 4, t.y);
    ctx.lineTo(t.x + t.w - 4, t.y);
    ctx.lineTo(t.x + t.w + 8, t.y + 14);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = NOITE;
    ctx.lineWidth = 3;
    ctx.stroke();
  }
}

function ninja(ctx: CanvasRenderingContext2D, e: Estado, relogio: number) {
  if (e.invulneravel > 0 && Math.floor(relogio * 14) % 2 === 0) return;
  const x = NINJA_X;
  const y = e.y;
  const corre = e.noChao ? Math.sin(relogio * 22) : 0.6;
  ctx.save();
  ctx.lineCap = "round";
  ctx.strokeStyle = NOITE;
  ctx.lineWidth = 6;
  // Pernas
  ctx.beginPath();
  ctx.moveTo(x + 14, y - 16);
  ctx.lineTo(x + 14 + corre * 10, y);
  ctx.moveTo(x + 14, y - 16);
  ctx.lineTo(x + 14 - corre * 10, y);
  ctx.stroke();
  // Corpo inclinado pra frente
  ctx.fillStyle = LARANJA;
  ctx.beginPath();
  ctx.roundRect(x + 4, y - NINJA_A + 14, NINJA_L - 6, 20, 6);
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.stroke();
  // Cabeça + bandana
  ctx.fillStyle = "#f2c9a0";
  ctx.beginPath();
  ctx.arc(x + 18, y - NINJA_A + 6, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#2f4a6b";
  ctx.fillRect(x + 8, y - NINJA_A, 20, 5);
  ctx.strokeStyle = "#2f4a6b";
  ctx.beginPath();
  ctx.moveTo(x + 8, y - NINJA_A + 2);
  ctx.lineTo(x - 6, y - NINJA_A + 6 + Math.sin(relogio * 16) * 3);
  ctx.stroke();
  ctx.restore();
}

function shuriken(ctx: CanvasRenderingContext2D, x: number, y: number, giro: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-giro);
  ctx.fillStyle = "#c9ced6";
  ctx.strokeStyle = NOITE;
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2;
    ctx.lineTo(Math.cos(a) * 12, Math.sin(a) * 12);
    ctx.lineTo(Math.cos(a + Math.PI / 4) * 4, Math.sin(a + Math.PI / 4) * 4);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = NOITE;
  ctx.beginPath();
  ctx.arc(0, 0, 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function pergaminho(ctx: CanvasRenderingContext2D, x: number, y: number, relogio: number) {
  const b = Math.sin(relogio * 4 + x * 0.05) * 3;
  ctx.save();
  ctx.translate(x, y + b);
  ctx.fillStyle = CREME;
  ctx.strokeStyle = NOITE;
  ctx.lineWidth = 2;
  ctx.fillRect(-10, -8, 20, 16);
  ctx.strokeRect(-10, -8, 20, 16);
  ctx.fillStyle = VERMELHO;
  ctx.fillRect(-13, -9, 4, 18);
  ctx.fillRect(9, -9, 4, 18);
  ctx.fillRect(-2, -8, 4, 16);
  ctx.restore();
}

function hud(ctx: CanvasRenderingContext2D, e: Estado, recorde: number, fonte: string) {
  ctx.font = `700 22px ${fonte}`;
  ctx.textBaseline = "top";
  ctx.fillStyle = CREME;
  ctx.textAlign = "left";
  ctx.fillText(`${pontos(e)} pts`, 18, 14);
  ctx.font = `600 14px ${fonte}`;
  ctx.fillText(`recorde ${Math.max(recorde, pontos(e))} · ${e.pergaminhos} pergaminhos`, 18, 42);
  ctx.textAlign = "right";
  ctx.font = `700 22px ${fonte}`;
  for (let i = 0; i < VIDAS; i++) {
    ctx.fillStyle = i < e.vidas ? "#e8584a" : "rgba(236,227,190,0.25)";
    ctx.fillText("♥", W - 18 - i * 26, 14);
  }
}

// ---------- componente ----------

export function FugaDaAkatsuki() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const estado = useRef<Estado>(novoEstado(() => 0.5)); // cena do menu fixa; a partida usa Math.random
  const ui = useRef<Ui>("menu");
  const recorde = useRef(0);
  const [uiState, setUiState] = useState<Ui>("menu");
  const [fim, setFim] = useState<{ pontos: number; novo: boolean; recorde: number; pergaminhos: number } | null>(null);

  const mudarUi = useCallback((u: Ui) => {
    ui.current = u;
    setUiState(u);
  }, []);

  const comecar = useCallback(() => {
    estado.current = novoEstado();
    setFim(null);
    mudarUi("jogando");
  }, [mudarUi]);

  const apertar = useCallback(() => {
    if (ui.current === "menu") comecar();
    if (ui.current === "jogando") apertarLogica(estado.current);
  }, [comecar]);

  const soltar = useCallback(() => soltarLogica(estado.current), []);

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
    let relogio = 0;
    let sacode = 0;
    let golpeVisto = -99;

    const frame = (agora: number) => {
      const dt = Math.min(1 / 30, (agora - antes) / 1000);
      antes = agora;
      relogio += dt;
      const e = estado.current;

      if (ui.current === "jogando") {
        step(e, dt);
        if (e.acertado !== golpeVisto) {
          golpeVisto = e.acertado;
          sacode = 0.3;
        }
        if (e.status === "fim") {
          const p = pontos(e);
          const novo = p > recorde.current;
          if (novo) {
            recorde.current = p;
            salvarRecorde(p);
          }
          setFim({ pontos: p, novo, recorde: recorde.current, pergaminhos: e.pergaminhos });
          mudarUi("fim");
        }
      }
      sacode = Math.max(0, sacode - dt);

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (sacode > 0) ctx.translate((Math.random() - 0.5) * 24 * sacode, (Math.random() - 0.5) * 24 * sacode);
      ceu(ctx, e.distancia + (ui.current === "menu" ? relogio * 60 : 0));
      telhados(ctx, e);
      for (const p of e.itens) if (!p.pego) pergaminho(ctx, p.x, p.y, relogio);
      for (const s of e.shurikens) shuriken(ctx, s.x, s.y, s.giro);
      ninja(ctx, e, relogio);
      if (ui.current !== "menu") hud(ctx, e, recorde.current, fonte);
      if (ui.current === "jogando" && e.status === "pronto") {
        ctx.font = `700 20px ${fonte}`;
        ctx.textAlign = "center";
        ctx.fillStyle = CREME;
        ctx.fillText("Toque ou espaço pra correr!", W / 2, 150);
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
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [apertar, soltar, mudarUi]);

  const r = fim ? rank(fim.pontos) : null;

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
      onPointerCancel={soltar}
      onContextMenu={(ev) => ev.preventDefault()}
    >
      <canvas ref={canvasRef} className="block h-full w-full" aria-label="Fuga da Akatsuki: corra pelos telhados, pule e desvie das shurikens" />

      {uiState === "menu" && (
        <div className="absolute inset-0 flex flex-col items-center justify-end gap-3 bg-gradient-to-t from-noite/85 via-noite/20 to-transparent p-5 text-center sm:justify-center sm:bg-noite/45">
          <h2 className="font-titulo text-4xl font-bold leading-none text-creme sm:text-6xl" style={{ textShadow: "3px 3px 0 #01121e" }}>
            Fuga da Akatsuki
          </h2>
          <p className="max-w-md text-sm text-creme sm:text-base">
            <strong>Toque</strong> pra pular, de novo no ar pro <strong>pulo duplo</strong>. Desvie das shurikens e pegue os pergaminhos.
          </p>
          <button type="button" onClick={comecar} className="btn bg-laranja text-noite !px-6 !py-2.5 !text-lg">
            Jogar
          </button>
        </div>
      )}

      {uiState === "fim" && fim && r && (
        <div className="absolute inset-0 flex items-center justify-center bg-noite/55 p-3">
          <div className="card flex w-full max-w-sm flex-col items-center gap-1.5 !p-4 text-center sm:gap-2 sm:!p-6">
            <span className="etiqueta text-[11px] text-estrela">{fim.novo ? "Novo recorde!" : `recorde ${fim.recorde} pontos`}</span>
            <p className="font-titulo text-4xl font-bold leading-none text-azul sm:text-5xl">{fim.pontos} pts</p>
            <p className="etiqueta text-[11px] text-azul">{fim.pergaminhos} pergaminhos</p>
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
