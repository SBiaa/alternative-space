import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AvisoSemConta } from "@/components/bolso/IniciarPartida";
import { Retrato } from "@/components/bolso/Retrato";
import { Atributos, nomesDosTalentos } from "@/components/bolso/Servidor";
import { COLUNA, LINK_VOLTAR, MESA, PAPEL } from "@/components/bolso/tema";
import { getUser } from "@/lib/auth/server";
import { BASE, TEXTOS } from "@/lib/bolso/config";
import { listarPersonagens } from "@/lib/bolso/dados";
import { lerPersonagemLocal } from "@/lib/bolso/local";
import type { Personagem } from "@/lib/bolso/personagem";

export const metadata: Metadata = { title: "Personagens · Mesa de Bolso" };

export default function Page() {
  return (
    <section className={MESA}>
      <div className={COLUNA}>
        <Link href={BASE} className={LINK_VOLTAR}>← {TEXTOS.titulo}</Link>
        <h1 className="m-0 text-[28px] font-semibold leading-[1.05] tracking-[-0.02em] sm:text-[40px]">Personagens</h1>
        <Suspense fallback={<p className="text-areia">Abrindo a gaveta de fichas…</p>}>
          <Lista />
        </Suspense>
      </div>
    </section>
  );
}

function Cartao({ p, href }: { p: Personagem; href?: string }) {
  return (
    <li className={`${PAPEL} flex items-center gap-4`}>
      <Retrato retrato={p.retrato} nome={p.nome} tamanho={72} />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <h2 className="m-0 truncate text-xl font-semibold">{p.nome}</h2>
        <Atributos attrs={p.attrs} />
        <p className="m-0 text-sm">Talentos: {nomesDosTalentos(p.talentos).join(", ")}</p>
        {href && (
          <Link href={href} className="min-h-11 content-center text-sm font-semibold text-azul underline">
            Ver o diário
          </Link>
        )}
      </div>
    </li>
  );
}

async function Lista() {
  const user = await getUser();
  const lista = user ? await listarPersonagens(user.id) : [];
  const local = user ? null : await lerPersonagemLocal();
  const vazio = !lista.length && !local;
  return (
    <>
      {vazio && <p className="m-0 text-areia">Você ainda não criou nenhuma personagem.</p>}
      <ul className="m-0 flex list-none flex-col gap-3 p-0">
        {lista.map((p) => (
          <Cartao key={p.id} p={p} href={`${BASE}/personagens/${p.id}`} />
        ))}
        {local && <Cartao p={local} />}
      </ul>
      {(user || !local) && (
        <Link href={`${BASE}/personagens/novo`} className="btn bg-laranja min-h-11 self-start text-noite">
          Criar uma personagem rápida
        </Link>
      )}
      {!user && <AvisoSemConta next={`${BASE}/personagens`} />}
    </>
  );
}
