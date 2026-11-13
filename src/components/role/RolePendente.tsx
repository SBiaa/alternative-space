"use client";

import { useEffect, useState } from "react";
import { salvarCorrida } from "@/app/actions/role";
import { TEXTOS } from "@/lib/role/config";
import { lerPendente, limparPendente } from "./pendente";

// Logo depois do cadastro: salva a corrida que ficou esperando na sessão.
export function RolePendente({ logado }: { logado: boolean }) {
  const [aviso, setAviso] = useState<string | null>(null);

  useEffect(() => {
    if (!logado) return;
    const p = lerPendente();
    if (!p) return;
    limparPendente();
    salvarCorrida(p.slug, p.corrida, true).then((r) => setAviso(r.ok ? TEXTOS.pico.pendenteGuardada(p.titulo) : r.erro));
  }, [logado]);

  if (!aviso) return null;
  return (
    <p role="status" className="surface-vidro m-0 px-4 py-3 text-sm text-creme">
      {aviso}
    </p>
  );
}
