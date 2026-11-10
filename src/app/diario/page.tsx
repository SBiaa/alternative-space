import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { Carregando } from "@/components/diario/Carregando";
import { hoje, semanaDaData } from "@/lib/diario/calendario";

export const metadata = { title: "Diário de Bordo 2027" };

// /diario abre na semana de hoje. Antes da missão (e na Pré-missão), abre a Pré-missão; depois dela, o índice do ano.
export default function Page() {
  return (
    <Suspense fallback={<Carregando />}>
      <IrPraHoje />
    </Suspense>
  );
}

async function IrPraHoje(): Promise<never> {
  await connection();
  const dia = hoje();
  const n = semanaDaData(dia);
  if (n === null) redirect(dia < "2027-01-01" ? "/diario/2027/pre-missao" : "/diario/2027");
  redirect(n === 0 ? "/diario/2027/pre-missao" : `/diario/2027/semana/${n}#dia-${dia}`);
}
