import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ApagarPico } from "@/components/role/AcoesPico";
import { CabecalhoRole } from "@/components/role/CabecalhoRole";
import { RolePendente } from "@/components/role/RolePendente";
import { getUser } from "@/lib/auth/server";
import { TEXTOS } from "@/lib/role/config";
import { picosDe, picosMaisJogados, picosRecentes, type ResumoPico } from "@/lib/role/dados";
import { miniaturaDataUri } from "@/lib/role/miniatura";

export const metadata: Metadata = {
  title: TEXTOS.pagina.titulo,
  description: TEXTOS.pagina.listaDescricao,
};

// Cores da miniatura: mesmos valores dos tokens Cozy (noite, creme-escuro, creme, linha forte).
const MINI = { fundo: "#01121e", peca: "#e3d8ac", grind: "#ece3be", linha: "#4f5d66" };

const nomeDe = (p: ResumoPico) => (p.apelido ? `@${p.apelido}` : p.criador);

function Cartao({ p, dono }: { p: ResumoPico; dono?: boolean }) {
  const href = p.status === "draft" || !p.slug ? `/jogos/role-noturno/editor/${p.id}` : `/jogos/role-noturno/pico/${p.slug}`;
  return (
    <li className="surface-vidro flex flex-col gap-2 p-3">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={miniaturaDataUri(p.layout, MINI)} alt="" className="aspect-[4/1] w-full rounded-md object-cover" />
      <div className="flex flex-col">
        <Link href={href} className="text-lg font-semibold text-creme no-underline hover:underline">
          {p.title || TEXTOS.pico.semTitulo}
        </Link>
        <span className="font-ficha text-xs text-areia">
          {dono ? (p.status === "draft" ? TEXTOS.pico.rascunho : p.status === "hidden" ? TEXTOS.pico.escondido : TEXTOS.pico.publicado) : TEXTOS.pico.por(nomeDe(p))}
          {p.playsCount > 0 && ` · ${TEXTOS.pico.jogadas(p.playsCount)}`}
          {p.recordeCriador !== null && p.status !== "draft" && ` · ${TEXTOS.pico.recordeCriador}: ${TEXTOS.pico.pontos(p.recordeCriador)}`}
        </span>
      </div>
      {dono && (
        <div className="flex flex-wrap gap-2">
          <Link href={href} className="botao-vidro min-h-11 content-center px-3 text-sm no-underline">
            {p.status === "draft" ? TEXTOS.pico.editar : TEXTOS.pico.jogar}
          </Link>
          <ApagarPico id={p.id} />
        </div>
      )}
    </li>
  );
}

function Lista({ titulo, picos, dono }: { titulo: string; picos: ResumoPico[]; dono?: boolean }) {
  if (picos.length === 0) return null;
  return (
    <section className="flex flex-col gap-3">
      <h2 className="m-0 text-2xl font-semibold">{titulo}</h2>
      <ul className="m-0 grid list-none gap-3 p-0 sm:grid-cols-2 lg:grid-cols-3">
        {picos.map((p) => (
          <Cartao key={p.id} p={p} dono={dono} />
        ))}
      </ul>
    </section>
  );
}

export default function Page() {
  return (
    <section className="bg-ceu relative px-4 pb-18 pt-5 sm:px-6 sm:pt-9">
      <div className="mx-auto flex max-w-[1200px] flex-col gap-6">
        <CabecalhoRole titulo={TEXTOS.pagina.titulo} descricao={TEXTOS.pagina.listaDescricao} voltar="/jogos" rotuloVoltar={TEXTOS.pagina.voltar} />
        <div>
          <Link href="/jogos/role-noturno/editor" className="botao-laranja inline-flex min-h-11 items-center px-5 no-underline">
            {TEXTOS.pico.montar}
          </Link>
        </div>
        <Suspense fallback={<p className="text-areia">{TEXTOS.pagina.carregando}</p>}>
          <Picos />
        </Suspense>
      </div>
    </section>
  );
}

async function Picos() {
  const user = await getUser();
  const [recentes, jogados, meus] = await Promise.all([picosRecentes(), picosMaisJogados(), user ? picosDe(user.id) : Promise.resolve([])]);
  return (
    <>
      <RolePendente logado={Boolean(user)} />
      <Lista titulo={TEXTOS.pico.meus} picos={meus} dono />
      <Lista titulo={TEXTOS.pico.recentes} picos={recentes} />
      <Lista titulo={TEXTOS.pico.jogados} picos={jogados} />
      {recentes.length === 0 && meus.length === 0 && <p className="m-0 text-areia">{TEXTOS.pico.nenhum}</p>}
    </>
  );
}
