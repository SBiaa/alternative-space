"use client";

import { useState, useTransition } from "react";
import { notaSemana } from "@/app/actions/diario";

/** "+ Buff da semana" e "− Debuff a evitar". Salva ao sair do campo. No celular começa fechado, atrás de um botão. */
export function BuffDebuff({ semana, buff, debuff }: { semana: number; buff: string; debuff: string }) {
  const [valores, setValores] = useState({ buff, debuff });
  const [salvo, setSalvo] = useState({ buff, debuff });
  const [msg, setMsg] = useState("");
  const [aberto, setAberto] = useState(false);
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

  const campo = (k: "buff" | "debuff", titulo: string) => (
    <label className="flex flex-col gap-1.5">
      <span className="rotulo text-laranja-claro">{titulo}</span>
      <textarea
        rows={2}
        maxLength={300}
        className="campo-vidro resize-y"
        value={valores[k]}
        onChange={(e) => setValores((s) => ({ ...s, [k]: e.target.value }))}
        onBlur={salvar}
      />
    </label>
  );

  return (
    <div className="surface-vidro flex flex-col gap-3 p-[18px]">
      <button
        type="button"
        aria-expanded={aberto}
        aria-controls="buff-debuff"
        onClick={() => setAberto((a) => !a)}
        className="flex min-h-11 items-center justify-between gap-3 text-left lg:hidden"
      >
        <span className="flex flex-col gap-1">
          <span className="rotulo text-laranja-claro">Buff e debuff</span>
          <span className="text-[15px]">Como foi sua semana até aqui?</span>
        </span>
        <span aria-hidden className={`text-2xl text-laranja-claro transition-transform ${aberto ? "rotate-90" : ""}`}>
          ›
        </span>
      </button>
      <div id="buff-debuff" className={`${aberto ? "flex" : "hidden"} flex-col gap-3 lg:flex`}>
        {campo("buff", "+ Buff da semana")}
        {campo("debuff", "− Debuff a evitar")}
        <p role="status" className="rotulo min-h-4 text-poeira">
          {pendente ? "Salvando…" : msg}
        </p>
      </div>
    </div>
  );
}
