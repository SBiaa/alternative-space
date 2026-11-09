import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Carregando } from "@/components/diario/Carregando";
import { Migalhas } from "@/components/diario/Ficha";
import { Inventario } from "@/components/diario/Inventario";
import { MESES, mesPorSlug } from "@/lib/diario/calendario";
import { inventarioDoMes } from "@/lib/diario/dados";
import { exigeUsuario } from "@/lib/diario/sessao";

export const metadata = { title: "Inventário" };

// Os 12 meses são conhecidos: a casca da página sai pronta no build e só os dados do usuário chegam depois.
export function generateStaticParams() {
  return MESES.map((m) => ({ mes: m.slug }));
}

export default function Page(props: PageProps<"/diario/2027/[mes]/inventario">) {
  return (
    <Suspense fallback={<Carregando />}>
      <InventarioPagina params={props.params} />
    </Suspense>
  );
}

async function InventarioPagina({ params }: { params: Promise<{ mes: string }> }) {
  const { mes: slug } = await params;
  const mes = mesPorSlug(slug);
  if (!mes) notFound();
  const userId = await exigeUsuario(`/diario/2027/${slug}/inventario`);
  const itens = await inventarioDoMes(userId, mes);
  const info = MESES[mes - 1];

  return (
    <>
      <Migalhas itens={[{ href: "/diario", label: "Diário" }, { href: `/diario/2027/${slug}`, label: info.nome }, { label: "Inventário" }]} />
      <h1 className="diario-titulo text-4xl sm:text-5xl">Inventário de {info.nome}</h1>
      <p className="ficha-rotulo mb-5 mt-1">Séries, animes, jogos e livros do mês</p>
      <Inventario mes={mes} itens={itens} />
    </>
  );
}
