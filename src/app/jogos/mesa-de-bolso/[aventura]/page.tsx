import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { AvisoSemConta, IniciarPartida, type PersonagemUI } from "@/components/bolso/IniciarPartida";
import { FocarCena, Partida, Recomecar, type OpcaoUI } from "@/components/bolso/Partida";
import { ResultadoRolagem } from "@/components/bolso/Dados";
import { CenaTexto, FichaCompacta } from "@/components/bolso/Servidor";
import { COLUNA, LINK_VOLTAR, MESA, PAPEL } from "@/components/bolso/tema";
import { getUser } from "@/lib/auth/server";
import { aventuraPorSlug } from "@/lib/bolso/aventuras";
import { ATRIBUTOS, BASE, TALENTOS, TEMAS, TEXTOS } from "@/lib/bolso/config";
import type { Aventura } from "@/lib/bolso/conteudo";
import { listarPersonagens, runAtiva } from "@/lib/bolso/dados";
import { lerPersonagemLocal, lerRunLocal } from "@/lib/bolso/local";
import { cenaAtual, opcoesDaCena } from "@/lib/bolso/motor";
import type { Estado } from "@/lib/bolso/save";

type Props = { params: Promise<{ aventura: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const a = aventuraPorSlug((await params).aventura);
  return a ? { title: `${a.titulo} · ${TEXTOS.titulo}`, description: a.resumo } : {};
}

export default function Page({ params }: Props) {
  return (
    <section className={MESA}>
      <div className={COLUNA}>
        <Link href={BASE} className={LINK_VOLTAR}>← {TEXTOS.titulo}</Link>
        <Suspense fallback={<p className="text-areia">Abrindo a aventura…</p>}>
          <Conteudo params={params} />
        </Suspense>
      </div>
    </section>
  );
}

const nomeAtributo = (id: string) => ATRIBUTOS.find((a) => a.id === id)?.nome ?? id;

function opcoesUI(a: Aventura, e: Estado): OpcaoUI[] {
  return opcoesDaCena(a, e).map(({ opcao, bloqueada, motivo }) => {
    const t = opcao.teste;
    const meu = t?.talentos?.find((id) => e.personagem.talentos.includes(id));
    return {
      id: opcao.id,
      texto: opcao.texto,
      bloqueada,
      motivo,
      teste: t ? { atributo: nomeAtributo(t.atributo), dificuldade: t.dificuldade, talentoAjuda: meu ? TALENTOS.find((x) => x.id === meu)?.nome : undefined } : undefined,
    };
  });
}

async function Conteudo({ params }: Props) {
  const { aventura: slug } = await params;
  const a = aventuraPorSlug(slug);
  if (!a) notFound();
  const user = await getUser();
  const guardada = user ? await runAtiva(user.id, a.slug) : null;
  const estado = user ? guardada?.estado : await lerRunLocal(a.slug);

  // Sem conta, a partida terminada fica no cookie: o final é a tela dela.
  if (estado?.final) redirect(`${BASE}/${a.slug}/fim`);

  if (!estado) return <Escolha a={a} logado={!!user} userId={user?.id} />;

  let cena;
  try {
    cena = cenaAtual(a, estado);
  } catch {
    return (
      <div className={`${PAPEL} flex flex-col gap-3`}>
        <p className="m-0">Essa aventura foi atualizada desde a última vez que você jogou, e a sua partida não cabe mais nela.</p>
        <Recomecar slug={a.slug} rotulo="Começar de novo" confirmar={false} />
      </div>
    );
  }
  const ultima = estado.ultima;

  return (
    <>
      <h1 className="m-0 text-[22px] font-semibold leading-tight sm:text-[30px]">{a.titulo}</h1>
      <FichaCompacta estado={estado} aventura={a} />
      {ultima?.rolagem && <ResultadoRolagem key={ultima.rolagem.n} rolagem={ultima.rolagem} opcao={ultima.opcao} />}
      <article key={cena.id} className={`${PAPEL} flex flex-col gap-3`} aria-labelledby="cena-titulo">
        <h2 id="cena-titulo" tabIndex={-1} className="rotulo m-0 text-neutro outline-offset-4">
          Cena {estado.passos + 1}
        </h2>
        <CenaTexto texto={cena.texto} />
      </article>
      <FocarCena passos={estado.passos} />
      <Partida slug={a.slug} opcoes={opcoesUI(a, estado)} />
      <Recomecar slug={a.slug} />
      {!user && <AvisoSemConta next={`${BASE}/${a.slug}`} />}
    </>
  );
}

async function Escolha({ a, logado, userId }: { a: Aventura; logado: boolean; userId?: string }) {
  const personagens: PersonagemUI[] = logado
    ? (await listarPersonagens(userId!)).map((p) => ({ id: p.id, nome: p.nome }))
    : await lerPersonagemLocal().then((p) => (p ? [{ id: null, nome: p.nome }] : []));
  const criar = `${BASE}/personagens/novo?volta=${BASE}/${a.slug}`;
  return (
    <>
      <p className="rotulo m-0 text-lareira-brasa">
        {TEMAS[a.tema]} · cerca de {a.duracaoMin} min · {a.classificacao}
      </p>
      <h1 className="m-0 text-[28px] font-semibold leading-[1.05] tracking-[-0.02em] sm:text-[40px]">{a.titulo}</h1>
      <p className="m-0 text-base text-areia">{a.resumo}</p>
      <div className={`${PAPEL} flex flex-col gap-3`}>
        <h2 className="m-0 text-xl font-semibold">Quem vai jogar?</h2>
        {personagens.length > 0 ? <IniciarPartida slug={a.slug} personagens={personagens} /> : <p className="m-0">Você ainda não tem personagem. Crie uma rapidinho, leva um minuto.</p>}
        {(logado || personagens.length === 0) && (
          <Link href={criar} className="btn btn-contorno min-h-11 self-start">
            Criar uma personagem rápida
          </Link>
        )}
      </div>
      {!logado && <AvisoSemConta next={`${BASE}/${a.slug}`} />}
    </>
  );
}
