"use client";

import { useState } from "react";
import Link from "next/link";
import { TEXTOS } from "@/lib/fanzine/config";
import type { DeducaoFeita, VisaoCapitulo } from "@/lib/fanzine/tipos";
import { IconeCheck } from "./Icones";

type Props = {
  visao: VisaoCapitulo;
  deducoes: DeducaoFeita[];
  resolvida: boolean;
  logado: boolean;
  faltou: string[] | null;
  ocupado: boolean;
  onResponder: (respostas: Record<string, string>) => void;
};

const T = TEXTOS.pergunta;

/** Pergunta do capítulo: uma escolha por parte (quem, onde, por quê). Errar não pune: mostra o que faltou. */
export function Pergunta({ visao, deducoes, resolvida, logado, faltou, ocupado, onResponder }: Props) {
  const [resp, setResp] = useState<Record<string, string>>({});
  const [avisoVazio, setAvisoVazio] = useState(false);
  const partes = visao.pergunta.partes;

  return (
    <section aria-labelledby="pergunta" className="flex flex-col gap-4">
      <h2 id="pergunta" className="m-0 text-2xl font-semibold">
        {T.titulo}
      </h2>
      <p className="m-0 text-lg">{visao.pergunta.enunciado}</p>

      {deducoes.length > 0 && (
        <details className="surface-vidro p-3">
          <summary className="min-h-11 cursor-pointer py-2 text-sm font-semibold">
            {TEXTOS.quadro.deducoes} ({deducoes.length})
          </summary>
          <ul className="m-0 flex list-none flex-col gap-2 p-0 text-sm">
            {deducoes.map((d) => (
              <li key={d.id} className="flex items-start gap-2">
                <IconeCheck /> {d.texto}
              </li>
            ))}
          </ul>
        </details>
      )}

      {resolvida && (
        <div role="status" className="surface-vidro flex flex-col gap-2 border-l-4 border-laranja p-4">
          <p className="m-0 inline-flex items-center gap-2 text-xl font-semibold">
            <IconeCheck /> {T.resolvida}
          </p>
          <p className="m-0 text-areia">{logado ? T.resolvidaTexto : T.resolvidaSemConta}</p>
          <p className="m-0 font-ficha text-sm">{visao.selo.nome}</p>
          {!logado && (
            <Link href="/cadastro" className="btn h-11 self-start bg-laranja px-4 text-noite no-underline">
              {TEXTOS.conta.botao}
            </Link>
          )}
        </div>
      )}

      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (partes.some((p) => !resp[p.id])) return setAvisoVazio(true);
          setAvisoVazio(false);
          onResponder(resp);
        }}
      >
        {partes.map((p) => (
          <fieldset key={p.id} className="m-0 flex flex-col gap-2 border-0 p-0">
            <legend className="mb-1 text-base font-semibold">{p.rotulo}</legend>
            {p.opcoes.map((o) => (
              <label key={o.id} className="surface-vidro flex min-h-11 cursor-pointer items-center gap-3 px-3 py-2 has-[:checked]:outline has-[:checked]:outline-2 has-[:checked]:outline-creme">
                <input type="radio" name={p.id} value={o.id} checked={resp[p.id] === o.id} onChange={() => setResp({ ...resp, [p.id]: o.id })} className="size-5 accent-[#dd5d05]" />
                <span>{o.texto}</span>
              </label>
            ))}
          </fieldset>
        ))}
        <div role="status" aria-live="polite" className="flex flex-col gap-2">
          {avisoVazio && <p className="m-0 text-laranja-claro">{T.preencha}</p>}
          {faltou && !resolvida && (
            <div className="surface-vidro p-3 text-sm">
              <p className="m-0 font-semibold">{faltou.length > 0 ? T.faltouTitulo : T.faltouGenerico}</p>
              {faltou.length > 0 && (
                <ul className="m-0 mt-1 list-disc pl-5">
                  {faltou.map((f) => (
                    <li key={f}>{f}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
        <button type="submit" className="btn h-12 self-start bg-laranja px-8 text-noite" disabled={ocupado}>
          {T.responder}
        </button>
      </form>
    </section>
  );
}
