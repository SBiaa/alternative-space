"use client";

import { useId, useOptimistic, useState, useTransition } from "react";
import { apagarQuest, novaQuest, statusQuest } from "@/app/actions/diario";
import type { Quest } from "@/lib/diario/dados";
import { type AlvoQuest, MAX_TEXTO, STATUS, type Status } from "@/lib/diario/regras";
import { STATUS_INFO, StatusPill } from "./Ficha";

type Acao = { tipo: "add"; quest: Quest } | { tipo: "status"; id: string; status: Status } | { tipo: "remove"; id: string };

function reduz(lista: Quest[], a: Acao): Quest[] {
  if (a.tipo === "add") return [...lista, a.quest];
  if (a.tipo === "remove") return lista.filter((q) => q.id !== a.id);
  return lista.map((q) => (q.id === a.id ? { ...q, status: a.status } : q));
}

/** Lista de quests de um dia ou do mês. Mostra a mudança na hora e confirma no servidor. */
export function QuestLista({ quests, alvo, rotulo }: { quests: Quest[]; alvo: AlvoQuest; rotulo: string }) {
  const [lista, aplicar] = useOptimistic(quests, reduz);
  const [, start] = useTransition();
  const [texto, setTexto] = useState("");
  const [erro, setErro] = useState("");
  const campo = useId();

  const roda = (acao: Acao, fn: () => Promise<{ error?: string } | undefined>) =>
    start(async () => {
      setErro("");
      aplicar(acao);
      const r = await fn();
      if (r?.error) setErro(r.error);
    });

  function adicionar(e: React.FormEvent) {
    e.preventDefault();
    const t = texto.trim();
    if (!t) return;
    setTexto("");
    const temp: Quest = { id: `temp-${Date.now()}`, scope: alvo.scope, date: null, year: null, month: null, text: t, status: "open", position: lista.length };
    roda({ tipo: "add", quest: temp }, () => novaQuest(alvo, t));
  }

  return (
    <div>
      {lista.length > 0 && (
        <ul className="mb-3 flex flex-col gap-2">
          {lista.map((q) => {
            const temp = q.id.startsWith("temp-");
            return (
              <li key={q.id} className={`flex flex-wrap items-center gap-2 border-b border-dashed border-noite/30 pb-2 ${temp ? "opacity-60" : ""}`}>
                <input
                  type="checkbox"
                  className="ficha-check"
                  checked={q.status === "done"}
                  disabled={temp}
                  aria-label={`Concluir: ${q.text}`}
                  onChange={(e) => {
                    const s: Status = e.target.checked ? "done" : "open";
                    roda({ tipo: "status", id: q.id, status: s }, () => statusQuest(q.id, s));
                  }}
                />
                <span className={`min-w-0 flex-1 break-words ${q.status === "done" || q.status === "dropped" ? "line-through decoration-2" : ""}`}>{q.text}</span>
                <StatusPill status={q.status} />
                <label className="sr-only" htmlFor={`st-${q.id}`}>
                  Status de {q.text}
                </label>
                <select
                  id={`st-${q.id}`}
                  className="ficha-campo !min-h-[40px] !py-1 text-sm"
                  value={q.status}
                  disabled={temp}
                  onChange={(e) => {
                    const s = e.target.value as Status;
                    roda({ tipo: "status", id: q.id, status: s }, () => statusQuest(q.id, s));
                  }}
                >
                  {STATUS.map((s) => (
                    <option key={s} value={s}>
                      {STATUS_INFO[s].simbolo} {STATUS_INFO[s].nome}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="ficha-botao ficha-botao-claro !min-h-[40px] !px-3 text-sm"
                  disabled={temp}
                  aria-label={`Apagar: ${q.text}`}
                  onClick={() => roda({ tipo: "remove", id: q.id }, () => apagarQuest(q.id))}
                >
                  <span aria-hidden>Apagar</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
      <form onSubmit={adicionar} className="flex gap-2">
        <label htmlFor={campo} className="sr-only">
          Nova quest — {rotulo}
        </label>
        <input id={campo} className="ficha-campo min-w-0 flex-1" maxLength={MAX_TEXTO} placeholder="+ nova quest" value={texto} onChange={(e) => setTexto(e.target.value)} />
        <button type="submit" className="ficha-botao" disabled={!texto.trim()}>
          Adicionar
        </button>
      </form>
      <p role="status" className="mt-2 text-sm font-semibold text-estrela empty:hidden">
        {erro}
      </p>
    </div>
  );
}
