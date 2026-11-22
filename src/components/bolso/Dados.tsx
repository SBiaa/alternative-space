"use client";

import { useEffect, useState } from "react";
import type { RolagemEstado } from "@/lib/bolso/save";
import { FAIXAS, REGRAS, ATRIBUTOS } from "@/lib/bolso/config";

const PASSOS = 11;

// Um dado em SVG: osso (creme) ou resina (azul). O número fica sempre no texto, pra leitor de tela e pra quem
// prefere menos movimento. A animação só troca a face mostrada (sem girar); com prefers-reduced-motion some.
export function Dado({ valor, tipo, rotulo, animar }: { valor: number; tipo: "osso" | "resina"; rotulo: string; animar: boolean }) {
  const [passo, setPasso] = useState(animar ? 0 : PASSOS);
  useEffect(() => {
    if (!animar) return;
    const t = setInterval(() => setPasso((p) => (p >= PASSOS ? p : p + 1)), 75);
    return () => clearInterval(t);
  }, [animar]);
  const girando = passo < PASSOS;
  // Faces falsas durante a animação: determinísticas (nada de Math.random na tela).
  const mostrada = girando ? 1 + ((passo * 5 + valor * 2) % REGRAS.faces) : valor;
  const osso = tipo === "osso";
  return (
    <figure className="m-0 flex flex-col items-center gap-1">
      <svg width="64" height="64" viewBox="0 0 64 64" role="img" aria-label={`${rotulo}: ${valor}`}>
        <rect x="3" y="3" width="58" height="58" rx="8" fill={osso ? "#f6f0d6" : "#2f5d9e"} stroke={osso ? "#b3a688" : "#d6deec"} strokeWidth="2" />
        <text x="32" y="43" textAnchor="middle" fontSize="30" fontWeight="700" fill={osso ? "#01121e" : "#f6f0d6"} style={{ fontFamily: "var(--font-ficha)" }}>
          <tspan className={girando ? "motion-reduce:hidden" : "hidden"}>{mostrada}</tspan>
          <tspan className={girando ? "hidden motion-reduce:inline" : undefined}>{valor}</tspan>
        </text>
      </svg>
      <figcaption className="etiqueta text-[10px] text-areia">{osso ? "osso" : "resina"}</figcaption>
    </figure>
  );
}

// O que aconteceu no último teste: dados, a conta em texto e a faixa (com texto, nunca só cor).
export function ResultadoRolagem({ rolagem, opcao }: { rolagem: RolagemEstado; opcao?: string }) {
  const faixa = FAIXAS[rolagem.faixa];
  const nomeAtributo = ATRIBUTOS.find((a) => a.id === rolagem.atributo)?.nome ?? rolagem.atributo;
  return (
    <section aria-labelledby={`rol-${rolagem.n}`} className="surface-vidro flex flex-col gap-3 p-4 text-creme">
      {opcao ? <p className="m-0 text-sm text-areia">Você escolheu: {opcao}</p> : null}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex gap-3">
          {rolagem.dados.map((d, i) => (
            <Dado key={`${rolagem.n}-${i}`} valor={d} tipo={i === 0 ? "osso" : "resina"} rotulo={`Dado ${i + 1}`} animar />
          ))}
        </div>
        <div className="flex flex-col gap-1">
          <h2 id={`rol-${rolagem.n}`} className="m-0 text-lg font-semibold">
            {faixa.rotulo} <span className="font-ficha text-base font-normal text-areia">· teste de {nomeAtributo}</span>
          </h2>
          <p className="m-0 text-sm text-areia">{faixa.explica}</p>
        </div>
      </div>
      <p className="m-0 font-ficha text-sm leading-relaxed" aria-live="polite">{rolagem.texto}</p>
    </section>
  );
}
