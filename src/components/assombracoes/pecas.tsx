"use client";

import Link from "next/link";
import { useId } from "react";
import { TEXTOS } from "@/lib/assombracoes/config";
import type { Desfecho } from "@/app/actions/assombracoes";

// Peças pequenas que várias telas usam: ajustes de som, aviso de conta, cartão de origem, opções.

export function Ajustes({ sons, semSustos, setSons, setSemSustos }: { sons: boolean; semSustos: boolean; setSons: (v: boolean) => void; setSemSustos: (v: boolean) => void }) {
  const T = TEXTOS;
  const item = (rotulo: string, ligado: boolean, mudar: (v: boolean) => void, ajuda?: string) => (
    <button type="button" role="switch" aria-checked={ligado} onClick={() => mudar(!ligado)} className="botao-vidro flex items-center gap-2 text-sm" title={ajuda}>
      <span>{rotulo}:</span>
      <span className="font-ficha text-xs uppercase text-laranja-claro">{ligado ? T.ligado : T.desligado}</span>
    </button>
  );
  return (
    <div className="flex flex-wrap items-center gap-2" role="group" aria-label={`${T.sons} e ${T.semSustos}`}>
      {item(T.sons, sons, setSons)}
      {item(T.semSustos, semSustos, setSemSustos, T.semSustosAjuda)}
    </div>
  );
}

export function AvisoConta() {
  const T = TEXTOS;
  return (
    <aside className="surface-vidro flex flex-col gap-2 p-4" aria-label={T.criarConta}>
      <p className="m-0 font-semibold text-creme">{T.criarConta}</p>
      <p className="m-0 text-sm text-areia">{T.criarContaTexto}</p>
      <div className="flex flex-wrap gap-2">
        <Link href="/cadastro" className="botao-laranja inline-flex items-center no-underline">{T.cadastrar}</Link>
        <Link href="/entrar" className="botao-vidro inline-flex items-center no-underline">{T.entrar}</Link>
      </div>
    </aside>
  );
}

export function CartaoOrigem({ origem }: { origem: Desfecho["origem"] }) {
  const T = TEXTOS;
  return (
    <section className="surface-vidro flex flex-col gap-3 p-5" aria-labelledby="origem-titulo">
      <span className="rotulo text-laranja-claro">{T.origemTitulo}</span>
      <h3 id="origem-titulo" className="m-0 text-2xl font-semibold text-creme">{origem.titulo}</h3>
      {origem.texto.map((t) => (
        <p key={t} className="m-0 text-creme">{t}</p>
      ))}
      {origem.fontes.length > 0 && (
        <div>
          <h4 className="m-0 mb-1 text-sm font-semibold text-areia">{T.fontes}</h4>
          <ul className="m-0 flex list-none flex-col gap-1 p-0 text-sm text-areia">
            {origem.fontes.map((f) => (
              <li key={f.titulo}>
                <span className="text-creme">{f.titulo}</span>
                {f.autor && `, ${f.autor}`}
                {f.ano && ` (${f.ano})`}
                {f.nota && <span className="block text-xs text-poeira">{f.nota}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}
      <p className="m-0 font-ficha text-xs text-poeira">{origem.revisao ? T.revisadoPor(origem.revisao.por) : T.semRevisao}</p>
    </section>
  );
}

/** Grupo de opções (radio nativo), com alvo de 44px e marca que não depende só de cor. */
export function Opcoes({ nome, legenda, opcoes, valor, onChange }: { nome: string; legenda: string; opcoes: { id: string; texto: string }[]; valor: string; onChange: (id: string) => void }) {
  const base = useId();
  return (
    <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
      <legend className="mb-1 p-0 text-lg font-semibold text-creme">{legenda}</legend>
      {opcoes.map((o) => {
        const marcada = valor === o.id;
        return (
          <label
            key={o.id}
            htmlFor={`${base}-${o.id}`}
            className={`flex min-h-11 cursor-pointer items-start gap-3 rounded-md border p-3 text-creme ${marcada ? "border-laranja-claro bg-laranja-claro/15" : "border-creme/30 bg-creme/5"} has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-3 has-[:focus-visible]:outline-laranja-claro`}
          >
            <input id={`${base}-${o.id}`} type="radio" name={`${base}-${nome}`} value={o.id} checked={marcada} onChange={() => onChange(o.id)} className="mt-1 size-5 shrink-0 accent-laranja" />
            <span>{o.texto}</span>
            {marcada && <span className="sr-only"> (escolhida)</span>}
          </label>
        );
      })}
    </fieldset>
  );
}
