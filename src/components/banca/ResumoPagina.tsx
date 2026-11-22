"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BANCA } from "@/lib/banca/config";
import { RESUMO } from "@/lib/banca/conteudo";
import { ResumoView, type ResumoSalvo } from "./ResumoView";

/** Último resumo guardado neste aparelho (o servidor guarda o histórico em stall_events; aqui só a tela de resumo). */
export function ResumoPagina() {
  const [r, setR] = useState<ResumoSalvo | null | undefined>(undefined);
  useEffect(() => {
    try {
      const bruto = localStorage.getItem(BANCA.chaveResumo);
      setR(bruto ? (JSON.parse(bruto) as ResumoSalvo) : null);
    } catch {
      setR(null);
    }
  }, []);
  if (r === undefined) return null;
  if (r === null) {
    return (
      <div className="flex flex-col gap-3">
        <p className="m-0 text-areia">{RESUMO.semResumo}</p>
        <Link href="/jogos/banca-na-feira/atelie" className="botao-laranja inline-flex min-h-[44px] w-fit items-center no-underline">Ir pro ateliê</Link>
      </div>
    );
  }
  return <ResumoView {...r} />;
}
