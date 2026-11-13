"use client";

import { useCallback, useState, type ReactNode } from "react";
import { GameShell } from "./GameShell";
import { capaDe, textosShell as t } from "@/config/modo-jogo";
import { acharJogo } from "@/lib/jogos";
import { JogoRecordeLinha } from "./JogoTela";

// Capa do jogo (página normal) e, ao tocar em jogar, o modo jogo em tela cheia.
export function JogoCapa({ slug, arte, teclado, children }: { slug: string; arte: ReactNode; teclado: ReactNode; children: ReactNode }) {
  const jogo = acharJogo(slug);
  const capa = capaDe(slug);
  const [jogando, setJogando] = useState(false);
  const sair = useCallback(() => setJogando(false), []);

  return (
    <>
      <div className="flex flex-col gap-3.5">
        <div className="overflow-hidden rounded-lg">{arte}</div>
        <h1 className="m-0 text-[28px] font-semibold leading-tight sm:text-[36px]">{jogo.nome}</h1>
        <ul className="m-0 flex list-none flex-wrap gap-1.5 p-0">
          {capa.tags.map((tag) => (
            <li key={tag} className="rounded-md border border-creme/30 px-2 py-1 font-ficha text-[12px] text-areia">
              {tag}
            </li>
          ))}
        </ul>
        <button type="button" onClick={() => setJogando(true)} className="btn h-14 w-full bg-laranja text-lg text-noite sm:w-auto sm:px-10">
          {capa.botao}
        </button>
        <JogoRecordeLinha slug={slug} />

        <div className="card flex flex-col gap-2 px-4 py-3.5">
          <h2 className="etiqueta m-0 text-[10px] text-laranja-claro">{t.comoJogarCelular}</h2>
          <ol className="m-0 flex flex-col gap-1.5 pl-5 text-sm text-areia sm:text-[15px]">
            {capa.passos.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ol>
        </div>

        <details className="card px-4 py-3">
          <summary className="min-h-11 cursor-pointer content-center text-sm font-semibold text-creme">{t.jogandoComputador}</summary>
          <div className="mt-2 flex flex-col gap-3 text-sm leading-normal text-areia">{teclado}</div>
        </details>
      </div>

      {jogando && (
        <GameShell title={jogo.nome} dica={capa.dica} onExit={sair}>
          {children}
        </GameShell>
      )}
    </>
  );
}
