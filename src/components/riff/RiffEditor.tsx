"use client";

import { useEffect, useRef, useState } from "react";
import { salvarMapa } from "@/app/actions/riff";
import { carregarMusica, clique, contexto, tocarBuffer } from "@/lib/riff/audio";
import { CHAVE_AJUSTES, normalizarAjustes } from "@/lib/riff/ajustes";
import { DIFICULDADES, NOME_DIFICULDADE, TRILHAS, type Dificuldade } from "@/lib/riff/config";
import { normalizarMapa, quantizar, type Nota } from "@/lib/riff/regras";

type MusicaEditor = {
  id: string;
  slug: string;
  title: string;
  bpm: number;
  durationMs: number;
  audioUrl: string;
  published: boolean;
  mapas: { difficulty: Dificuldade; notes: Nota[] }[];
};

const campo = "rounded-md border border-creme/30 bg-noite px-2 py-1.5 text-creme";

// Editor de mapa: toca a música, grava as teclas como notas, ajusta, quantiza, testa e salva.
export function RiffEditor({ musicas }: { musicas: MusicaEditor[] }) {
  const [musicaId, setMusicaId] = useState(musicas[0].id);
  const [dif, setDif] = useState<Dificuldade>("facil");
  const musica = musicas.find((m) => m.id === musicaId)!;
  const [notas, setNotas] = useState<Nota[]>(() => musica.mapas.find((m) => m.difficulty === dif)?.notes ?? []);
  const [tocando, setTocando] = useState<null | "ouvir" | "gravar" | "testar">(null);
  const [posicao, setPosicao] = useState(0);
  const [inicioEm, setInicioEm] = useState(0);
  const [sub, setSub] = useState(4);
  const [aviso, setAviso] = useState<string | null>(null);
  const [mudou, setMudou] = useState(false);

  const ctxRef = useRef<AudioContext | null>(null);
  const srcRef = useRef<AudioBufferSourceNode | null>(null);
  const inicioRef = useRef(0); // tempo do áudio em que a música estaria no 0
  const modoRef = useRef<typeof tocando>(null);
  const offset = useRef(0);
  const teclas = useRef<string[]>(["d", "f", "j", "k"]);

  useEffect(() => {
    try {
      const a = normalizarAjustes(JSON.parse(localStorage.getItem(CHAVE_AJUSTES) ?? "null"));
      if (a) {
        offset.current = a.offsetMs;
        teclas.current = a.teclas;
      }
    } catch {}
  }, []);

  const trocarMapa = (id: string, d: Dificuldade) => {
    if (mudou && !confirm("Descartar as mudanças que não foram salvas?")) return;
    parar();
    setMusicaId(id);
    setDif(d);
    setNotas(musicas.find((m) => m.id === id)?.mapas.find((m) => m.difficulty === d)?.notes ?? []);
    setMudou(false);
    setAviso(null);
  };

  const mexer = (fn: (n: Nota[]) => Nota[]) => {
    setNotas((n) => fn(n));
    setMudou(true);
  };

  const agora = () => {
    const c = ctxRef.current;
    return c ? (c.currentTime - inicioRef.current) * 1000 : 0;
  };

  function parar() {
    srcRef.current?.stop();
    srcRef.current = null;
    modoRef.current = null;
    setTocando(null);
  }

  const tocar = async (modo: "ouvir" | "gravar" | "testar") => {
    parar();
    const c = await contexto();
    ctxRef.current = c;
    const buffer = await carregarMusica(musica.audioUrl);
    const de = Math.max(0, Math.min(inicioEm, musica.durationMs));
    const quando = c.currentTime + 0.3;
    inicioRef.current = quando - de / 1000;
    srcRef.current = tocarBuffer(c, buffer, quando, de / 1000);
    srcRef.current.onended = () => {
      if (modoRef.current === modo) parar();
    };
    if (modo === "testar") for (const n of notas) if (n.t >= de) clique(c, inicioRef.current + n.t / 1000, n.lane % 2 === 0);
    modoRef.current = modo;
    setTocando(modo);
  };

  // Posição na tela e teclas de gravação (tempo do áudio no instante do evento, menos o offset do admin).
  useEffect(() => {
    if (!tocando) return;
    let raf = 0;
    const loop = () => {
      setPosicao(Math.round(agora()));
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    const onKey = (ev: KeyboardEvent) => {
      if (modoRef.current !== "gravar" || ev.repeat) return;
      const lane = teclas.current.indexOf(ev.key.toLowerCase());
      if (lane < 0) return;
      ev.preventDefault();
      const t = Math.round(agora() - offset.current);
      if (t < 0 || t > musica.durationMs) return;
      mexer((n) => [...n, { t, lane }].sort((a, b) => a.t - b.t));
    };
    window.addEventListener("keydown", onKey);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", onKey);
    };
  }, [tocando, musica.durationMs]);

  useEffect(() => () => srcRef.current?.stop(), []);

  const salvar = async () => {
    const mapa = normalizarMapa(notas, musica.durationMs);
    if (!mapa) return setAviso("Tem nota fora da música ou numa trilha que não existe.");
    const r = await salvarMapa(musica.id, dif, mapa);
    if (r.ok) {
      setNotas(mapa);
      setMudou(false);
    }
    setAviso(r.ok ? `Mapa salvo com ${r.total} notas.` : (r.erro ?? "Não deu pra salvar."));
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="surface-vidro flex flex-wrap items-end gap-3 p-4">
        <label className="flex flex-col gap-1 text-sm">
          Música
          <select className={campo} value={musicaId} onChange={(e) => trocarMapa(e.target.value, dif)}>
            {musicas.map((m) => (
              <option key={m.id} value={m.id}>
                {m.title}
                {m.published ? "" : " (rascunho)"}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Dificuldade
          <select className={campo} value={dif} onChange={(e) => trocarMapa(musicaId, e.target.value as Dificuldade)}>
            {DIFICULDADES.map((d) => (
              <option key={d} value={d}>
                {NOME_DIFICULDADE[d]}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Começar em (ms)
          <input type="number" min={0} step={100} className={`${campo} w-28 font-ficha`} value={inicioEm} onChange={(e) => setInicioEm(Number(e.target.value) || 0)} />
        </label>
        <p className="m-0 font-ficha text-sm text-areia">
          {musica.bpm} BPM · {musica.durationMs} ms · {notas.length} notas{mudou ? " · não salvo" : ""}
        </p>
      </div>

      <div className="surface-vidro flex flex-wrap items-center gap-2 p-4">
        {tocando ? (
          <button type="button" className="btn" onClick={parar}>
            Parar
          </button>
        ) : (
          <>
            <button type="button" className="btn" onClick={() => void tocar("ouvir")}>
              Tocar
            </button>
            <button type="button" className="btn" onClick={() => void tocar("gravar")}>
              Gravar notas
            </button>
            <button type="button" className="btn-fantasma" onClick={() => void tocar("testar")}>
              Testar (cliques nas notas)
            </button>
          </>
        )}
        <span className="font-ficha text-lg tabular-nums" aria-live="off">
          {posicao} ms
        </span>
        {tocando === "gravar" && (
          <span className="font-ficha text-sm text-laranja-claro">Gravando: {teclas.current.join(" ").toUpperCase()}</span>
        )}
      </div>

      <div className="surface-vidro flex flex-wrap items-end gap-2 p-4">
        <label className="flex flex-col gap-1 text-sm">
          Grade
          <select className={campo} value={sub} onChange={(e) => setSub(Number(e.target.value))}>
            <option value={1}>1/4 (tempo)</option>
            <option value={2}>1/8</option>
            <option value={4}>1/16</option>
            <option value={3}>1/12 (tercina)</option>
          </select>
        </label>
        <button type="button" className="btn-fantasma" onClick={() => mexer((n) => normalizarMapa(n.map((x) => ({ ...x, t: quantizar(x.t, musica.bpm, sub) })), musica.durationMs) ?? n)}>
          Quantizar tudo
        </button>
        <button type="button" className="btn-fantasma" onClick={() => mexer((n) => n.map((x) => ({ ...x, t: Math.max(0, x.t - 10) })))}>
          Tudo −10 ms
        </button>
        <button type="button" className="btn-fantasma" onClick={() => mexer((n) => n.map((x) => ({ ...x, t: x.t + 10 })))}>
          Tudo +10 ms
        </button>
        <button type="button" className="btn-fantasma" onClick={() => confirm("Apagar todas as notas deste mapa?") && mexer(() => [])}>
          Limpar
        </button>
        <button type="button" className="btn ml-auto" onClick={() => void salvar()}>
          Salvar mapa
        </button>
      </div>

      {aviso && (
        <p role="status" className="m-0 text-sm text-areia">
          {aviso}
        </p>
      )}

      <div className="surface-vidro max-h-[50vh] overflow-auto p-2">
        <table className="w-full border-collapse font-ficha text-sm">
          <thead>
            <tr className="text-left text-areia">
              <th className="p-1.5">#</th>
              <th className="p-1.5">Tempo (ms)</th>
              <th className="p-1.5">Trilha</th>
              <th className="p-1.5">
                <span className="sr-only">Ações</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {notas.map((n, i) => (
              <tr key={`${i}-${n.t}-${n.lane}`} className={Math.abs(n.t - posicao) < 120 && tocando ? "bg-laranja/20" : ""}>
                <td className="p-1.5 text-areia">{i + 1}</td>
                <td className="p-1.5">
                  <input
                    type="number"
                    min={0}
                    max={musica.durationMs}
                    aria-label={`Tempo da nota ${i + 1}`}
                    className={`${campo} w-28`}
                    defaultValue={n.t}
                    onBlur={(e) => {
                      const t = Number(e.target.value);
                      if (Number.isFinite(t) && t !== n.t) mexer((l) => l.map((x, k) => (k === i ? { ...x, t: Math.round(t) } : x)).sort((a, b) => a.t - b.t));
                    }}
                  />
                </td>
                <td className="p-1.5">
                  <select
                    aria-label={`Trilha da nota ${i + 1}`}
                    className={campo}
                    value={n.lane}
                    onChange={(e) => mexer((l) => l.map((x, k) => (k === i ? { ...x, lane: Number(e.target.value) } : x)))}
                  >
                    {Array.from({ length: TRILHAS }, (_, k) => (
                      <option key={k} value={k}>
                        {k + 1}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="p-1.5 text-right">
                  <button type="button" className="btn-fantasma px-2 py-1 text-xs" onClick={() => mexer((l) => l.filter((_, k) => k !== i))}>
                    Apagar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {notas.length === 0 && <p className="m-2 text-areia">Sem notas. Use “Gravar notas” e toque nas suas teclas.</p>}
      </div>
    </div>
  );
}
