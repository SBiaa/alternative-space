"use client";

import { useEffect, useRef, useState } from "react";
import { salvarAjustes } from "@/app/actions/riff";
import { clique, contexto } from "@/lib/riff/audio";
import { nomeTecla, normalizarAjustes, salvarAjustesLocais, type Ajustes } from "@/lib/riff/ajustes";
import { useAjustes } from "./useAjustes";
import { RIFF, TRILHAS } from "@/lib/riff/config";
import { calcularOffset, diferencaParaBatida } from "@/lib/riff/regras";

type Fase = "parado" | "ouvindo" | "pronto" | "falhou";

// Calibração: o tripulante toca junto com um clique; a média do atraso vira o offset.
export function RiffCalibrar({ ajustesServidor, logado }: { ajustesServidor: Ajustes | null; logado: boolean }) {
  const [ajustes, setAjustes] = useAjustes(ajustesServidor);
  const [fase, setFase] = useState<Fase>("parado");
  const [toques, setToques] = useState(0);
  const [medido, setMedido] = useState<number | null>(null);
  const [trocando, setTrocando] = useState<number | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const batidas = useRef<number[]>([]);
  const difs = useRef<number[]>([]);
  const ctxRef = useRef<AudioContext | null>(null);
  const fimRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (fimRef.current) clearTimeout(fimRef.current);
    };
  }, []);

  const guardar = async (a: Ajustes) => {
    const ok = normalizarAjustes(a);
    if (!ok) return setAviso("Esses ajustes não valem: as quatro teclas precisam ser diferentes.");
    setAjustes(ok);
    salvarAjustesLocais(ok);
    if (logado) {
      const r = await salvarAjustes(ok);
      setAviso(r.ok ? "Ajustes guardados no seu perfil." : "Guardado neste navegador. No perfil não deu agora.");
    } else setAviso("Ajustes guardados neste navegador.");
  };

  const registrarToque = () => {
    const c = ctxRef.current;
    if (!c || fase !== "ouvindo") return;
    const t = c.currentTime * 1000;
    // As 4 primeiras batidas são só pra pegar o ritmo.
    const validas = batidas.current.slice(4);
    if (t < validas[0] - 250) return;
    difs.current.push(diferencaParaBatida(t, validas));
    setToques(difs.current.length);
  };

  const comecar = async () => {
    const c = await contexto();
    ctxRef.current = c;
    const { batidas: n, intervaloMs } = RIFF.calibracao;
    const inicio = c.currentTime + 0.6;
    batidas.current = Array.from({ length: n }, (_, i) => (inicio + (i * intervaloMs) / 1000) * 1000);
    batidas.current.forEach((b, i) => clique(c, b / 1000, i % 4 === 0));
    difs.current = [];
    setToques(0);
    setMedido(null);
    setAviso(null);
    setFase("ouvindo");
    fimRef.current = setTimeout(() => {
      const off = calcularOffset(difs.current);
      setMedido(off);
      setFase(off === null ? "falhou" : "pronto");
    }, 600 + n * intervaloMs + 300);
  };

  // Tecla de toque na calibração: qualquer tecla da trilha ou espaço. Troca de tecla: a próxima tecla apertada.
  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      if (trocando !== null) {
        ev.preventDefault();
        if (ev.key === "Escape") return setTrocando(null);
        const novas = [...ajustes.teclas];
        novas[trocando] = ev.key.toLowerCase();
        setTrocando(null);
        void guardar({ ...ajustes, teclas: novas });
        return;
      }
      if (fase !== "ouvindo" || ev.repeat) return;
      if (ev.key === " " || ajustes.teclas.includes(ev.key.toLowerCase())) {
        ev.preventDefault();
        registrarToque();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const ajustarFino = (d: number) => {
    const offsetMs = Math.max(-RIFF.offsetLimiteMs, Math.min(RIFF.offsetLimiteMs, ajustes.offsetMs + d));
    void guardar({ ...ajustes, offsetMs });
  };

  return (
    <div className="flex flex-col gap-5">
      <section className="surface-vidro flex flex-col gap-4 p-5">
        <h2 className="m-0 text-xl font-semibold">Atraso do som</h2>
        <p className="m-0 text-areia">
          Ponha o fone ou o som que você vai usar, aperte começar e toque junto com o clique (espaço, uma das suas teclas, ou o botão grande).
          As 4 primeiras batidas são pra pegar o ritmo.
        </p>
        <button
          type="button"
          onPointerDown={(e) => {
            if (fase === "ouvindo") {
              e.preventDefault();
              registrarToque();
            }
          }}
          onClick={() => {
            if (fase !== "ouvindo") void comecar();
          }}
          className="btn min-h-24 w-full text-lg"
        >
          {fase === "ouvindo" ? `Toque no clique (${toques})` : fase === "parado" ? "Começar" : "Medir de novo"}
        </button>
        <div role="status" className="font-ficha text-sm">
          {fase === "pronto" && medido !== null && (
            <div className="flex flex-wrap items-center gap-3">
              <span>Atraso medido: {medido} ms</span>
              <button type="button" className="btn min-h-11 px-4 py-2 text-sm" onClick={() => void guardar({ ...ajustes, offsetMs: medido })}>
                Usar esse valor
              </button>
            </div>
          )}
          {fase === "falhou" && <p className="m-0 text-laranja-claro">Poucos toques no ritmo. Tenta de novo, sem pressa.</p>}
        </div>
        <div className="flex flex-wrap items-center gap-2 font-ficha">
          <span className="text-sm text-areia">Atraso em uso:</span>
          <button type="button" className="btn-fantasma min-h-11 min-w-11 px-2 py-1" onClick={() => ajustarFino(-5)} aria-label="Diminuir 5 milissegundos">
            −5
          </button>
          <output className="min-w-16 text-center text-lg">{ajustes.offsetMs} ms</output>
          <button type="button" className="btn-fantasma min-h-11 min-w-11 px-2 py-1" onClick={() => ajustarFino(5)} aria-label="Aumentar 5 milissegundos">
            +5
          </button>
        </div>
      </section>

      <section className="surface-vidro flex flex-col gap-3 p-5">
        <h2 className="m-0 text-xl font-semibold">Teclas</h2>
        <p className="m-0 text-sm text-areia">Clique numa trilha e aperte a tecla nova. Esc cancela. Espaço, Esc, P, Tab e Enter ficam reservados.</p>
        <ul className="m-0 grid list-none grid-cols-4 gap-2 p-0">
          {Array.from({ length: TRILHAS }, (_, i) => (
            <li key={i}>
              <button
                type="button"
                onClick={() => setTrocando(i)}
                aria-label={`Trilha ${i + 1}: tecla ${nomeTecla(ajustes.teclas[i])}. Trocar`}
                className={`min-h-14 w-full rounded-md border font-ficha text-lg ${trocando === i ? "border-laranja-claro text-laranja-claro" : "border-creme/30 text-creme"}`}
              >
                {trocando === i ? "…" : nomeTecla(ajustes.teclas[i])}
              </button>
            </li>
          ))}
        </ul>
        <button type="button" className="btn-fantasma self-start" onClick={() => void guardar({ ...ajustes, teclas: [...RIFF.teclasPadrao] })}>
          Voltar pro padrão
        </button>
      </section>

      {aviso && (
        <p role="status" className="m-0 text-sm text-areia">
          {aviso}
        </p>
      )}
    </div>
  );
}
