import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ModerarSpot } from "@/components/skate/ModerarSpot";
import { requireAdmin } from "@/lib/auth/admin";
import { spotsPendentes } from "@/lib/skate/dados";
import { linkComoChegar, NOME_TIPO } from "@/lib/skate/tipos";

export const metadata: Metadata = { title: "Picos pendentes · Skate Universe", robots: { index: false } };

export default function Page() {
  return (
    <section className="px-4 pb-16 pt-6 sm:px-6">
      <div className="mx-auto flex max-w-[1100px] flex-col gap-4">
        <Link href="/admin" className="etiqueta text-[11px] text-laranja-claro no-underline">← Painel</Link>
        <h1 className="m-0 text-3xl font-semibold">Picos pendentes do Skate Universe</h1>
        <Suspense fallback={<p className="text-areia">Carregando…</p>}>
          <Lista />
        </Suspense>
      </div>
    </section>
  );
}

async function Lista() {
  await requireAdmin("/admin/skate");
  const spots = await spotsPendentes();
  if (spots.length === 0) return <p className="text-areia">Nenhum pico esperando aprovação.</p>;
  return (
    <ul className="m-0 flex list-none flex-col gap-3 p-0">
      {spots.map((s) => (
        <li key={s.id} className="surface-vidro flex flex-col gap-2 p-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="m-0 text-xl font-semibold">{s.nome}</h2>
            <span className="font-ficha text-sm text-laranja-claro">{NOME_TIPO[s.tipo]} · {s.cidade}</span>
          </div>
          <p className="m-0 font-ficha text-xs text-areia">
            Por {s.nomeDescobridor} em {new Date(s.createdAt).toLocaleString("pt-BR")} ·{" "}
            <a href={linkComoChegar(s.lat, s.lng)} target="_blank" rel="noopener noreferrer" className="underline">ver no mapa</a>
          </p>
          {s.obstaculos.length > 0 && <p className="m-0 text-sm">Tem: {s.obstaculos.join(", ")}</p>}
          {s.descricao && <p className="m-0 whitespace-pre-line text-sm text-areia">{s.descricao}</p>}
          <ModerarSpot id={s.id} />
        </li>
      ))}
    </ul>
  );
}
