// Peças pequenas e compartilhadas do Mar Sem Fim: arte do pirata, bandeira, rosa dos ventos, barras e chips.
import type { ReactNode } from "react";
import { svgBandeira, svgPirata } from "@/lib/mar-sem-fim/arte";
import { T, formatarNumero } from "@/lib/mar-sem-fim/textos";
import type { Aparencia, Bandeira } from "@/lib/mar-sem-fim/tipos";
import { Icone } from "./Icone";

export function PirataArte({ aparencia, className, rotulo }: { aparencia: Aparencia; className?: string; rotulo: string }) {
  return <span role="img" aria-label={rotulo} className={`[&>svg]:block [&>svg]:h-auto [&>svg]:w-full ${className ?? ""}`} dangerouslySetInnerHTML={{ __html: svgPirata(aparencia) }} />;
}

export function BandeiraArte({ bandeira, className, rotulo }: { bandeira: Bandeira; className?: string; rotulo: string }) {
  return <span role="img" aria-label={rotulo} className={`[&>svg]:block [&>svg]:h-auto [&>svg]:w-full ${className ?? ""}`} dangerouslySetInnerHTML={{ __html: svgBandeira(bandeira) }} />;
}

/** Rosa dos ventos fininha, enfeite das cartas náuticas. */
export function RosaDosVentos({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} fill="none" stroke="currentColor" strokeWidth="1" aria-hidden="true">
      <circle cx="32" cy="32" r="26" />
      <circle cx="32" cy="32" r="18" strokeDasharray="2 3" />
      <path d="M32 4l5 24 24 4-24 4-5 24-5-24L3 32l24-4z" strokeLinejoin="round" />
      <path d="M32 12l2 18 18 2-18 2-2 18-2-18-18-2 18-2z" opacity=".5" />
    </svg>
  );
}

/** Barra de casco ou de mantimentos: número escrito e role de barra de progresso, não só cor. */
export function Barra({ rotulo, valor, max, tom = "azul" }: { rotulo: string; valor: number; max: number; tom?: "azul" | "laranja" }) {
  const pct = max > 0 ? Math.round((valor / max) * 100) : 0;
  const baixo = pct <= 25;
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-baseline justify-between gap-2 text-sm">
        <span>{rotulo}</span>
        <span className="font-ficha text-xs">{valor}/{max}{baixo ? " ⚠" : ""}</span>
      </div>
      <div role="progressbar" aria-label={rotulo} aria-valuemin={0} aria-valuemax={max} aria-valuenow={valor} className="h-2.5 w-full overflow-hidden rounded-[4px] bg-black/25">
        <div className={`h-full ${baixo ? "bg-estrela" : tom === "laranja" ? "bg-laranja" : "bg-azul-claro"}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function Chip({ icone, children, rotulo }: { icone?: string; children: ReactNode; rotulo?: string }) {
  return (
    <span aria-label={rotulo} className="inline-flex items-center gap-1.5 rounded-[6px] border border-creme/20 bg-black/30 px-2.5 py-1 text-xs text-creme">
      {icone && <Icone nome={icone} tamanho={14} />}
      {children}
    </span>
  );
}

/** Ouro e recompensa em Space Mono, nos chips do topo e nas telas. */
export function Valores({ ouro, recompensa }: { ouro: number; recompensa: number }) {
  return (
    <>
      <Chip icone="moeda" rotulo={`${T.unidades.ouro}: ${ouro}`}>
        <span className="font-ficha">{formatarNumero(ouro)}</span> {T.unidades.ouro}
      </Chip>
      <Chip icone="cartaz" rotulo={`${T.unidades.recompensa}: ${recompensa}`}>
        <span className="font-ficha">{formatarNumero(recompensa)}</span>
      </Chip>
    </>
  );
}

/** Carta náutica: cartão creme com linhas de rumo finas e rosa dos ventos no canto. */
export function Carta({ children, className = "", rotuloRegiao }: { children: ReactNode; className?: string; rotuloRegiao?: string }) {
  return (
    <section aria-label={rotuloRegiao} className={`surface-creme relative overflow-hidden p-4 text-tinta sm:p-5 ${className}`}>
      <RosaDosVentos className="pointer-events-none absolute -right-5 -top-5 size-24 text-azul/15" />
      <div className="pointer-events-none absolute inset-x-4 top-0 h-px bg-azul/20" aria-hidden="true" />
      <div className="relative">{children}</div>
    </section>
  );
}
