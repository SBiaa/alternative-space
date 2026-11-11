"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

export type Produto = { name: string; type: string; fandom: string; price: string; image: string; alt: string };

const chip = "cursor-pointer rounded border px-3.5 py-2.5 text-sm";

// Grade da loja na home, com filtro por tipo de peça e por fandom.
export function Vitrine({ produtos }: { produtos: Produto[] }) {
  const [filtro, setFiltro] = useState("Tudo");
  const filtros = ["Tudo", ...new Set(produtos.map((p) => p.type + "s")), ...new Set(produtos.map((p) => p.fandom))];
  const visiveis = produtos.filter((p) => filtro === "Tudo" || p.type + "s" === filtro || p.fandom === filtro);

  return (
    <>
      <div role="group" aria-label="Filtrar produtos" className="flex flex-wrap gap-2">
        {filtros.map((f) => (
          <button
            key={f}
            type="button"
            aria-pressed={filtro === f}
            onClick={() => setFiltro(f)}
            className={`${chip} ${filtro === f ? "border-laranja-claro bg-laranja-claro font-semibold text-noite" : "border-creme/40 font-medium text-creme hover:border-creme/70"}`}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-4">
        {visiveis.map((p) => (
          <Link key={p.name} href="/colecoes" className="surge card flex flex-col overflow-hidden text-creme no-underline hover:border-creme/40">
            <div className="relative aspect-square bg-white">
              <Image src={p.image} alt={p.alt} fill sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw" className="object-cover" />
            </div>
            <div className="flex flex-col gap-1 px-4 py-3.5">
              <span className="etiqueta !text-[11px] text-laranja-claro">{p.type} · {p.fandom}</span>
              <div className="flex justify-between gap-2">
                <span className="text-base font-semibold">{p.name}</span>
                <span className="shrink-0 font-ficha text-[13px] text-laranja-claro">R$ {p.price}</span>
              </div>
            </div>
          </Link>
        ))}
        <Link href="/colecoes" className="surge flex min-h-[260px] flex-col items-start justify-center gap-2.5 rounded-lg border-[1.5px] border-dashed border-laranja-claro p-6 text-creme no-underline hover:bg-creme/5">
          <span className="etiqueta text-laranja-claro">Armazém completo</span>
          <span className="text-[22px] font-semibold leading-[1.2]">Ver todas as peças e canecas</span>
          <span className="etiqueta text-laranja-claro">Ir pra loja →</span>
        </Link>
      </div>
    </>
  );
}
