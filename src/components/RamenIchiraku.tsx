"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  CALDOS,
  EXTRAS,
  MAX_EXTRAS,
  NOMES,
  adicionar,
  limpar,
  multiplicador,
  novoEstado,
  rank,
  servir,
  step,
  type Caldo,
  type Estado,
  type Extra,
} from "@/lib/ramen";

type Ui = "menu" | "jogando" | "fim";
type Aviso = { id: number; assento: number; texto: string; bom: boolean };

const CHAVE_RECORDE = "ramen-do-ichiraku:recorde";

const ICONE: Record<Caldo | Extra, string> = {
  misso: "🟫",
  shoyu: "🟤",
  tonkotsu: "⚪",
  chashu: "🥓",
  naruto: "🍥",
  ovo: "🥚",
  menma: "🎋",
  cebolinha: "🌿",
  nori: "🟩",
};
const COR_CALDO: Record<Caldo, string> = { misso: "#c98a3c", shoyu: "#8a4a22", tonkotsu: "#f0c98a" };
const TECLA_CALDO = ["Q", "W", "E"];
const TECLA_EXTRA = ["A", "S", "D", "F", "G", "H"];

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

function Tigela({ caldo, extras, pequena }: { caldo: Caldo | null; extras: Extra[]; pequena?: boolean }) {
  const t = pequena ? "text-base" : "text-2xl sm:text-3xl";
  return (
    <div className={`relative flex flex-col items-center ${pequena ? "w-20" : "w-36 sm:w-44"}`}>
      <div
        className={`flex w-full flex-wrap items-center justify-center gap-0.5 rounded-t-full border-4 border-b-0 border-[#7a2a2a] ${pequena ? "min-h-8 p-1" : "min-h-16 p-2"}`}
        style={{ background: caldo ? COR_CALDO[caldo] : "#fffaf0" }}
      >
        {extras.map((x) => (
          <span key={x} className={t} aria-hidden>
            {ICONE[x]}
          </span>
        ))}
      </div>
      <div className={`w-full rounded-b-full bg-[#c0262d] ${pequena ? "h-4" : "h-9"}`} />
    </div>
  );
}

export function RamenIchiraku() {
  const estado = useRef<Estado>(novoEstado());
  const ui = useRef<Ui>("menu");
  const recorde = useRef(0);
  const avisoId = useRef(0);
  const [uiState, setUi] = useState<Ui>("menu");
  const [e, setVisao] = useState<Estado>(() => novoEstado());
  const [avisos, setAvisos] = useState<Aviso[]>([]);
  const [fim, setFim] = useState<{ pontos: number; novo: boolean; recorde: number; servidos: number; perdidos: number; combo: number } | null>(null);

  // A lógica muda o estado no lugar; a tela desenha uma cópia rasa a cada quadro.
  const render = useCallback(() => {
    const s = estado.current;
    setVisao({ ...s, assentos: s.assentos.map((c) => c && { ...c }), tigela: { caldo: s.tigela.caldo, extras: [...s.tigela.extras] } });
  }, []);
  const mudarUi = useCallback((u: Ui) => {
    ui.current = u;
    setUi(u);
  }, []);

  const comecar = useCallback(() => {
    estado.current = novoEstado();
    setAvisos([]);
    render();
    mudarUi("jogando");
  }, [mudarUi, render]);

  const avisar = useCallback((assento: number, texto: string, bom: boolean) => {
    const id = ++avisoId.current;
    setAvisos((a) => [...a, { id, assento, texto, bom }]);
    setTimeout(() => setAvisos((a) => a.filter((x) => x.id !== id)), 900);
  }, []);

  const pegar = useCallback(
    (item: Caldo | Extra) => {
      if (ui.current !== "jogando") return;
      adicionar(estado.current, item);
      render();
    },
    [render],
  );

  const entregar = useCallback(
    (assento: number) => {
      if (ui.current !== "jogando") return;
      const { resultado, ganho } = servir(estado.current, assento);
      if (resultado === "certo") avisar(assento, `+${ganho}`, true);
      else if (resultado === "errado") avisar(assento, "Não foi isso!", false);
      render();
    },
    [avisar, render],
  );

  const jogarFora = useCallback(() => {
    limpar(estado.current);
    render();
  }, [render]);

  useEffect(() => {
    recorde.current = lerRecorde();
    let raf = 0;
    let antes = performance.now();
    const frame = (agora: number) => {
      const dt = Math.min(1 / 20, (agora - antes) / 1000);
      antes = agora;
      const e = estado.current;
      if (ui.current === "jogando") {
        step(e, dt);
        if (e.status === "fim") {
          const novo = e.pontos > recorde.current;
          if (novo) {
            recorde.current = e.pontos;
            salvarRecorde(e.pontos);
          }
          setFim({ pontos: e.pontos, novo, recorde: recorde.current, servidos: e.servidos, perdidos: e.perdidos, combo: e.maiorCombo });
          mudarUi("fim");
        }
        render();
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    const onKey = (ev: KeyboardEvent) => {
      if (ui.current !== "jogando" || ev.repeat) return;
      const alvo = ev.target as HTMLElement | null;
      if (alvo && ["INPUT", "TEXTAREA", "SELECT"].includes(alvo.tagName)) return;
      const k = ev.key.toUpperCase();
      const c = TECLA_CALDO.indexOf(k);
      const x = TECLA_EXTRA.indexOf(k);
      if (c >= 0) pegar(CALDOS[c]);
      else if (x >= 0) pegar(EXTRAS[x]);
      else if (["1", "2", "3"].includes(ev.key)) entregar(Number(ev.key) - 1);
      else if (ev.key === "Backspace" || ev.key === "Delete") jogarFora();
      else return;
      ev.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", onKey);
    };
  }, [entregar, jogarFora, mudarUi, pegar, render]);

  const r = fim ? rank(fim.pontos) : null;

  return (
    <div style={{ color: "#2a2a2a" }} className="relative w-full select-none overflow-hidden rounded-lg border-[6px] border-creme bg-[#f5ecd7] text-tinta shadow-[0_10px_30px_rgb(0_0_0/0.35)]">
      {/* Toldo */}
      <div className="flex h-8 sm:h-10" aria-hidden>
        {Array.from({ length: 12 }, (_, i) => (
          <div key={i} className="flex-1 rounded-b-full" style={{ background: i % 2 ? "#f5ecd7" : "#c0262d" }} />
        ))}
      </div>

      {/* Placar */}
      <div className="flex items-center justify-between gap-2 px-3 pt-2 font-titulo text-sm font-bold sm:px-5 sm:text-lg">
        <span>⏱ {Math.ceil(e.tempo)}s</span>
        <span className={e.combo >= 2 ? "text-laranja" : "text-[#6b5a45]"}>
          combo ×{multiplicador(e.combo).toFixed(2).replace(/\.?0+$/, "")} {e.combo >= 2 && `(${e.combo} seguidos)`}
        </span>
        <span>{e.pontos} pts</span>
      </div>

      {/* Balcão com clientes */}
      <div className="grid grid-cols-3 gap-2 px-2 pt-3 sm:gap-4 sm:px-5">
        {e.assentos.map((c, i) => {
          const frac = c ? c.paciencia / c.pacienciaMax : 0;
          return (
            <button
              key={c?.id ?? `vazio-${i}`}
              type="button"
              onClick={() => entregar(i)}
              disabled={!c || uiState !== "jogando"}
              className="relative flex min-h-40 flex-col items-center gap-1.5 rounded-xl border-2 border-dashed border-[#d8c9a4] bg-white/50 p-2 transition enabled:hover:-translate-y-0.5 enabled:hover:border-laranja enabled:hover:bg-white sm:min-h-48"
              aria-label={c ? `Servir cliente ${i + 1}: ${NOMES[c.pedido.caldo]} com ${c.pedido.extras.map((x) => NOMES[x]).join(", ")}` : `Banco ${i + 1} vazio`}
            >
              <span className="etiqueta absolute left-1.5 top-1 text-[10px] text-[#6b5a45]">{i + 1}</span>
              {c ? (
                <>
                  <div className="rounded-lg bg-white px-2 py-1 text-xs shadow sm:text-sm">
                    <p className="m-0 font-bold">{NOMES[c.pedido.caldo]}</p>
                    <p className="m-0 text-base leading-tight sm:text-lg" aria-hidden>
                      {c.pedido.extras.map((x) => ICONE[x]).join(" ")}
                    </p>
                  </div>
                  <span className={`text-4xl sm:text-5xl ${frac < 0.3 ? "animate-bounce" : ""}`} aria-hidden>
                    {frac < 0.3 ? "😤" : c.rosto}
                  </span>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-[#e6d8b5]">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${frac * 100}%`, background: frac < 0.3 ? "#c0262d" : frac < 0.6 ? "#dd5d05" : "#4a8a3a" }}
                    />
                  </div>
                </>
              ) : (
                <span className="m-auto text-xs text-[#6b5a45]">banco livre</span>
              )}
              {avisos
                .filter((a) => a.assento === i)
                .map((a) => (
                  <span
                    key={a.id}
                    className={`pointer-events-none absolute left-1/2 top-1/3 animate-[subir_0.9s_ease-out_forwards] whitespace-nowrap font-titulo text-lg font-bold sm:text-2xl ${a.bom ? "text-[#2f7a2a]" : "text-[#c0262d]"}`}
                  >
                    {a.texto}
                  </span>
                ))}
            </button>
          );
        })}
      </div>

      {/* Balcão de madeira */}
      <div className="mt-3 h-3 bg-[#8a5a32]" aria-hidden />

      {/* Cozinha */}
      <div className="flex flex-col items-center gap-3 bg-[#ead9b4] px-2 py-3 sm:flex-row sm:items-start sm:justify-center sm:gap-6 sm:px-5">
        <div className="flex flex-col items-center gap-2">
          <Tigela caldo={e.tigela.caldo} extras={e.tigela.extras} />
          <button type="button" onClick={jogarFora} className="btn bg-white !px-3 !py-1 !text-xs">
            🗑 jogar fora
          </button>
        </div>
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap justify-center gap-1.5">
            {CALDOS.map((c, i) => (
              <Ingrediente key={c} item={c} tecla={TECLA_CALDO[i]} ativo={e.tigela.caldo === c} onClick={() => pegar(c)} />
            ))}
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {EXTRAS.map((x, i) => (
              <Ingrediente
                key={x}
                item={x}
                tecla={TECLA_EXTRA[i]}
                ativo={e.tigela.extras.includes(x)}
                cheio={!e.tigela.extras.includes(x) && e.tigela.extras.length >= MAX_EXTRAS}
                onClick={() => pegar(x)}
              />
            ))}
          </div>
          <p className="m-0 text-center text-[11px] text-[#6b5a45]">monte a tigela e toque no cliente pra servir</p>
        </div>
      </div>

      {uiState === "menu" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-noite/70 p-5 text-center">
          <span className="text-6xl" aria-hidden>
            🍜
          </span>
          <h2 className="font-titulo text-4xl font-bold leading-none text-creme sm:text-6xl" style={{ textShadow: "3px 3px 0 #01121e" }}>
            Ramen do Ichiraku
          </h2>
          <p className="max-w-md text-sm text-creme sm:text-base">
            90 segundos de balcão. Escolha o <strong>caldo</strong>, junte os <strong>ingredientes</strong> e toque no cliente certo antes que a paciência
            acabe. Acertos seguidos viram <strong>combo</strong>.
          </p>
          <button type="button" onClick={comecar} className="btn bg-laranja text-noite !px-6 !py-2.5 !text-lg">
            Abrir a loja
          </button>
        </div>
      )}

      {uiState === "fim" && fim && r && (
        <div className="absolute inset-0 flex items-center justify-center bg-noite/60 p-3">
          <div className="card flex w-full max-w-sm flex-col items-center gap-1.5 !p-4 text-center sm:gap-2 sm:!p-6">
            <span className="etiqueta text-[11px] text-estrela">{fim.novo ? "Novo recorde!" : `recorde ${fim.recorde} pontos`}</span>
            <p className="font-titulo text-4xl font-bold leading-none text-azul sm:text-5xl">{fim.pontos} pts</p>
            <p className="etiqueta text-[11px] text-azul">
              {fim.servidos} tigelas · maior combo {fim.combo} · {fim.perdidos} foram embora
            </p>
            <p className="font-titulo text-lg font-bold leading-tight sm:text-xl">{r.titulo}</p>
            <p className="text-sm text-tinta">{r.texto}</p>
            <button type="button" onClick={comecar} className="btn mt-1 bg-laranja text-noite !px-5 !py-2 !text-base">
              Mais um turno
            </button>
          </div>
        </div>
      )}

      <style>{`@keyframes subir { from { opacity: 1; transform: translate(-50%, 0); } to { opacity: 0; transform: translate(-50%, -40px); } }`}</style>
    </div>
  );
}

function Ingrediente({ item, tecla, ativo, cheio, onClick }: { item: Caldo | Extra; tecla: string; ativo: boolean; cheio?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={cheio}
      aria-pressed={ativo}
      className={`relative flex min-w-20 flex-col items-center rounded-lg border-2 px-2 py-1.5 text-xs font-bold transition disabled:opacity-40 sm:min-w-24 sm:text-sm ${
        ativo ? "border-laranja bg-[#fff1dc]" : "border-[#d8c9a4] bg-white hover:border-laranja"
      }`}
    >
      <span className="text-xl sm:text-2xl" aria-hidden>
        {ICONE[item]}
      </span>
      {NOMES[item]}
      <span className="absolute right-1 top-0.5 hidden text-[9px] text-[#6b5a45] sm:block">{tecla}</span>
    </button>
  );
}
