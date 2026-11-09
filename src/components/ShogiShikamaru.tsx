"use client";

import { useEffect, useMemo, useState } from "react";
import {
  N,
  NOMES,
  aplicar,
  emXeque,
  lanceCpu,
  lancesLegais,
  novoEstado,
  vencedor,
  type Estado,
  type Lance,
  type Mao,
  type Nivel,
  type Tipo,
} from "@/lib/shogi";

const KANJI: Record<Tipo, string> = { K: "王", G: "金", S: "銀", B: "角", R: "飛", P: "歩" };
const KANJI_PROM: Partial<Record<Tipo, string>> = { S: "全", B: "馬", R: "龍", P: "と" };
const NIVEIS: { id: Nivel; nome: string }[] = [
  { id: "genin", nome: "Genin" },
  { id: "chunin", nome: "Chunin" },
  { id: "jonin", nome: "Jonin" },
];
const FALAS = ["Que problemático...", "Hmm, deixa eu pensar.", "Isso foi previsível.", "Você caiu direitinho.", "Nada mal."];

type Selecao = { de: number } | { drop: keyof Mao } | null;

function Pedra({ tipo, prom, inimiga }: { tipo: Tipo; prom: boolean; inimiga: boolean }) {
  return (
    <span
      className={`flex aspect-[5/6] w-[78%] items-center justify-center bg-[#f3dca6] font-bold leading-none shadow-[0_2px_3px_rgb(0_0_0/0.35)] ${inimiga ? "rotate-180" : ""}`}
      style={{ clipPath: "polygon(50% 0, 88% 16%, 100% 100%, 0 100%, 12% 16%)", color: prom ? "#b0201a" : "#1d1d1d" }}
    >
      <span className="mt-[18%] text-[clamp(14px,5vw,30px)]">{prom ? KANJI_PROM[tipo] ?? KANJI[tipo] : KANJI[tipo]}</span>
    </span>
  );
}

export function ShogiShikamaru() {
  const [e, setE] = useState<Estado>(novoEstado);
  const [nivel, setNivel] = useState<Nivel>("chunin");
  const [sel, setSel] = useState<Selecao>(null);
  const [promover, setPromover] = useState<Lance[] | null>(null);
  const [ultimo, setUltimo] = useState<number | null>(null);
  const [fala, setFala] = useState("Vamos lá. Sua vez.");

  const legais = useMemo(() => lancesLegais(e), [e]);
  const fim = useMemo(() => (legais.length === 0 ? vencedor(e) : null), [e, legais]);

  // Vez da CPU (pequeno atraso pra parecer que ela pensa).
  useEffect(() => {
    if (e.vez !== 1 || fim !== null) return;
    const t = setTimeout(() => {
      const l = lanceCpu(e, nivel);
      if (!l) return;
      const prox = aplicar(e, l);
      setE(prox);
      setUltimo(l.para);
      setFala(emXeque(prox, 0) ? "Xeque." : FALAS[Math.floor(Math.random() * FALAS.length)]);
    }, 450);
    return () => clearTimeout(t);
  }, [e, nivel, fim]);

  const destinos = useMemo(() => {
    if (!sel || e.vez !== 0) return new Set<number>();
    return new Set(
      legais.filter((l) => ("de" in sel ? "de" in l && l.de === sel.de : "drop" in l && l.drop === sel.drop)).map((l) => l.para),
    );
  }, [sel, legais, e.vez]);

  function jogar(l: Lance) {
    setE(aplicar(e, l));
    setUltimo(l.para);
    setSel(null);
    setPromover(null);
    setFala("Hmm...");
  }

  function clicar(i: number) {
    if (e.vez !== 0 || fim !== null || promover) return;
    if (sel && destinos.has(i)) {
      const op = legais.filter((l) => l.para === i && ("de" in sel ? "de" in l && l.de === sel.de : "drop" in l && l.drop === sel.drop));
      if (op.length > 1) setPromover(op);
      else jogar(op[0]);
      return;
    }
    const pc = e.tab[i];
    setSel(pc?.lado === 0 ? { de: i } : null);
  }

  function reiniciar() {
    setE(novoEstado());
    setSel(null);
    setPromover(null);
    setUltimo(null);
    setFala("Vamos lá. Sua vez.");
  }

  const reiEmXeque = (lado: 0 | 1) => (emXeque(e, lado) ? e.tab.findIndex((p) => p?.tipo === "K" && p.lado === lado) : -1);
  const xeques = new Set([reiEmXeque(0), reiEmXeque(1)]);

  const Mao = ({ lado }: { lado: 0 | 1 }) => {
    const itens = (Object.entries(e.maos[lado]) as [keyof Mao, number][]).filter(([, n]) => n > 0);
    return (
      <div className="flex min-h-12 flex-wrap items-center justify-center gap-1.5 sm:min-h-14">
        <span className="etiqueta text-[10px] text-[#d9cfa6]">{lado === 0 ? "sua mão" : "mão do Shikamaru"}</span>
        {itens.length === 0 && <span className="text-xs text-[#d9cfa6]/60">vazia</span>}
        {itens.map(([t, n]) => {
          const ativo = sel && "drop" in sel && sel.drop === t;
          return (
            <button
              key={t}
              type="button"
              disabled={lado === 1 || e.vez !== 0 || fim !== null}
              onClick={() => setSel(ativo ? null : { drop: t })}
              aria-label={`${NOMES[t]} na mão (${n})`}
              className={`relative flex size-10 items-center justify-center rounded sm:size-12 ${ativo ? "bg-[#f2a66e]/60" : "enabled:hover:bg-white/10"}`}
            >
              <Pedra tipo={t} prom={false} inimiga={lado === 1} />
              {n > 1 && <span className="absolute -right-1 -top-1 rounded-full bg-[#c0262d] px-1.5 text-[11px] font-bold text-white">{n}</span>}
            </button>
          );
        })}
      </div>
    );
  };

  return (
    <div className="relative flex w-full select-none flex-col items-center gap-2 bg-[#24331f] px-2 py-3 text-creme sm:py-4">
      <div className="flex w-full max-w-md items-center justify-between gap-2 text-sm">
        <span className="font-titulo font-bold">🦌 Shikamaru: <span className="font-normal italic">“{fala}”</span></span>
        <div className="flex gap-1">
          {NIVEIS.map((n) => (
            <button
              key={n.id}
              type="button"
              onClick={() => { setNivel(n.id); reiniciar(); }}
              className={`rounded px-2 py-0.5 text-xs ${nivel === n.id ? "bg-[#f2a66e] text-[#1d1d1d]" : "bg-white/10 hover:bg-white/20"}`}
            >
              {n.nome}
            </button>
          ))}
        </div>
      </div>

      <Mao lado={1} />

      <div
        className="grid w-full max-w-[min(420px,62vh)] gap-px border-4 border-[#6b4a22] bg-[#6b4a22]"
        style={{ gridTemplateColumns: `repeat(${N}, 1fr)` }}
      >
        {e.tab.map((pc, i) => {
          const alvo = destinos.has(i);
          const selecionada = sel && "de" in sel && sel.de === i;
          return (
            <button
              key={i}
              type="button"
              onClick={() => clicar(i)}
              aria-label={pc ? `${NOMES[pc.tipo]} ${pc.lado === 0 ? "seu" : "do Shikamaru"}` : alvo ? "casa livre" : "casa vazia"}
              className={`relative flex aspect-square items-center justify-center ${
                selecionada ? "bg-[#f2a66e]" : xeques.has(i) ? "bg-[#d9604f]" : ultimo === i ? "bg-[#e6c477]" : "bg-[#dcb56e]"
              }`}
            >
              {pc && <Pedra tipo={pc.tipo} prom={pc.prom} inimiga={pc.lado === 1} />}
              {alvo && (
                <span className={`absolute rounded-full bg-[#2f4a2a]/55 ${pc ? "inset-1 bg-transparent ring-4 ring-[#2f4a2a]/60" : "size-1/4"}`} />
              )}
            </button>
          );
        })}
      </div>

      <Mao lado={0} />

      {promover && (
        <div className="absolute inset-0 flex items-center justify-center bg-noite/70">
          <div className="card flex flex-col items-center gap-3 px-6 py-4">
            <p className="m-0 font-titulo text-lg">Promover a peça?</p>
            <div className="flex gap-2">
              <button type="button" className="btn" onClick={() => jogar(promover.find((l) => "prom" in l && l.prom)!)}>Promover</button>
              <button type="button" className="btn bg-white/10" onClick={() => jogar(promover.find((l) => "prom" in l && !l.prom)!)}>Não</button>
            </div>
          </div>
        </div>
      )}

      {fim !== null && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-noite/75 p-5 text-center">
          <span className="text-5xl" aria-hidden>{fim === 0 ? "🏆" : "🦌"}</span>
          <p className="m-0 font-titulo text-2xl font-bold">{fim === 0 ? "Xeque-mate! Você venceu o Shikamaru." : "Xeque-mate. Que problemático pra você..."}</p>
          <button type="button" className="btn" onClick={reiniciar}>Jogar de novo</button>
        </div>
      )}
    </div>
  );
}
