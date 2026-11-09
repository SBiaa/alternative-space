"use client";

import { useState, useTransition } from "react";
import { notaSemana } from "@/app/actions/diario";

/** Caixas "+ Buff da semana" e "− Debuff a evitar". Salva ao sair do campo. */
export function BuffDebuff({ semana, buff, debuff }: { semana: number; buff: string; debuff: string }) {
  const [valores, setValores] = useState({ buff, debuff });
  const [salvo, setSalvo] = useState({ buff, debuff });
  const [msg, setMsg] = useState("");
  const [pendente, start] = useTransition();

  function salvar() {
    if (valores.buff === salvo.buff && valores.debuff === salvo.debuff) return;
    const v = valores;
    start(async () => {
      const r = await notaSemana(semana, v.buff, v.debuff);
      if (r?.error) setMsg(r.error);
      else {
        setSalvo(v);
        setMsg("Salvo.");
      }
    });
  }

  const caixa = (k: "buff" | "debuff", titulo: string, simbolo: string, fundo: string) => (
    <div className="ficha-caixa p-4" style={{ background: fundo }}>
      <label htmlFor={`semana-${k}`} className="diario-titulo mb-2 block text-lg">
        <span aria-hidden>{simbolo} </span>
        {titulo}
      </label>
      <textarea
        id={`semana-${k}`}
        className="ficha-campo w-full resize-y"
        rows={3}
        maxLength={300}
        value={valores[k]}
        onChange={(e) => setValores((s) => ({ ...s, [k]: e.target.value }))}
        onBlur={salvar}
      />
    </div>
  );

  return (
    <div>
      <div className="grid gap-3 sm:grid-cols-2">
        {caixa("buff", "Buff da semana", "+", "#eef7e9")}
        {caixa("debuff", "Debuff a evitar", "−", "#fbece4")}
      </div>
      <p role="status" className="ficha-rotulo mt-2 min-h-5">
        {pendente ? "Salvando…" : msg}
      </p>
    </div>
  );
}
