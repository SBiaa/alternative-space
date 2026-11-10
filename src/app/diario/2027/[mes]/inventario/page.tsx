import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Carregando } from "@/components/diario/Carregando";
import { Abas, Cabecalho } from "@/components/diario/Ficha";
import { Inventario } from "@/components/diario/Inventario";
import { ANO, MESES, diasDoMes, hoje, mesPorSlug, semanaDaData, semanasDoMes } from "@/lib/diario/calendario";
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
  const dia = hoje();

  return (
    <div className="flex flex-col gap-6">
      <Cabecalho etiqueta={`Diário de Bordo ${ANO} · ${info.nome}`} titulo="Inventário" apoio="Séries, animes, jogos e livros do mês." />
      <Abas atual="inventario" mes={mes} semana={diasDoMes(mes).includes(dia) ? semanaDaData(dia)! : semanasDoMes(mes)[0].n} />
      <Inventario mes={mes} itens={itens} />
    </div>
  );
}
