"use client";

import { useOptimistic, useState, useTransition } from "react";
import { apagarItem, notaItem, novoItem, statusItem } from "@/app/actions/diario";
import type { Item } from "@/lib/diario/dados";
import { STATUS_ITEM, type StatusItem, TIPOS_ITEM, type TipoItem } from "@/lib/diario/regras";

export const TIPO_NOME: Record<TipoItem, string> = { serie: "Série", anime: "Anime", jogo: "Jogo", livro: "Livro" };
export const STATUS_ITEM_NOME: Record<StatusItem, string> = { quero: "Quero", fazendo: "Fazendo", terminei: "Terminei" };

type Acao = { add: Item } | { id: string; mudar: Partial<Item> } | { remove: string };

export function Inventario({ mes, itens }: { mes: number; itens: Item[] }) {
  const [lista, aplicar] = useOptimistic(itens, (l: Item[], a: Acao) => {
    if ("add" in a) return [...l, a.add];
    if ("remove" in a) return l.filter((i) => i.id !== a.remove);
    return l.map((i) => (i.id === a.id ? { ...i, ...a.mudar } : i));
  });
  const [, start] = useTransition();
  const [erro, setErro] = useState("");
  const [form, setForm] = useState({ type: "anime" as TipoItem, title: "", rating: "", status: "quero" as StatusItem });

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
    const item = { type: form.type, title, rating: form.rating ? Number(form.rating) : null, status: form.status };
    setForm((f) => ({ ...f, title: "", rating: "" }));
    roda({ add: { id: `temp-${Date.now()}`, ...item } }, () => novoItem(mes, item));
  }

  return (
    <div className="flex flex-col gap-4">
      <form onSubmit={adicionar} className="ficha-caixa grid gap-3 p-4 sm:grid-cols-[auto_1fr_auto_auto_auto] sm:items-end">
        <label className="flex flex-col gap-1">
          <span className="ficha-rotulo">Tipo</span>
          <select className="ficha-campo" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as TipoItem })}>
            {TIPOS_ITEM.map((t) => (
              <option key={t} value={t}>
                {TIPO_NOME[t]}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="ficha-rotulo">Título</span>
          <input className="ficha-campo" maxLength={200} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="ficha-rotulo">Nota</span>
          <select className="ficha-campo" value={form.rating} onChange={(e) => setForm({ ...form, rating: e.target.value })}>
            <option value="">—</option>
            {[1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>
                {"★".repeat(n)}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="ficha-rotulo">Status</span>
          <select className="ficha-campo" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as StatusItem })}>
            {STATUS_ITEM.map((s) => (
              <option key={s} value={s}>
                {STATUS_ITEM_NOME[s]}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className="ficha-botao" disabled={!form.title.trim()}>
          Guardar
        </button>
      </form>

      <p role="status" className="text-sm font-semibold text-estrela empty:hidden">
        {erro}
      </p>

      {lista.length === 0 ? (
        <p className="ficha-caixa p-4">Inventário vazio. Guarda aí o que você quer ver, jogar ou ler este mês.</p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {lista.map((i) => {
            const temp = i.id.startsWith("temp-");
            return (
              <li key={i.id} className={`ficha-caixa flex flex-col gap-3 p-4 ${temp ? "opacity-60" : ""}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="ficha-rotulo">{TIPO_NOME[i.type]}</p>
                    <p className="diario-titulo break-words text-lg">{i.title}</p>
                  </div>
                  <button
                    type="button"
                    className="ficha-botao ficha-botao-claro !min-h-[40px] !px-3 text-sm"
                    disabled={temp}
                    aria-label={`Apagar ${i.title}`}
                    onClick={() => roda({ remove: i.id }, () => apagarItem(i.id))}
                  >
                    Apagar
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  <label className="flex items-center gap-2">
                    <span className="ficha-rotulo">Status</span>
                    <select
                      className="ficha-campo !min-h-[40px] !py-1 text-sm"
                      value={i.status}
                      disabled={temp}
                      onChange={(e) => {
                        const status = e.target.value as StatusItem;
                        roda({ id: i.id, mudar: { status } }, () => statusItem(i.id, status));
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
                    <span className="ficha-rotulo">Nota</span>
                    <select
                      className="ficha-campo !min-h-[40px] !py-1 text-sm"
                      value={i.rating ?? ""}
                      disabled={temp}
                      onChange={(e) => {
                        const rating = e.target.value ? Number(e.target.value) : null;
                        roda({ id: i.id, mudar: { rating } }, () => notaItem(i.id, rating));
                      }}
                    >
                      <option value="">—</option>
                      {[1, 2, 3, 4, 5].map((n) => (
                        <option key={n} value={n}>
                          {"★".repeat(n)}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
