"use client";

import type { ReactNode } from "react";
import { MANOBRA, MANOBRAS, TEXTOS } from "@/lib/role/config";
import { bonusDeTempo } from "@/lib/role/pontuacao";
import type { FimDeCorrida } from "./motor/jogo";

// Card de fim de corrida (surface-creme, texto ink, títulos azul).
export function ResultadoCorrida({ fim, timeLimit, children }: { fim: FimDeCorrida; timeLimit: number; children?: ReactNode }) {
  const c = fim.corrida;
  const bonus = c.finished ? bonusDeTempo(timeLimit, c.durationMs) : 0;
  const linhas: [string, string | number][] = [
    [TEXTOS.resultado.manobras, c.trickPoints],
    [TEXTOS.resultado.bonus, bonus],
    [TEXTOS.resultado.maxCombo, c.maxCombo],
    [TEXTOS.resultado.tombos, fim.tombos],
  ];
  const feitas = MANOBRAS.filter((m) => (c.tricks[m] ?? 0) > 0);
  return (
    <div className="surface-creme flex w-full max-w-[420px] flex-col gap-3 rounded-lg p-5 text-tinta" role="dialog" aria-labelledby="role-resultado">
      <h2 id="role-resultado" className="m-0 text-2xl font-semibold text-azul">
        {c.finished ? TEXTOS.jogo.chegou : TEXTOS.jogo.tempoAcabou} · {TEXTOS.resultado.titulo}
      </h2>
      <dl className="m-0 grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 font-ficha text-sm">
        {linhas.map(([k, v]) => (
          <div key={k} className="contents">
            <dt>{k}</dt>
            <dd className="m-0 text-right">{v}</dd>
          </div>
        ))}
        <dt className="mt-1 font-bold text-azul">{TEXTOS.resultado.total}</dt>
        <dd className="m-0 mt-1 text-right text-lg font-bold text-azul">{c.score}</dd>
      </dl>
      {feitas.length > 0 && (
        <ul className="m-0 flex list-none flex-wrap gap-2 p-0 font-ficha text-xs">
          {feitas.map((m) => (
            <li key={m} className="rounded border border-tinta/30 px-2 py-1">
              {MANOBRA[m].nome.toUpperCase()} ×{c.tricks[m]}
            </li>
          ))}
        </ul>
      )}
      {children}
    </div>
  );
}
