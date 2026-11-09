"use client";

import { useEffect, useState } from "react";
import { MAX_ERROS, PUZZLES, alternar, embaralhar, enviar, novoEstado, type Estado, type Resultado } from "@/lib/conexoes";

const CORES = ["#e8c547", "#5fa84a", "#4f8fd6", "#b05ad1"];
const CHAVE = "conexoes-shinobi:puzzle";
const AVISOS: Partial<Record<Resultado, string>> = {
  quase: "Quase! Falta só um.",
  errou: "Não é um grupo.",
  repetido: "Você já tentou esse.",
};

export function ConexoesShinobi() {
  const [e, setE] = useState<Estado>(() => novoEstado(0, () => 0.5));
  const [aviso, setAviso] = useState("");
  const [tremer, setTremer] = useState(false);

  useEffect(() => {
    let n = 0;
    try {
      n = Number(localStorage.getItem(CHAVE)) || 0;
    } catch {}
    // eslint-disable-next-line react-hooks/set-state-in-effect -- embaralhar só no navegador
    setE(novoEstado(n % PUZZLES.length));
  }, []);

  const trocar = (n: number) => {
    const i = (n + PUZZLES.length) % PUZZLES.length;
    try {
      localStorage.setItem(CHAVE, String(i));
    } catch {}
    setAviso("");
    setE(novoEstado(i));
  };

  const mandar = () => {
    const r = enviar(e);
    setE(r.estado);
    const msg = AVISOS[r.resultado];
    setAviso(msg ?? "");
    if (r.resultado === "quase" || r.resultado === "errou") {
      setTremer(true);
      setTimeout(() => setTremer(false), 400);
    }
  };

  const fim = e.status !== "jogando";

  return (
    <div className="flex w-full flex-col gap-3 rounded-lg border-[6px] border-creme bg-noite p-3 sm:p-5">
      <div className="flex items-center justify-between text-sm text-areia">
        <span>Puzzle {e.puzzle + 1} de {PUZZLES.length}</span>
        <span aria-label={`${MAX_ERROS - e.erros} chances`}>
          Chances:{" "}
          {Array.from({ length: MAX_ERROS }, (_, i) => (
            <span key={i} className={i < MAX_ERROS - e.erros ? "text-laranja-claro" : "text-creme/20"}>●</span>
          ))}
        </span>
      </div>

      <div className="flex flex-col gap-2">
        {e.achados.map((g) => (
          <div key={g.tema} className="rounded-md px-3 py-2.5 text-center text-noite" style={{ background: CORES[g.nivel] }}>
            <div className="text-sm font-bold uppercase tracking-wide">{g.tema}</div>
            <div className="text-sm">{g.nomes.join(", ")}</div>
          </div>
        ))}
        <div className={`grid grid-cols-4 gap-2 ${tremer ? "animate-[tremer_0.4s]" : ""}`}>
          {e.restantes.map((nome) => {
            const sel = e.selecao.includes(nome);
            return (
              <button
                key={nome}
                type="button"
                onClick={() => setE(alternar(e, nome))}
                className={`min-h-14 rounded-md px-1 text-xs font-semibold uppercase leading-tight transition-colors sm:min-h-16 sm:text-sm ${
                  sel ? "bg-laranja text-creme" : "bg-creme text-noite hover:bg-areia"
                }`}
              >
                {nome}
              </button>
            );
          })}
        </div>
      </div>

      <p className="m-0 min-h-5 text-center text-sm text-laranja-claro" aria-live="polite">
        {e.status === "venceu" ? "Você achou todas as conexões!" : e.status === "perdeu" ? "Acabaram as chances. Esses eram os grupos." : aviso}
      </p>

      <div className="flex flex-wrap justify-center gap-2">
        {fim ? (
          <button type="button" className="rounded-full bg-laranja px-5 py-2 font-semibold text-creme" onClick={() => trocar(e.puzzle + 1)}>
            Próximo puzzle
          </button>
        ) : (
          <>
            <button type="button" className="rounded-full border border-creme/40 px-4 py-2 text-creme" onClick={() => setE({ ...e, restantes: embaralhar(e.restantes) })}>
              Embaralhar
            </button>
            <button type="button" disabled={!e.selecao.length} className="rounded-full border border-creme/40 px-4 py-2 text-creme disabled:opacity-40" onClick={() => setE({ ...e, selecao: [] })}>
              Desmarcar
            </button>
            <button type="button" disabled={e.selecao.length !== 4} className="rounded-full bg-laranja px-5 py-2 font-semibold text-creme disabled:opacity-40" onClick={mandar}>
              Enviar
            </button>
          </>
        )}
      </div>
      <style>{`@keyframes tremer{20%,60%{transform:translateX(-6px)}40%,80%{transform:translateX(6px)}}`}</style>
    </div>
  );
}
