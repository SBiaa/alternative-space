import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ModerarPico } from "@/components/role/DenunciarPico";
import { requireAdmin } from "@/lib/auth/admin";
import { TEXTOS } from "@/lib/role/config";
import { entradasTop1, picosDenunciados } from "@/lib/role/dados";
import { miniaturaDataUri } from "@/lib/role/miniatura";

export const metadata: Metadata = { title: TEXTOS.admin.titulo, robots: { index: false } };

// Cores da miniatura: mesmos valores dos tokens Cozy (noite, creme-escuro, creme, linha forte).
const MINI = { fundo: "#01121e", peca: "#e3d8ac", grind: "#ece3be", linha: "#4f5d66" };

export default function Page() {
  return (
    <section className="px-4 pb-16 pt-6 sm:px-6">
      <div className="mx-auto flex max-w-[1100px] flex-col gap-4">
        <Link href="/admin" className="etiqueta text-[11px] text-laranja-claro no-underline">
          ← Painel
        </Link>
        <h1 className="m-0 text-3xl font-semibold">{TEXTOS.admin.titulo}</h1>
        <Suspense fallback={<p className="text-areia">{TEXTOS.pagina.carregando}</p>}>
          <Lista />
        </Suspense>
      </div>
    </section>
  );
}

async function Lista() {
  await requireAdmin("/admin/role-noturno");
  const picos = await picosDenunciados();
  if (picos.length === 0) return <p className="text-areia">{TEXTOS.admin.vazio}</p>;
  const entradas = await Promise.all(picos.map((p) => (p.entradasTop1 ? entradasTop1(p.id) : Promise.resolve(null))));
  return (
    <ul className="m-0 flex list-none flex-col gap-3 p-0">
      {picos.map((p, i) => (
        <li key={p.id} className="surface-vidro flex flex-col gap-3 p-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="m-0 text-xl font-semibold">{p.title}</h2>
            <span className="font-ficha text-sm text-laranja-claro">{TEXTOS.admin.denuncias(p.total)}</span>
          </div>
          <p className="m-0 font-ficha text-xs text-areia">{TEXTOS.pico.por(p.criador)}</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={miniaturaDataUri(p.layout, MINI)} alt="" className="aspect-[4/1] w-full rounded-md object-cover" />
          <ul className="m-0 list-disc pl-5 text-sm">
            {p.motivos.map((m, j) => (
              <li key={j}>
                {m.reason} <span className="font-ficha text-xs text-areia">{new Date(m.created_at).toLocaleString("pt-BR")}</span>
              </li>
            ))}
          </ul>
          {entradas[i] && (
            <details className="text-sm">
              <summary className="min-h-11 cursor-pointer content-center">{TEXTOS.admin.entradas(entradas[i].inputs.length)}</summary>
              <p className="m-0 font-ficha text-xs">
                {TEXTOS.pico.pontos(entradas[i].score)} · {(entradas[i].durationMs / 1000).toFixed(1)}s
              </p>
              <pre className="max-h-64 overflow-auto rounded-md bg-noite p-2 font-ficha text-xs">{entradas[i].inputs.map((e) => `${e.t} ${e.a}`).join(String.fromCharCode(10))}</pre>
            </details>
          )}
          <div className="flex flex-wrap items-center gap-3">
            <ModerarPico id={p.id} status={p.status} />
            {p.slug && (
              <Link href={`/jogos/role-noturno/pico/${p.slug}`} className="text-sm text-laranja-claro">
                {TEXTOS.admin.ver}
              </Link>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
