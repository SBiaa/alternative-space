"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { mandarProRanking } from "@/lib/enviarRecorde";
import { acharJogo, lerRecorde } from "@/lib/jogos";
import { textosShell } from "@/config/modo-jogo";

// Topo da página do jogo (voltar, nome, tela cheia) e a área onde o jogo roda.
// Ficam juntos porque o botão de tela cheia precisa alcançar a área do jogo.
export function JogoTela({ nome, children }: { nome: string; children: ReactNode }) {
  const area = useRef<HTMLDivElement>(null);
  const [podeTelaCheia, setPodeTelaCheia] = useState(false);

  useEffect(() => {
    // iPhone não deixa pôr um pedaço da página em tela cheia; aí o botão some.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- só dá pra saber no navegador
    setPodeTelaCheia(Boolean(document.fullscreenEnabled));
  }, []);

  const alternar = () => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void area.current?.requestFullscreen().catch(() => {});
  };

  return (
    <>
      <header className="flex items-center gap-1 sm:gap-3">
        <Link href="/jogos" aria-label="Voltar pro Fliperama" className="-ml-3 flex size-11 shrink-0 items-center justify-center rounded-md text-creme hover:bg-creme/8">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M15 5l-7 7 7 7" />
          </svg>
        </Link>
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="etiqueta text-[10px] text-laranja-claro sm:text-[11px]">Fliperama</span>
          <h1 className="text-xl font-semibold leading-[1.15] sm:text-[32px] sm:tracking-[-0.015em]">{nome}</h1>
        </div>
        {podeTelaCheia && (
          <button
            type="button"
            onClick={alternar}
            aria-label="Tela cheia"
            className="flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-md border border-creme/35 bg-creme/8 hover:bg-creme/16"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ece3be" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
            </svg>
          </button>
        )}
      </header>
      <div ref={area} className="jogo-area">
        {children}
      </div>
    </>
  );
}

// Painel creme com o recorde guardado neste navegador.
export function JogoRecorde({ slug }: { slug: string }) {
  const jogo = acharJogo(slug);
  const [valor, setValor] = useState<number | null>(null);
  useEffect(() => {
    const v = lerRecorde(jogo);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage só existe no navegador
    setValor(v);
    // Recorde de antes do ranking existir (ou feito sem conta): sobe agora. Sem conta, o servidor ignora.
    if (v > 0) mandarProRanking(jogo.slug, v);
  }, [jogo]);
  if (!jogo.recorde) return null;
  return (
    <div className="painel flex flex-col gap-1.5 px-4 py-3.5">
      <span className="etiqueta text-[10px] text-azul">Seu recorde</span>
      <span className="text-2xl font-bold leading-tight text-azul">{valor ? jogo.recorde.formato(valor) : "—"}</span>
      <span className="text-[13px] leading-snug text-neutro">
        {valor ? "Fica salvo neste navegador e, com conta, vai pro ranking." : "Ainda não jogou aqui. A primeira partida já vira recorde."}
      </span>
    </div>
  );
}

// Recorde e atalho pro ranking, numa linha só (capa do jogo).
export function JogoRecordeLinha({ slug }: { slug: string }) {
  const jogo = acharJogo(slug);
  const [valor, setValor] = useState<number | null>(null);
  useEffect(() => {
    const v = lerRecorde(jogo);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage só existe no navegador
    setValor(v);
    if (v > 0) mandarProRanking(jogo.slug, v);
  }, [jogo]);
  if (!jogo.recorde) return null;
  return (
    <p className="m-0 flex items-center justify-between gap-3 text-sm text-areia">
      <span>
        <span className="etiqueta mr-2 text-[10px] text-laranja-claro">{textosShell.seuRecorde}</span>
        <strong className="text-creme">{valor ? jogo.recorde.formato(valor) : textosShell.semRecorde}</strong>
      </span>
      <a href="#ranking" className="inline-flex min-h-11 items-center text-areia underline hover:text-creme">{textosShell.verRanking}</a>
    </p>
  );
}
