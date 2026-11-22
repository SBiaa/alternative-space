"use client";

import { useEffect, useState } from "react";
import { TEXTOS } from "@/lib/banda/conteudo";
import { definirSom, somAtivo } from "./sons";

/** Liga e desliga os sons do jogo. Começa ligado; a escolha fica neste aparelho. */
export function BotaoSom() {
  const [ligado, setLigado] = useState(true);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- a preferência só existe no navegador
    setLigado(somAtivo());
  }, []);
  return (
    <button
      type="button"
      className="botao-vidro min-h-11"
      aria-pressed={ligado}
      onClick={() => {
        definirSom(!ligado);
        setLigado(!ligado);
      }}
    >
      {ligado ? `🔊 ${TEXTOS.somLigado}` : `🔇 ${TEXTOS.somDesligado}`}
    </button>
  );
}
