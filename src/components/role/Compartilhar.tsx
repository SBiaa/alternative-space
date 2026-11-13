"use client";

import { useState } from "react";
import { TEXTOS } from "@/lib/role/config";

// Compartilhar o link do pico (menu nativo do celular, senão copia o link).
export function Compartilhar({ titulo, recorde }: { titulo: string; recorde: number | null }) {
  const [copiado, setCopiado] = useState(false);
  const enviar = async () => {
    const url = window.location.href.split("?")[0];
    const text = TEXTOS.compartilhar.texto(titulo, recorde);
    try {
      if (navigator.share) return await navigator.share({ title: titulo, text, url });
      await navigator.clipboard.writeText(`${text} ${url}`);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    } catch {}
  };
  return (
    <button type="button" className="botao-vidro min-h-11 px-4" onClick={enviar}>
      <span aria-live="polite">{copiado ? TEXTOS.compartilhar.copiado : TEXTOS.compartilhar.botao}</span>
    </button>
  );
}
