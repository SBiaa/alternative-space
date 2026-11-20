"use client";

import { CONFIG } from "@/lib/cartas-do-conves/config";
import { CONTEUDO } from "@/lib/cartas-do-conves/conteudo";
import { proximosNos } from "@/lib/cartas-do-conves/mapa";
import { TRECHOS } from "@/lib/cartas-do-conves/nomes-mar";
import { TEXTOS } from "@/lib/cartas-do-conves/textos";
import type { Acao, Estado, No, TipoNo } from "@/lib/cartas-do-conves/tipos";
import { Icone, RosaDosVentos } from "./Icone";

const T = TEXTOS.mapa;
const ICONE: Record<TipoNo, string> = { encontro: "espada", evento: "evento", porto: "ancora", tesouro: "bau", chefe: "polvo" };

export function Mapa({ estado, agir }: { estado: Estado; agir: (a: Acao) => void }) {
  const camadas = estado.mapa[estado.trecho - 1];
  const linhas = camadas.length;
  const disponiveis = new Set(proximosNos(estado.mapa, estado.trecho, estado.pos).map((n) => n.id));
  const mar = TRECHOS[estado.trecho - 1];
  // A travessia sobe: a primeira camada fica embaixo e o fim do trecho, no alto.
  const ordem = [...camadas.keys()].reverse();
  const x = (n: No) => ((camadas[n.camada].indexOf(n) + 0.5) / camadas[n.camada].length) * 100;
  const y = (n: No) => ((linhas - 1 - n.camada + 0.5) / linhas) * 100;
  const noPor = (id: string) => camadas.flat().find((n) => n.id === id)!;

  return (
    <div className="mx-auto flex h-full w-full max-w-[460px] flex-col gap-2 overflow-y-auto px-4 pb-6 pt-14 text-creme">
      <header className="flex items-center gap-3">
        <RosaDosVentos className="size-12 shrink-0 text-laranja-claro" />
        <div className="flex flex-col">
          <h2 className="m-0 text-xl font-semibold leading-tight">{T.titulo(mar.mar, mar.ilha)}</h2>
          <p className="m-0 text-sm text-areia">
            {TEXTOS.hud.trecho(estado.trecho, CONFIG.trechos)} · {T.escolha}
          </p>
        </div>
      </header>

      <div className="relative min-h-[430px] flex-1 rounded-lg border-2 border-creme-escuro/60 bg-surface p-2">
        <svg className="pointer-events-none absolute inset-2 size-[calc(100%-1rem)] text-creme/40" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          {camadas.flat().flatMap((n) =>
            n.liga.map((id) => {
              const m = noPor(id);
              const ativa = estado.pos === n.id;
              return <line key={`${n.id}>${id}`} x1={x(n)} y1={y(n)} x2={x(m)} y2={y(m)} stroke="currentColor" strokeWidth={ativa ? 1.4 : 0.7} strokeDasharray={ativa ? undefined : "2 2"} className={ativa ? "text-laranja-claro" : ""} vectorEffect="non-scaling-stroke" />;
            }),
          )}
        </svg>
        <ol className="relative m-0 flex h-full list-none flex-col p-0" aria-label={T.titulo(mar.mar, mar.ilha)}>
          {ordem.map((c) => (
            <li key={c} className="flex flex-1 items-center">
              <ul className="m-0 flex w-full list-none p-0">
                {camadas[c].map((n) => {
                  const dispo = disponiveis.has(n.id);
                  const visitado = estado.visitados.includes(n.id);
                  const atual = estado.pos === n.id;
                  const estadoTxt = atual ? T.atual : dispo ? T.disponivel : visitado ? T.visitado : T.fora;
                  const cls = dispo ? "border-laranja-claro bg-laranja text-noite ring-2 ring-laranja-claro/60 motion-safe:animate-pulse" : visitado || atual ? "border-creme/50 bg-surface-3 text-areia" : "border-line bg-surface-2 text-faint opacity-70";
                  return (
                    <li key={n.id} className="flex flex-1 justify-center">
                      <button
                        type="button"
                        disabled={!dispo}
                        onClick={() => agir({ t: "no", id: n.id })}
                        aria-label={`${T.tipos[n.tipo]}, ${estadoTxt}. ${T.dicas[n.tipo]}`}
                        className={`relative flex min-h-14 min-w-14 flex-col items-center justify-center gap-0.5 rounded-lg border-2 px-1.5 py-1 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-laranja-claro ${cls} ${dispo ? "cursor-pointer" : "cursor-default"}`}
                      >
                        <Icone nome={ICONE[n.tipo]} className="size-6" />
                        <span className="text-[11px] font-semibold leading-none">{T.tipos[n.tipo]}</span>
                        {(visitado || atual) && <Icone nome="check" className="absolute -right-1 -top-1 size-4 rounded-full bg-ok p-0.5 text-noite" />}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </li>
          ))}
        </ol>
      </div>

      <ul className="m-0 flex list-none flex-wrap gap-x-3 gap-y-1 p-0 text-[12px] text-areia" aria-label="Legenda do mapa">
        {(Object.keys(T.tipos) as TipoNo[]).map((k) => (
          <li key={k} className="flex items-center gap-1">
            <Icone nome={ICONE[k]} className="size-3.5" />
            {T.tipos[k]}
          </li>
        ))}
      </ul>
      {estado.reliquias.length > 0 && (
        <ul className="m-0 flex list-none flex-wrap gap-2 p-0" aria-label={TEXTOS.hud.reliquias}>
          {estado.reliquias.map((s) => {
            const r = CONTEUDO.reliquias[s];
            return (
              <li key={s} className="flex items-center gap-1.5 rounded-md border border-creme/30 bg-surface-2 px-2 py-1 text-[12px]" title={r.texto}>
                <Icone nome={r.icone} className="size-4 text-laranja-claro" />
                <span>
                  <strong>{r.nome}</strong>: {r.texto}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
