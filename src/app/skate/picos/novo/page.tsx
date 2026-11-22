import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { FormNovoPico } from "@/components/skate/FormNovoPico";
import { getUser } from "@/lib/auth/server";

export const metadata: Metadata = { title: "Cadastrar pico · Skate Universe", robots: { index: false } };

export default function NovoPicoPage() {
  return (
    <section className="px-4 pb-20 pt-8 sm:px-6">
      <div className="mx-auto flex max-w-[720px] flex-col gap-6">
        <Link href="/skate/mapa" className="link-ficha no-underline">← Mapa</Link>
        <header className="flex flex-col gap-2">
          <span className="etiqueta text-laranja-claro">Cadastrar pico</span>
          <h1 className="h2 m-0 text-creme">Achou um pico? Dá o nome.</h1>
          <p className="m-0 text-areia">Depois que a moderação aprovar, ele aparece no mapa com o seu crédito de descoberta.</p>
        </header>
        <Suspense fallback={<p className="text-areia">Carregando…</p>}>
          <Conteudo />
        </Suspense>
      </div>
    </section>
  );
}

async function Conteudo() {
  const user = await getUser();
  if (!user) {
    return (
      <div className="surface-vidro flex flex-col gap-3 p-5">
        <p className="m-0 text-creme">Entre na sua conta pra cadastrar um pico. É assim que o crédito da descoberta fica no seu nome.</p>
        <div className="flex flex-wrap gap-2">
          <Link href={`/entrar?next=${encodeURIComponent("/skate/picos/novo")}`} className="botao-laranja inline-flex items-center no-underline">Entrar</Link>
          <Link href="/cadastro" className="botao-vidro inline-flex items-center no-underline">Criar conta</Link>
        </div>
      </div>
    );
  }
  return <FormNovoPico />;
}
