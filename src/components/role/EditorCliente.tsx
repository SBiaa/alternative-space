"use client";

import dynamic from "next/dynamic";
import { TEXTOS } from "@/lib/role/config";

// O editor lê rascunho e ajustes do navegador e monta o Phaser: nada disso roda no servidor.
export const EditorCliente = dynamic(() => import("./EditorConta"), {
  ssr: false,
  loading: () => <p className="text-areia">{TEXTOS.pagina.carregando}</p>,
});

export const JogoCliente = dynamic(() => import("./JogarPico"), {
  ssr: false,
  loading: () => <p className="text-areia">{TEXTOS.pagina.carregando}</p>,
});
