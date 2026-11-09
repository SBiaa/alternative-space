"use client";

import { useOptimistic, useState, useTransition } from "react";
import { apagarHabito, marcarHabito, marcarHumor, novoHabito, salvarLegenda } from "@/app/actions/diario";
import type { Habito, Legenda } from "@/lib/diario/dados";
import { MAX_HABITOS } from "@/lib/diario/regras";

const LEGENDA_PADRAO: Legenda[] = [
  { slot: 1, color: "#7fc97f", label: "" },
  { slot: 2, color: "#fdd06b", label: "" },
  { slot: 3, color: "#8fb4e3", label: "" },
  { slot: 4, color: "#e88a7a", label: "" },
];

type Props = { mes: number; dias: string[]; habitos: Habito[]; feitos: string[]; legenda: Legenda[]; humor: Record<string, number> };

/** Grade de hábitos × dias do mês e a linha de humor, com legenda de 4 cores. */
export function GradeHabitos({ mes, dias, habitos, feitos, legenda, humor }: Props) {
  const [, start] = useTransition();
  const [erro, setErro] = useState("");
  const [novo, setNovo] = useState("");

  const [marcados, marcar] = useOptimistic(new Set(feitos), (s: Set<string>, a: { chave: string; done: boolean }) => {
    const n = new Set(s);
    if (a.done) n.add(a.chave);
    else n.delete(a.chave);
    return n;
  });
  const [lista, mexeLista] = useOptimistic(habitos, (l: Habito[], a: { add?: Habito; remove?: string }) =>
    a.add ? [...l, a.add] : l.filter((h) => h.id !== a.remove),
  );
  const [humores, mudaHumor] = useOptimistic(humor, (h: Record<string, number>, a: { date: string; slot: number | null }) => {
    const n = { ...h };
    if (a.slot === null) delete n[a.date];
    else n[a.date] = a.slot;
    return n;
  });

  const legendaAtual = legenda.length === 4 ? legenda : LEGENDA_PADRAO;
  const [leg, setLeg] = useState(legendaAtual);

  const roda = (fn: () => void, acao: () => Promise<{ error?: string } | undefined>) =>
    start(async () => {
      setErro("");
      fn();
      const r = await acao();
      if (r?.error) setErro(r.error);
    });

  const dia = (d: string) => Number(d.slice(8, 10));
  const nomeSlot = (s: number) => leg[s - 1]?.label || `Cor ${s}`;

  return (
    <div className="flex flex-col gap-6">
      <div className="overflow-x-auto rounded-[10px] border-2 border-noite bg-white">
        <table className="border-collapse text-sm">
          <caption className="sr-only">Hábitos do mês: marque os dias em que cumpriu cada hábito</caption>
          <thead>
            <tr>
              <th scope="col" className="sticky left-0 z-10 min-w-36 border-b-2 border-r-2 border-noite bg-white p-2 text-left">
                <span className="ficha-rotulo">Hábito</span>
              </th>
              {dias.map((d) => (
                <th key={d} scope="col" className="border-b-2 border-noite px-1 py-2 font-ficha text-xs font-normal">
                  {String(dia(d)).padStart(2, "0")}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {lista.map((h) => (
              <tr key={h.id} className="border-b border-noite/20">
                <th scope="row" className="sticky left-0 z-10 border-r-2 border-noite bg-white p-2 text-left font-semibold">
                  <div className="flex items-center justify-between gap-2">
                    <span className="break-words">{h.name}</span>
                    <button
                      type="button"
                      className="ficha-rotulo shrink-0 px-1 py-2 underline"
                      aria-label={`Apagar hábito ${h.name}`}
                      disabled={h.id.startsWith("temp-")}
                      onClick={() => roda(() => mexeLista({ remove: h.id }), () => apagarHabito(h.id))}
                    >
                      ✕
                    </button>
                  </div>
                </th>
                {dias.map((d) => {
                  const chave = `${h.id}|${d}`;
                  return (
                    <td key={d} className="px-1 py-1 text-center">
                      <input
                        type="checkbox"
                        className="ficha-check"
                        checked={marcados.has(chave)}
                        disabled={h.id.startsWith("temp-")}
                        aria-label={`${h.name}, dia ${dia(d)}`}
                        onChange={(e) => {
                          const done = e.target.checked;
                          roda(() => marcar({ chave, done }), () => marcarHabito(h.id, d, done));
                        }}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
            <tr>
              <th scope="row" className="sticky left-0 z-10 border-r-2 border-t-2 border-noite bg-[#fffbe8] p-2 text-left">
                <span className="ficha-rotulo">Humor</span>
              </th>
              {dias.map((d) => {
                const s = humores[d] ?? null;
                const prox = s === null ? 1 : s === 4 ? null : s + 1;
                return (
                  <td key={d} className="border-t-2 border-noite bg-[#fffbe8] px-1 py-1 text-center">
                    <button
                      type="button"
                      className="h-7 w-7 rounded-full border-2 border-noite"
                      style={{ background: s ? leg[s - 1].color : "#fff" }}
                      aria-label={`Humor do dia ${dia(d)}: ${s ? nomeSlot(s) : "vazio"}. Trocar para ${prox ? nomeSlot(prox) : "vazio"}`}
                      onClick={() => roda(() => mudaHumor({ date: d, slot: prox }), () => marcarHumor(d, prox))}
                    />
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>
      </div>

      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          const n = novo.trim();
          if (!n) return;
          setNovo("");
          roda(() => mexeLista({ add: { id: `temp-${Date.now()}`, name: n, position: lista.length } }), () => novoHabito(mes, n));
        }}
      >
        <label htmlFor="novo-habito" className="sr-only">
          Novo hábito
        </label>
        <input
          id="novo-habito"
          className="ficha-campo min-w-0 flex-1"
          maxLength={60}
          placeholder={lista.length >= MAX_HABITOS ? "Limite de 12 hábitos" : "+ novo hábito"}
          disabled={lista.length >= MAX_HABITOS}
          value={novo}
          onChange={(e) => setNovo(e.target.value)}
        />
        <button type="submit" className="ficha-botao" disabled={!novo.trim() || lista.length >= MAX_HABITOS}>
          Adicionar
        </button>
      </form>

      <fieldset className="ficha-caixa p-4">
        <legend className="diario-titulo px-1 text-lg">Legenda do humor</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          {leg.map((l, i) => (
            <div key={l.slot} className="flex items-center gap-2">
              <label className="sr-only" htmlFor={`cor-${l.slot}`}>
                Cor {l.slot}
              </label>
              <input
                id={`cor-${l.slot}`}
                type="color"
                className="h-11 w-11 shrink-0 cursor-pointer rounded-md border-2 border-noite bg-white p-0.5"
                value={l.color}
                onChange={(e) => setLeg((x) => x.map((y, j) => (j === i ? { ...y, color: e.target.value } : y)))}
              />
              <label className="sr-only" htmlFor={`nome-${l.slot}`}>
                Nome da cor {l.slot}
              </label>
              <input
                id={`nome-${l.slot}`}
                className="ficha-campo min-w-0 flex-1"
                maxLength={30}
                placeholder={`Ex.: ${["animada", "tranquila", "cansada", "brava"][i]}`}
                value={l.label}
                onChange={(e) => setLeg((x) => x.map((y, j) => (j === i ? { ...y, label: e.target.value } : y)))}
              />
            </div>
          ))}
        </div>
        <button type="button" className="ficha-botao mt-3" onClick={() => roda(() => {}, () => salvarLegenda(mes, leg))}>
          Salvar legenda
        </button>
      </fieldset>

      <p role="status" className="text-sm font-semibold text-estrela empty:hidden">
        {erro}
      </p>
    </div>
  );
}
