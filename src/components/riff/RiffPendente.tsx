"use client";

import { useEffect, useState } from "react";
import { salvarPartida } from "@/app/actions/riff";
import { lerPendente, limparPendente } from "./pendente";

// Logo depois do cadastro: salva a partida que ficou esperando na sessão.
export function RiffPendente({ logado }: { logado: boolean }) {
  const [aviso, setAviso] = useState<string | null>(null);

  useEffect(() => {
    if (!logado) return;
    const p = lerPendente();
    if (!p) return;
    limparPendente();
    salvarPartida(p.slug, p.dificuldade, p.partida).then((r) => {
      setAviso(r.ok ? `Sua partida de ${p.titulo} foi guardada na cabine.` : r.erro);
    });
  }, [logado]);

  if (!aviso) return null;
  return (
    <p role="status" className="surface-vidro m-0 px-4 py-3 text-sm text-creme">
      {aviso}
    </p>
  );
}
