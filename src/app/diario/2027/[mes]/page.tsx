import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Carregando } from "@/components/diario/Carregando";
import { BarraXP, FichaCaixa, LinkFicha, Migalhas } from "@/components/diario/Ficha";
import { QuestLista } from "@/components/diario/QuestLista";
import { ANO, DIAS_SEMANA, MESES, diaCurto, diaDaSemana, diasDoMes, dois, hoje, mesPorSlug, semanaDaData, semanasDoMes } from "@/lib/diario/calendario";
import { questsDoMes, xpDoMes } from "@/lib/diario/dados";
import { exigeUsuario } from "@/lib/diario/sessao";

export const metadata = { title: "Mês" };

// Os 12 meses são conhecidos: a casca da página sai pronta no build e só os dados do usuário chegam depois.
export function generateStaticParams() {
  return MESES.map((m) => ({ mes: m.slug }));
}

export default function Page(props: PageProps<"/diario/2027/[mes]">) {
  return (
    <Suspense fallback={<Carregando />}>
      <MesPagina params={props.params} />
    </Suspense>
  );
}

const linkDoDia = (d: string) => {
  const n = semanaDaData(d);
  return n === 0 ? "/diario/2027/pre-missao" : `/diario/2027/semana/${n}#dia-${d}`;
};

async function MesPagina({ params }: { params: Promise<{ mes: string }> }) {
  const { mes: slug } = await params;
  const mes = mesPorSlug(slug);
  if (!mes) notFound();
  const userId = await exigeUsuario(`/diario/2027/${slug}`);
  const [quests, xp] = await Promise.all([questsDoMes(userId, mes), xpDoMes(userId, mes)]);
  const info = MESES[mes - 1];
  const dias = diasDoMes(mes);
  const vazios = diaDaSemana(dias[0]);
  const dia = hoje();

  return (
    <>
      <Migalhas itens={[{ href: "/diario", label: "Diário" }, { label: info.nome }]} />
      <h1 className="diario-titulo mb-5 text-4xl sm:text-5xl">
        {info.nome} <span className="font-ficha text-2xl font-normal">{ANO}</span>
      </h1>

      <div className="grid gap-4 lg:grid-cols-[1.1fr_1fr]">
        <FichaCaixa titulo="Calendário" id="calendario">
          <table className="w-full table-fixed border-collapse text-center">
            <caption className="sr-only">Calendário de {info.nome}. Cada dia abre a semana dele.</caption>
            <thead>
              <tr>
                {DIAS_SEMANA.map((d) => (
                  <th key={d} scope="col" className="ficha-rotulo pb-2 !text-[11px] font-normal">
                    <abbr title={d} className="no-underline">
                      {d.slice(0, 3)}
                    </abbr>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: Math.ceil((vazios + dias.length) / 7) }, (_, linha) => (
                <tr key={linha}>
                  {Array.from({ length: 7 }, (_, col) => {
                    const d = dias[linha * 7 + col - vazios];
                    return (
                      <td key={col} className="p-0.5">
                        {d && (
                          <Link
                            href={linkDoDia(d)}
                            aria-label={`${diaCurto(d)}${d === dia ? ", hoje" : ""}`}
                            className={`flex aspect-square items-center justify-center rounded-md border-2 font-ficha text-sm hover:bg-[#fffbe8] ${d === dia ? "border-noite bg-laranja-claro" : "border-noite/25"}`}
                          >
                            {Number(d.slice(8))}
                          </Link>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </FichaCaixa>

        <div className="flex flex-col gap-4">
          <FichaCaixa>
            <BarraXP pontos={xp} />
            <p className="mt-2 text-sm">Cada quest concluída no mês vale 1 bloco.</p>
          </FichaCaixa>
          <FichaCaixa titulo="Semanas" id="semanas">
            <ul className="flex flex-wrap gap-2">
              {mes === 1 && (
                <li>
                  <LinkFicha href="/diario/2027/pre-missao">Pré-missão</LinkFicha>
                </li>
              )}
              {semanasDoMes(mes).map((s) => (
                <li key={s.n}>
                  <LinkFicha href={`/diario/2027/semana/${s.n}`}>
                    S{dois(s.n)} · {diaCurto(s.inicio)}
                  </LinkFicha>
                </li>
              ))}
            </ul>
          </FichaCaixa>
          <div className="grid grid-cols-2 gap-3">
            <LinkFicha href={`/diario/2027/${slug}/habitos`} className="diario-titulo !font-ficha">
              Hábitos →
            </LinkFicha>
            <LinkFicha href={`/diario/2027/${slug}/inventario`} className="diario-titulo !font-ficha">
              Inventário →
            </LinkFicha>
          </div>
        </div>
      </div>

      <FichaCaixa titulo="Quests principais do mês" id="quests-mes" className="mt-4">
        <QuestLista quests={quests} alvo={{ scope: "month", year: ANO, month: mes }} rotulo={info.nome} />
      </FichaCaixa>
    </>
  );
}
