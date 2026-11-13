"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { salvarAjustes, salvarPartida } from "@/app/actions/riff";
import { carregarMusica, contexto, tocarBuffer } from "@/lib/riff/audio";
import { nomeTecla, salvarAjustesLocais, type Ajustes } from "@/lib/riff/ajustes";
import { NOME_DIFICULDADE, RIFF, TRILHAS, type Dificuldade } from "@/lib/riff/config";
import { alturaDoAnel, desenhar, type Feedback, type Particula } from "@/lib/riff/desenho";
import { acabou, ativarEnergia, avancar, criarEstado, energiaAtiva, resultado, tocar, type Estado, type Evento } from "@/lib/riff/motor";
import { multiplicador, tempoDaMusica, type Nota, type Partida } from "@/lib/riff/regras";
import { EnergiaConstelacao } from "./Constelacao";
import { guardarPendente } from "./pendente";
import { useAjustes } from "./useAjustes";
import { RiffResultado, type EstadoSalvar } from "./RiffResultado";

export type MusicaJogo = { slug: string; title: string; artist: string; durationMs: number; audioUrl: string };
type Fase = "pronto" | "carregando" | "jogando" | "pausado" | "fim" | "erro";
type Hud = { score: number; combo: number; energia: number; energiaAtiva: boolean; contagem: number };
const HUD_ZERO: Hud = { score: 0, combo: 0, energia: 0, energiaAtiva: false, contagem: 0 };

export function RiffEstelar({
  musica,
  mapas,
  dificuldadeInicial,
  ajustesServidor,
  logado,
}: {
  musica: MusicaJogo;
  mapas: { difficulty: Dificuldade; notes: Nota[] }[];
  dificuldadeInicial: Dificuldade;
  ajustesServidor: Ajustes | null;
  logado: boolean;
}) {
  const [dificuldade, setDificuldade] = useState<Dificuldade>(
    mapas.some((m) => m.difficulty === dificuldadeInicial) ? dificuldadeInicial : mapas[0].difficulty,
  );
  const [ajustes, setAjustes] = useAjustes(ajustesServidor);
  const [fase, setFase] = useState<Fase>("pronto");
  const [hud, setHud] = useState<Hud>(HUD_ZERO);
  const [final, setFinal] = useState<Partida | null>(null);
  const [salvar, setSalvar] = useState<EstadoSalvar>({ tipo: "salvando" });

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const srcRef = useRef<AudioBufferSourceNode | null>(null);
  const bufferRef = useRef<AudioBuffer | null>(null);
  const inicioRef = useRef(0);
  const estadoRef = useRef<Estado | null>(null);
  const faseRef = useRef<Fase>("pronto");
  const apertadasRef = useRef<number[]>(Array(TRILHAS).fill(-Infinity));
  const feedbackRef = useRef<(Feedback | null)[]>(Array(TRILHAS).fill(null));
  const particulasRef = useRef<Particula[]>([]);
  const reduzidoRef = useRef(false);
  const fonteRef = useRef("monospace");
  const hudRef = useRef<Hud>(HUD_ZERO);
  const ajustesRef = useRef(ajustes);
  useEffect(() => {
    ajustesRef.current = ajustes;
  }, [ajustes]);

  const mapa = mapas.find((m) => m.difficulty === dificuldade) ?? mapas[0];
  const nomeDif = NOME_DIFICULDADE[dificuldade];

  const mudarFase = (f: Fase) => {
    faseRef.current = f;
    setFase(f);
  };

  useEffect(() => {
    reduzidoRef.current = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const f = getComputedStyle(document.body).getPropertyValue("--font-space-mono").trim();
    if (f) fonteRef.current = `${f}, monospace`;
  }, []);

  const agoraMusica = useCallback(() => {
    const c = ctxRef.current;
    return c ? tempoDaMusica(c.currentTime, inicioRef.current, ajustesRef.current.offsetMs) : 0;
  }, []);

  const registrar = useCallback((ev: Evento, agora: number) => {
    if (ev.tipo === "vazio") return;
    const j = ev.tipo === "acerto" ? ev.julgamento : "passou";
    feedbackRef.current[ev.lane] = { julgamento: j, inicio: agora, ate: agora + 450 };
    if (j === "perfeito" && !reduzidoRef.current) {
      const c = canvasRef.current;
      if (!c) return;
      const larg = c.clientWidth / TRILHAS;
      const x = larg * (ev.lane + 0.5);
      const y = alturaDoAnel(c.clientHeight);
      for (let k = 0; k < 6; k++) {
        const a = (Math.PI * 2 * k) / 6;
        particulasRef.current.push({ x, y, vx: Math.cos(a) * 120, vy: Math.sin(a) * 120, inicio: agora });
      }
      if (particulasRef.current.length > 60) particulasRef.current.splice(0, particulasRef.current.length - 60);
    }
  }, []);

  const finalizar = useCallback(async () => {
    const e = estadoRef.current;
    if (!e || faseRef.current === "fim") return;
    srcRef.current?.stop();
    srcRef.current = null;
    const p = resultado(e);
    setFinal(p);
    mudarFase("fim");
    if (!logado) {
      guardarPendente({ slug: musica.slug, dificuldade, titulo: musica.title, partida: p });
      setSalvar({ tipo: "semConta" });
      return;
    }
    setSalvar({ tipo: "salvando" });
    const r = await salvarPartida(musica.slug, dificuldade, p).catch(() => null);
    if (!r) setSalvar({ tipo: "erro", texto: "Não deu pra salvar agora. Tenta de novo em instantes." });
    else if (r.ok) setSalvar({ tipo: "salvo", recorde: r.recorde });
    else if (r.semConta) {
      guardarPendente({ slug: musica.slug, dificuldade, titulo: musica.title, partida: p });
      setSalvar({ tipo: "semConta" });
    } else setSalvar({ tipo: "erro", texto: r.erro });
  }, [dificuldade, logado, musica.slug, musica.title]);

  // Laço de desenho: a posição de tudo vem do relógio do áudio.
  useEffect(() => {
    if (fase !== "jogando") return;
    let raf = 0;
    const quadro = () => {
      const e = estadoRef.current;
      const canvas = canvasRef.current;
      const c2d = canvas?.getContext("2d");
      if (!e || !canvas || !c2d || faseRef.current !== "jogando") return;
      const agora = agoraMusica();
      for (const ev of avancar(e, agora)) registrar(ev, agora);

      const dpr = window.devicePixelRatio || 1;
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
        canvas.width = Math.round(w * dpr);
        canvas.height = Math.round(h * dpr);
      }
      c2d.setTransform(dpr, 0, 0, dpr, 0, 0);
      const real = ctxRef.current ? (ctxRef.current.currentTime - inicioRef.current) * 1000 : 0;
      desenhar(c2d, {
        w,
        h,
        agora,
        quedaMs: RIFF.quedaMs / ajustesRef.current.velocidade,
        notas: e.notas,
        julgadas: e.julgadas,
        apertadas: apertadasRef.current.map((t) => real - t < 110),
        feedback: feedbackRef.current,
        particulas: particulasRef.current,
        energiaAtiva: energiaAtiva(e, agora),
        reduzido: reduzidoRef.current,
        fonte: fonteRef.current,
      });

      const novo: Hud = {
        score: e.score,
        combo: e.combo,
        energia: e.energia,
        energiaAtiva: energiaAtiva(e, agora),
        contagem: real < 0 ? Math.ceil(-real / 1000) : 0,
      };
      const v = hudRef.current;
      if (v.score !== novo.score || v.combo !== novo.combo || v.energia !== novo.energia || v.energiaAtiva !== novo.energiaAtiva || v.contagem !== novo.contagem) {
        hudRef.current = novo;
        setHud(novo);
      }

      const ultima = e.notas.length ? e.notas[e.notas.length - 1].t : 0;
      if (agora > musica.durationMs || (acabou(e) && agora > ultima + 600)) {
        void finalizar();
        return;
      }
      raf = requestAnimationFrame(quadro);
    };
    raf = requestAnimationFrame(quadro);
    return () => cancelAnimationFrame(raf);
  }, [fase, agoraMusica, registrar, finalizar, musica.durationMs]);

  const comecar = async () => {
    mudarFase("carregando");
    try {
      const c = await contexto();
      ctxRef.current = c;
      const buffer = await carregarMusica(musica.audioUrl);
      bufferRef.current = buffer;
      srcRef.current?.stop();
      estadoRef.current = criarEstado(mapa.notes);
      feedbackRef.current = Array(TRILHAS).fill(null);
      particulasRef.current = [];
      hudRef.current = HUD_ZERO;
      setHud(HUD_ZERO);
      inicioRef.current = c.currentTime + RIFF.contagemS;
      srcRef.current = tocarBuffer(c, buffer, inicioRef.current);
      mudarFase("jogando");
    } catch (e) {
      console.error(e);
      mudarFase("erro");
    }
  };

  const pausar = useCallback(async () => {
    if (faseRef.current !== "jogando") return;
    mudarFase("pausado");
    await ctxRef.current?.suspend();
  }, []);

  const continuar = async () => {
    await ctxRef.current?.resume();
    mudarFase("jogando");
  };

  const sair = () => {
    srcRef.current?.stop();
    srcRef.current = null;
    void ctxRef.current?.resume();
    mudarFase("pronto");
  };

  const apertar = useCallback(
    (lane: number) => {
      const e = estadoRef.current;
      const c = ctxRef.current;
      if (!e || !c || faseRef.current !== "jogando") return;
      apertadasRef.current[lane] = (c.currentTime - inicioRef.current) * 1000;
      const agora = agoraMusica();
      registrar(tocar(e, lane, agora), agora);
    },
    [agoraMusica, registrar],
  );

  const energia = useCallback(() => {
    const e = estadoRef.current;
    if (e && faseRef.current === "jogando") ativarEnergia(e, agoraMusica());
  }, [agoraMusica]);

  // Teclado: registra o tempo do áudio no instante do evento.
  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      if (faseRef.current !== "jogando" && faseRef.current !== "pausado") return;
      const k = ev.key.toLowerCase();
      if (k === "escape" || k === "p") {
        ev.preventDefault();
        if (faseRef.current === "jogando") void pausar();
        return;
      }
      if (faseRef.current !== "jogando") return;
      if (k === " ") {
        ev.preventDefault();
        energia();
        return;
      }
      const lane = ajustesRef.current.teclas.indexOf(k);
      if (lane < 0) return;
      ev.preventDefault();
      if (!ev.repeat) apertar(lane);
    };
    const onVisivel = () => {
      if (document.hidden) void pausar();
    };
    window.addEventListener("keydown", onKey);
    document.addEventListener("visibilitychange", onVisivel);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("visibilitychange", onVisivel);
    };
  }, [apertar, energia, pausar]);

  // Sair da página para a música.
  useEffect(() => () => srcRef.current?.stop(), []);

  const onPointer = (ev: React.PointerEvent<HTMLCanvasElement>) => {
    ev.preventDefault();
    const r = ev.currentTarget.getBoundingClientRect();
    const lane = Math.min(TRILHAS - 1, Math.max(0, Math.floor(((ev.clientX - r.left) / r.width) * TRILHAS)));
    apertar(lane);
  };

  const mudarVelocidade = (v: number) => {
    const novo = { ...ajustes, velocidade: v };
    setAjustes(novo);
    salvarAjustesLocais(novo);
    if (logado) void salvarAjustes(novo);
  };

  const cadastroHref = `/cadastro?next=${encodeURIComponent(`/jogos/riff-estelar/${musica.slug}?d=${dificuldade}`)}`;
  const emJogo = fase === "jogando" || fase === "pausado";

  if (fase === "fim" && final)
    return (
      <RiffResultado
        partida={final}
        titulo={musica.title}
        dificuldade={nomeDif}
        salvar={salvar}
        cadastroHref={cadastroHref}
        onDeNovo={() => void comecar()}
      />
    );

  return (
    <div className="mx-auto flex w-full max-w-[520px] flex-col gap-3">
      {emJogo && (
        <div className="flex items-center justify-between gap-3 font-ficha text-creme">
          <div className="flex flex-col">
            <span className="text-[10px] uppercase tracking-wider text-areia">Pontos</span>
            <span className="text-xl font-bold tabular-nums">{hud.score.toLocaleString("pt-BR")}</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-[10px] uppercase tracking-wider text-areia">Combo</span>
            <span className="text-xl font-bold tabular-nums">
              {hud.combo} <span className="text-sm text-laranja-claro">x{multiplicador(hud.combo)}</span>
            </span>
          </div>
          <button type="button" onClick={() => void pausar()} className="btn-fantasma min-h-11 px-3 py-2 text-sm" aria-label="Pausar">
            Pausar
          </button>
        </div>
      )}

      <div className="surface-vidro relative overflow-hidden" style={{ height: "min(72svh, 680px)", minHeight: 300 }}>
        {emJogo ? (
          <canvas
            ref={canvasRef}
            onPointerDown={onPointer}
            className="block size-full touch-none select-none"
            aria-label={`Trilhas de ${musica.title}. Teclas ${ajustes.teclas.map(nomeTecla).join(", ")}, ou toque na trilha.`}
            role="img"
          />
        ) : (
          <div className="flex size-full flex-col items-center justify-center gap-4 p-5 text-center">
            <div>
              <h2 className="m-0 text-2xl font-semibold text-creme">{musica.title}</h2>
              <p className="m-0 text-areia">{musica.artist}</p>
            </div>
            <fieldset className="m-0 flex flex-wrap justify-center gap-2 border-0 p-0">
              <legend className="mb-2 w-full text-xs uppercase tracking-wider text-areia">Dificuldade</legend>
              {mapas.map((m) => (
                <button
                  key={m.difficulty}
                  type="button"
                  aria-pressed={m.difficulty === dificuldade}
                  onClick={() => setDificuldade(m.difficulty)}
                  className={`min-h-11 rounded-md border px-4 text-sm ${m.difficulty === dificuldade ? "border-laranja-claro bg-laranja-claro text-noite" : "border-creme/30 text-creme"}`}
                >
                  {NOME_DIFICULDADE[m.difficulty]}
                </button>
              ))}
            </fieldset>
            <fieldset className="m-0 flex flex-wrap justify-center gap-2 border-0 p-0">
              <legend className="mb-2 w-full text-xs uppercase tracking-wider text-areia">Velocidade das notas</legend>
              {RIFF.velocidades.map((v) => (
                <button
                  key={v}
                  type="button"
                  aria-pressed={v === ajustes.velocidade}
                  onClick={() => mudarVelocidade(v)}
                  className={`min-h-11 min-w-11 rounded-md border px-3 font-ficha text-sm ${v === ajustes.velocidade ? "border-laranja-claro bg-laranja-claro text-noite" : "border-creme/30 text-creme"}`}
                >
                  {v.toLocaleString("pt-BR")}x
                </button>
              ))}
            </fieldset>
            <p className="m-0 font-ficha text-sm text-areia">
              Teclas {ajustes.teclas.map(nomeTecla).join(" ")} · Espaço liga a energia · Esc pausa
            </p>
            <button type="button" onClick={() => void comecar()} disabled={fase === "carregando"} className="btn min-w-40">
              {fase === "carregando" ? "Afinando…" : "Começar"}
            </button>
            {fase === "erro" && <p role="alert" className="m-0 text-sm text-laranja-claro">Não deu pra tocar a música. Tenta de novo.</p>}
            <Link href="/jogos/riff-estelar/calibrar" className="text-sm text-laranja-claro">
              Calibrar atraso e trocar teclas
            </Link>
          </div>
        )}

        {fase === "jogando" && hud.contagem > 0 && (
          <div aria-live="assertive" className="pointer-events-none absolute inset-0 flex items-center justify-center font-ficha text-7xl font-bold text-laranja-claro">
            {hud.contagem}
          </div>
        )}

        {fase === "pausado" && (
          <div role="dialog" aria-modal="true" aria-labelledby="riff-pausa" className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-noite/85 p-5">
            <h2 id="riff-pausa" className="m-0 text-2xl font-semibold text-creme">Pausado</h2>
            <button type="button" autoFocus onClick={() => void continuar()} className="btn min-w-40">
              Continuar
            </button>
            <button type="button" onClick={() => void comecar()} className="btn-fantasma min-w-40">
              Recomeçar
            </button>
            <button type="button" onClick={sair} className="btn-fantasma min-w-40">
              Sair da partida
            </button>
          </div>
        )}
      </div>

      {emJogo && (
        <div className="flex items-center justify-between gap-3">
          <EnergiaConstelacao energia={hud.energia} ativa={hud.energiaAtiva} />
          <button
            type="button"
            onClick={energia}
            disabled={hud.energia < 1 || hud.energiaAtiva}
            className="btn min-h-11 px-4 py-2 text-sm disabled:opacity-40"
          >
            {hud.energiaAtiva ? "Pontos em dobro" : "Ligar energia"}
          </button>
        </div>
      )}
    </div>
  );
}
