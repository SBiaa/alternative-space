import Link from "next/link";
import type { Status } from "@/lib/diario/regras";
import { XP_MAX } from "@/lib/diario/regras";

// Peças visuais do Diário de Bordo (sem estado).

export function FichaCaixa({ titulo, id, children, className = "" }: { titulo?: React.ReactNode; id?: string; children: React.ReactNode; className?: string }) {
  return (
    <section aria-labelledby={titulo && id ? id : undefined} className={`ficha-caixa p-4 ${className}`}>
      {titulo && (
        <h2 id={id} className="diario-titulo mb-3 text-xl">
          {titulo}
        </h2>
      )}
      {children}
    </section>
  );
}

export const STATUS_INFO: Record<Status, { simbolo: string; nome: string; cor: string }> = {
  open: { simbolo: "○", nome: "Aberta", cor: "#ffffff" },
  done: { simbolo: "✓", nome: "Concluída", cor: "#cfe8c4" },
  moved: { simbolo: "→", nome: "Passou pra frente", cor: "#d6deec" },
  dropped: { simbolo: "✕", nome: "Desisti", cor: "#e4e1d6" },
  urgent: { simbolo: "!", nome: "Urgente", cor: "#f2a66e" },
};

export function StatusPill({ status }: { status: Status }) {
  if (status === "open") return null;
  const s = STATUS_INFO[status];
  return (
    <span className="ficha-rotulo inline-flex shrink-0 items-center gap-1 rounded-full border-2 border-noite px-2 py-0.5 !text-[11px] !tracking-normal" style={{ background: s.cor }}>
      <span aria-hidden>{s.simbolo}</span> {s.nome}
    </span>
  );
}

export function BarraXP({ pontos }: { pontos: number }) {
  return (
    <div>
      <p className="ficha-rotulo mb-2" id="xp-rotulo">
        XP do mês · {pontos}/{XP_MAX}
      </p>
      <div role="meter" aria-labelledby="xp-rotulo" aria-valuemin={0} aria-valuemax={XP_MAX} aria-valuenow={pontos} className="grid grid-cols-10 gap-1">
        {Array.from({ length: XP_MAX }, (_, i) => (
          <span key={i} className={`h-6 rounded-[4px] border-2 border-noite ${i < pontos ? "bg-laranja" : "bg-white"}`} />
        ))}
      </div>
    </div>
  );
}

export function Migalhas({ itens }: { itens: { href?: string; label: string }[] }) {
  return (
    <nav aria-label="Caminho" className="ficha-rotulo mb-4 flex flex-wrap items-center gap-x-2 gap-y-1">
      {itens.map((it, i) => (
        <span key={i} className="flex items-center gap-2">
          {i > 0 && <span aria-hidden>/</span>}
          {it.href ? (
            <Link href={it.href} className="inline-block py-2 underline underline-offset-4 hover:text-azul">
              {it.label}
            </Link>
          ) : (
            <span aria-current="page">{it.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}

export function LinkFicha({ href, children, className = "" }: { href: string; children: React.ReactNode; className?: string }) {
  return (
    <Link href={href} className={`ficha-caixa inline-flex min-h-[44px] items-center justify-center px-3 py-2 font-ficha text-sm hover:bg-[#fffbe8] ${className}`}>
      {children}
    </Link>
  );
}
