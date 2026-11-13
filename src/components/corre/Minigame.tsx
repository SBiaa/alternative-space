"use client";

import { CORRE } from "@/lib/corre/config";
import type { Puzzle } from "@/lib/corre/minigames";
import type { Acao } from "@/lib/corre/motor";

const T = CORRE.textos.minigames;
const btn = "min-h-11 rounded-md border px-3 text-left text-[15px] font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ft-app-acao)] disabled:opacity-45";
const borda = { borderColor: "var(--ft-app-acao)" };

// Minigames da coleta e da entrega. Mostra o puzzle e devolve a escolha; quem confere é o motor.
export function Minigame({ m, agir }: { m: Puzzle; agir: (a: Acao) => void }) {
  return (
    <section aria-labelledby="mg" className="flex flex-col gap-3">
      <h2 id="mg" className="m-0 text-lg font-bold">{m.tipo === "coleta" ? T.coletaTitulo : T.entregaTitulo}</h2>
      <p className="m-0 text-sm">{m.tipo === "coleta" ? T.coletaDica : T.entregaDica}</p>

      {m.tipo === "coleta" ? (
        <>
          <div>
            <h3 className="m-0 text-sm font-bold">{T.notaRotulo}</h3>
            <ul className="m-0 list-disc pl-5 text-[15px]">
              {m.nota.map((n, i) => <li key={i}>{n}</li>)}
            </ul>
          </div>
          <div>
            <h3 className="m-0 mb-1 text-sm font-bold">{T.sacolaRotulo}</h3>
            <ul className="m-0 flex list-none flex-col gap-2 p-0">
              {m.sacola.map((n, i) => (
                <li key={i} className="flex items-center gap-2">
                  <span className="flex-1 text-[15px]">{n ?? T.faltando}</span>
                  <button onClick={() => agir({ tipo: "minigame", resposta: i })} className={btn} style={borda}>{T.marcarErrado}</button>
                </li>
              ))}
            </ul>
          </div>
          <button onClick={() => agir({ tipo: "minigame", resposta: -1 })} className={`${btn} text-[#f6f0d6]`} style={{ background: "var(--ft-app-acao)" }}>{T.tudoCerto}</button>
        </>
      ) : (
        <>
          <p className="m-0 rounded-md bg-black/10 p-3 text-[15px]" role="status">
            Pista do cliente: casa <strong>{m.pista.casa}</strong>, portão <strong>{m.pista.portao}</strong>, número <strong>{m.pista.paridade}</strong>.
          </p>
          {m.erradas.length > 0 && <p role="status" className="m-0 text-sm font-semibold" style={{ color: "var(--ft-app-alerta)" }}>{T.entregaErrou}</p>}
          <ul className="m-0 grid list-none grid-cols-2 gap-2 p-0">
            {m.portas.map((p, i) => {
              const tentada = m.erradas.includes(i);
              return (
                <li key={i}>
                  <button disabled={tentada} onClick={() => agir({ tipo: "minigame", resposta: i })} className={`${btn} flex w-full flex-col`} style={borda} aria-label={`Porta ${i + 1}: casa ${p.casa}, portão ${p.portao}, número ${p.numero}${tentada ? ", já tentada" : ""}`}>
                    <span className="font-ficha text-sm">nº {p.numero}</span>
                    <span className="text-xs font-normal">casa {p.casa} · portão {p.portao}{tentada ? " · ✖ tentada" : ""}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      )}
      <button onClick={() => agir({ tipo: "minigame", resposta: "pular" })} className="min-h-11 text-sm underline">{T.pular}</button>
    </section>
  );
}
