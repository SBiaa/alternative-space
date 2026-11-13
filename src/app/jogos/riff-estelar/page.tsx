import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { RiffPendente } from "@/components/riff/RiffPendente";
import { getUser } from "@/lib/auth/server";
import { NOME_DIFICULDADE } from "@/lib/riff/config";
import { listarMusicas, recordesDe } from "@/lib/riff/dados";

export const metadata: Metadata = {
  title: "Riff Estelar",
  description: "Jogo de ritmo na cabine: estrelas caem por quatro trilhas e você acerta no tempo da música.",
};

const minutos = (ms: number) => {
  const s = Math.round(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

export default function Page() {
  return (
    <section className="bg-ceu relative px-4 pb-18 pt-5 sm:px-6 sm:pt-9">
      <div className="mx-auto flex max-w-[960px] flex-col gap-5">
        <div className="flex flex-col gap-1.5">
          <Link href="/jogos" className="etiqueta text-[11px] text-laranja-claro no-underline sm:text-xs">← Fliperama</Link>
          <h1 className="m-0 text-[28px] font-semibold leading-[1.05] tracking-[-0.02em] sm:text-[44px]">Riff Estelar</h1>
          <p className="m-0 text-base text-areia">
            Estrelas caem por quatro trilhas. Toque quando elas encostarem no anel. <Link href="/jogos/riff-estelar/calibrar" className="text-laranja-claro">Calibrar atraso e teclas</Link>
          </p>
        </div>
        <Suspense fallback={<p className="text-areia">Afinando as músicas…</p>}>
          <Lista />
        </Suspense>
      </div>
    </section>
  );
}

async function Lista() {
  const [musicas, user] = await Promise.all([listarMusicas(), getUser()]);
  const recordes = user ? await recordesDe(user.id) : [];
  if (musicas.length === 0) return <p className="text-areia">Nenhuma música publicada ainda.</p>;
  return (
    <>
      <RiffPendente logado={Boolean(user)} />
      <ul className="m-0 grid list-none gap-3 p-0 sm:grid-cols-2">
        {musicas.map((m) => (
          <li key={m.id} className="surface-vidro flex flex-col gap-3 p-4">
            <div>
              <h2 className="m-0 text-xl font-semibold">{m.title}</h2>
              <p className="m-0 text-areia">
                {m.artist} · <span className="font-ficha text-sm">{minutos(m.durationMs)}</span>
              </p>
            </div>
            <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
              {m.mapas.map((mp) => {
                const r = recordes.find((x) => x.songId === m.id && x.difficulty === mp.difficulty);
                return (
                  <li key={mp.difficulty}>
                    <Link
                      href={`/jogos/riff-estelar/${m.slug}?d=${mp.difficulty}`}
                      className="line-sutil flex min-h-11 flex-col justify-center rounded-md border px-3 py-1.5 text-creme no-underline hover:border-laranja-claro"
                    >
                      <span className="text-sm font-semibold">{NOME_DIFICULDADE[mp.difficulty]}</span>
                      <span className="font-ficha text-xs text-areia">
                        {mp.total} notas{r ? ` · recorde ${r.score.toLocaleString("pt-BR")}` : ""}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
            <dl className="m-0 grid gap-1 text-xs text-areia">
              <div>
                <dt className="inline font-semibold text-creme">Créditos: </dt>
                <dd className="inline">{m.credits}</dd>
              </div>
              <div>
                <dt className="inline font-semibold text-creme">Licença: </dt>
                <dd className="inline">{m.license}</dd>
              </div>
            </dl>
          </li>
        ))}
      </ul>
    </>
  );
}
