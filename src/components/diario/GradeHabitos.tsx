"use client";

import { useOptimistic, useState, useTransition } from "react";
import { apagarHabito, marcarHabito, marcarHumor, novoHabito, salvarLegenda } from "@/app/actions/diario";
import { DIAS_SEMANA, diaCurto, diaDaSemana } from "@/lib/diario/calendario";
import type { Habito, Legenda } from "@/lib/diario/dados";
import { MAX_HABITOS } from "@/lib/diario/regras";

const LEGENDA_PADRAO: Legenda[] = [
  { slot: 1, color: "#7fc97f", label: "" },
  { slot: 2, color: "#fdd06b", label: "" },
  { slot: 3, color: "#8fb4e3", label: "" },
  { slot: 4, color: "#e88a7a", label: "" },
];

type Props = { mes: number; dias: string[]; hoje: string; habitos: Habito[]; feitos: string[]; legenda: Legenda[]; humor: Record<string, number> };

/** Corta os dias do mês em semanas (segunda a domingo). */
function semanasDoMes(dias: string[]) {
  const out: string[][] = [];
  for (const d of dias) {
    if (out.length === 0 || diaDaSemana(d) === 0) out.push([]);
    out.at(-1)!.push(d);
  }
  return out;
}

/** Hábitos × dias do mês e a linha de humor. No computador, o mês inteiro; no celular, uma semana por vez. */
export function GradeHabitos({ mes, dias, hoje, habitos, feitos, legenda, humor }: Props) {
  const [, start] = useTransition();
  const [erro, setErro] = useState("");
  const [novo, setNovo] = useState("");
  const blocos = semanasDoMes(dias);
  const [bloco, setBloco] = useState(Math.max(0, blocos.findIndex((b) => b.includes(hoje))));

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
  const [leg, setLeg] = useState(legenda.length === 4 ? legenda : LEGENDA_PADRAO);

  const roda = (fn: () => void, acao: () => Promise<{ error?: string } | undefined>) =>
    start(async () => {
      setErro("");
      fn();
      const r = await acao();
      if (r?.error) setErro(r.error);
    });

  const n = (d: string) => Number(d.slice(8, 10));
  const nomeSlot = (s: number) => leg[s - 1]?.label || `Cor ${s}`;

  const tabela = (colunas: string[], celular: boolean) => (
    <div className={`surface-creme overflow-x-auto ${celular ? "lg:hidden" : "hidden lg:block"}`}>
      <table className="w-full border-collapse text-sm">
        <caption className="sr-only">
          Hábitos {celular ? `de ${diaCurto(colunas[0])} a ${diaCurto(colunas.at(-1)!)}` : "do mês"}: marque os dias em que cumpriu cada hábito
        </caption>
        <thead>
          <tr>
            <th scope="col" className={`${celular ? "" : "sticky left-0 z-10 min-w-40"} bg-creme-claro p-2 text-left`}>
              <span className="rotulo text-azul">Hábito</span>
            </th>
            {colunas.map((d) => (
              <th key={d} scope="col" className={`px-0.5 py-2 text-center font-ficha text-[11px] font-normal ${d === hoje ? "text-estrela" : "text-[#4a4a4a]"}`}>
                {celular && <span className="block">{DIAS_SEMANA[diaDaSemana(d)].slice(0, 3).toUpperCase()}</span>}
                <span className={d === hoje ? "font-bold" : ""}>{String(n(d)).padStart(2, "0")}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {lista.map((h) => {
            const temp = h.id.startsWith("temp-");
            return (
              <tr key={h.id} className="border-t border-noite/12">
                <th scope="row" className={`${celular ? "max-w-28" : "sticky left-0 z-10"} bg-creme-claro p-2 text-left font-medium text-tinta`}>
                  <span className="break-words">{h.name}</span>
                </th>
                {colunas.map((d) => {
                  const chave = `${h.id}|${d}`;
                  return (
                    <td key={d} className="p-0 text-center">
                      <label className="inline-flex size-11 cursor-pointer items-center justify-center">
                        <input
                          type="checkbox"
                          className="size-5 cursor-pointer accent-laranja"
                          checked={marcados.has(chave)}
                          disabled={temp}
                          aria-label={`${h.name}, ${diaCurto(d)}`}
                          onChange={(e) => {
                            const done = e.target.checked;
                            roda(() => marcar({ chave, done }), () => marcarHabito(h.id, d, done));
                          }}
                        />
                      </label>
                    </td>
                  );
                })}
              </tr>
            );
          })}
          <tr className="border-t-2 border-noite/25">
            <th scope="row" className={`${celular ? "" : "sticky left-0 z-10"} bg-creme-claro p-2 text-left`}>
              <span className="rotulo text-azul">Humor</span>
            </th>
            {colunas.map((d) => {
              const s = humores[d] ?? null;
              const prox = s === null ? 1 : s === 4 ? null : s + 1;
              return (
                <td key={d} className="p-0 text-center">
                  <button
                    type="button"
                    className="inline-flex size-11 items-center justify-center"
                    aria-label={`Humor de ${diaCurto(d)}: ${s ? nomeSlot(s) : "vazio"}. Trocar para ${prox ? nomeSlot(prox) : "vazio"}`}
                    onClick={() => roda(() => mudaHumor({ date: d, slot: prox }), () => marcarHumor(d, prox))}
                  >
                    <span aria-hidden className="block size-6 rounded-full border border-noite" style={{ background: s ? leg[s - 1].color : "transparent" }} />
                  </button>
                </td>
              );
            })}
          </tr>
        </tbody>
      </table>
    </div>
  );

  const semana = blocos[bloco];

  return (
    <div className="flex flex-col gap-6">
      {/* Celular: semana por semana */}
      <div className="flex items-center justify-between gap-2 lg:hidden">
        <button type="button" className="botao-vidro w-11 !px-0 text-xl" disabled={bloco === 0} aria-label="Semana anterior" onClick={() => setBloco((b) => b - 1)}>
          ‹
        </button>
        <span className="font-ficha text-sm text-areia" aria-live="polite">
          {diaCurto(semana[0])} a {diaCurto(semana.at(-1)!)}
        </span>
        <button type="button" className="botao-vidro w-11 !px-0 text-xl" disabled={bloco === blocos.length - 1} aria-label="Próxima semana" onClick={() => setBloco((b) => b + 1)}>
          ›
        </button>
      </div>
      {tabela(semana, true)}
      {tabela(dias, false)}

      {lista.length === 0 && <p className="text-areia">Nenhum hábito ainda. Crie até 12 para acompanhar no mês.</p>}

      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          const nome = novo.trim();
          if (!nome) return;
          setNovo("");
          roda(() => mexeLista({ add: { id: `temp-${Date.now()}`, name: nome, position: lista.length } }), () => novoHabito(mes, nome));
        }}
      >
        <label htmlFor="novo-habito" className="sr-only">
          Novo hábito
        </label>
        <input
          id="novo-habito"
          className="campo-vidro min-w-0 flex-1 !py-0"
          maxLength={60}
          placeholder={lista.length >= MAX_HABITOS ? "Limite de 12 hábitos" : "Novo hábito…"}
          disabled={lista.length >= MAX_HABITOS}
          value={novo}
          onChange={(e) => setNovo(e.target.value)}
        />
        <button type="submit" className="botao-laranja" disabled={!novo.trim() || lista.length >= MAX_HABITOS}>
          Adicionar
        </button>
      </form>

      {lista.length > 0 && (
        <details className="surface-vidro p-4">
          <summary className="flex min-h-11 cursor-pointer items-center font-medium">Apagar hábitos</summary>
          <ul className="mt-2 flex flex-wrap gap-2">
            {lista.map((h) => (
              <li key={h.id}>
                <button type="button" className="botao-vidro text-sm" disabled={h.id.startsWith("temp-")} onClick={() => roda(() => mexeLista({ remove: h.id }), () => apagarHabito(h.id))}>
                  Apagar “{h.name}”
                </button>
              </li>
            ))}
          </ul>
        </details>
      )}

      <fieldset className="surface-vidro flex flex-col gap-3 p-[18px]">
        <legend className="rotulo float-left mb-1 text-laranja-claro">Legenda do humor</legend>
        <p className="clear-both text-sm text-areia">Escolha 4 cores e dê um nome a cada uma. Toque na bolinha do dia pra trocar.</p>
        <div className="grid gap-3 sm:grid-cols-2">
          {leg.map((l, i) => (
            <div key={l.slot} className="flex items-center gap-2">
              <label className="sr-only" htmlFor={`cor-${l.slot}`}>
                Cor {l.slot}
              </label>
              <input
                id={`cor-${l.slot}`}
                type="color"
                className="size-11 shrink-0 cursor-pointer rounded-md border border-creme/40 bg-transparent p-1"
                value={l.color}
                onChange={(e) => setLeg((x) => x.map((y, j) => (j === i ? { ...y, color: e.target.value } : y)))}
              />
              <label className="sr-only" htmlFor={`nome-${l.slot}`}>
                Nome da cor {l.slot}
              </label>
              <input
                id={`nome-${l.slot}`}
                className="campo-vidro min-w-0 flex-1 !py-0"
                maxLength={30}
                placeholder={`Ex.: ${["animada", "tranquila", "cansada", "brava"][i]}`}
                value={l.label}
                onChange={(e) => setLeg((x) => x.map((y, j) => (j === i ? { ...y, label: e.target.value } : y)))}
              />
            </div>
          ))}
        </div>
        <button type="button" className="botao-laranja self-start" onClick={() => roda(() => {}, () => salvarLegenda(mes, leg))}>
          Salvar legenda
        </button>
      </fieldset>

      <p role="status" className="text-sm font-semibold text-[#ff8f80] empty:hidden">
        {erro}
      </p>
    </div>
  );
}
