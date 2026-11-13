import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { RiffEstelar } from "@/components/riff/RiffEstelar";
import { RiffPendente } from "@/components/riff/RiffPendente";
import { getUser } from "@/lib/auth/server";
import { ehDificuldade } from "@/lib/riff/config";
import { acharMusica, lerAjustes } from "@/lib/riff/dados";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export const metadata: Metadata = { title: "Riff Estelar" };

export default function Page({ params, searchParams }: Props) {
  return (
    <section className="bg-ceu relative px-4 pb-18 pt-4 sm:px-6 sm:pt-8">
      <div className="mx-auto flex max-w-[960px] flex-col gap-4">
        <Link href="/jogos/riff-estelar" className="etiqueta text-[11px] text-laranja-claro no-underline sm:text-xs">← Músicas</Link>
        <Suspense fallback={<p className="text-areia">Abrindo a cabine…</p>}>
          <Partida params={params} searchParams={searchParams} />
        </Suspense>
      </div>
    </section>
  );
}

async function Partida({ params, searchParams }: Props) {
  const [{ slug }, sp, user] = await Promise.all([params, searchParams, getUser()]);
  const musica = await acharMusica(slug);
  if (!musica || musica.mapas.length === 0) notFound();
  const ajustes = user ? await lerAjustes(user.id) : null;
  const ordem = ["facil", "medio", "dificil"];
  const mapas = [...musica.mapas].sort((a, b) => ordem.indexOf(a.difficulty) - ordem.indexOf(b.difficulty));
  const d = ehDificuldade(sp.d) ? sp.d : mapas[0].difficulty;
  return (
    <>
      <h1 className="sr-only">Riff Estelar: {musica.title}</h1>
      <RiffPendente logado={Boolean(user)} />
      <RiffEstelar
        musica={{ slug: musica.slug, title: musica.title, artist: musica.artist, durationMs: musica.durationMs, audioUrl: musica.audioUrl }}
        mapas={mapas}
        dificuldadeInicial={d}
        ajustesServidor={ajustes}
        logado={Boolean(user)}
      />
      <p className="m-0 text-center text-xs text-areia">
        {musica.credits} · {musica.license}
      </p>
    </>
  );
}
