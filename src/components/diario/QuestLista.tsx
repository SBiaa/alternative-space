"use client";

import { useId, useOptimistic, useRef, useState, useTransition } from "react";
import { apagarQuest, novaQuest, statusQuest } from "@/app/actions/diario";
import { DIAS_SEMANA, MESES, diaDaSemana } from "@/lib/diario/calendario";
import type { Quest } from "@/lib/diario/dados";
import { type AlvoQuest, MAX_TEXTO, type Status, destinoMovida } from "@/lib/diario/regras";

type Acao = { tipo: "add"; quest: Quest } | { tipo: "status"; id: string; status: Status } | { tipo: "remove"; id: string };

function reduz(lista: Quest[], a: Acao): Quest[] {
  if (a.tipo === "add") return [...lista, a.quest];
  if (a.tipo === "remove") return lista.filter((q) => q.id !== a.id);
  return lista.map((q) => (q.id === a.id ? { ...q, status: a.status } : q));
}

/** "→ qua 24" (dia) ou "→ abril" (mês): para onde foi a cópia de uma quest que passou pra frente. */
function rotuloMovida(alvo: AlvoQuest) {
  const d = destinoMovida(alvo);
  if (!d) return "→ depois";
  if (d.scope === "month") return `→ ${MESES[d.month - 1].nome.toLowerCase()}`;
  return `→ ${DIAS_SEMANA[diaDaSemana(d.date)].slice(0, 3).toLowerCase()} ${Number(d.date.slice(8))}`;
}

type Props = {
  quests: Quest[];
  alvo: AlvoQuest;
  /** Nome do dia ou mês, para os rótulos de leitor de tela. */
  rotulo: string;
  /** creme = hoje / mês (campo sempre aberto); vidro = outros dias (botão "+ Nova quest"). */
  tom: "creme" | "vidro";
  /** Cabeçalho do cartão, que recebe o placar atualizado na hora. */
  cabeca?: (feitas: number, total: number) => React.ReactNode;
};

/** Quests de um dia ou do mês. Mostra a mudança na hora e confirma no servidor. */
export function QuestLista({ quests, alvo, rotulo, tom, cabeca }: Props) {
  const [lista, aplicar] = useOptimistic(quests, reduz);
  const [, start] = useTransition();
  const [texto, setTexto] = useState("");
  const [aberto, setAberto] = useState(tom === "creme");
  const [erro, setErro] = useState("");
  const campo = useId();
  const creme = tom === "creme";

  const roda = (acao: Acao, fn: () => Promise<{ error?: string } | undefined>) =>
    start(async () => {
      setErro("");
      aplicar(acao);
      const r = await fn();
      if (r?.error) setErro(r.error);
    });

  const mudar = (q: Quest, status: Status) => roda({ tipo: "status", id: q.id, status }, () => statusQuest(q.id, status));

  function adicionar(e: React.FormEvent) {
    e.preventDefault();
    const t = texto.trim();
    if (!t) return;
    setTexto("");
    const temp: Quest = { id: `temp-${Date.now()}`, scope: alvo.scope, date: null, year: null, month: null, text: t, status: "open", position: lista.length };
    roda({ tipo: "add", quest: temp }, () => novaQuest(alvo, t));
  }

  const feitas = lista.filter((q) => q.status === "done").length;

  return (
    <>
      {cabeca?.(feitas, lista.length)}
      {lista.length > 0 && (
        <ul className="flex flex-col">
          {lista.map((q) => (
            <QuestItem key={q.id} q={q} creme={creme} rotuloMovida={rotuloMovida(alvo)} onStatus={(s) => mudar(q, s)} onApagar={() => roda({ tipo: "remove", id: q.id }, () => apagarQuest(q.id))} />
          ))}
        </ul>
      )}
      {lista.length === 0 && !creme && !aberto && <p className="text-sm text-poeira">Nenhuma quest ainda.</p>}

      {aberto ? (
        <form onSubmit={adicionar} className="mt-auto flex gap-2">
          <label htmlFor={campo} className="sr-only">
            Nova quest — {rotulo}
          </label>
          <input
            id={campo}
            className={`${creme ? "campo" : "campo-vidro !py-0"} min-w-0 flex-1`}
            maxLength={MAX_TEXTO}
            placeholder={alvo.scope === "month" ? "Nova quest do mês…" : "Nova quest…"}
            autoFocus={!creme}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
          />
          <button type="submit" className="botao-laranja !px-3.5 text-[15px]" disabled={!texto.trim()}>
            Guardar
          </button>
        </form>
      ) : (
        <button type="button" className="botao-tracejado mt-auto w-full" onClick={() => setAberto(true)} aria-label={`Nova quest — ${rotulo}`}>
          + Nova quest
        </button>
      )}
      <p role="status" className={`text-sm font-semibold empty:hidden ${creme ? "text-estrela" : "text-[#ff8f80]"}`}>
        {erro}
      </p>
    </>
  );
}

function QuestItem({ q, creme, rotuloMovida, onStatus, onApagar }: { q: Quest; creme: boolean; rotuloMovida: string; onStatus: (s: Status) => void; onApagar: () => void }) {
  const menu = useRef<HTMLDetailsElement>(null);
  const temp = q.id.startsWith("temp-");
  const id = `q-${q.id}`;
  const fecha = (fn: () => void) => () => {
    if (menu.current) menu.current.open = false;
    fn();
  };

  const riscada = q.status === "done";
  const apagada = q.status === "dropped" || q.status === "moved";
  const corTexto = creme ? (riscada || apagada ? "text-[#4a4a4a]" : "text-tinta") : riscada || apagada ? "text-poeira" : "text-creme";

  const opcoes: { label: string; status?: Status; apagar?: true }[] = [
    q.status === "urgent" ? { label: "Tirar o urgente", status: "open" } : { label: "Marcar urgente", status: "urgent" },
    { label: "Passar pra frente", status: "moved" },
    q.status === "dropped" ? { label: "Reabrir", status: "open" } : { label: "Desisti", status: "dropped" },
    { label: "Apagar", apagar: true },
  ];

  return (
    <li className={`flex min-h-11 items-center gap-2.5 ${creme ? "border-b border-noite/12" : "border-t border-creme/18"} ${temp ? "opacity-60" : ""}`}>
      <input
        type="checkbox"
        id={id}
        className="size-5 shrink-0 cursor-pointer accent-laranja"
        checked={riscada}
        disabled={temp || q.status === "moved"}
        onChange={(e) => onStatus(e.target.checked ? "done" : "open")}
      />
      <label htmlFor={id} className={`min-w-0 flex-1 cursor-pointer break-words py-2 text-[15px] ${corTexto} ${riscada ? "line-through" : ""}`}>
        {q.text}
        {q.status === "dropped" && <span className="sr-only"> (desisti)</span>}
      </label>
      {q.status === "urgent" && <span className={`rotulo shrink-0 rounded px-1.5 py-[3px] !tracking-[0.08em] text-noite ${creme ? "bg-creme" : "bg-laranja-claro"}`}>Urgente</span>}
      {q.status === "moved" && <span className={`shrink-0 font-ficha text-[11px] ${creme ? "text-azul" : "text-laranja-claro"}`}>{rotuloMovida}</span>}
      {q.status === "dropped" && <span className={`rotulo shrink-0 !tracking-[0.08em] ${creme ? "text-[#4a4a4a]" : "text-poeira"}`}>Desisti</span>}
      {!temp && (
        <details ref={menu} className="relative shrink-0">
          <summary
            aria-label={`Mais opções: ${q.text}`}
            className={`flex size-11 cursor-pointer list-none items-center justify-center rounded-md text-lg [&::-webkit-details-marker]:hidden ${creme ? "text-noite hover:bg-noite/8" : "text-areia hover:bg-creme/10"}`}
          >
            <span aria-hidden>⋯</span>
          </summary>
          <div className="absolute right-0 top-full z-20 flex w-48 flex-col rounded-lg border border-creme/18 bg-cabine p-1 shadow-[0_8px_24px_rgba(0,0,0,0.25)]">
            {opcoes.map((o) => (
              <button
                key={o.label}
                type="button"
                className="min-h-11 rounded-md px-3 text-left text-sm text-creme hover:bg-creme/10"
                onClick={fecha(() => (o.apagar ? onApagar() : onStatus(o.status!)))}
              >
                {o.label}
              </button>
            ))}
          </div>
        </details>
      )}
    </li>
  );
}
