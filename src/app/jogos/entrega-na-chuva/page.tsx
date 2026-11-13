import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Capa } from "@/components/entrega/Capa";
import { Configuracoes } from "@/components/entrega/Configuracoes";
import { EntregaPendente } from "@/components/entrega/EntregaPendente";
import { TeclasAtuais } from "@/components/entrega/TeclasAtuais";
import { getUser } from "@/lib/auth/server";
import { TEXTOS } from "@/lib/entrega/config";
import { implantesDe, recordeDe, saldoDe } from "@/lib/entrega/dados";

export const metadata: Metadata = { title: TEXTOS.nome, description: TEXTOS.resumo };

const E = TEXTOS.entrada;
const R = TEXTOS.resultado;

export default function Page() {
  return (
    <section className="bg-ceu relative px-4 pb-18 pt-5 sm:px-6 sm:pt-9">
      <div className="mx-auto flex max-w-[1040px] flex-col gap-8 sm:gap-10">
        {/* Capa */}
        <div className="grid items-center gap-5 md:grid-cols-[1fr_1.1fr] md:gap-8">
          <div className="flex flex-col gap-3">
            <Link href="/jogos" className="etiqueta text-[11px] text-laranja-claro no-underline sm:text-xs">
              ← Fliperama
            </Link>
            <p className="rotulo m-0 text-areia">{E.etiqueta}</p>
            <h1 className="m-0 text-[34px] font-semibold leading-[1.02] tracking-[-0.02em] sm:text-[52px]">{TEXTOS.nome}</h1>
            <p className="m-0 text-lg text-creme">{E.chamada}</p>
            <p className="m-0 text-base text-areia">{TEXTOS.resumo}</p>
            <div className="mt-1 flex flex-wrap gap-3">
              <Link href="/jogos/entrega-na-chuva/turno" className="botao-laranja flex items-center gap-2 px-6 text-base no-underline">
                ▶ {TEXTOS.comecar}
              </Link>
              <Link href="/jogos/entrega-na-chuva/oficina" className="botao-vidro flex items-center no-underline">
                {TEXTOS.oficina}
              </Link>
            </div>
          </div>
          <Capa className="block h-auto w-full rounded-lg border border-creme/15" />
        </div>

        <Suspense fallback={null}>
          <Painel />
        </Suspense>

        {/* Como jogar */}
        <section aria-labelledby="como-jogar" className="flex flex-col gap-3">
          <h2 id="como-jogar" className="m-0 text-2xl font-semibold">
            {E.comoJogar}
          </h2>
          <ol className="m-0 grid list-none gap-3 p-0 sm:grid-cols-2 lg:grid-cols-4">
            {E.passos.map((p, i) => (
              <li key={p.titulo} className="surface-vidro flex flex-col gap-2 p-4">
                <span className="flex items-center gap-2">
                  <span aria-hidden="true" className="flex size-9 items-center justify-center rounded-md bg-laranja-claro font-ficha text-sm font-bold text-noite">
                    {p.icone}
                  </span>
                  <span className="rotulo text-areia">{i + 1}</span>
                </span>
                <h3 className="m-0 text-base font-semibold">{p.titulo}</h3>
                <p className="m-0 text-sm text-areia">{p.texto}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* Perigos e controles */}
        <div className="grid gap-5 md:grid-cols-2">
          <section aria-labelledby="perigos" className="flex flex-col gap-3">
            <h2 id="perigos" className="m-0 text-2xl font-semibold">
              {E.perigosTitulo}
            </h2>
            <ul className="m-0 flex list-none flex-col gap-2 p-0">
              {E.perigos.map((p) => (
                <li key={p.nome} className="line-sutil flex items-start gap-3 border-b pb-2">
                  <span aria-hidden="true" className="flex size-8 shrink-0 items-center justify-center rounded border border-creme/30 font-ficha text-sm">
                    {p.icone}
                  </span>
                  <span className="text-sm">
                    <strong className="text-creme">{p.nome}.</strong> <span className="text-areia">{p.texto}</span>
                  </span>
                </li>
              ))}
            </ul>
          </section>
          <section aria-labelledby="controles" className="flex flex-col gap-3">
            <h2 id="controles" className="m-0 text-2xl font-semibold">
              {E.controlesTitulo}
            </h2>
            <div className="surface-vidro flex flex-col gap-3 p-4">
              <TeclasAtuais />
              <p className="m-0 text-sm text-areia">📱 {E.toque}</p>
            </div>
            <Configuracoes />
          </section>
        </div>
      </div>
    </section>
  );
}

// Recorde, carteira e implantes do tripulante. Sem conta: convite pro cadastro.
async function Painel() {
  const user = await getUser();
  if (!user)
    return (
      <div className="surface-vidro flex flex-wrap items-center justify-between gap-3 p-4">
        <p className="m-0 max-w-[560px] text-sm text-areia">{E.semConta}</p>
        <Link href={`/cadastro?next=${encodeURIComponent("/jogos/entrega-na-chuva")}`} className="botao-vidro flex items-center no-underline">
          {E.criarConta}
        </Link>
      </div>
    );
  const [r, saldo, implantes] = await Promise.all([recordeDe(user.id), saldoDe(user.id), implantesDe(user.id)]);
  const equipados = implantes.filter((i) => i.equipped);
  const stats: [string, string | number][] = r
    ? [
        [R.creditos, r.creditsEarned],
        [R.entregas, r.deliveries],
        [R.sequencia, r.bestStreak],
      ]
    : [];
  return (
    <div className="flex flex-col gap-3">
      <EntregaPendente logado />
      <div className="grid gap-3 md:grid-cols-[1.4fr_1fr]">
        <section aria-labelledby="recorde" className="surface-vidro flex flex-col gap-3 p-4">
          <h2 id="recorde" className="rotulo m-0 text-laranja-claro">
            ★ {TEXTOS.recorde}
          </h2>
          {r ? (
            <dl className="m-0 grid grid-cols-3 gap-3">
              {stats.map(([k, v]) => (
                <div key={k} className="flex flex-col-reverse gap-0.5">
                  <dt className="text-xs text-areia">{k}</dt>
                  <dd className="m-0 font-ficha text-2xl font-bold sm:text-3xl">{v}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="m-0 text-areia">{TEXTOS.semRecorde}</p>
          )}
        </section>
        <section aria-labelledby="carteira" className="surface-vidro flex flex-col gap-2 p-4">
          <h2 id="carteira" className="rotulo m-0 text-laranja-claro">
            {E.saldo}
          </h2>
          <p className="m-0 font-ficha text-2xl font-bold sm:text-3xl">{saldo}</p>
          {equipados.length > 0 ? (
            <ul className="m-0 flex list-none flex-wrap gap-1.5 p-0">
              {equipados.map((i) => (
                <li key={i.slug} className="rotulo rounded border border-creme/30 px-2 py-1">
                  {i.name} {"◆".repeat(i.level)}
                </li>
              ))}
            </ul>
          ) : (
            <p className="m-0 text-sm text-areia">{E.oficinaTexto}</p>
          )}
          <Link href="/jogos/entrega-na-chuva/oficina" className="text-sm text-laranja-claro">
            {TEXTOS.oficina} →
          </Link>
        </section>
      </div>
    </div>
  );
}
