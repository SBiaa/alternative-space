"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { lerBestiario, type EntradaBestiario } from "@/app/actions/assombracoes";
import { TEXTOS } from "@/lib/assombracoes/config";
import { Criatura } from "./arte";
import { AvisoConta } from "./pecas";
import { resolucoesDoNavegador } from "./useVila";

type Estado = { carregado: boolean; logado: boolean; entradas: EntradaBestiario[]; total: number };

/** Criaturas conhecidas, com arte própria. As que faltam aparecem só como sombra, sem nome (não entrega o próximo caso). */
export function Bestiario() {
  const T = TEXTOS;
  const [s, setS] = useState<Estado>({ carregado: false, logado: false, entradas: [], total: 0 });
  useEffect(() => {
    let vivo = true;
    lerBestiario(resolucoesDoNavegador())
      .then((r) => vivo && setS({ carregado: true, ...r }))
      .catch(() => vivo && setS((a) => ({ ...a, carregado: true })));
    return () => {
      vivo = false;
    };
  }, []);

  if (!s.carregado) return <p className="text-areia" role="status">{T.conferindo}</p>;
  const faltam = Math.max(0, s.total - s.entradas.length);
  return (
    <div className="flex flex-col gap-4">
      <p className="m-0 font-ficha text-sm text-laranja-claro">{T.conhecidas(s.entradas.length, s.total)}</p>
      {s.entradas.length === 0 && <p className="m-0 text-areia">{T.bestiarioVazio}</p>}
      <ul className="m-0 grid list-none gap-3 p-0 sm:grid-cols-2 lg:grid-cols-3">
        {s.entradas.map((e) => (
          <li key={e.criatura} className="surface-vidro flex flex-col gap-2 p-4">
            <Criatura slug={e.criatura} className="w-full max-w-[200px] self-center" />
            <h2 className="m-0 text-xl font-semibold text-creme">{e.nome}</h2>
            <p className="m-0 text-sm text-areia">{e.resumo}</p>
            <Link href={`/jogos/assombracoes/caso/${e.caso}`} className="text-sm text-laranja-claro underline">{T.origemTitulo}</Link>
          </li>
        ))}
        {Array.from({ length: faltam }, (_, i) => (
          <li key={`falta-${i}`} className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-creme/30 p-4">
            <Criatura slug="desconhecida" silhueta className="w-full max-w-[200px]" />
            <p className="m-0 text-sm text-areia">{T.bestiarioDesconhecida}</p>
          </li>
        ))}
      </ul>
      {!s.logado && s.entradas.length > 0 && <AvisoConta />}
    </div>
  );
}
