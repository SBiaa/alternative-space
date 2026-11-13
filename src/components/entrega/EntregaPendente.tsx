"use client";

import { useEffect, useState } from "react";
import { salvarTurno } from "@/app/actions/entrega";
import { TEXTOS } from "@/lib/entrega/config";
import { tirarPendente } from "./ajustes";

// Logo depois do cadastro: credita o único turno que ficou esperando na sessão (com a moto básica).
export function EntregaPendente({ logado }: { logado: boolean }) {
  const [aviso, setAviso] = useState<string | null>(null);
  useEffect(() => {
    if (!logado) return;
    const t = tirarPendente();
    if (!t) return;
    salvarTurno(t, true).then((r) => setAviso(r.ok ? `+${r.resumo.creditsEarned} · ${TEXTOS.resultado.salvo}` : r.erro));
  }, [logado]);
  if (!aviso) return null;
  return (
    <p role="status" className="surface-vidro m-0 px-4 py-3 text-sm text-creme">
      {aviso}
    </p>
  );
}
