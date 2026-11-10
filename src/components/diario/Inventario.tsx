"use client";

import { useOptimistic, useState, useTransition } from "react";
import { apagarItem, notaItem, novoItem, statusItem } from "@/app/actions/diario";
import type { Item } from "@/lib/diario/dados";
import { STATUS_ITEM, type StatusItem, TIPOS_ITEM, type TipoItem } from "@/lib/diario/regras";
import { Estrela } from "./Ficha";

export const TIPO_NOME: Record<TipoItem, string> = { serie: "Série", anime: "Anime", jogo: "Jogo", livro: "Livro" };
const TIPO_PLURAL: Record<TipoItem, string> = { serie: "Séries", anime: "Animes", jogo: "Jogos", livro: "Livros" };
export const STATUS_ITEM_NOME: Record<StatusItem, string> = { quero: "Quero", fazendo: "Fazendo", terminei: "Terminei" };

type Acao = { add: Item } | { id: string; mudar: Partial<Item> } | { remove: string };

/** Resumo do mês: quantos em cada status e nota média dos que têm nota. */
export function resumir(itens: Item[]) {
  const porStatus = Object.fromEntries(STATUS_ITEM.map((s) => [s, itens.filter((i) => i.status === s).length])) as Record<StatusItem, number>;
  const porTipo = Object.fromEntries(TIPOS_ITEM.map((t) => [t, itens.filter((i) => i.type === t).length])) as Record<TipoItem, number>;
  const notas = itens.map((i) => i.rating).filter((r): r is number => r !== null);
  const media = notas.length ? notas.reduce((a, b) => a + b, 0) / notas.length : null;
  return { total: itens.length, porStatus, porTipo, media };
}

function Filtro<T extends string>({ rotulo, opcoes, nomes, valor, onChange }: { rotulo: string; opcoes: readonly T[]; nomes: Record<T, string>; valor: T | null; onChange: (v: T | null) => void }) {
  return (
    <div role="group" aria-label={rotulo} className="flex flex-wrap gap-1.5">
      {[null, ...opcoes].map((o) => {
        const on = valor === o;
        return (
          <button
            key={o ?? "todos"}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(o)}
            className={`min-h-11 rounded px-3 text-sm font-medium ${on ? "bg-laranja-claro text-noite" : "border border-creme/40 text-areia hover:text-creme"}`}
          >
            {o === null ? "Todos" : nomes[o]}
          </button>
        );
      })}
    </div>
  );
}

const SelectNota = ({ valor, onChange, disabled, id }: { valor: number | null; onChange: (v: number | null) => void; disabled?: boolean; id?: string }) => (
  <select id={id} className="campo !min-h-11 !px-2" value={valor ?? ""} disabled={disabled} onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}>
    <option value="">Sem nota</option>
    {[1, 2, 3, 4, 5].map((n) => (
      <option key={n} value={n}>
        {"★".repeat(n)} ({n})
      </option>
    ))}
  </select>
);

export function Inventario({ mes, itens }: { mes: number; itens: Item[] }) {
  const [lista, aplicar] = useOptimistic(itens, (l: Item[], a: Acao) => {
    if ("add" in a) return [...l, a.add];
    if ("remove" in a) return l.filter((i) => i.id !== a.remove);
    return l.map((i) => (i.id === a.id ? { ...i, ...a.mudar } : i));
  });
  const [, start] = useTransition();
  const [erro, setErro] = useState("");
  const [tipo, setTipo] = useState<TipoItem | null>(null);
  const [status, setStatus] = useState<StatusItem | null>(null);
  const [form, setForm] = useState({ type: "anime" as TipoItem, title: "", rating: null as number | null, status: "quero" as StatusItem });

  const roda = (a: Acao, fn: () => Promise<{ error?: string } | undefined>) =>
    start(async () => {
      setErro("");
      aplicar(a);
      const r = await fn();
      if (r?.error) setErro(r.error);
    });

  function adicionar(e: React.FormEvent) {
    e.preventDefault();
    const title = form.title.trim();
    if (!title) return;
    const item = { type: form.type, title, rating: form.rating, status: form.status };
    setForm((f) => ({ ...f, title: "", rating: null }));
    roda({ add: { id: `temp-${Date.now()}`, ...item } }, () => novoItem(mes, item));
  }

  const r = resumir(lista);
  const visiveis = lista.filter((i) => (!tipo || i.type === tipo) && (!status || i.status === status));

  return (
    <div className="flex flex-wrap items-start gap-6">
      <div className="flex min-w-0 flex-[999_1_560px] flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Filtro rotulo="Filtrar por tipo" opcoes={TIPOS_ITEM} nomes={TIPO_PLURAL} valor={tipo} onChange={setTipo} />
          <Filtro rotulo="Filtrar por status" opcoes={STATUS_ITEM} nomes={STATUS_ITEM_NOME} valor={status} onChange={setStatus} />
        </div>

        <p role="status" className="text-sm font-semibold text-[#ff8f80] empty:hidden">
          {erro}
        </p>

        {visiveis.length === 0 ? (
          <p className="surface-vidro p-4 text-areia">{lista.length === 0 ? "Inventário vazio. Guarda aí o que você quer ver, jogar ou ler este mês." : "Nada com esses filtros."}</p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {visiveis.map((i) => {
              const temp = i.id.startsWith("temp-");
              return (
                <li key={i.id} className={`surface-vidro flex flex-col gap-3 p-4 ${temp ? "opacity-60" : ""}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="rotulo text-laranja-claro">{TIPO_NOME[i.type]}</p>
                      <p className={`break-words text-lg font-semibold ${i.status === "terminei" ? "text-areia" : ""}`}>{i.title}</p>
                      {i.rating !== null && (
                        <p className="mt-1 flex gap-0.5" aria-label={`Nota ${i.rating} de 5`}>
                          {Array.from({ length: 5 }, (_, k) => (
                            <Estrela key={k} acesa={k < i.rating!} tamanho={14} />
                          ))}
                        </p>
                      )}
                    </div>
                    <button type="button" className="min-h-11 shrink-0 px-2 text-sm text-areia underline underline-offset-4 hover:text-creme" disabled={temp} aria-label={`Apagar ${i.title}`} onClick={() => roda({ remove: i.id }, () => apagarItem(i.id))}>
                      Apagar
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <label className="flex items-center gap-2">
                      <span className="sr-only">Status de {i.title}</span>
                      <select
                        className="campo !min-h-11 !px-2"
                        value={i.status}
                        disabled={temp}
                        onChange={(e) => {
                          const s = e.target.value as StatusItem;
                          roda({ id: i.id, mudar: { status: s } }, () => statusItem(i.id, s));
                        }}
                      >
                        {STATUS_ITEM.map((s) => (
                          <option key={s} value={s}>
                            {STATUS_ITEM_NOME[s]}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="flex items-center gap-2">
                      <span className="sr-only">Nota de {i.title}</span>
                      <SelectNota valor={i.rating} disabled={temp} onChange={(rating) => roda({ id: i.id, mudar: { rating } }, () => notaItem(i.id, rating))} />
                    </label>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <aside className="flex min-w-0 flex-[1_1_280px] flex-col gap-4">
        <section aria-labelledby="resumo" className="surface-vidro flex flex-col gap-3 p-[18px]">
          <h2 id="resumo" className="rotulo text-laranja-claro">
            Resumo do mês
          </h2>
          <p className="text-[34px] font-bold leading-none">
            {r.total} <span className="text-base font-normal text-areia">{r.total === 1 ? "item" : "itens"}</span>
          </p>
          <dl className="grid grid-cols-3 gap-2 text-center">
            {STATUS_ITEM.map((s) => (
              <div key={s} className="rounded-md bg-creme/8 py-2">
                <dt className="rotulo !tracking-[0.08em] text-areia">{STATUS_ITEM_NOME[s]}</dt>
                <dd className="text-xl font-semibold">{r.porStatus[s]}</dd>
              </div>
            ))}
          </dl>
          <p className="text-sm text-areia">
            {TIPOS_ITEM.filter((t) => r.porTipo[t] > 0)
              .map((t) => `${r.porTipo[t]} ${(r.porTipo[t] === 1 ? TIPO_NOME[t] : TIPO_PLURAL[t]).toLowerCase()}`)
              .join(" · ") || "Nenhum tipo ainda"}
          </p>
          <p className="text-sm text-areia">Nota média: {r.media === null ? "—" : r.media.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}</p>
        </section>

        <form onSubmit={adicionar} className="surface-creme flex flex-col gap-3 p-[18px]">
          <h2 className="rotulo text-azul">Guardar no inventário</h2>
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium">Título</span>
            <input className="campo" maxLength={200} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium">Tipo</span>
              <select className="campo !px-2" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as TipoItem })}>
                {TIPOS_ITEM.map((t) => (
                  <option key={t} value={t}>
                    {TIPO_NOME[t]}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium">Status</span>
              <select className="campo !px-2" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as StatusItem })}>
                {STATUS_ITEM.map((s) => (
                  <option key={s} value={s}>
                    {STATUS_ITEM_NOME[s]}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium">Nota (opcional)</span>
            <SelectNota valor={form.rating} onChange={(rating) => setForm({ ...form, rating })} />
          </label>
          <button type="submit" className="botao-laranja" disabled={!form.title.trim()}>
            Guardar
          </button>
        </form>
      </aside>
    </div>
  );
}
