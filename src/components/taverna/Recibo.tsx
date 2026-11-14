"use client";

import { useEffect, useState } from "react";
import { TAVERNA } from "@/lib/taverna/config";
import type { RegistroNoite } from "@/lib/taverna/tipos";

// O fechamento da noite como recibo: entradas, saídas e o saldo contando até o valor final.
// Com "reduzir movimento" ligado o número já aparece pronto.

function useContagem(alvo: number) {
  const [v, setV] = useState(alvo);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let id = 0;
    const ini = performance.now();
    const dur = TAVERNA.recibo.contagemMs;
    const tick = (agora: number) => {
      const f = Math.min(1, (agora - ini) / dur);
      setV(Math.round(alvo * (1 - Math.pow(1 - f, 3))));
      if (f < 1) id = requestAnimationFrame(tick);
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [alvo]);
  return v;
}

const Linha = ({ rotulo, valor, sinal }: { rotulo: string; valor: number; sinal: "+" | "−" }) => (
  <div className="flex items-baseline gap-2">
    <dt className="m-0">{rotulo}</dt>
    <span aria-hidden className="min-w-4 flex-1 border-b border-dotted border-azul/40" />
    <dd className="font-ficha m-0 tabular-nums">{sinal} {valor}</dd>
  </div>
);

export function Recibo({ r }: { r: RegistroNoite }) {
  const saldo = useContagem(r.saldo);
  const cena = TAVERNA.recibo.cenas[(r.noite - 1) % TAVERNA.recibo.cenas.length];
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-dashed border-azul/40 p-4">
      <p className="m-0 text-sm italic">{cena}</p>
      <dl className="m-0 flex flex-col gap-1.5">
        <Linha rotulo="Vendas" valor={r.ganhos} sinal="+" />
        <Linha rotulo="Gorjetas" valor={r.gorjetas} sinal="+" />
        <Linha rotulo="Ingredientes" valor={r.gastos.ingredientes} sinal="−" />
        <Linha rotulo="Salários" valor={r.gastos.salarios} sinal="−" />
        <Linha rotulo="Reparos" valor={r.gastos.reparos} sinal="−" />
      </dl>
      <div className="flex items-baseline justify-between border-t-2 border-azul pt-2">
        <span className="rotulo text-azul">Saldo da noite</span>
        <span className="font-ficha text-2xl font-semibold tabular-nums text-azul" aria-label={`Saldo da noite: ${r.saldo}`}>
          {saldo >= 0 ? "+" : "−"} {Math.abs(saldo)} 💰
        </span>
      </div>
    </div>
  );
}
