import { Suspense } from "react";
import { Carregando } from "@/components/diario/Carregando";
import { FichaCaixa, LinkFicha, Migalhas } from "@/components/diario/Ficha";
import { QuestLista } from "@/components/diario/QuestLista";
import { DIAS_SEMANA, diaCurto, diaDaSemana, preMissao } from "@/lib/diario/calendario";
import { questsDosDias } from "@/lib/diario/dados";
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
  const quests = dias.length ? await questsDosDias(userId, dias[0], dias.at(-1)!) : [];

  return (
    <>
      <Migalhas itens={[{ href: "/diario", label: "Diário" }, { href: "/diario/2027/janeiro", label: "Janeiro" }, { label: "Pré-missão" }]} />
      <h1 className="diario-titulo text-4xl sm:text-5xl">Pré-missão</h1>
      <p className="ficha-rotulo mb-6 mt-1">
        {diaCurto(dias[0])} a {diaCurto(dias.at(-1)!)} · aquecimento antes da semana 01
      </p>
      <div className="grid gap-4 md:grid-cols-3">
        {dias.map((d) => (
          <FichaCaixa
            key={d}
            id={`dia-${d}`}
            titulo={
              <span className="flex items-baseline justify-between gap-2">
                <span>{DIAS_SEMANA[diaDaSemana(d)]}</span>
                <span className="font-ficha text-sm font-normal">{diaCurto(d)}</span>
              </span>
            }
          >
            <QuestLista quests={quests.filter((q) => q.date === d)} alvo={{ scope: "day", date: d }} rotulo={diaCurto(d)} />
          </FichaCaixa>
        ))}
      </div>
      <nav aria-label="Próxima semana" className="mt-8 flex justify-end">
        <LinkFicha href="/diario/2027/semana/1">Semana 01 →</LinkFicha>
      </nav>
    </>
  );
}
