"use client";

import Link from "next/link";
import { useOptimistic, useState, useTransition } from "react";
import { marcarHabito } from "@/app/actions/diario";
import { DIAS_SEMANA, MESES, diaDaSemana } from "@/lib/diario/calendario";
import type { Habito, Quest } from "@/lib/diario/dados";
import { Estrela } from "./Ficha";
import { QuestLista } from "./QuestLista";

export type DiaDaSemana = { date: string; quests: Quest[] };
type HabitosDoMes = { mes: number; habitos: Habito[]; feitos: string[] };

type Props = {
  dias: DiaDaSemana[];
  hoje: string;
  habitos: HabitosDoMes[];
  /** Constelação (só no celular aparece aqui; no computador fica na coluna). */
  estrelas: React.ReactNode;
  /** Coluna da direita no computador; no celular vem embaixo do dia. */
  lateral: React.ReactNode;
};

const curto = (i: number) => DIAS_SEMANA[i].slice(0, 3).toUpperCase();
const numero = (d: string) => d.slice(8, 10);
const mesDe = (d: string) => Number(d.slice(5, 7));

/** Semana do diário: todos os dias no computador; no celular, um dia por vez com seletor no topo. */
export function SemanaVista({ dias, hoje, habitos, estrelas, lateral }: Props) {
  const temHoje = dias.some((d) => d.date === hoje);
  const [escolhido, setEscolhido] = useState(temHoje ? hoje : dias[0].date);

  return (
    <>
      {/* Celular: estrelas e seletor de dias */}
      <div className="flex flex-col gap-4 lg:hidden">
        {estrelas}
        <div role="group" aria-label="Escolher o dia" className="grid gap-1" style={{ gridTemplateColumns: `repeat(${dias.length}, minmax(0, 1fr))` }}>
          {dias.map((d, i) => {
            const sel = d.date === escolhido;
            return (
              <button
                key={d.date}
                type="button"
                aria-pressed={sel}
                aria-label={`${DIAS_SEMANA[i]}, ${Number(numero(d.date))}${d.date === hoje ? ", hoje" : ""}`}
                onClick={() => setEscolhido(d.date)}
                className={`flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-md ${sel ? "bg-laranja-claro text-noite" : d.date === hoje ? "border border-laranja-claro text-creme" : "text-areia hover:bg-creme/8"}`}
              >
                <span className="font-ficha text-[10px] tracking-[0.08em]">{curto(i)}</span>
                <span className="text-lg font-semibold leading-none">{numero(d.date)}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap items-start gap-6">
        <div className="grid min-w-0 flex-[999_1_600px] grid-cols-1 gap-4 lg:grid-cols-[repeat(auto-fill,minmax(230px,1fr))]">
          {dias.map((d, i) => (
            <CartaoDia key={d.date} dia={d} indice={i} hoje={d.date === hoje} visivelCelular={d.date === escolhido} />
          ))}
        </div>
        <aside className="flex min-w-0 flex-[1_1_280px] flex-col gap-4">
          <HabitosDoDia dia={escolhido} hoje={hoje} grupo={habitos.find((h) => h.mes === mesDe(escolhido))} />
          {lateral}
        </aside>
      </div>
    </>
  );
}

function CartaoDia({ dia, indice, hoje, visivelCelular }: { dia: DiaDaSemana; indice: number; hoje: boolean; visivelCelular: boolean }) {
  const nome = `${DIAS_SEMANA[indice]}, ${Number(numero(dia.date))} de ${MESES[mesDe(dia.date) - 1].nome.toLowerCase()}`;
  const mostra = visivelCelular ? "flex" : "hidden lg:flex";
  const alvo = { scope: "day" as const, date: dia.date };

  if (hoje)
    return (
      <section id={`dia-${dia.date}`} aria-label={`${nome} (hoje)`} className={`surface-creme ${mostra} flex-col gap-3 p-4 lg:row-span-2`}>
        <QuestLista
          quests={dia.quests}
          alvo={alvo}
          rotulo={nome}
          tom="creme"
          cabeca={(feitas, total) => (
            <>
              <div className="flex items-center justify-between">
                <span className="rotulo text-azul">{DIAS_SEMANA[indice]} · Hoje</span>
                <span className="flex items-center gap-2">
                  <span className="font-ficha text-xs text-[#4a4a4a]">
                    {feitas}/{total}
                  </span>
                  <Estrela cor="#AB392F" tamanho={16} />
                </span>
              </div>
              <span className="text-[34px] font-bold leading-none tracking-[-0.015em] text-azul">{numero(dia.date)}</span>
            </>
          )}
        />
      </section>
    );

  return (
    <section id={`dia-${dia.date}`} aria-label={nome} className={`surface-vidro ${mostra} flex-col gap-2 px-4 py-3.5`}>
      <QuestLista
        quests={dia.quests}
        alvo={alvo}
        rotulo={nome}
        tom="vidro"
        cabeca={(feitas, total) => (
          <>
            <div className="flex items-baseline justify-between">
              <span className="rotulo text-laranja-claro">{DIAS_SEMANA[indice]}</span>
              <span className="font-ficha text-xs text-poeira">
                <span className="sr-only">Concluídas: </span>
                {feitas}/{total}
              </span>
            </div>
            <span className="text-[22px] font-semibold leading-none">{numero(dia.date)}</span>
          </>
        )}
      />
    </section>
  );
}

/** Chips "Hábitos de hoje" (ou do dia escolhido): toque liga/desliga. */
function HabitosDoDia({ dia, hoje, grupo }: { dia: string; hoje: string; grupo?: HabitosDoMes }) {
  const [, start] = useTransition();
  const [erro, setErro] = useState("");
  const [feitos, marcar] = useOptimistic(new Set(grupo?.feitos ?? []), (s: Set<string>, a: { chave: string; done: boolean }) => {
    const n = new Set(s);
    if (a.done) n.add(a.chave);
    else n.delete(a.chave);
    return n;
  });
  const mes = MESES[mesDe(dia) - 1];
  const titulo = dia === hoje ? "Hábitos de hoje" : `Hábitos · ${DIAS_SEMANA[diaDaSemana(dia)].slice(0, 3).toLowerCase()} ${Number(numero(dia))}`;

  return (
    <div className="surface-creme flex flex-col gap-3 p-[18px]">
      <div className="flex items-center justify-between gap-2">
        <span className="rotulo text-azul">{titulo}</span>
        <Link href={`/diario/2027/${mes.slug}/habitos`} className="inline-flex min-h-11 items-center font-ficha text-xs text-azul underline underline-offset-4">
          VER O MÊS
        </Link>
      </div>
      {grupo && grupo.habitos.length > 0 ? (
        <div role="group" aria-label={titulo} className="flex flex-wrap gap-2">
          {grupo.habitos.map((h) => {
            const chave = `${h.id}|${dia}`;
            const on = feitos.has(chave);
            return (
              <button
                key={h.id}
                type="button"
                aria-pressed={on}
                className="chip"
                onClick={() =>
                  start(async () => {
                    setErro("");
                    marcar({ chave, done: !on });
                    const r = await marcarHabito(h.id, dia, !on);
                    if (r?.error) setErro(r.error);
                  })
                }
              >
                {on && <span aria-hidden>✓ </span>}
                {h.name}
              </button>
            );
          })}
        </div>
      ) : (
        <p className="text-sm text-tinta">
          Nenhum hábito em {mes.nome.toLowerCase()}.{" "}
          <Link href={`/diario/2027/${mes.slug}/habitos`} className="font-semibold text-azul underline underline-offset-4">
            Criar hábitos
          </Link>
        </p>
      )}
      <p role="status" className="text-sm font-semibold text-estrela empty:hidden">
        {erro}
      </p>
    </div>
  );
}
