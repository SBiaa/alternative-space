import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { ResultadoRolagem } from "@/components/bolso/Dados";
import { AvisoSemConta } from "@/components/bolso/IniciarPartida";
import { Recomecar } from "@/components/bolso/Partida";
import { CenaTexto, FichaCompacta, ListaRecompensas } from "@/components/bolso/Servidor";
import { COLUNA, LINK_VOLTAR, MESA, PAPEL } from "@/components/bolso/tema";
import { getUser } from "@/lib/auth/server";
import { aventuraPorSlug } from "@/lib/bolso/aventuras";
import { BASE, FINAIS, TEXTOS } from "@/lib/bolso/config";
import { ultimaRunTerminada } from "@/lib/bolso/dados";
import { lerRunLocal } from "@/lib/bolso/local";
import { cenaDe, recompensasDe, resumoDaPartida } from "@/lib/bolso/motor";

type Props = { params: Promise<{ aventura: string }> };

export const metadata: Metadata = { title: "O final · Mesa de Bolso" };

export default function Page({ params }: Props) {
  return (
    <section className={MESA}>
      <div className={COLUNA}>
        <Link href={BASE} className={LINK_VOLTAR}>← {TEXTOS.titulo}</Link>
        <Suspense fallback={<p className="text-areia">Apagando a lâmpada…</p>}>
          <Final params={params} />
        </Suspense>
      </div>
    </section>
  );
}

async function Final({ params }: Props) {
  const { aventura: slug } = await params;
  const a = aventuraPorSlug(slug);
  if (!a) notFound();
  const user = await getUser();
  const run = user ? await ultimaRunTerminada(user.id, a.slug) : null;
  const estado = user ? run?.estado : await lerRunLocal(a.slug);
  if (!estado?.final) redirect(`${BASE}/${a.slug}`);

  const cena = cenaDe(a, estado.cena);
  const resumo = resumoDaPartida(a, estado)!;

  return (
    <>
      <p className="rotulo m-0 text-lareira-brasa">{FINAIS[estado.final.tipo]} · {a.titulo}</p>
      <h1 className="m-0 text-[28px] font-semibold leading-[1.05] tracking-[-0.02em] sm:text-[40px]">{resumo.titulo}</h1>
      {estado.ultima?.rolagem && <ResultadoRolagem key={estado.ultima.rolagem.n} rolagem={estado.ultima.rolagem} opcao={estado.ultima.opcao} />}
      <article className={`${PAPEL} flex flex-col gap-3`}>
        <CenaTexto texto={cena.texto} />
      </article>

      <section className={`${PAPEL} flex flex-col gap-3`} aria-labelledby="resumo-titulo">
        <h2 id="resumo-titulo" className="m-0 text-xl font-semibold">Resumo da aventura</h2>
        <p className="m-0">{resumo.texto}</p>
        <h3 className="m-0 text-base font-semibold">O que {estado.personagem.nome} ganhou</h3>
        <ListaRecompensas recompensas={recompensasDe(a, estado)} />
      </section>

      <FichaCompacta estado={estado} aventura={a} />

      {user && run ? (
        <p className="m-0 rounded-md border border-ok p-3 text-sm text-ok" role="status">
          Essa aventura entrou no diário de {estado.personagem.nome}.{" "}
          <Link href={`${BASE}/personagens/${run.characterId}`} className="font-semibold text-ok underline">Ver o diário</Link>
        </p>
      ) : (
        <AvisoSemConta next={`${BASE}/${a.slug}/fim`} />
      )}

      <div className="flex flex-wrap gap-3">
        <Recomecar slug={a.slug} rotulo="Jogar de novo" confirmar={false} />
        <Link href={BASE} className="btn btn-fantasma min-h-11">Outras aventuras</Link>
      </div>
    </>
  );
}
