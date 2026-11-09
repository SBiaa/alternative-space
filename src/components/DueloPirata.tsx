"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type PointerEvent as PE } from "react";
import {
  CHAO,
  H,
  PERSONAGENS,
  W,
  cpu,
  entradaVazia,
  novaLuta,
  novaMente,
  passo,
  personagem,
  vencedorDaLuta,
  type Dificuldade,
  type Entrada,
  type Luta,
  type MenteCPU,
} from "@/lib/luta";
import {
  atualizarParticulas,
  cenario,
  desenharLutador,
  desenharParticulas,
  desenharProjetil,
  efeitoAcerto,
  efeitoBloqueio,
  efeitoPoeira,
  hud,
  type Faixa,
  type Particula,
} from "@/lib/lutaDesenho";

type Tela = "menu" | "escolha" | "luta" | "pausa" | "fim";
type Modo = "cpu" | "2p";
type Mapa = Record<string, keyof Entrada>;

// 1 jogador: WASD ou setas pra andar, J K L (ou F G H) pros golpes.
const P1_SOLO: Mapa = {
  KeyA: "esq", KeyD: "dir", KeyW: "cima", KeyS: "baixo",
  ArrowLeft: "esq", ArrowRight: "dir", ArrowUp: "cima", ArrowDown: "baixo",
  KeyJ: "soco", KeyK: "chute", KeyL: "especial",
  KeyF: "soco", KeyG: "chute", KeyH: "especial",
};
// 2 jogadores no mesmo teclado.
const P1_DUPLA: Mapa = { KeyA: "esq", KeyD: "dir", KeyW: "cima", KeyS: "baixo", KeyF: "soco", KeyG: "chute", KeyH: "especial" };
const P2: Mapa = {
  ArrowLeft: "esq", ArrowRight: "dir", ArrowUp: "cima", ArrowDown: "baixo",
  Numpad1: "soco", Numpad2: "chute", Numpad3: "especial",
  Comma: "soco", Period: "chute", Slash: "especial",
};

function lerTeclas(teclas: Set<string>, mapa: Mapa): Entrada {
  const e = entradaVazia();
  for (const t of teclas) if (mapa[t]) e[mapa[t]] = true;
  return e;
}

function lerControle(gp: Gamepad | null | undefined): Entrada {
  const e = entradaVazia();
  if (!gp) return e;
  const b = (i: number) => !!gp.buttons[i]?.pressed;
  const [ax = 0, ay = 0] = gp.axes;
  e.esq = ax < -0.5 || b(14);
  e.dir = ax > 0.5 || b(15);
  e.cima = ay < -0.6 || b(12);
  e.baixo = ay > 0.6 || b(13);
  e.soco = b(2);
  e.chute = b(0);
  e.especial = b(1) || b(3);
  return e;
}

function juntar(...es: Entrada[]): Entrada {
  const r = entradaVazia();
  for (const e of es) for (const k of Object.keys(r) as (keyof Entrada)[]) r[k] ||= e[k];
  return r;
}

const sortear = () => PERSONAGENS[Math.floor(Math.random() * PERSONAGENS.length)].id;

// ---------- retrato animado na seleção ----------

function Retrato({ id }: { id: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = 150 * dpr;
    canvas.height = 190 * dpr;
    const f = novaLuta(id, id).a;
    f.x = 70;
    let raf = 0;
    const t0 = performance.now();
    const desenhar = (now: number) => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, 150, 190);
      ctx.translate(0, 186 - CHAO);
      desenharLutador(ctx, f, (now - t0) / 1000);
      raf = requestAnimationFrame(desenhar);
    };
    raf = requestAnimationFrame(desenhar);
    return () => cancelAnimationFrame(raf);
  }, [id]);
  return <canvas ref={ref} className="h-[120px] w-[95px] sm:h-[190px] sm:w-[150px]" aria-hidden />;
}

// ---------- botão de toque ----------

const TOQUE = "(pointer: coarse)";
const assinarToque = (cb: () => void) => {
  const mq = window.matchMedia(TOQUE);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
};

function BotaoToque({ rotulo, tecla, onMuda, className = "" }: { rotulo: string; tecla: keyof Entrada; onMuda: (t: keyof Entrada, v: boolean) => void; className?: string }) {
  const solta = () => onMuda(tecla, false);
  return (
    <button
      type="button"
      className={`flex select-none items-center justify-center rounded-full border-2 border-noite bg-noite font-titulo font-bold text-creme shadow-duro active:translate-y-0.5 active:bg-laranja active:text-noite ${className}`}
      style={{ touchAction: "none" }}
      onPointerDown={(ev: PE) => {
        ev.preventDefault();
        ev.currentTarget.setPointerCapture(ev.pointerId);
        onMuda(tecla, true);
      }}
      onPointerUp={solta}
      onPointerCancel={solta}
      onLostPointerCapture={solta}
      onContextMenu={(ev) => ev.preventDefault()}
    >
      {rotulo}
    </button>
  );
}

// ---------- jogo ----------

export function DueloPirata() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // Atrás do menu roda uma luta de demonstração CPU x CPU.
  const luta = useRef<Luta>(novaLuta("luffy", "zoro"));
  const demo = useRef(true);
  const tela = useRef<Tela>("menu");
  const [telaUi, setTelaUi] = useState<Tela>("menu");
  const [modo, setModo] = useState<Modo>("cpu");
  const [dif, setDif] = useState<Dificuldade>("normal");
  const [escolha, setEscolha] = useState<[string | null, string | null]>([null, null]);
  const [vencedor, setVencedor] = useState<{ nome: string; lado: 0 | 1 } | null>(null);
  const toqueAtivo = useSyncExternalStore(assinarToque, () => window.matchMedia(TOQUE).matches, () => false);
  const config = useRef({ modo, dif });
  useEffect(() => {
    config.current = { modo, dif };
  }, [modo, dif]);

  const teclas = useRef(new Set<string>());
  const toque = useRef<Entrada>(entradaVazia());
  const mentes = useRef<[MenteCPU, MenteCPU]>([novaMente(), novaMente()]);
  const parts = useRef<Particula[]>([]);
  const faixas = useRef<Faixa[]>([]);
  const rastro = useRef<[number, number]>([1000, 1050]);
  const tremor = useRef(0);

  const mudarTela = useCallback((t: Tela) => {
    tela.current = t;
    setTelaUi(t);
  }, []);

  const iniciar = useCallback(
    (a: string, b: string) => {
      luta.current = novaLuta(a, b);
      demo.current = false;
      mentes.current = [novaMente(), novaMente()];
      parts.current = [];
      faixas.current = [];
      rastro.current = [luta.current.a.vida, luta.current.b.vida];
      teclas.current.clear();
      toque.current = entradaVazia();
      setVencedor(null);
      mudarTela("luta");
    },
    [mudarTela],
  );

  const voltarMenu = useCallback(() => {
    luta.current = novaLuta(sortear(), sortear());
    demo.current = true;
    setEscolha([null, null]);
    mudarTela("menu");
  }, [mudarTela]);

  const escolher = (id: string) => {
    if (!escolha[0]) setEscolha([id, null]);
    else {
      setEscolha([escolha[0], id]);
      iniciar(escolha[0], id);
    }
  };

  const mudarToque = useCallback((k: keyof Entrada, v: boolean) => {
    toque.current[k] = v;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    const fonte = getComputedStyle(document.body).getPropertyValue("--font-fredoka").trim() || "system-ui";
    let ultimo = performance.now();
    let tempo = 0;
    let raf = 0;

    const frame = (now: number) => {
      const dt = Math.min(0.033, (now - ultimo) / 1000);
      ultimo = now;
      const t = tela.current;
      const l = luta.current;
      const [m0, m1] = mentes.current;

      if (t !== "pausa") {
        tempo += dt;
        let ea: Entrada;
        let eb: Entrada;
        if (demo.current) {
          ea = cpu(l, 0, m0, "normal", Math.random, dt);
          eb = cpu(l, 1, m1, "normal", Math.random, dt);
        } else {
          const gps = navigator.getGamepads ? navigator.getGamepads() : [];
          const { modo: md, dif: df } = config.current;
          if (md === "cpu") {
            ea = juntar(lerTeclas(teclas.current, P1_SOLO), toque.current, lerControle(gps[0]));
            eb = cpu(l, 1, m1, df, Math.random, dt);
          } else {
            ea = juntar(lerTeclas(teclas.current, P1_DUPLA), toque.current, lerControle(gps[0]));
            eb = juntar(lerTeclas(teclas.current, P2), lerControle(gps[1]));
          }
        }
        const caidosAntes = [l.a.estado === "caido" && l.a.y < CHAO, l.b.estado === "caido" && l.b.y < CHAO];
        passo(l, dt, ea, eb);

        for (const ev of l.eventos) {
          if (ev.tipo === "hit") {
            efeitoAcerto(parts.current, ev.x, ev.y, ev.forte);
            tremor.current = Math.max(tremor.current, ev.forte ? 0.22 : 0.1);
          } else if (ev.tipo === "bloqueio") efeitoBloqueio(parts.current, ev.x, ev.y);
          else if (ev.tipo === "especial") faixas.current.push({ texto: ev.nome, quem: ev.quem, vida: 1.2 });
          else if (ev.tipo === "ko") tremor.current = 0.5;
        }
        l.eventos.length = 0;
        // Poeira quando alguém cai no chão.
        [l.a, l.b].forEach((f, i) => {
          if (caidosAntes[i] && f.y >= CHAO) efeitoPoeira(parts.current, f.x);
        });
        atualizarParticulas(parts.current, dt);
        for (const fx of faixas.current) fx.vida -= dt;
        faixas.current = faixas.current.filter((fx) => fx.vida > 0);
        [l.a, l.b].forEach((f, i) => {
          const r = rastro.current[i];
          rastro.current[i] = r > f.vida ? Math.max(f.vida, r - Math.max(80, (r - f.vida) * 2) * dt) : f.vida;
        });
        tremor.current = Math.max(0, tremor.current - dt);

        if (demo.current && l.fase === "fim" && l.t > 1.5) {
          luta.current = novaLuta(sortear(), sortear());
          mentes.current = [novaMente(), novaMente()];
        }
        if (!demo.current && t === "luta" && l.fase === "fim" && l.t > 1.4) {
          const v = vencedorDaLuta(l) ?? 0;
          setVencedor({ nome: (v === 0 ? l.a : l.b).p.nome, lado: v });
          mudarTela("fim");
        }
      }

      // ----- desenho -----
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const tr = tremor.current;
      if (tr > 0) ctx.translate((Math.random() - 0.5) * 30 * tr, (Math.random() - 0.5) * 30 * tr);
      cenario(ctx, tempo);
      // Quem está atacando fica na frente.
      const ordem = l.b.estado === "golpe" && l.a.estado !== "golpe" ? [l.a, l.b] : [l.b, l.a];
      for (const f of ordem) desenharLutador(ctx, f, tempo);
      for (const p of l.projeteis) desenharProjetil(ctx, p, tempo);
      desenharParticulas(ctx, parts.current);
      if (!demo.current) hud(ctx, l, rastro.current, faixas.current, fonte, tempo);

      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    const emJogo = () => tela.current === "luta" || tela.current === "pausa";
    const onKeyDown = (ev: KeyboardEvent) => {
      const alvo = ev.target as HTMLElement | null;
      if (alvo && ["INPUT", "TEXTAREA", "SELECT"].includes(alvo.tagName)) return;
      if (!emJogo()) return;
      if (ev.code === "Escape" || ev.code === "KeyP") {
        ev.preventDefault();
        if (!ev.repeat) mudarTela(tela.current === "pausa" ? "luta" : "pausa");
        return;
      }
      if (P1_SOLO[ev.code] || P2[ev.code]) {
        ev.preventDefault(); // setas não rolam a página no meio da luta
        teclas.current.add(ev.code);
      }
    };
    const onKeyUp = (ev: KeyboardEvent) => {
      teclas.current.delete(ev.code);
    };
    const onBlur = () => {
      teclas.current.clear();
      toque.current = entradaVazia();
      if (tela.current === "luta") mudarTela("pausa");
    };
    const onVis = () => {
      if (document.hidden) onBlur();
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [mudarTela]);

  const tituloEscolha = !escolha[0] ? "Jogador 1, escolha seu pirata" : modo === "cpu" ? "Agora escolha quem a CPU controla" : "Jogador 2, escolha seu pirata";

  // No celular os botões ficam fora da tela do jogo: embaixo com o aparelho em pé, dos lados deitado.
  const comControles = toqueAtivo && (telaUi === "luta" || telaUi === "pausa");

  return (
    <div
      className={comControles ? "flex select-none flex-col gap-3 landscape:flex-row landscape:items-center landscape:justify-center" : ""}
      style={{ WebkitTouchCallout: "none" }}
      onContextMenu={(ev) => ev.preventDefault()}
    >
    <div
      className={`relative w-full select-none overflow-hidden rounded-lg border-[6px] border-creme bg-noite shadow-[0_10px_30px_rgb(0_0_0/0.35)] ${comControles ? "landscape:order-2 landscape:min-w-0 landscape:flex-1 landscape:max-w-[calc(88dvh*16/9)]" : ""}`}
      style={{ aspectRatio: `${W} / ${H}`, WebkitTouchCallout: "none" }}
      onContextMenu={(ev) => ev.preventDefault()}
    >
      <canvas ref={canvasRef} className="block h-full w-full" aria-label="Duelo Pirata: jogo de luta" />

      {telaUi === "menu" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-noite/55 p-4 text-center">
          <h2 className="font-titulo text-4xl font-bold leading-none text-creme sm:text-7xl" style={{ textShadow: "4px 4px 0 #01121e" }}>
            Duelo Pirata
          </h2>
          <p className="max-w-md text-sm text-creme sm:text-base">Luta 1 contra 1 no convés. Melhor de 3 rounds.</p>
          <div className="flex flex-wrap justify-center gap-2">
            {(
              [
                ["cpu", "1 jogador"],
                ["2p", "2 jogadores"],
              ] as const
            ).map(([m, rotulo]) => (
              <button
                key={m}
                type="button"
                onClick={() => setModo(m)}
                className={`btn !px-4 !py-1.5 !text-base ${modo === m ? "bg-laranja text-noite" : "bg-creme-claro text-noite opacity-80"}`}
                aria-pressed={modo === m}
              >
                {rotulo}
              </button>
            ))}
          </div>
          {modo === "cpu" ? (
            <div className="flex items-center gap-2 text-sm text-creme">
              <span className="etiqueta text-[11px]">CPU</span>
              {(
                [
                  ["facil", "fácil"],
                  ["normal", "normal"],
                  ["dificil", "difícil"],
                ] as const
              ).map(([d, rotulo]) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDif(d)}
                  aria-pressed={dif === d}
                  className={`rounded-full border-2 border-creme/70 px-3 py-0.5 font-titulo font-bold ${dif === d ? "bg-creme text-noite" : "text-creme"}`}
                >
                  {rotulo}
                </button>
              ))}
            </div>
          ) : (
            <p className="text-xs text-creme/80">Mesmo teclado ou dois controles de videogame.</p>
          )}
          <button
            type="button"
            onClick={() => {
              setEscolha([null, null]);
              mudarTela("escolha");
            }}
            className="btn mt-1 bg-laranja text-noite !px-6 !py-2.5 !text-lg"
          >
            Escolher piratas
          </button>
        </div>
      )}

      {telaUi === "escolha" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 overflow-y-auto bg-noite/75 p-3 text-center sm:gap-4">
          <h2 className="font-titulo text-xl font-bold text-creme sm:text-3xl">{tituloEscolha}</h2>
          <div className="grid grid-cols-4 gap-2 sm:gap-4">
            {PERSONAGENS.map((p) => {
              const marcado = escolha[0] === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => escolher(p.id)}
                  className={`group flex flex-col items-center rounded-xl border-2 border-noite p-1 transition-transform hover:-translate-y-1 sm:p-2 ${marcado ? "ring-4 ring-laranja" : ""}`}
                  style={{ background: `linear-gradient(180deg, ${p.cor}cc, #f6f0d6 70%)` }}
                >
                  <Retrato id={p.id} />
                  <span className="font-titulo text-base font-bold leading-none text-noite sm:text-2xl">{p.nome}</span>
                  <span className="etiqueta hidden text-[10px] text-noite/80 sm:block">{p.titulo}</span>
                </button>
              );
            })}
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => escolher(sortear())} className="btn bg-creme-claro text-noite !px-4 !py-1.5 !text-base">
              Aleatório
            </button>
            <button
              type="button"
              onClick={() => (escolha[0] ? setEscolha([null, null]) : mudarTela("menu"))}
              className="btn bg-creme-claro text-noite !px-4 !py-1.5 !text-base opacity-80"
            >
              Voltar
            </button>
          </div>
        </div>
      )}

      {telaUi === "pausa" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-noite/60 text-center">
          <p className="font-titulo text-5xl font-bold text-creme">Pausado</p>
          <div className="flex gap-2">
            <button type="button" onClick={() => mudarTela("luta")} className="btn bg-laranja text-noite !px-5 !py-2 !text-base">
              Continuar
            </button>
            <button type="button" onClick={voltarMenu} className="btn bg-creme-claro text-noite !px-5 !py-2 !text-base">
              Menu
            </button>
          </div>
          <p className="etiqueta hidden text-[11px] text-creme/70 sm:block">Esc ou P pra pausar</p>
        </div>
      )}

      {telaUi === "fim" && vencedor && (
        <div className="absolute inset-0 flex items-center justify-center bg-noite/50 p-3">
          <div className="card flex w-full max-w-sm flex-col items-center gap-2 !p-4 text-center sm:!p-6">
            <span className="etiqueta text-[11px] text-estrela">
              {modo === "cpu" ? (vencedor.lado === 0 ? "Você venceu!" : "A CPU venceu") : `Jogador ${vencedor.lado + 1} venceu`}
            </span>
            <p className="font-titulo text-4xl font-bold leading-none text-azul sm:text-5xl">{vencedor.nome}</p>
            <p className="text-sm text-tinta">
              {personagem(escolha[vencedor.lado] ?? "luffy").titulo} leva essa.
            </p>
            <div className="mt-1 flex flex-wrap justify-center gap-2">
              <button type="button" onClick={() => escolha[0] && escolha[1] && iniciar(escolha[0], escolha[1])} className="btn bg-laranja text-noite !px-5 !py-2 !text-base">
                Revanche
              </button>
              <button
                type="button"
                onClick={() => {
                  setEscolha([null, null]);
                  demo.current = true;
                  luta.current = novaLuta(sortear(), sortear());
                  mudarTela("escolha");
                }}
                className="btn bg-creme-claro text-noite !px-5 !py-2 !text-base"
              >
                Trocar piratas
              </button>
            </div>
          </div>
        </div>
      )}

    </div>

      {comControles && (
        <div
          className={`flex items-end justify-between gap-3 px-1 landscape:contents ${telaUi === "pausa" ? "pointer-events-none opacity-50" : ""}`}
        >
          <div className="grid shrink-0 grid-cols-3 grid-rows-3 gap-1 landscape:order-1">
            <span />
            <BotaoToque rotulo="▲" tecla="cima" onMuda={mudarToque} className="h-14 w-14 text-xl" />
            <span />
            <BotaoToque rotulo="◀" tecla="esq" onMuda={mudarToque} className="h-14 w-14 text-xl" />
            <span />
            <BotaoToque rotulo="▶" tecla="dir" onMuda={mudarToque} className="h-14 w-14 text-xl" />
            <span />
            <BotaoToque rotulo="▼" tecla="baixo" onMuda={mudarToque} className="h-14 w-14 text-xl" />
            <span />
          </div>
          <div className="flex shrink-0 flex-col items-end gap-2 landscape:order-3">
            <button
              type="button"
              onClick={() => mudarTela("pausa")}
              className="pointer-events-auto rounded-full border-2 border-noite bg-creme-claro px-4 py-1 font-titulo text-sm font-bold text-noite"
              aria-label="Pausar"
            >
              II
            </button>
            <div className="grid grid-cols-2 gap-2">
              <span />
              <BotaoToque rotulo="Esp." tecla="especial" onMuda={mudarToque} className="h-16 w-16 !bg-laranja text-sm !text-noite" />
              <BotaoToque rotulo="Soco" tecla="soco" onMuda={mudarToque} className="h-16 w-16 text-sm" />
              <BotaoToque rotulo="Chute" tecla="chute" onMuda={mudarToque} className="h-16 w-16 text-sm" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
