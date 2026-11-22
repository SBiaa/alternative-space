import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getAdmin } from "@/lib/auth/admin";
import { getUser } from "@/lib/auth/server";
import { acharSpot } from "@/lib/skate/dados";
import { UUID } from "@/lib/skate/regras";
import { linkComoChegar, NOME_TIPO } from "@/lib/skate/tipos";

export const metadata: Metadata = { title: "Pico · Skate Universe" };

export default function PicoPage({ params }: PageProps<"/skate/picos/[id]">) {
  return (
    <section className="px-4 pb-20 pt-8 sm:px-6">
      <div className="mx-auto flex max-w-[720px] flex-col gap-6">
        <Link href="/skate/mapa" className="link-ficha no-underline">← Mapa</Link>
        <Suspense fallback={<p className="text-areia">Carregando pico…</p>}>
          <Pico params={params} />
        </Suspense>
      </div>
    </section>
  );
}

async function Pico({ params }: { params: PageProps<"/skate/picos/[id]">["params"] }) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const spot = await acharSpot(id);
  if (!spot) notFound();

  // Pendente ou recusado: só quem cadastrou e a moderação enxergam.
  if (spot.status !== "aprovado") {
    const [user, admin] = await Promise.all([getUser(), getAdmin()]);
    if (!admin && user?.id !== spot.descobertoPor) notFound();
  }

  return (
    <article className="flex flex-col gap-5">
      {spot.status !== "aprovado" && (
        <p className="m-0 rounded-md border border-[#f2c14e] px-3 py-2 text-[#f2c14e]">
          {spot.status === "pendente" ? "Esperando aprovação da moderação. Só você está vendo esta página." : "Este pico não foi aprovado."}
        </p>
      )}
      <header className="flex flex-col gap-2">
        <span className="rotulo text-laranja-claro">{NOME_TIPO[spot.tipo]} · {spot.cidade}</span>
        <h1 className="m-0 font-titulo text-4xl font-semibold text-creme">{spot.nome}</h1>
        <p className="m-0 font-ficha text-sm text-areia">Descoberto e batizado por {spot.nomeDescobridor}</p>
      </header>
      {spot.obstaculos.length > 0 && (
        <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
          {spot.obstaculos.map((o) => (
            <li key={o} className="rotulo rounded border border-laranja-claro px-2 py-1 text-laranja-claro">{o}</li>
          ))}
        </ul>
      )}
      {spot.descricao && <p className="m-0 whitespace-pre-line text-lg text-areia">{spot.descricao}</p>}
      <a href={linkComoChegar(spot.lat, spot.lng)} target="_blank" rel="noopener noreferrer" className="botao-laranja inline-flex items-center self-start no-underline">
        Como chegar
      </a>
    </article>
  );
}
