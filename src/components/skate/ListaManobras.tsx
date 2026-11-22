"use client";

import Link from "next/link";
import { useState } from "react";
import { NIVEIS, NOME_NIVEL, type Manobra, type Nivel } from "@/lib/skate/tipos";

const COR: Record<Nivel, string> = {
  basico: "text-[#8fd6a4] border-[#8fd6a4]",
  intermediario: "text-[#f2c14e] border-[#f2c14e]",
  avancado: "text-[#ff8f80] border-[#ff8f80]",
};

export function SeloNivel({ nivel }: { nivel: Nivel }) {
  return <span className={`rotulo rounded border px-2 py-1 ${COR[nivel]}`}>{NOME_NIVEL[nivel]}</span>;
}

// Lista do guia com filtro por nível.
export function ListaManobras({ manobras }: { manobras: Manobra[] }) {
  const [nivel, setNivel] = useState<Nivel | "todos">("todos");
  const grupos = NIVEIS.filter((n) => nivel === "todos" || n === nivel).map((n) => ({ nivel: n, itens: manobras.filter((m) => m.nivel === n) }));

  return (
    <div className="flex flex-col gap-8">
      <div role="group" aria-label="Filtrar por nível" className="flex flex-wrap gap-2">
        {(["todos", ...NIVEIS] as const).map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setNivel(n)}
            aria-pressed={nivel === n}
            className={nivel === n ? "botao-laranja" : "botao-vidro"}
          >
            {n === "todos" ? "Todas" : NOME_NIVEL[n]}
          </button>
        ))}
      </div>
      {grupos.map((g) => (
        <section key={g.nivel} className="flex flex-col gap-3">
          <h2 className="m-0 font-titulo text-2xl font-semibold text-creme">{NOME_NIVEL[g.nivel]}</h2>
          <ol className="m-0 grid list-none gap-3 p-0 sm:grid-cols-2 lg:grid-cols-3">
            {g.itens.map((m) => (
              <li key={m.slug}>
                <Link href={`/skate/manobras/${m.slug}`} className="surface-vidro flex h-full flex-col gap-2 p-4 text-creme no-underline hover:border-laranja-claro">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-lg font-semibold">{m.nome}</span>
                    <span className="rotulo text-areia">{m.obstaculo}</span>
                  </div>
                  <span className="text-sm text-areia">{m.resumo}</span>
                </Link>
              </li>
            ))}
          </ol>
        </section>
      ))}
    </div>
  );
}
