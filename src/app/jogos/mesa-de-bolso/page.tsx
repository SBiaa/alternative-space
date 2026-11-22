import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AvisoSemConta, MigrarLocal } from "@/components/bolso/IniciarPartida";
import { COLUNA, LINK_VOLTAR, MESA, PAPEL } from "@/components/bolso/tema";
import { getUser } from "@/lib/auth/server";
import { listarAventuras } from "@/lib/bolso/aventuras";
import { BASE, TEMAS, TEXTOS } from "@/lib/bolso/config";
import { runsAtivas } from "@/lib/bolso/dados";
import { lerPersonagemLocal, lerRunsLocais } from "@/lib/bolso/local";

export const metadata: Metadata = {
  title: TEXTOS.titulo,
  description: TEXTOS.chamada,
};

export default function Page() {
  return (
    <section className={MESA}>
      <div className={COLUNA}>
        <Link href="/jogos" className={LINK_VOLTAR}>← Fliperama</Link>
        <h1 className="m-0 text-[28px] font-semibold leading-[1.05] tracking-[-0.02em] sm:text-[44px]">{TEXTOS.titulo}</h1>
        <p className="m-0 text-base text-areia">{TEXTOS.chamada}</p>
        <nav aria-label="Mesa de Bolso" className="flex flex-wrap gap-3">
          <Link href={`${BASE}/como-jogar`} className="btn btn-fantasma min-h-11">Como jogar</Link>
          <Link href={`${BASE}/personagens`} className="btn btn-fantasma min-h-11">Personagens</Link>
        </nav>
        <Suspense fallback={<p className="text-areia">Arrumando a mesa…</p>}>
          <Aventuras />
        </Suspense>
      </div>
    </section>
  );
}

async function Aventuras() {
  const user = await getUser();
  const aventuras = listarAventuras();
  const [locais, personagemLocal] = await Promise.all([lerRunsLocais(), lerPersonagemLocal()]);
  // Logado: partidas em andamento na conta. Sem conta: as do cookie.
  const ativas = new Map<string, string>(
    user
      ? (await runsAtivas(user.id)).map((r) => [r.aventura, r.personagem] as const)
      : locais.filter((e) => !e.final).map((e) => [e.aventura, e.personagem.nome] as const),
  );
  const terminadasLocais = new Set(user ? [] : locais.filter((e) => e.final).map((e) => e.aventura));
  const temLocal = locais.length > 0 || personagemLocal !== null;

  return (
    <>
      {user && temLocal && <MigrarLocal />}
      {aventuras.length === 0 && <p className="text-areia">{TEXTOS.semAventuras}</p>}
      <ul className="m-0 flex list-none flex-col gap-4 p-0">
        {aventuras.map((a) => {
          const em = ativas.get(a.slug);
          return (
            <li key={a.slug} className={`${PAPEL} flex flex-col gap-3`}>
              <p className="rotulo m-0 text-neutro">
                {TEMAS[a.tema]} · cerca de {a.duracaoMin} min · {a.classificacao}
              </p>
              <h2 className="m-0 text-2xl font-semibold leading-tight">{a.titulo}</h2>
              <p className="m-0">{a.resumo}</p>
              {em && <p className="m-0 text-sm">Partida em andamento com {em}.</p>}
              {terminadasLocais.has(a.slug) && <p className="m-0 text-sm">Você já terminou esta aventura neste navegador.</p>}
              <div className="flex flex-wrap gap-3">
                <Link href={`${BASE}/${a.slug}`} className="btn bg-laranja min-h-11 text-noite">
                  {em ? "Continuar" : terminadasLocais.has(a.slug) ? "Ver o final" : "Jogar"}
                </Link>
              </div>
            </li>
          );
        })}
      </ul>
      {!user && <AvisoSemConta next={BASE} />}
    </>
  );
}
