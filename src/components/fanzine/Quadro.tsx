"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { TEXTOS } from "@/lib/fanzine/config";
import type { DeducaoFeita, Pista, VisaoCapitulo } from "@/lib/fanzine/tipos";
import { IconeCheck, IconeLigar, IconeX } from "./Icones";

export type AvisoQuadro = { tipo: "certa" | "nao" | "info"; texto: string } | null;

type Props = {
  visao: VisaoCapitulo;
  achadas: string[];
  deducoes: DeducaoFeita[];
  aviso: AvisoQuadro;
  ocupado: boolean;
  // Quando a ligação certa acabou de acontecer, a linha dela se desenha com animação (se o usuário aceitar movimento).
  novaDeducao: string | null;
  onLigar: (a: string, b: string) => void;
};

const T = TEXTOS.quadro;
type Ponto = { x: number; y: number };

/** Quadro de cortiça. Ligar: tocar numa pista e depois em outra, arrastar de uma até a outra, ou a lista com "Ligar". */
export function Quadro({ visao, achadas, deducoes, aviso, ocupado, novaDeducao, onLigar }: Props) {
  const fichas = visao.pistas.filter((p) => achadas.includes(p.id));
  const nome = (id: string) => visao.pistas.find((p) => p.id === id)?.rotulo ?? id;
  const [sel, setSel] = useState<string | null>(null);
  const [a, setA] = useState("");
  const [b, setB] = useState("");

  const quadro = useRef<HTMLDivElement>(null);
  const fichaRefs = useRef(new Map<string, HTMLElement>());
  const [pinos, setPinos] = useState<Record<string, Ponto>>({});
  const [tam, setTam] = useState({ w: 0, h: 0 });

  const medir = useCallback(() => {
    const q = quadro.current;
    if (!q) return;
    const r = q.getBoundingClientRect();
    const novos: Record<string, Ponto> = {};
    fichaRefs.current.forEach((el, id) => {
      const e = el.getBoundingClientRect();
      novos[id] = { x: e.left - r.left + e.width / 2, y: e.top - r.top + 11 };
    });
    setPinos(novos);
    setTam({ w: r.width, h: r.height });
  }, []);

  useLayoutEffect(() => {
    medir();
    const q = quadro.current;
    if (!q || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(medir);
    ro.observe(q);
    return () => ro.disconnect();
  }, [medir, achadas.length]);

  // Arrastar de uma ficha até outra (mouse e caneta; no toque o gesto é tocar numa e depois na outra).
  const arrasto = useRef<{ de: string; x: number; y: number; moveu: boolean } | null>(null);
  const acabouDeArrastar = useRef(false);
  useEffect(() => {
    const mover = (e: PointerEvent) => {
      const g = arrasto.current;
      if (g && Math.hypot(e.clientX - g.x, e.clientY - g.y) > 8) g.moveu = true;
    };
    const soltar = (e: PointerEvent) => {
      const g = arrasto.current;
      arrasto.current = null;
      if (!g?.moveu) return;
      acabouDeArrastar.current = true;
      setTimeout(() => (acabouDeArrastar.current = false), 0);
      const alvo = (document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null)?.closest<HTMLElement>("[data-pista]")?.dataset.pista;
      if (alvo && alvo !== g.de) {
        setSel(null);
        onLigar(g.de, alvo);
      }
    };
    window.addEventListener("pointermove", mover);
    window.addEventListener("pointerup", soltar);
    window.addEventListener("pointercancel", soltar);
    return () => {
      window.removeEventListener("pointermove", mover);
      window.removeEventListener("pointerup", soltar);
      window.removeEventListener("pointercancel", soltar);
    };
  }, [onLigar]);

  const tocar = (p: Pista) => {
    if (acabouDeArrastar.current) return;
    if (sel === null) return setSel(p.id);
    if (sel === p.id) return setSel(null);
    const de = sel;
    setSel(null);
    onLigar(de, p.id);
  };

  return (
    <section aria-labelledby="quadro" className="flex flex-col gap-3">
      <h2 id="quadro" className="m-0 text-2xl font-semibold">
        {T.titulo}
      </h2>
      <p className="m-0 text-sm text-areia">{T.arraste}</p>

      <div role="status" aria-live="polite" className="min-h-6 text-sm">
        {sel && <p className="m-0 font-semibold text-creme">{T.selecionada(nome(sel))}</p>}
        {!sel && aviso && (
          <p className="surface-vidro m-0 inline-flex items-start gap-2 px-3 py-2 text-creme">
            {aviso.tipo === "certa" ? <IconeCheck /> : aviso.tipo === "nao" ? <IconeX /> : null}
            <span>
              {aviso.tipo === "certa" && <strong>{T.certa}: </strong>}
              {aviso.texto}
            </span>
          </p>
        )}
      </div>

      {fichas.length === 0 ? (
        <p className="surface-vidro m-0 p-4 text-areia">{T.vazio}</p>
      ) : (
        <div ref={quadro} className="xerox-cortica p-3 pt-5 sm:p-4 sm:pt-6">
          <svg className="pointer-events-none absolute left-0 top-0" width={tam.w} height={tam.h} aria-hidden="true" focusable="false">
            {deducoes.map((d) => {
              const p = pinos[d.pistas[0]];
              const q = pinos[d.pistas[1]];
              if (!p || !q) return null;
              return (
                <g key={d.id} className={d.id === novaDeducao ? "xerox-linha-nova" : undefined}>
                  <line x1={p.x} y1={p.y} x2={q.x} y2={q.y} stroke="#141414" strokeWidth={5} strokeLinecap="round" />
                  <line x1={p.x} y1={p.y} x2={q.x} y2={q.y} stroke="#dd5d05" strokeWidth={2.5} strokeLinecap="round" strokeDasharray="1 0" />
                </g>
              );
            })}
          </svg>
          <ul className="relative m-0 grid list-none grid-cols-2 gap-x-3 gap-y-7 p-0 sm:grid-cols-3">
            {fichas.map((p) => {
              const ligada = deducoes.some((d) => d.pistas.includes(p.id));
              return (
                <li key={p.id}>
                  <button
                    type="button"
                    ref={(el) => {
                      if (el) fichaRefs.current.set(p.id, el);
                      else fichaRefs.current.delete(p.id);
                    }}
                    data-pista={p.id}
                    className="xerox-ficha w-full"
                    aria-pressed={sel === p.id}
                    disabled={ocupado}
                    onPointerDown={(e) => (arrasto.current = { de: p.id, x: e.clientX, y: e.clientY, moveu: false })}
                    onClick={() => tocar(p)}
                  >
                    <span className="block text-[13px] font-bold leading-tight">{p.rotulo}</span>
                    <span className="mt-1 block text-xs leading-snug text-[color:var(--xerox-cinza)]">{p.texto}</span>
                    {ligada && (
                      <span className="mt-1.5 inline-flex items-center gap-1 font-ficha text-[11px] font-bold">
                        <IconeLigar /> ligada
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {fichas.length >= 2 && (
        <form
          className="surface-vidro flex flex-col gap-2 p-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (a && b) {
              onLigar(a, b);
              setA("");
              setB("");
            }
          }}
        >
          <h3 className="etiqueta m-0 text-[11px] text-laranja-claro">{T.ligarListaTitulo}</h3>
          <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
            {([["A", a, setA, T.pistaA], ["B", b, setB, T.pistaB]] as const).map(([k, valor, set, rotulo]) => (
              <label key={k} className="flex flex-col gap-1 text-sm">
                {rotulo}
                <select value={valor} onChange={(e) => set(e.target.value)} className="h-11 rounded-md border border-creme/40 bg-noite px-2 text-creme">
                  <option value="">{T.escolher}</option>
                  {fichas.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.rotulo}
                    </option>
                  ))}
                </select>
              </label>
            ))}
            <button type="submit" className="btn h-11 gap-1.5 self-end bg-laranja px-4 text-noite" disabled={ocupado || !a || !b}>
              <IconeLigar /> {T.ligar}
            </button>
          </div>
        </form>
      )}

      <section aria-labelledby="deducoes" className="flex flex-col gap-2">
        <h3 id="deducoes" className="m-0 text-lg font-semibold">
          {T.deducoes} <span className="font-ficha text-sm text-areia">({deducoes.length})</span>
        </h3>
        {deducoes.length === 0 ? (
          <p className="m-0 text-sm text-areia">{T.nenhumaDeducao}</p>
        ) : (
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {deducoes.map((d) => (
              <li key={d.id} className="surface-vidro flex items-start gap-2 p-3 text-sm">
                <IconeCheck />
                <span>
                  <span className="block font-ficha text-[11px] uppercase text-areia">{T.ligacaoDe(nome(d.pistas[0]), nome(d.pistas[1]))}</span>
                  {d.texto}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </section>
  );
}
