import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { CabecalhoRole } from "@/components/role/CabecalhoRole";
import { Compartilhar } from "@/components/role/Compartilhar";
import { DenunciarPico } from "@/components/role/DenunciarPico";
import { JogoCliente } from "@/components/role/EditorCliente";
import { RolePendente } from "@/components/role/RolePendente";
import { getUser } from "@/lib/auth/server";
import { TEXTOS } from "@/lib/role/config";
import { acharPorSlug, melhorDe, ranking, type Pico } from "@/lib/role/dados";

type Params = { params: Promise<{ slug: string }> };

const nomeDe = (nome: string, apelido: string | null) => (apelido ? `@${apelido}` : nome);

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const p = await acharPorSlug(slug).catch(() => null);
  if (!p || p.status !== "published") return { title: TEXTOS.pagina.titulo, robots: { index: false } };
  return {
    title: `${p.title} · ${TEXTOS.pagina.titulo}`,
    description: p.description || TEXTOS.pico.por(nomeDe(p.criador, p.apelido)),
  };
}

export default function Page({ params }: Params) {
  return (
    <section className="bg-ceu relative px-4 pb-18 pt-5 sm:px-6 sm:pt-9">
      <div className="mx-auto flex max-w-[1200px] flex-col gap-4">
        <Suspense fallback={<p className="text-areia">{TEXTOS.pagina.carregando}</p>}>
          <ConteudoPico params={params} />
        </Suspense>
      </div>
    </section>
  );
}

async function ConteudoPico({ params }: Params) {
  const { slug } = await params;
  const [p, user] = await Promise.all([acharPorSlug(slug), getUser()]);
  // Escondido: só o dono vê, com aviso.
  if (!p || (p.status === "hidden" && p.userId !== user?.id)) notFound();
  return <PicoCompleto p={p} userId={user?.id ?? null} />;
}

async function PicoCompleto({ p, userId }: { p: Pico; userId: string | null }) {
  const [linhas, recordeCriador, meu] = await Promise.all([ranking(p.id), melhorDe(p.id, p.userId), userId ? melhorDe(p.id, userId) : Promise.resolve(null)]);
  const criador = nomeDe(p.criador, p.apelido);
  return (
    <>
      <CabecalhoRole titulo={p.title} descricao={p.description || undefined} />
      <p className="m-0 -mt-2 font-ficha text-sm text-areia">
        {p.apelido ? (
          <Link href={`/t/${p.apelido}`} className="text-areia">
            {TEXTOS.pico.por(criador)}
          </Link>
        ) : (
          TEXTOS.pico.por(criador)
        )}
        {p.playsCount > 0 && ` · ${TEXTOS.pico.jogadas(p.playsCount)}`}
      </p>
      {p.status === "hidden" && (
        <p role="status" className="surface-vidro m-0 px-4 py-3 text-sm">
          {TEXTOS.pico.escondido}
        </p>
      )}
      <RolePendente logado={Boolean(userId)} />
      <JogoCliente slug={p.slug!} titulo={p.title} pista={p.layout} logado={Boolean(userId)} />
      <div className="grid gap-3 md:grid-cols-[1fr_320px]">
        <section className="surface-vidro flex flex-col gap-2 p-4" aria-labelledby="ranking">
          <h2 id="ranking" className="m-0 text-xl font-semibold">
            {TEXTOS.pico.ranking}
          </h2>
          {linhas.length > 0 && (
            <ol className="m-0 flex list-none flex-col gap-1 p-0 font-ficha text-sm">
              {linhas.map((l, i) => (
                <li key={l.userId} className={`flex justify-between gap-3 rounded px-2 py-1.5 ${l.userId === userId ? "bg-laranja-claro/15" : ""}`}>
                  <span>
                    {i + 1}. {nomeDe(l.nome, l.apelido)}
                  </span>
                  <span>{TEXTOS.pico.pontos(l.score)}</span>
                </li>
              ))}
            </ol>
          )}
        </section>
        <aside className="flex flex-col gap-3">
          {recordeCriador !== null && (
            <div className="surface-vidro flex flex-col gap-1 p-4">
              <span className="etiqueta text-[11px] text-laranja-claro">{TEXTOS.pico.recordeCriador}</span>
              <span className="font-ficha text-2xl">{TEXTOS.pico.pontos(recordeCriador)}</span>
            </div>
          )}
          {meu !== null && (
            <div className="surface-vidro flex flex-col gap-1 p-4">
              <span className="etiqueta text-[11px] text-laranja-claro">{TEXTOS.pico.seuRecorde}</span>
              <span className="font-ficha text-2xl">{TEXTOS.pico.pontos(meu)}</span>
            </div>
          )}
          {p.status === "published" && <Compartilhar titulo={p.title} recorde={recordeCriador} />}
          {p.status === "published" && userId !== p.userId && <DenunciarPico slug={p.slug!} logado={Boolean(userId)} />}
          {userId === p.userId && (
            <Link href={`/jogos/role-noturno/editor/${p.id}`} className="botao-vidro min-h-11 content-center px-4 text-center no-underline">
              {TEXTOS.pico.duplicar}
            </Link>
          )}
        </aside>
      </div>
    </>
  );
}
