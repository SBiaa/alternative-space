import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { RiffEditor } from "@/components/riff/RiffEditor";
import { requireAdmin } from "@/lib/auth/admin";
import { acharMusica, listarMusicas } from "@/lib/riff/dados";

export const metadata: Metadata = { title: "Editor de mapa · Riff Estelar", robots: { index: false } };

export default function Page() {
  return (
    <section className="px-4 pb-16 pt-6 sm:px-6">
      <div className="mx-auto flex max-w-[1100px] flex-col gap-4">
        <Link href="/admin" className="etiqueta text-[11px] text-laranja-claro no-underline">← Painel</Link>
        <h1 className="m-0 text-3xl font-semibold">Editor de mapa · Riff Estelar</h1>
        <Suspense fallback={<p className="text-areia">Carregando músicas…</p>}>
          <Editor />
        </Suspense>
      </div>
    </section>
  );
}

async function Editor() {
  await requireAdmin("/admin/riff-estelar/editor");
  const lista = await listarMusicas(true);
  const musicas = (await Promise.all(lista.map((m) => acharMusica(m.slug, true)))).filter((m) => m !== null);
  if (musicas.length === 0) return <p className="text-areia">Nenhuma música cadastrada em songs.</p>;
  return (
    <RiffEditor
      musicas={musicas.map((m) => ({
        id: m.id,
        slug: m.slug,
        title: m.title,
        bpm: m.bpm,
        durationMs: m.durationMs,
        audioUrl: m.audioUrl,
        published: m.published,
        mapas: m.mapas,
      }))}
    />
  );
}
