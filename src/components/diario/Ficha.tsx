import Link from "next/link";
import { MESES, dois } from "@/lib/diario/calendario";
import { XP_MAX } from "@/lib/diario/regras";

// Peças visuais do Diário de Bordo no tema Cozy (sem estado).

const ESTRELA = "M12 1 C13 9 15 11 23 12 C15 13 13 15 12 23 C11 15 9 13 1 12 C9 11 11 9 12 1 Z";

/** Estrela de quatro pontas. */
export function Estrela({ acesa = true, tamanho = 18, cor = "#F2A66E" }: { acesa?: boolean; tamanho?: number; cor?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 24 24" width={tamanho} height={tamanho} className="shrink-0">
      {acesa ? <path d={ESTRELA} fill={cor} /> : <path d={ESTRELA} fill="none" stroke="rgb(236 227 190 / 0.4)" strokeWidth={1.5} />}
    </svg>
  );
}

/** XP do mês: 10 estrelas que acendem. */
export function Estrelas({ pontos, mes, tamanho = 18 }: { pontos: number; mes: number; tamanho?: number }) {
  return (
    <div role="img" aria-label={`Constelação de ${MESES[mes - 1].nome.toLowerCase()}: ${pontos} de ${XP_MAX} estrelas acesas`} className="flex flex-wrap items-center gap-1.5">
      {Array.from({ length: XP_MAX }, (_, i) => (
        <Estrela key={i} acesa={i < pontos} tamanho={tamanho} />
      ))}
    </div>
  );
}

/** Cartão grande da constelação, com o planeta da marca. */
export function Constelacao({ pontos, mes }: { pontos: number; mes: number }) {
  return (
    <div className="surface-vidro flex flex-col items-center gap-3.5 p-[18px]">
      <div aria-hidden className="size-[132px] rounded-full bg-creme p-2 shadow-[0_20px_60px_rgba(0,0,0,0.4)]">
        <svg viewBox="0 0 116 116" className="block size-[116px]">
          <circle cx="58" cy="58" r="58" fill="#072F5C" />
          <circle cx="22" cy="30" r="1.2" fill="#ECE3BE" opacity="0.7" />
          <circle cx="92" cy="24" r="1" fill="#ECE3BE" opacity="0.6" />
          <circle cx="30" cy="92" r="1" fill="#ECE3BE" opacity="0.6" />
          <ellipse cx="58" cy="62" rx="40" ry="10" fill="none" stroke="#ECE3BE" strokeWidth="2" transform="rotate(-16 58 62)" />
          <circle cx="58" cy="62" r="22" fill="#DD5D05" />
          <path d="M38 56 Q58 50 78 56" stroke="#AB392F" strokeWidth="3" fill="none" />
          <path d="M37 66 Q58 72 79 66" stroke="#F2A66E" strokeWidth="3" fill="none" />
          <path d="M88 80 C88.6 85 90 86.4 95 87 C90 87.6 88.6 89 88 94 C87.4 89 86 87.6 81 87 C86 86.4 87.4 85 88 80 Z" fill="#F2A66E" />
        </svg>
      </div>
      <div className="flex flex-col items-center gap-1 text-center">
        <span className="rotulo text-laranja-claro">Constelação de {MESES[mes - 1].nome}</span>
        <span className="text-sm text-areia">
          {pontos} de {XP_MAX} estrelas acesas
        </span>
      </div>
      <Estrelas pontos={pontos} mes={mes} />
    </div>
  );
}

/** Topo das páginas do diário: etiqueta, título, linha de apoio e ações à direita. */
export function Cabecalho({ etiqueta, titulo, apoio, children }: { etiqueta: React.ReactNode; titulo: React.ReactNode; apoio?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="flex flex-col gap-1.5">
        <span className="rotulo text-laranja-claro">{etiqueta}</span>
        <h1 className="text-[34px] font-semibold leading-[1.05] tracking-[-0.015em] sm:text-[44px]">{titulo}</h1>
        {apoio && <span className="text-base text-areia">{apoio}</span>}
      </div>
      {children && <div className="flex flex-wrap gap-2">{children}</div>}
    </div>
  );
}

export type Aba = "semana" | "mes" | "habitos" | "inventario" | "ano";

/** Abas Semana / Mês / Hábitos / Inventário / Visão do ano. `mes` é o mês da página aberta. */
export function Abas({ atual, mes, semana, soComputador = false }: { atual: Aba; mes: number; semana: number; soComputador?: boolean }) {
  const slug = MESES[mes - 1].slug;
  const abas: { id: Aba; label: string; href: string }[] = [
    { id: "semana", label: "Semana", href: semana === 0 ? "/diario/2027/pre-missao" : `/diario/2027/semana/${semana}` },
    { id: "mes", label: "Mês", href: `/diario/2027/${slug}` },
    { id: "habitos", label: "Hábitos", href: `/diario/2027/${slug}/habitos` },
    { id: "inventario", label: "Inventário", href: `/diario/2027/${slug}/inventario` },
    { id: "ano", label: "Visão do ano", href: "/diario/2027" },
  ];
  return (
    <nav aria-label="Visões do diário" className={`${soComputador ? "hidden lg:flex" : "flex"} -mx-4 gap-1 overflow-x-auto overflow-y-hidden border-b border-creme/18 px-4 sm:mx-0 sm:px-0`}>
      {abas.map((a) => (
        <Link key={a.id} href={a.href} className="aba" aria-current={a.id === atual ? "page" : undefined}>
          {a.label}
        </Link>
      ))}
    </nav>
  );
}

export function LinkVidro({ href, children, className = "", ...rest }: { href: string; children: React.ReactNode; className?: string } & Omit<React.ComponentProps<typeof Link>, "href" | "className">) {
  return (
    <Link href={href} className={`botao-vidro inline-flex items-center justify-center no-underline hover:bg-creme/14 ${className}`} {...rest}>
      {children}
    </Link>
  );
}

export function LinkLaranja({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="botao-laranja inline-flex items-center justify-center no-underline hover:brightness-105">
      {children}
    </Link>
  );
}

export const nomeSemana = (n: number) => (n === 0 ? "Pré-missão" : `Semana ${dois(n)}`);
