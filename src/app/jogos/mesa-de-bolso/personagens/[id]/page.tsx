import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { Retrato } from "@/components/bolso/Retrato";
import { Atributos, ListaRecompensas, nomesDosTalentos } from "@/components/bolso/Servidor";
import { COLUNA, LINK_VOLTAR, MESA, PAPEL } from "@/components/bolso/tema";
import { getUser } from "@/lib/auth/server";
import { aventuraPorSlug } from "@/lib/bolso/aventuras";
import { BASE, TEXTOS } from "@/lib/bolso/config";
import { diarioDaPersonagem, personagemDoDono } from "@/lib/bolso/dados";

export const metadata: Metadata = { title: "Diário da personagem · Mesa de Bolso" };

type Props = { params: Promise<{ id: string }> };

export default function Page({ params }: Props) {
  return (
    <section className={MESA}>
      <div className={COLUNA}>
        <Link href={`${BASE}/personagens`} className={LINK_VOLTAR}>← Personagens</Link>
        <Suspense fallback={<p className="text-areia">Abrindo o diário…</p>}>
          <Diario params={params} />
        </Suspense>
      </div>
    </section>
  );
}

const quando = (iso: string) => new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric", timeZone: "America/Sao_Paulo" });

async function Diario({ params }: Props) {
  const { id } = await params;
  const user = await getUser();
  if (!user) redirect(`/entrar?next=${BASE}/personagens/${encodeURIComponent(id)}`);
  const p = await personagemDoDono(user.id, id);
  if (!p) notFound();
  const entradas = await diarioDaPersonagem(user.id, p.id);

  return (
    <>
      <div className="flex items-center gap-4">
        <Retrato retrato={p.retrato} nome={p.nome} tamanho={88} />
        <div className="flex min-w-0 flex-col gap-1">
          <h1 className="m-0 truncate text-[28px] font-semibold leading-tight sm:text-[36px]">{p.nome}</h1>
          <Atributos attrs={p.attrs} />
          <p className="m-0 text-sm text-areia">Talentos: {nomesDosTalentos(p.talentos).join(", ")}</p>
        </div>
      </div>

      <h2 className="m-0 text-xl font-semibold">Diário de aventuras</h2>
      {entradas.length === 0 && <p className="m-0 text-areia">{p.nome} ainda não terminou nenhuma aventura.</p>}
      <ol className="m-0 flex list-none flex-col gap-3 p-0">
        {entradas.map((e) => (
          <li key={e.id} className={`${PAPEL} flex flex-col gap-2`}>
            <p className="rotulo m-0 text-neutro">{quando(e.quando)}</p>
            <h3 className="m-0 text-lg font-semibold">{aventuraPorSlug(e.aventura)?.titulo ?? e.aventura}</h3>
            <p className="m-0">{e.resumo}</p>
            <ListaRecompensas recompensas={e.recompensas} />
          </li>
        ))}
      </ol>
      <Link href={BASE} className="btn bg-laranja min-h-11 self-start text-noite">{TEXTOS.titulo}: jogar outra</Link>
    </>
  );
}
