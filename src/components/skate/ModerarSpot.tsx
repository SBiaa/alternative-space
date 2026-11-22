"use client";

import { useState, useTransition } from "react";
import { moderarSpot } from "@/app/actions/skate";

// Botões de aprovar/recusar da fila de moderação.
export function ModerarSpot({ id }: { id: string }) {
  const [feito, setFeito] = useState<string | null>(null);
  const [enviando, iniciar] = useTransition();
  const decidir = (d: "aprovado" | "recusado") =>
    iniciar(async () => {
      const r = await moderarSpot(id, d);
      setFeito(r.ok ? (d === "aprovado" ? "Aprovado" : "Recusado") : "Não deu certo");
    });

  if (feito) return <span className="font-ficha text-sm text-laranja-claro">{feito}</span>;
  return (
    <div className="flex gap-2">
      <button type="button" disabled={enviando} onClick={() => decidir("aprovado")} className="botao-laranja text-sm">Aprovar</button>
      <button type="button" disabled={enviando} onClick={() => decidir("recusado")} className="botao-vidro text-sm">Recusar</button>
    </div>
  );
}
