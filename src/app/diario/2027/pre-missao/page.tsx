import { Suspense } from "react";
import { Carregando } from "@/components/diario/Carregando";
import { Abas, Cabecalho, Constelacao, Estrelas, LinkVidro } from "@/components/diario/Ficha";
import { SemanaVista } from "@/components/diario/SemanaVista";
import { diaCurto, hoje, preMissao } from "@/lib/diario/calendario";
import { habitosDoMes, questsDosDias, xpDoMes } from "@/lib/diario/dados";
import { exigeUsuario } from "@/lib/diario/sessao";

export const metadata = { title: "Pré-missão" };

export default function Page() {
  return (
    <Suspense fallback={<Carregando />}>
      <PreMissao />
    </Suspense>
  );
}

async function PreMissao() {
  const userId = await exigeUsuario("/diario/2027/pre-missao");
  const dias = preMissao();
  const [quests, xp, habitos] = await Promise.all([
    dias.length ? questsDosDias(userId, dias[0], dias.at(-1)!) : Promise.resolve([]),
    xpDoMes(userId, 1),
    habitosDoMes(userId, 1),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <Cabecalho etiqueta="Diário de Bordo 2027 · Janeiro" titulo="Pré-missão" apoio={`${diaCurto(dias[0])} a ${diaCurto(dias.at(-1)!)} · aquecimento antes da semana 01`}>
        <LinkVidro href="/diario/2027/semana/1">Semana 01 ›</LinkVidro>
      </Cabecalho>
      <Abas atual="semana" mes={1} semana={0} />
      <SemanaVista
        dias={dias.map((d) => ({ date: d, quests: quests.filter((q) => q.date === d) }))}
        hoje={hoje()}
        habitos={[{ mes: 1, ...habitos }]}
        estrelas={<div className="flex justify-center"><Estrelas pontos={xp} mes={1} tamanho={20} /></div>}
        lateral={
          <div className="hidden lg:block">
            <Constelacao pontos={xp} mes={1} />
          </div>
        }
      />
    </div>
  );
}
