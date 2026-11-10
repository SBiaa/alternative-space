import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Carregando } from "@/components/diario/Carregando";
import { Abas, Cabecalho, Constelacao, LinkVidro } from "@/components/diario/Ficha";
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
  const semanas = semanasDoMes(mes);

  return (
    <div className="flex flex-col gap-6">
      <Cabecalho etiqueta={`Diário de Bordo ${ANO}`} titulo={info.nome} apoio={`${semanas.length} semanas${mes === 1 ? " e a Pré-missão" : ""}`}>
        {mes > 1 && <LinkVidro href={`/diario/2027/${MESES[mes - 2].slug}`}>‹ {MESES[mes - 2].nome}</LinkVidro>}
        {mes < 12 && <LinkVidro href={`/diario/2027/${MESES[mes].slug}`}>{MESES[mes].nome} ›</LinkVidro>}
      </Cabecalho>
      <Abas atual="mes" mes={mes} semana={dias.includes(dia) ? semanaDaData(dia)! : semanas[0].n} />

      <div className="flex flex-wrap items-start gap-6">
        <div className="flex min-w-0 flex-[999_1_560px] flex-col gap-4">
          <section aria-labelledby="calendario" className="surface-vidro p-4">
            <h2 id="calendario" className="rotulo mb-3 text-laranja-claro">
              Calendário
            </h2>
            <table className="w-full table-fixed border-collapse text-center">
              <caption className="sr-only">Calendário de {info.nome}. Cada dia abre a semana dele.</caption>
              <thead>
                <tr>
                  {DIAS_SEMANA.map((d) => (
                    <th key={d} scope="col" className="pb-2 font-ficha text-[11px] font-normal text-areia">
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
                              aria-current={d === dia ? "date" : undefined}
                              className={`flex min-h-11 items-center justify-center rounded-md font-ficha text-sm no-underline ${d === dia ? "bg-laranja-claro font-bold text-noite" : "text-creme hover:bg-creme/10"}`}
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
          </section>

          <section aria-labelledby="quests-mes" className="surface-creme flex flex-col gap-3 p-4">
            <h2 id="quests-mes" className="rotulo text-azul">
              Quests principais de {info.nome}
            </h2>
            <QuestLista quests={quests} alvo={{ scope: "month", year: ANO, month: mes }} rotulo={info.nome} tom="creme" />
          </section>
        </div>

        <aside className="flex min-w-0 flex-[1_1_280px] flex-col gap-4">
          <Constelacao pontos={xp} mes={mes} />
          <nav aria-labelledby="semanas-mes" className="surface-vidro flex flex-col gap-3 p-[18px]">
            <h2 id="semanas-mes" className="rotulo text-laranja-claro">
              Semanas
            </h2>
            <ul className="flex flex-col">
              {mes === 1 && (
                <li>
                  <Link href="/diario/2027/pre-missao" className="flex min-h-11 items-center justify-between border-t border-creme/18 text-creme no-underline hover:text-laranja-claro">
                    <span>Pré-missão</span>
                    <span className="font-ficha text-xs text-poeira">01–03/jan</span>
                  </Link>
                </li>
              )}
              {semanas.map((s) => (
                <li key={s.n}>
                  <Link href={`/diario/2027/semana/${s.n}`} className="flex min-h-11 items-center justify-between border-t border-creme/18 text-creme no-underline hover:text-laranja-claro">
                    <span>Semana {dois(s.n)}</span>
                    <span className="font-ficha text-xs text-poeira">
                      {diaCurto(s.inicio)}–{diaCurto(s.fim)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <div className="grid grid-cols-2 gap-2">
            <LinkVidro href={`/diario/2027/${slug}/habitos`}>Hábitos</LinkVidro>
            <LinkVidro href={`/diario/2027/${slug}/inventario`}>Inventário</LinkVidro>
          </div>
        </aside>
      </div>
    </div>
  );
}
