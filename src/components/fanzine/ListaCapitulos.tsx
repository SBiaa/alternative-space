"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { FANZINE, TEXTOS } from "@/lib/fanzine/config";
import { migrar } from "@/lib/fanzine/save";
import type { ResumoCapitulo } from "@/lib/fanzine/tipos";
import { lerLocal } from "@/lib/gestao/save";

type Andamento = Record<string, { pistas: number; resolvido: boolean }>;
const T = TEXTOS.capitulos;

/**
 * Cartões dos capítulos. Com conta o andamento vem do servidor; sem conta, do aparelho
 * (lido depois de montar, pra não diferir do HTML do servidor).
 */
export function ListaCapitulos({ capitulos, doServidor, logado }: { capitulos: ResumoCapitulo[]; doServidor: Andamento; logado: boolean }) {
  const [local, setLocal] = useState<Andamento>({});
  useEffect(() => {
    if (logado) return;
    const lido: Andamento = {};
    for (const c of capitulos) {
      const p = lerLocal(FANZINE.chaveLocal(c.slug), migrar);
      if (p) lido[c.slug] = { pistas: p.clues.length, resolvido: p.solved };
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- só dá pra ler o localStorage no navegador
    setLocal(lido);
  }, [capitulos, logado]);
  const andamento = logado ? doServidor : local;

  if (capitulos.length === 0) return <p className="m-0 text-areia">{T.vazio}</p>;
  return (
    <ul className="m-0 flex list-none flex-col gap-3 p-0">
      {capitulos.map((c) => {
        const a = andamento[c.slug];
        const estado = a?.resolvido ? T.resolvido : a ? T.emAndamento : T.novo;
        return (
          <li key={c.slug} className="surface-vidro flex flex-col gap-2 p-4">
            <p className="m-0 flex items-center gap-2 font-ficha text-xs uppercase text-areia">
              <span>Capítulo {c.ordem}</span>
              <span aria-hidden="true">·</span>
              <span>{a?.resolvido ? `✓ ${estado}` : estado}</span>
            </p>
            <h3 className="m-0 text-xl font-semibold">{c.titulo}</h3>
            <p className="m-0 text-sm text-areia">{c.resumo}</p>
            <p className="m-0 font-ficha text-sm">{T.progresso(a?.pistas ?? 0, c.totalPistas)}</p>
            <Link href={`/jogos/fanzine/${c.slug}`} className="btn h-11 self-start bg-laranja px-5 text-noite no-underline">
              {T.abrir}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
