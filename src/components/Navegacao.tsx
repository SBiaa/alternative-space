"use client";

import Link from "next/link";
import { useState } from "react";

import { ComCaminho } from "./ComCaminho";
import { ativo, type ItemMenu } from "@/lib/menu";

// Menu principal: links no meio do cabeçalho e, no celular, uma gaveta com o que não cabe nas abas de baixo.
// Logado, os links ficam numa barra com a página atual destacada.
type Props = { links: ItemMenu[]; mais: ItemMenu[]; logado: boolean; entrar: boolean; children: React.ReactNode };

export function Navegacao({ links, mais, logado, entrar, children }: Props) {
  const [aberto, setAberto] = useState(false);
  const fechar = () => setAberto(false);

  return (
    <>
      <nav
        aria-label="Principal"
        className={
          logado
            ? "hidden flex-wrap gap-1 rounded-lg border border-creme/15 bg-creme/6 p-1 text-sm font-medium lg:flex"
            : "hidden flex-1 justify-center gap-x-6 text-[15px] font-medium lg:flex"
        }
      >
        <ComCaminho render={(path) => links.map((l) => {
          const atual = ativo(path, l);
          return (
            <Link
              key={l.href}
              href={l.href}
              aria-current={atual ? "page" : undefined}
              className={
                logado
                  ? `rounded-md px-3.5 py-2 no-underline ${atual ? "bg-laranja-claro text-noite" : "text-areia hover:text-creme"}`
                  : `py-3 no-underline ${atual ? "text-laranja-claro" : "text-areia hover:text-creme"}`
              }
            >
              {l.label}
            </Link>
          );
        })} />
      </nav>

      <div className="flex shrink-0 items-center gap-2">
        {children}
        <button
          type="button"
          onClick={() => setAberto((a) => !a)}
          aria-expanded={aberto}
          aria-controls="menu-celular"
          aria-label={aberto ? "Fechar menu" : "Abrir menu"}
          className="flex size-11 cursor-pointer items-center justify-center rounded-md border border-creme/35 bg-creme/8 lg:hidden"
        >
          {aberto ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ece3be" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M5 5l14 14M19 5L5 19" /></svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ece3be" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h10" /></svg>
          )}
        </button>
      </div>

      {aberto && (
        <nav id="menu-celular" aria-label="Menu" className="absolute inset-x-0 top-full z-20 border-b border-creme/20 bg-cabine px-5 pb-5 pt-2 lg:hidden">
          <div className="flex flex-col">
            <ComCaminho render={(path) => [...links, ...mais].map((l, i) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={fechar}
                aria-current={ativo(path, l) ? "page" : undefined}
                className="flex items-center justify-between border-b border-creme/12 py-3.5 text-xl font-medium text-creme no-underline"
              >
                {l.label}
                <span className="font-ficha text-[11px] text-laranja-claro">{String(i + 1).padStart(2, "0")}</span>
              </Link>
            ))} />
          </div>
          {entrar && (
            <Link href="/entrar" onClick={fechar} className="btn btn-fantasma mt-4 block text-center">
              Já tenho conta, entrar
            </Link>
          )}
        </nav>
      )}
    </>
  );
}
