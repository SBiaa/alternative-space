import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Abas, Cabecalho } from "@/components/diario/Ficha";
import { Carregando } from "@/components/diario/Carregando";
import { GradeHabitos } from "@/components/diario/GradeHabitos";
import { ANO, MESES, diasDoMes, hoje, mesPorSlug, semanaDaData, semanasDoMes } from "@/lib/diario/calendario";
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
  const dias = diasDoMes(mes);
  const dia = hoje();

  return (
    <div className="flex flex-col gap-6">
      <Cabecalho etiqueta={`Diário de Bordo ${ANO} · ${info.nome}`} titulo="Hábitos" apoio="Até 12 hábitos. Toque no dia pra marcar." />
      <Abas atual="habitos" mes={mes} semana={dias.includes(dia) ? semanaDaData(dia)! : semanasDoMes(mes)[0].n} />
      <GradeHabitos key={mes} mes={mes} dias={dias} hoje={dia} habitos={habitos} feitos={feitos} legenda={legenda} humor={humor} />
    </div>
  );
}
