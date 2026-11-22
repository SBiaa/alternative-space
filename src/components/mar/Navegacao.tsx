"use client";

import Link from "next/link";
import { T } from "@/lib/mar-sem-fim/textos";
import { useMar } from "./MarProvider";
import { Icone } from "./Icone";
import { Valores } from "./Pecas";

export const BASE = "/jogos/mar-sem-fim";

/** Barra de cima das telas de menu (barco, ilha, criação): voltar, atalhos e valores do pirata. */
export function NavMar({ atual }: { atual?: "mundo" | "barco" | "ilha" | "novo" }) {
  const { estado } = useMar();
  const item = (href: string, id: string, rotulo: string, icone: string) => (
    <Link
      href={href}
      aria-current={atual === id ? "page" : undefined}
      className={`inline-flex min-h-11 items-center gap-1.5 rounded-[6px] border px-3 text-sm no-underline ${atual === id ? "border-laranja-claro bg-laranja-claro/15 text-creme" : "border-creme/30 text-creme"}`}
    >
      <Icone nome={icone} tamanho={16} />
      {rotulo}
    </Link>
  );
  return (
    <nav aria-label={T.meta.titulo} className="flex flex-wrap items-center gap-2">
      <Link href={BASE} className="etiqueta mr-1 inline-flex min-h-11 items-center text-[11px] text-laranja-claro no-underline sm:text-xs">
        {T.nav.voltar}
      </Link>
      {estado && (
        <>
          {item(`${BASE}/mundo`, "mundo", T.nav.mundo, "globo")}
          {item(`${BASE}/barco`, "barco", T.nav.barco, "barco")}
          <span className="ml-auto flex flex-wrap gap-1.5">
            <Valores ouro={estado.ouro} recompensa={estado.recompensa} />
          </span>
        </>
      )}
    </nav>
  );
}

/** No modo sem conta: lembra que o pirata só está neste aparelho e convida a criar a conta. */
export function AvisoConta() {
  const { logado, estado, migracao } = useMar();
  if (migracao === "migrando") return <p role="status" className="m-0 text-sm text-areia">{T.conta.migrando}</p>;
  if (migracao === "ok") return <p role="status" className="m-0 text-sm text-ok">{T.conta.migrado}</p>;
  if (migracao === "falhou") return <p role="alert" className="m-0 text-sm text-danger">{T.conta.migracaoFalhou}</p>;
  if (logado || !estado) return null;
  const volta = encodeURIComponent(`${BASE}/mundo`);
  return (
    <div className="surface-vidro flex flex-col gap-2 p-3 text-sm text-creme">
      <p className="m-0">{T.conta.modoLocal}</p>
      <div className="flex flex-wrap gap-2">
        <Link href={`/cadastro?next=${volta}`} className="botao-laranja inline-flex items-center no-underline">
          {T.conta.guardar}
        </Link>
        <Link href={`/entrar?next=${volta}`} className="botao-vidro inline-flex items-center no-underline">
          {T.conta.entrar}
        </Link>
      </div>
    </div>
  );
}
