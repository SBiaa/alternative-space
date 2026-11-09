"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { JogoArte } from "./JogoArte";
import { hrefJogo, jogos, lerRecorde, tipos, type Jogo, type Tipo } from "@/lib/jogos";

// Recordes salvos no navegador. Só existem depois de montar, então começa vazio.
function useRecordes() {
  const [recordes, setRecordes] = useState<Record<string, number>>({});
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage só existe no navegador
    setRecordes(Object.fromEntries(jogos.map((j) => [j.slug, lerRecorde(j)])));
  }, []);
  return recordes;
}

const textoRecorde = (j: Jogo, n: number) => (j.recorde && n > 0 ? `recorde: ${j.recorde.formato(n)}` : null);

export function Fliperama() {
  const recordes = useRecordes();
  const [filtro, setFiltro] = useState<Tipo | null>(null);
  const jogados = jogos.filter((j) => (recordes[j.slug] ?? 0) > 0);
  const lista = filtro ? jogos.filter((j) => j.tipo === filtro) : jogos;
  const tiposUsados = tipos.filter((t) => jogos.some((j) => j.tipo === t));

  return (
    <>
      {jogados.length > 0 && (
        <section aria-labelledby="continue" className="flex flex-col gap-3.5">
          <h2 id="continue" className="text-[22px] font-semibold">Continue jogando</h2>
          <ul className="grid list-none grid-cols-[repeat(auto-fit,minmax(min(280px,100%),1fr))] gap-3.5 p-0">
            {jogados.map((j) => (
              <li key={j.slug}>
                <Link href={hrefJogo(j.slug)} className="card flex items-center gap-3 p-3 text-creme no-underline hover:!border-creme/40">
                  <JogoArte jogo={j} className="size-16 shrink-0 rounded-md" />
                  <span className="flex min-w-0 flex-col gap-0.5">
                    <span className="text-base font-semibold">{j.nome}</span>
                    <span className="font-ficha text-[11px] text-laranja-claro">{textoRecorde(j, recordes[j.slug])}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="todos-jogos" className="flex flex-col gap-3.5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="todos-jogos" className="text-[22px] font-semibold">Todos os jogos</h2>
          <div role="group" aria-label="Filtrar por tipo" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0">
            <Chip ativo={filtro === null} onClick={() => setFiltro(null)}>Todos</Chip>
            {tiposUsados.map((t) => (
              <Chip key={t} ativo={filtro === t} onClick={() => setFiltro(t)}>{t}</Chip>
            ))}
          </div>
        </div>
        <ul className="grid list-none grid-cols-2 gap-2.5 p-0 sm:grid-cols-[repeat(auto-fill,minmax(200px,1fr))] sm:gap-3.5">
          {lista.map((j) => (
            <li key={j.slug}>
              <Link href={hrefJogo(j.slug)} className="card flex h-full flex-col overflow-hidden text-creme no-underline hover:!border-creme/40">
                <JogoArte jogo={j} className="aspect-square" />
                <span className="flex flex-col gap-0.5 p-2.5 sm:p-3">
                  <span className="text-[15px] font-semibold leading-tight">{j.nome}</span>
                  {textoRecorde(j, recordes[j.slug] ?? 0) ? (
                    <span className="font-ficha text-[10px] text-laranja-claro">{textoRecorde(j, recordes[j.slug])}</span>
                  ) : (
                    <span className="font-ficha text-[10px] uppercase text-poeira">{j.tipo}</span>
                  )}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}

function Chip({ ativo, onClick, children }: { ativo: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={ativo}
      className={`shrink-0 cursor-pointer whitespace-nowrap rounded px-3 py-2.5 text-sm ${
        ativo ? "border border-laranja-claro bg-laranja-claro font-semibold text-noite" : "border border-creme/35 font-medium text-creme hover:bg-creme/8"
      }`}
    >
      {children}
    </button>
  );
}
