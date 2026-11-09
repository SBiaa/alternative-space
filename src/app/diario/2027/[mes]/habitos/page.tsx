import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Carregando } from "@/components/diario/Carregando";
import { Migalhas } from "@/components/diario/Ficha";
import { GradeHabitos } from "@/components/diario/GradeHabitos";
import { MESES, diasDoMes, mesPorSlug } from "@/lib/diario/calendario";
import { habitosDoMes, humorDoMes } from "@/lib/diario/dados";
import { exigeUsuario } from "@/lib/diario/sessao";

export const metadata = { title: "Hábitos" };

// Os 12 meses são conhecidos: a casca da página sai pronta no build e só os dados do usuário chegam depois.
export function generateStaticParams() {
  return MESES.map((m) => ({ mes: m.slug }));
}

export default function Page(props: PageProps<"/diario/2027/[mes]/habitos">) {
  return (
    <Suspense fallback={<Carregando />}>
      <Habitos params={props.params} />
    </Suspense>
  );
}

async function Habitos({ params }: { params: Promise<{ mes: string }> }) {
  const { mes: slug } = await params;
  const mes = mesPorSlug(slug);
  if (!mes) notFound();
  const userId = await exigeUsuario(`/diario/2027/${slug}/habitos`);
  const [{ habitos, feitos }, { legenda, dias: humor }] = await Promise.all([habitosDoMes(userId, mes), humorDoMes(userId, mes)]);
  const info = MESES[mes - 1];

  return (
    <>
      <Migalhas itens={[{ href: "/diario", label: "Diário" }, { href: `/diario/2027/${slug}`, label: info.nome }, { label: "Hábitos" }]} />
      <h1 className="diario-titulo text-4xl sm:text-5xl">Hábitos de {info.nome}</h1>
      <p className="ficha-rotulo mb-5 mt-1">Até 12 hábitos · toque no dia pra marcar</p>
      <GradeHabitos key={mes} mes={mes} dias={diasDoMes(mes)} habitos={habitos} feitos={feitos} legenda={legenda} humor={humor} />
    </>
  );
}
