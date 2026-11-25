"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Acoes, Magia, Talento } from "@/lib/fichas/pf2e/tipos";

const NOME_ACOES: Record<NonNullable<Acoes>, string> = { "1": "◆", "2": "◆◆", "3": "◆◆◆", reacao: "⟲", livre: "◇", "1a3": "◆ a ◆◆◆" };
const NOME_PROF: Record<string, string> = { treinado: "treinado", especialista: "especialista", mestre: "mestre", lendario: "lendário" };

type Entrada = Talento | Magia;
const ehTalento = (e: Entrada): e is Talento => "tipo" in e;

function detalhe(e: Entrada): string {
  if (ehTalento(e)) {
    return [`Nível ${e.nivel}`, e.pericia && `${e.pericia.id} ${NOME_PROF[e.pericia.prof] ?? e.pericia.prof}`, e.preRequisitos && `Requer: ${e.preRequisitos}`]
      .filter(Boolean)
      .join(" · ");
  }
  return [e.nivel === 0 ? "Truque" : `${e.nivel}º círculo`, e.alcance, e.alvo, e.defesa && `defesa: ${e.defesa}`, e.duracao].filter(Boolean).join(" · ");
}

export function Acoes({ a }: { a?: Acoes }) {
  if (!a) return null;
  return (
    <span className="font-ficha text-[12px] text-laranja" title="Ações">
      {NOME_ACOES[a]}
    </span>
  );
}

// Descrição curta do que foi escolhido, quando o nome está no catálogo.
export function Descricao({ e }: { e?: Entrada }) {
  if (!e) return null;
  return (
    <span className="text-[13px] leading-snug text-tinta">
      <Acoes a={e.acoes} /> {e.texto}
      {!ehTalento(e) && e.ampliado && <span className="block font-ficha text-[11px] text-neutro">Ampliado: {e.ampliado}</span>}
    </span>
  );
}

// Botão que abre a busca no catálogo e devolve o nome escolhido.
export function BotaoCatalogo({ titulo, itens, escolhidos = [], onEscolher }: {
  titulo: string;
  itens: Entrada[];
  escolhidos?: string[];
  onEscolher: (nome: string) => void;
}) {
  const [aberto, setAberto] = useState(false);
  if (itens.length === 0) return null;
  return (
    <>
      <button type="button" onClick={() => setAberto(true)} className="self-start font-ficha text-[12px] font-bold text-azul underline no-print">
        📖 Catálogo ({itens.length})
      </button>
      {aberto && (
        <Janela
          titulo={titulo}
          itens={itens}
          escolhidos={escolhidos}
          onFechar={() => setAberto(false)}
          onEscolher={(n) => {
            onEscolher(n);
            setAberto(false);
          }}
        />
      )}
    </>
  );
}

const normal = (s: string) => s.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");

function Janela({ titulo, itens, escolhidos, onEscolher, onFechar }: {
  titulo: string;
  itens: Entrada[];
  escolhidos: string[];
  onEscolher: (nome: string) => void;
  onFechar: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [busca, setBusca] = useState("");
  useEffect(() => {
    const d = ref.current;
    d?.showModal();
    return () => d?.close();
  }, []);
  const termo = normal(busca.trim());
  const visiveis = useMemo(() => itens.filter((e) => !termo || normal(`${e.nome} ${e.texto}`).includes(termo)), [itens, termo]);
  return (
    <dialog ref={ref} onClose={onFechar} className="m-auto max-h-[88vh] w-[min(720px,calc(100vw-24px))] rounded-2xl border-2 border-noite bg-creme-claro p-0 text-noite">
      <div className="sticky top-0 z-10 flex flex-col gap-2 border-b-2 border-noite bg-creme-claro p-4">
        <div className="flex items-center justify-between gap-3">
          <h3 className="m-0 font-titulo text-xl font-bold">{titulo}</h3>
          <button type="button" onClick={onFechar} className="rounded-full border-2 border-noite px-3 py-1 font-titulo font-bold">
            Fechar
          </button>
        </div>
        <input autoFocus value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar pelo nome ou efeito…" className="rounded-lg border-2 border-noite bg-creme px-3 py-2 text-base" />
      </div>
      <ul className="flex list-none flex-col gap-2 p-4">
        {visiveis.length === 0 && <li className="text-tinta">Nada encontrado. Dá pra digitar o nome à mão no campo.</li>}
        {visiveis.map((e) => {
          const ja = escolhidos.includes(e.nome);
          return (
            <li key={e.id}>
              <button
                type="button"
                onClick={() => onEscolher(e.nome)}
                className={`flex w-full flex-col gap-1 rounded-xl border-2 border-noite p-3 text-left ${ja ? "bg-laranja-claro" : "bg-creme hover:bg-creme-escuro"}`}
              >
                <span className="flex flex-wrap items-baseline gap-2">
                  <span className="font-titulo text-lg font-bold leading-tight">{e.nome}</span>
                  <Acoes a={e.acoes} />
                  {ja && <span className="font-ficha text-[11px] text-noite">já na ficha</span>}
                </span>
                <span className="font-ficha text-[11px] text-azul">{detalhe(e)}</span>
                <span className="text-[14px] leading-snug text-tinta">{e.texto}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </dialog>
  );
}
