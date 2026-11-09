import { notFound } from "next/navigation";
import { Suspense } from "react";
import { BuffDebuff } from "@/components/diario/BuffDebuff";
import { Carregando } from "@/components/diario/Carregando";
import { FichaCaixa, LinkFicha, Migalhas } from "@/components/diario/Ficha";
import { QuestLista } from "@/components/diario/QuestLista";
import { DIAS_SEMANA, MESES, diaCurto, dois, hoje, semana, semanas, totalSemanas } from "@/lib/diario/calendario";
import { notaDaSemana, questsDosDias } from "@/lib/diario/dados";
import { exigeUsuario } from "@/lib/diario/sessao";

export const metadata = { title: "Semana" };

// As 52 semanas são conhecidas: a casca sai pronta no build e só os dados do usuário chegam depois.
export function generateStaticParams() {
  return semanas().map((s) => ({ n: String(s.n) }));
}

export default function Page(props: PageProps<"/diario/2027/semana/[n]">) {
  return (
    <Suspense fallback={<Carregando />}>
      <SemanaPagina params={props.params} />
    </Suspense>
  );
}

async function SemanaPagina({ params }: { params: Promise<{ n: string }> }) {
  const { n: bruto } = await params;
  const n = /^\d{1,2}$/.test(bruto) ? Number(bruto) : NaN;
  const s = semana(n);
  if (!s) notFound();
  const userId = await exigeUsuario(`/diario/2027/semana/${n}`);
  const [quests, nota] = await Promise.all([questsDosDias(userId, s.inicio, s.fim), notaDaSemana(userId, n)]);
  const mes = MESES[s.mes - 1];
  const dia = hoje();

  return (
    <>
      <Migalhas itens={[{ href: "/diario", label: "Diário" }, { href: `/diario/2027/${mes.slug}`, label: mes.nome }, { label: `Semana ${dois(n)}` }]} />
      <header className="mb-5">
        <h1 className="diario-titulo text-4xl sm:text-5xl">Semana {dois(n)}</h1>
        <p className="ficha-rotulo mt-1">
          {diaCurto(s.inicio)} a {diaCurto(s.fim)} · {mes.nome}
        </p>
      </header>

      <div className="mb-6">
        <BuffDebuff key={n} semana={n} buff={nota.buff} debuff={nota.debuff} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {s.dias.map((d, i) => (
          <FichaCaixa
            key={d}
            id={`dia-${d}`}
            className={d === dia ? "!bg-[#fffbe8] shadow-[4px_4px_0_#01121e]" : ""}
            titulo={
              <span className="flex items-baseline justify-between gap-2">
                <span>{DIAS_SEMANA[i]}</span>
                <span className="font-ficha text-sm font-normal">
                  {diaCurto(d)}
                  {d === dia && " · hoje"}
                </span>
              </span>
            }
          >
            <QuestLista quests={quests.filter((q) => q.date === d)} alvo={{ scope: "day", date: d }} rotulo={`${DIAS_SEMANA[i]}, ${diaCurto(d)}`} />
          </FichaCaixa>
        ))}
      </div>

      <nav aria-label="Outras semanas" className="mt-8 flex flex-wrap justify-between gap-3">
        {n > 1 ? <LinkFicha href={`/diario/2027/semana/${n - 1}`}>← Semana {dois(n - 1)}</LinkFicha> : <LinkFicha href="/diario/2027/pre-missao">← Pré-missão</LinkFicha>}
        {n < totalSemanas() && <LinkFicha href={`/diario/2027/semana/${n + 1}`}>Semana {dois(n + 1)} →</LinkFicha>}
      </nav>
    </>
  );
}
