"use client";

import { useEffect, useRef, useState } from "react";
import { CONVERSANET, STATUS } from "@/lib/lan/conteudo";
import type { Contato, Recado } from "@/lib/lan/conversanet";

// Janela do mensageiro do dono, com cara de época mas autoral: barra de título, lista de contatos com status
// (ícone + texto) e os recados. "Chamar atenção" treme a janela, a não ser com movimento reduzido.
export function ConversaNet({ contatos, recados, aberto, onAlternar, onNovo }: {
  contatos: Contato[];
  recados: Recado[];
  aberto: boolean;
  onAlternar: () => void;
  onNovo?: (r: Recado) => void;
}) {
  const vistos = useRef(new Set<string>());
  const [naoLidos, setNaoLidos] = useState(0);
  const [tremer, setTremer] = useState(false);
  const porId = new Map(contatos.map((c) => [c.id, c]));

  useEffect(() => {
    const novos = recados.filter((r) => !vistos.current.has(r.id));
    if (novos.length === 0) return;
    novos.forEach((r) => vistos.current.add(r.id));
    const atencao = novos.some((r) => r.chamarAtencao);
    queueMicrotask(() => {
      if (!aberto) setNaoLidos((n) => n + novos.length);
      if (atencao) setTremer(true);
    });
    novos.forEach((r) => onNovo?.(r));
  }, [recados, aberto, onNovo]);

  useEffect(() => {
    if (!tremer) return;
    const t = setTimeout(() => setTremer(false), 1100);
    return () => clearTimeout(t);
  }, [tremer]);

  const alternar = () => {
    setNaoLidos(0);
    onAlternar();
  };

  if (!aberto) {
    return (
      <button type="button" onClick={alternar} className={`botao-vidro inline-flex items-center gap-2 ${tremer ? "chamar-atencao" : ""}`} aria-label={`${CONVERSANET.abrir}${naoLidos ? `, ${naoLidos} recados novos` : ""}`}>
        <span aria-hidden="true">💬</span> {CONVERSANET.abrir}
        {naoLidos > 0 && <span className="font-ficha rounded-[4px] bg-laranja px-1.5 text-xs text-noite">{naoLidos} {CONVERSANET.novo}</span>}
      </button>
    );
  }

  return (
    <section aria-label={CONVERSANET.nome} className={`overflow-hidden rounded-[8px] border border-bege-gabinete-sombra bg-bege-gabinete text-bege-texto ${tremer ? "chamar-atencao" : ""}`}>
      <header className="flex items-center justify-between gap-2 bg-bege-barra px-3 py-1.5 text-creme">
        <strong className="text-sm">{CONVERSANET.titulo}</strong>
        <button type="button" onClick={alternar} className="min-h-[44px] min-w-[44px] rounded-[4px] px-2 text-sm text-creme underline">{CONVERSANET.fechar}</button>
      </header>
      <div className="grid gap-0 sm:grid-cols-[minmax(0,0.9fr)_minmax(0,1.4fr)]">
        <div className="border-b border-bege-gabinete-sombra p-3 sm:border-b-0 sm:border-r">
          <p className="m-0 mb-2 font-ficha text-xs">{CONVERSANET.meuApelido}</p>
          <ul className="m-0 flex list-none flex-col gap-1 p-0 text-sm">
            {contatos.map((c) => (
              <li key={c.id} className="flex items-center gap-2">
                <span aria-hidden="true">{c.icone}</span>
                <span className="min-w-0 flex-1 truncate">{c.apelido}</span>
                <span className="font-ficha text-[11px]">{STATUS[c.status].icone} {STATUS[c.status].rotulo}</span>
              </li>
            ))}
          </ul>
        </div>
        <ol className="m-0 flex max-h-[260px] list-none flex-col gap-2 overflow-y-auto bg-creme-claro p-3 text-sm" aria-live="polite">
          {recados.length === 0 && <li className="text-bege-texto">{CONVERSANET.vazio}</li>}
          {recados.map((r) => {
            const c = porId.get(r.de);
            return (
              <li key={r.id}>
                <strong className="block text-[13px] text-bege-barra">{c?.apelido ?? r.de} diz:</strong>
                {r.chamarAtencao && <span className="font-ficha text-[11px] text-bege-tinta">⚠ {CONVERSANET.chamarAtencao} </span>}
                <span>{r.texto}</span>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
