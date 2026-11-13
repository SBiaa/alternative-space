"use client";

import { useEffect, useRef } from "react";
import type { Leitura, Salao, Toques } from "./salao";

// O Phaser só existe no navegador e entra por import dinâmico. O canvas é só desenho: quem joga sem mouse usa
// os botões do painel (fila, máquinas e balcão), que fazem exatamente as mesmas ações.
export default function SalaoLanPhaser({ ler, toques }: { ler: () => Leitura | null; toques: Toques }) {
  const pai = useRef<HTMLDivElement>(null);
  const lerRef = useRef(ler);
  const toquesRef = useRef(toques);
  useEffect(() => {
    lerRef.current = ler;
    toquesRef.current = toques;
  });

  useEffect(() => {
    let vivo = true;
    let salao: Salao | null = null;
    import("./salao")
      .then((m) => m.criarSalao(pai.current!, () => lerRef.current(), { maquina: (id) => toquesRef.current.maquina(id), grupo: (id) => toquesRef.current.grupo(id) }))
      .then((s) => {
        if (vivo) salao = s;
        else s.destruir();
      })
      .catch((e) => console.error("Não deu pra montar o salão da lan:", e));
    return () => {
      vivo = false;
      salao?.destruir();
    };
  }, []);

  return <div ref={pai} role="img" aria-label="Salão da lan visto de cima. Use os botões do painel pra jogar." className="h-full w-full touch-manipulation" />;
}
