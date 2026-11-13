"use client";

import { ACOES, TEXTOS } from "@/lib/entrega/config";
import { nomeTecla, useAjustesEntrega } from "./ajustes";

// As teclas que valem agora (já com o remapeamento salvo no navegador).
export function TeclasAtuais({ claro = false }: { claro?: boolean }) {
  const [a] = useAjustesEntrega();
  const tecla = claro ? "border-noite/40 bg-white text-noite" : "border-creme/30 bg-noite/50 text-creme";
  return (
    <dl className="m-0 grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3">
      {ACOES.map((k) => (
        <div key={k} className="flex flex-col gap-1">
          <dt className="text-xs opacity-80">{TEXTOS.acoes[k]}</dt>
          <dd className="m-0 flex flex-wrap gap-1">
            {a.teclas[k].map((t) => (
              <kbd key={t} className={`min-w-8 rounded border px-1.5 py-0.5 text-center font-ficha text-xs ${tecla}`}>
                {nomeTecla(t)}
              </kbd>
            ))}
          </dd>
        </div>
      ))}
    </dl>
  );
}
