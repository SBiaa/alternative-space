"use client";

import { mandarProRanking } from "@/lib/enviarRecorde";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  FASES,
  H,
  W,
  apertar as apertarLogica,
  cancelar,
  novoEstado,
  rank,
  soltar as soltarLogica,
  step,
  zona,
  type Estado,
  type FaseId,
  type Status,
} from "@/lib/chakra";
import { AZUL, anel, aura, aviso, barra, cena, esfera, frente, hud, ninja, pose, reflexo, vinheta, type Modo, type Onda } from "@/lib/chakraDesenho";

type Ui = "menu" | Status;
type Faisca = { x: number; y: number; vx: number; vy: number; vida: number; cor: string; r: number; g: number };

const CHAVE_RECORDE = "corrida-de-chakra:recorde";

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
  mandarProRanking("corrida-de-chakra", n);
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

  // Dedo (ou tecla) pressionado agora. Quem aperta enquanto ainda aparece o "Boa!" não perde o toque:
  // a carga começa assim que a próxima rodada abre.
  // Só vale o toque que começou durante o resultado; quem segurou até estourar precisa soltar e apertar de novo.
  const segurando = useRef(false);

  const apertar = useCallback(() => {
    segurando.current = estado.current.status === "resultado";
    const u = ui.current;
    if (u === "menu") comecar();
    else if (u !== "fim" && u !== "vitoria") apertarLogica(estado.current);
  }, [comecar]);

  const soltar = useCallback(() => {
    segurando.current = false;
    soltarLogica(estado.current);
  }, []);

  const largar = useCallback(() => {
    segurando.current = false;
    cancelar(estado.current);
  }, []);

  // Botão grande embaixo do jogo (só em tela de toque), pra o dedo não cobrir a cena.
  const enchimento = useRef<HTMLSpanElement>(null);

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
    let anelEm = -99;
    let flash = { em: -99, cor: "255,255,255" };

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
        const statusAntes = e.status;
        step(e, dt);
        if (statusAntes === "resultado" && e.status === "pronto" && segurando.current) {
          segurando.current = false;
          apertarLogica(e);
        }
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
        const nota = e.ultima.nota;
        if (nota === "perfeito" || nota === "bom") {
          espalhar(p0.ax, p0.ay, nota === "perfeito" ? 30 : 14, AZUL, 240, 0);
          if (nota === "perfeito") {
            anelEm = relogio;
            flash = { em: relogio, cor: "200,240,255" };
          }
          if (e.fase === 1) ondas.push({ x: 70 + e.passo * 96, y: 336, em: relogio });
        } else {
          falhaEm = relogio;
          sacode = 0.3;
          flash = { em: relogio, cor: "171,57,47" };
          const cor = e.fase === 0 ? "#8a5a33" : e.fase === 1 ? "#bfe6ff" : AZUL;
          const [fx, fy] = e.fase === 2 ? [p0.x + 50, p0.y - 75] : [p0.ax, p0.ay];
          espalhar(fx, fy, 24, cor, 260, e.fase === 2 ? 0 : 500);
          if (e.fase === 1) ondas.push({ x: p0.x, y: 338, em: relogio });
        }
      }
      const idadeFalha = relogio - falhaEm;
      const falha = idadeFalha < 0.7 ? Math.sin((idadeFalha / 0.7) * Math.PI) : 0;
      const p = pose(e.fase, prog, falha);
      const carregando = e.status === "carregando";
      const z = zona(e);
      const passou = e.carga > z.centro + z.largura / 2;

      // Fagulhas de chakra subindo enquanto segura
      if (carregando && Math.random() < 0.7) {
        faiscas.push({
          x: p.ax + (Math.random() - 0.5) * 50,
          y: p.ay + 24,
          vx: (Math.random() - 0.5) * 30,
          vy: -60 - Math.random() * 90 * (1 + e.carga),
          vida: 0.6,
          cor: passou ? "#ff9a7e" : AZUL,
          r: 1.5 + Math.random() * 1.5,
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
      ctx.save();
      if (sacode > 0) ctx.translate((Math.random() - 0.5) * 30 * sacode, (Math.random() - 0.5) * 30 * sacode);
      cena(ctx, e.fase, relogio, p.cam, e.passo, ondas);

      const andando = e.fase !== 2 && Math.abs(e.passo - prog) > 0.05 ? 1 : 0;
      const modo: Modo = e.fase === 2 ? "esfera" : carregando ? "selo" : "normal";
      const desenharNinja = () => ninja(ctx, p, relogio, andando, modo, carregando);
      if (e.fase === 1) reflexo(ctx, p, desenharNinja);
      aura(ctx, p.ax, p.ay, p.s, carregando ? e.carga : 0, passou, relogio);
      desenharNinja();

      if (e.fase === 2) {
        // A esfera cresce a cada acerto e incha enquanto segura
        const base = 8 + prog * 8;
        const extra = carregando ? e.carga * 14 : 0;
        const r = falha > 0 ? base * (1 - falha * 0.7) : base + extra;
        esfera(ctx, p.x + 24 * p.s + r * 0.7, p.y - 43 * p.s, r, relogio, carregando && passou);
      }

      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      for (const fa of faiscas) {
        ctx.globalAlpha = Math.max(0, Math.min(1, fa.vida * 2));
        ctx.fillStyle = fa.cor;
        ctx.beginPath();
        ctx.arc(fa.x, fa.y, fa.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
      anel(ctx, p.ax, p.ay, relogio - anelEm);
      frente(ctx, e.fase, relogio);
      vinheta(ctx);
      ctx.restore();

      const idadeFlash = relogio - flash.em;
      if (idadeFlash < 0.3) {
        ctx.fillStyle = `rgba(${flash.cor},${0.2 * (1 - idadeFlash / 0.3)})`;
        ctx.fillRect(0, 0, W, H);
      }

      barra(ctx, e, relogio, fonte);

      // O botão de segurar acompanha a carga.
      if (enchimento.current) {
        enchimento.current.style.transform = `scaleX(${carregando ? e.carga : 0})`;
        enchimento.current.style.background = passou ? "#ff7a50" : "#4fc3ff";
      }
      if (emJogo) {
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
    const onSumiu = () => largar();
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
  }, [apertar, soltar, largar, mudarUi]);

  const fase = FASES[faseUi];
  const r = fim ? rank(fim.pontos, fim.venceu) : null;
  const rotulo =
    uiState === "carregando"
      ? "Solta na faixa verde"
      : uiState === "menu"
        ? "Segura aqui pra jogar"
        : uiState === "intro"
          ? "Toque pra começar a fase"
          : uiState === "fim" || uiState === "vitoria"
            ? "Fim de jogo"
            : "Segura aqui";
  const botaoAtivo = uiState !== "fim" && uiState !== "vitoria";

  // Mesmos controles na tela do jogo e no botão de segurar.
  const tocar = {
    onPointerDown: (ev: React.PointerEvent<HTMLElement>) => {
      const alvo = (ev.target as HTMLElement).closest("button");
      if (alvo && alvo !== ev.currentTarget) return;
      ev.preventDefault();
      ev.currentTarget.setPointerCapture(ev.pointerId);
      apertar();
    },
    onPointerUp: soltar,
    onPointerCancel: largar,
    onContextMenu: (ev: React.MouseEvent) => ev.preventDefault(),
  };

  return (
    <div className="flex flex-col gap-3">
    <div
      className="relative w-full select-none overflow-hidden rounded-lg border-[3px] border-creme bg-noite shadow-[0_10px_30px_rgb(0_0_0/0.35)] sm:border-[6px]"
      style={{ touchAction: "none", WebkitTouchCallout: "none" }}
      {...tocar}
    >
      <canvas
        ref={canvasRef}
        className="block h-auto w-full"
        style={{ aspectRatio: `${W} / ${H}` }}
        aria-label="Corrida de Chakra: jogo de segurar e soltar na hora certa"
      />

      {uiState === "menu" && (
        <div className="absolute inset-0 flex flex-col items-center justify-end gap-2.5 bg-gradient-to-t from-noite/90 via-noite/30 to-transparent p-4 text-center sm:justify-center sm:gap-4 sm:bg-noite/50">
          <span className="etiqueta hidden rounded-full border border-[#4fc3ff]/50 bg-noite/60 px-3 py-1 text-[11px] text-[#9fdcff] sm:inline">
            3 fases · 1 botão
          </span>
          <h2
            className="font-titulo text-[28px] font-bold leading-none text-creme sm:text-6xl"
            style={{ textShadow: "3px 3px 0 #01121e, 0 0 24px rgb(79 195 255 / 0.55)" }}
          >
            Corrida de Chakra
          </h2>
          <p className="hidden max-w-md text-base text-creme sm:block">
            <strong>Segura</strong> pra concentrar chakra e <strong>solta</strong> quando a barra estiver na faixa verde.
          </p>
          <ul className="hidden list-none gap-2 p-0 sm:flex">
            {FASES.map((f, i) => (
              <li key={f.id} className="flex items-center gap-1.5 rounded-full border border-creme/20 bg-noite/60 py-1 pl-1 pr-3 text-xs text-areia">
                <Emblema id={f.id} className="size-6" />
                {i + 1}. {f.nome}
              </li>
            ))}
          </ul>
          <button type="button" onClick={comecar} className="btn bg-laranja text-noite !px-5 !py-1.5 !text-base sm:!px-7 sm:!py-2.5 sm:!text-lg">
            Jogar
          </button>
        </div>
      )}

      {uiState === "intro" && (
        <div className="absolute inset-0 flex items-center justify-center bg-noite/50 p-3">
          <div className="flex w-full max-w-sm flex-col items-center gap-1 rounded-xl border border-[#4fc3ff]/40 bg-noite/85 p-3 text-center shadow-[0_0_40px_rgb(79_195_255/0.2)] sm:gap-3 sm:p-6">
            <div className="hidden items-center gap-1.5 sm:flex" aria-label={`Fase ${faseUi + 1} de ${FASES.length}`}>
              {FASES.map((f, i) => (
                <span
                  key={f.id}
                  className={`h-1.5 rounded-full ${i === faseUi ? "w-8 bg-[#4fc3ff]" : i < faseUi ? "w-4 bg-[#4fc3ff]/50" : "w-4 bg-creme/20"}`}
                />
              ))}
            </div>
            <Emblema id={fase.id} className="hidden size-16 sm:block" />
            <span className="etiqueta text-[10px] text-laranja-claro sm:text-[11px]">
              Fase {faseUi + 1} de {FASES.length}
            </span>
            <p className="font-titulo text-2xl font-bold leading-none text-creme sm:text-4xl">{fase.nome}</p>
            <p className="hidden text-base leading-snug text-areia sm:block">{fase.dica}</p>
            <p className="etiqueta text-[10px] text-[#9fdcff] sm:text-[11px]">{fase.passos} acertos pra passar</p>
            <button type="button" onClick={comecarFase} className="btn mt-1 bg-laranja text-noite !px-5 !py-1.5 !text-sm sm:!px-6 sm:!py-2 sm:!text-base">
              Começar
            </button>
          </div>
        </div>
      )}

      {(uiState === "fim" || uiState === "vitoria") && fim && r && (
        <div className="absolute inset-0 flex items-center justify-center bg-noite/60 p-3">
          <div className="card flex w-full max-w-sm flex-col items-center gap-1 !p-3 text-center sm:gap-2.5 sm:!p-6">
            <span className="etiqueta text-[11px] text-estrela">
              {fim.venceu ? "Treino completo!" : `Parou em ${fase.nome}`}
              {fim.novo ? " · novo recorde!" : ""}
            </span>
            <p className="font-titulo text-3xl font-bold leading-none text-azul sm:text-5xl">{fim.pontos} pts</p>
            <p className="font-titulo text-base font-bold leading-tight sm:text-xl">{r.titulo}</p>
            <p className="hidden text-sm text-tinta sm:block">{r.texto}</p>
            <dl className="m-0 hidden w-full grid-cols-3 gap-2 sm:grid">
              {[
                ["acertos", fim.acertos],
                ["perfeitos", fim.perfeitos],
                ["recorde", fim.recorde],
              ].map(([rotulo, valor]) => (
                <div key={rotulo} className="rounded-md bg-azul/8 px-1 py-1.5 sm:py-2">
                  <dd className="m-0 font-titulo text-lg font-bold leading-none text-azul sm:text-xl">{valor}</dd>
                  <dt className="etiqueta mt-1 text-[9px] text-neutro sm:text-[10px]">{rotulo}</dt>
                </div>
              ))}
            </dl>
            <button type="button" onClick={comecar} className="btn mt-1 bg-laranja text-noite !px-5 !py-1.5 !text-sm sm:!px-6 sm:!py-2 sm:!text-base">
              Jogar de novo
            </button>
          </div>
        </div>
      )}
    </div>

    <button
      type="button"
      disabled={!botaoAtivo}
      aria-label="Segurar pra concentrar chakra"
      className="relative hidden h-28 w-full cursor-pointer select-none overflow-hidden rounded-xl border-2 border-[#4fc3ff]/60 bg-cabine text-creme disabled:border-creme/15 disabled:text-poeira pointer-coarse:flex pointer-coarse:items-center pointer-coarse:justify-center"
      style={{ touchAction: "none", WebkitTouchCallout: "none", WebkitUserSelect: "none" }}
      {...tocar}
    >
      <span ref={enchimento} aria-hidden="true" className="absolute inset-0 origin-left opacity-35" style={{ transform: "scaleX(0)" }} />
      <span className="relative font-titulo text-xl font-semibold">{rotulo}</span>
    </button>
    </div>
  );
}

// Selo redondo de cada fase, pros cartões.
function Emblema({ id, className = "" }: { id: FaseId; className?: string }) {
  const traco = { fill: "none", stroke: "#ece3be", strokeWidth: 3, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <circle cx="24" cy="24" r="22" fill="#0b2340" stroke="#4fc3ff" strokeWidth="2" />
      {id === "arvore" && (
        <g {...traco}>
          <path d="M24 38V22" />
          <path d="M24 10l9 12h-5l6 8H14l6-8h-5z" fill="#2f7148" />
        </g>
      )}
      {id === "agua" && (
        <g {...traco}>
          <path d="M10 22q4-4 7 0t7 0 7 0 7 0" stroke="#4fc3ff" />
          <path d="M10 30q4-4 7 0t7 0 7 0 7 0" />
        </g>
      )}
      {id === "rasengan" && (
        <g {...traco}>
          <circle cx="24" cy="24" r="11" fill="#4fc3ff" fillOpacity="0.35" stroke="#4fc3ff" />
          <path d="M24 24q5-1 5 4t-7 5q-8 0-8-8 0-10 10-11 11 0 12 11" />
        </g>
      )}
    </svg>
  );
}
