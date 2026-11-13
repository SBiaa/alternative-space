import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getUser } from "@/lib/auth/server";
import { TEXTOS } from "@/lib/role/config";
import { acharPorApelido, picosDaCabine } from "@/lib/role/dados";
import { miniaturaDataUri } from "@/lib/role/miniatura";

type Params = { params: Promise<{ usuario: string }> };

// Cores da miniatura: mesmos valores dos tokens Cozy (noite, creme-escuro, creme, linha forte).
const MINI = { fundo: "#01121e", peca: "#e3d8ac", grind: "#ece3be", linha: "#4f5d66" };

const apelidoDaUrl = (u: string) => decodeURIComponent(u).replace(/^@/, "");

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { usuario } = await params;
  const t = await acharPorApelido(apelidoDaUrl(usuario)).catch(() => null);
  return t ? { title: TEXTOS.cabine.titulo(`@${t.apelido}`) } : { robots: { index: false } };
}

// Cabine pública do tripulante (pelo apelido do perfil). Por enquanto mostra os picos do Rolê Noturno.
export default function Page({ params }: Params) {
  return (
    <section className="bg-ceu relative px-4 pb-18 pt-5 sm:px-6 sm:pt-9">
      <div className="mx-auto flex max-w-[1100px] flex-col gap-5">
        <Suspense fallback={<p className="text-areia">{TEXTOS.pagina.carregando}</p>}>
          <Cabine params={params} />
        </Suspense>
      </div>
    </section>
  );
}

async function Cabine({ params }: Params) {
  const { usuario } = await params;
  const t = await acharPorApelido(apelidoDaUrl(usuario));
  if (!t) notFound();
  const user = await getUser();
  const dono = user?.id === t.userId;
  const picos = await picosDaCabine(t.userId, dono);
  return (
    <>
      <div className="flex flex-col gap-1">
        <h1 className="m-0 text-[28px] font-semibold leading-[1.05] tracking-[-0.02em] sm:text-[44px]">{TEXTOS.cabine.titulo(`@${t.apelido}`)}</h1>
        {t.nome && <p className="m-0 text-areia">{t.nome}</p>}
      </div>
      {picos.length > 0 && (
        <section className="flex flex-col gap-3" aria-labelledby="picos">
          <h2 id="picos" className="m-0 text-2xl font-semibold">
            {TEXTOS.cabine.picos}
          </h2>
          <ul className="m-0 grid list-none gap-3 p-0 sm:grid-cols-2 lg:grid-cols-3">
            {picos.map((p) => (
              <li key={p.id} className="surface-vidro flex flex-col gap-2 p-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={miniaturaDataUri(p.layout, MINI)} alt="" className="aspect-[4/1] w-full rounded-md object-cover" />
                <Link href={`/jogos/role-noturno/pico/${p.slug}`} className="text-lg font-semibold text-creme no-underline hover:underline">
                  {p.title}
                </Link>
                {p.status === "hidden" && <p className="m-0 text-xs text-laranja-claro">{TEXTOS.pico.escondido}</p>}
                <p className="m-0 font-ficha text-xs text-areia">
                  {TEXTOS.cabine.melhor}: {p.recorde !== null ? TEXTOS.pico.pontos(p.recorde) : TEXTOS.cabine.semRecorde}
                  {p.playsCount > 0 && ` · ${TEXTOS.pico.jogadas(p.playsCount)}`}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
