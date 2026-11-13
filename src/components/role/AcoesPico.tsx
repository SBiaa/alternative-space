"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { apagarPico, duplicarPico } from "@/app/actions/role";
import { TEXTOS } from "@/lib/role/config";

export function DuplicarPico({ id }: { id: string }) {
  const router = useRouter();
  const [erro, setErro] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  return (
    <>
      <button
        type="button"
        className="botao-laranja min-h-11 px-4"
        disabled={ocupado}
        onClick={async () => {
          setOcupado(true);
          const r = await duplicarPico(id);
          setOcupado(false);
          if (r.ok) router.push(`/jogos/role-noturno/editor/${r.id}`);
          else setErro(r.erro);
        }}
      >
        {TEXTOS.pico.duplicar}
      </button>
      {erro && <p role="alert" className="m-0 text-sm text-laranja-claro">{erro}</p>}
    </>
  );
}

export function ApagarPico({ id }: { id: string }) {
  const router = useRouter();
  return (
    <button
      type="button"
      className="botao-vidro min-h-11 px-3 text-sm"
      onClick={async () => {
        if (!window.confirm(TEXTOS.pico.confirmarApagar)) return;
        const r = await apagarPico(id);
        if (r.ok) router.refresh();
      }}
    >
      {TEXTOS.pico.apagar}
    </button>
  );
}
