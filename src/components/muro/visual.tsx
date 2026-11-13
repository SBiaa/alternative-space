"use client";

// Peças visuais compartilhadas: adesivos, tag, croqui a lápis, barra de progresso e a leitura de cores do tema.

import type { ReactNode } from "react";
import { TAMANHOS } from "@/lib/muro/config";
import { TEXTOS } from "@/lib/muro/conteudo";
import { alturaUn, templatePorSlug } from "@/lib/muro/templates";
import type { Autorizacao, CorId, Forma, Job, Linha, Tag, Template } from "@/lib/muro/tipos";
import { Icone } from "./Icone";

/** Cada cor de tinta vem de um token CSS do tema (nunca um valor solto no componente). */
export const VAR_COR: Record<CorId, string> = {
  laranja: "var(--color-laranja)",
  azul: "var(--color-azul)",
  creme: "var(--color-creme)",
  tijolo: "var(--color-tijolo)",
  preto: "var(--color-noite)",
};
export const corCss = (c: CorId, el?: Element | null) => {
  if (typeof window === "undefined") return "#000";
  const nome = VAR_COR[c].slice(4, -1);
  return getComputedStyle(el ?? document.documentElement).getPropertyValue(nome).trim() || "#000";
};
export const brl = (v: number) => `R$ ${Math.round(v).toLocaleString("pt-BR")}`;

export function Adesivo({ tipo, children }: { tipo: "autorizado" | "falta" | "recusado" | "chuva" | "fresca" | "revisao" | "pronta"; children?: ReactNode }) {
  const icone = { autorizado: "check", falta: "cadeado", recusado: "alerta", chuva: "nuvem", fresca: "gota", revisao: "lapis", pronta: "check" }[tipo];
  const texto = children ?? TEXTOS.adesivos[tipo];
  return (
    <span className="muro-adesivo" data-tipo={tipo === "fresca" || tipo === "revisao" || tipo === "pronta" ? undefined : tipo}>
      <Icone nome={icone} tam={13} />
      {texto}
    </span>
  );
}
export const AdesivoAuth = ({ auth, revisao }: { auth: Autorizacao; revisao?: boolean }) =>
  revisao ? <Adesivo tipo="revisao" /> : <Adesivo tipo={auth} />;

export function Tag({ tag, className, cor = "currentColor" }: { tag: Tag; className?: string; cor?: string }) {
  return (
    <svg viewBox={`0 0 ${tag.viewBox[0]} ${tag.viewBox[1]}`} className={className} fill="none" stroke={cor} strokeWidth={3.2} strokeLinecap="round" strokeLinejoin="round" role="img" aria-label="Sua tag">
      {tag.paths.map((d, i) => <path key={i} d={d} />)}
    </svg>
  );
}

const caminho = (f: Forma): string => {
  if (f.t === "rect") return `M${f.x} ${f.y}h${f.w}v${f.h}h${-f.w}Z`;
  if (f.t === "elipse") return `M${f.cx - f.rx} ${f.cy}a${f.rx} ${f.ry} 0 1 0 ${f.rx * 2} 0a${f.rx} ${f.ry} 0 1 0 ${-f.rx * 2} 0Z`;
  return `M${f.p.map((q) => q.join(" ")).join("L")}Z`;
};
const linhaPath = (l: Linha) => `M${l.p.map((q) => q.join(" ")).join("L")}${l.fechada ? "Z" : ""}`;

/** O layout do mural em SVG: contorno, preenchimento e detalhe, na escala do muro. */
export function DesenhoMural({ t, cores, tag, tagDestaque, camadas = ["preenchimento", "contorno", "detalhe"], className, lapis = false }: {
  t: Template; cores?: [CorId, CorId, CorId]; tag?: Tag; tagDestaque?: boolean; camadas?: ("preenchimento" | "contorno" | "detalhe")[]; className?: string; lapis?: boolean;
}) {
  const H = alturaUn(t.size);
  const traco = lapis ? "var(--mural-ink)" : undefined;
  const slot = tagDestaque ? t.slots.tagGrande : t.slots.tag;
  const c = cores ?? (["creme", "laranja", "preto"] as [CorId, CorId, CorId]);
  return (
    <svg viewBox={`0 0 100 ${H}`} className={className} role="img" aria-label={`Desenho do mural ${t.nome}`} preserveAspectRatio="xMidYMid meet">
      {camadas.includes("preenchimento") && t.layers.preenchimento.map((f, i) => (
        <path key={`p${i}`} d={caminho(f)} fill={lapis ? "none" : VAR_COR[c[1]]} stroke={lapis ? traco : "none"} strokeWidth={0.8} strokeDasharray={lapis ? "2 1.4" : undefined} opacity={lapis ? 0.7 : 1} />
      ))}
      {camadas.includes("contorno") && t.layers.contorno.map((l, i) => (
        <path key={`c${i}`} d={linhaPath(l)} fill="none" stroke={lapis ? traco : VAR_COR[c[2]]} strokeWidth={lapis ? 0.7 : 1.2} strokeLinecap="round" strokeLinejoin="round" opacity={lapis ? 0.85 : 1} />
      ))}
      {camadas.includes("detalhe") && t.layers.detalhe.map((f, i) => (
        <path key={`d${i}`} d={caminho(f)} fill={lapis ? "none" : VAR_COR[c[2]]} stroke={lapis ? traco : "none"} strokeWidth={0.6} opacity={lapis ? 0.7 : 0.55} />
      ))}
      {tag && (
        <svg x={slot.x} y={slot.y} width={slot.w} height={slot.h} viewBox={`0 0 ${tag.viewBox[0]} ${tag.viewBox[1]}`} preserveAspectRatio="xMidYMid meet" fill="none" stroke={lapis ? "var(--mural-tijolo)" : VAR_COR[c[2]]} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
          {tag.paths.map((d, i) => <path key={i} d={d} />)}
        </svg>
      )}
    </svg>
  );
}

/** Croqui a lápis: o desenho do mural com a medida (Space Mono) e a tag em miniatura. */
export function Croqui({ job, tag, templates }: { job: Pick<Job, "modelo" | "tamanho" | "briefing">; tag: Tag; templates: Template[] }) {
  const t = templatePorSlug(job.modelo, templates);
  const cfg = TAMANHOS[job.tamanho];
  if (!t) return null;
  return (
    <figure className="m-0 flex flex-col gap-1">
      <div className="rounded-[4px] border border-dashed border-noite/50 bg-papel p-2" style={{ aspectRatio: `${cfg.larguraM} / ${cfg.alturaM}`, maxHeight: 190 }}>
        <DesenhoMural t={t} tag={tag} tagDestaque={job.briefing.tagDestaque} lapis className="h-full w-full" />
      </div>
      <figcaption className="muro-medida flex items-center justify-between text-xs">
        <span>{cfg.larguraM.toLocaleString("pt-BR")} m × {cfg.alturaM.toLocaleString("pt-BR")} m</span>
        <span className="flex items-center gap-1"><Icone nome="lapis" tam={12} />{job.briefing.tagDestaque ? TEXTOS.caderno.tagDestaque : TEXTOS.caderno.tagAssinatura}</span>
      </figcaption>
    </figure>
  );
}

export function Progresso({ valor, tom, rotulo }: { valor: number; tom?: "laranja" | "tijolo"; rotulo: string }) {
  const v = Math.max(0, Math.min(100, valor));
  return (
    <div className="muro-barra-prog" data-tom={tom} role="progressbar" aria-label={rotulo} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(v)}>
      <i style={{ width: `${v}%` }} />
    </div>
  );
}

export const PontoCor = ({ cor }: { cor: CorId }) => (
  <span aria-hidden className="inline-block h-4 w-4 rounded-full border-2 border-noite" style={{ background: VAR_COR[cor] }} />
);
