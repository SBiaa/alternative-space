import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { ListaCapitulos } from "@/components/fanzine/ListaCapitulos";
import { getUser } from "@/lib/auth/server";
import { capitulosPublicados, resumoDe } from "@/lib/fanzine/carregar";
import { TEXTOS } from "@/lib/fanzine/config";
import { progressoDeTodos } from "@/lib/fanzine/dados";

export const metadata: Metadata = {
  title: TEXTOS.titulo,
  description: TEXTOS.chamada,
};

export default function Page() {
  return (
    <section className="bg-ceu relative px-4 pb-18 pt-5 sm:px-6 sm:pt-9">
      <div className="mx-auto flex max-w-[720px] flex-col gap-5">
        <Link href="/jogos" className="etiqueta text-[11px] text-areia no-underline sm:text-xs">
          {TEXTOS.voltar}
        </Link>
        <h1 className="m-0 text-[28px] font-semibold leading-[1.05] tracking-[-0.02em] sm:text-[44px]">{TEXTOS.titulo}</h1>
        <p className="m-0 text-base text-areia">{TEXTOS.chamada}</p>

        <div className="surface-vidro flex flex-col gap-2 p-4">
          <h2 className="etiqueta m-0 text-[11px] text-laranja-claro">{TEXTOS.comoJogar.titulo}</h2>
          <ol className="m-0 flex flex-col gap-1.5 pl-5 text-sm text-creme sm:text-[15px]">
            {TEXTOS.comoJogar.passos.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ol>
        </div>

        <section aria-labelledby="capitulos" className="flex flex-col gap-3">
          <h2 id="capitulos" className="m-0 text-2xl font-semibold">
            {TEXTOS.capitulos.titulo}
          </h2>
          <Suspense fallback={<p className="text-areia">…</p>}>
            <Capitulos />
          </Suspense>
        </section>
      </div>
    </section>
  );
}

async function Capitulos() {
  await connection(); // a data de publicação depende da hora do pedido
  const capitulos = capitulosPublicados().map(resumoDe);
  const user = await getUser();
  const doServidor = user ? await progressoDeTodos(user.id).catch(() => ({})) : {};
  return <ListaCapitulos capitulos={capitulos} doServidor={doServidor} logado={user !== null} />;
}
