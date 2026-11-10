import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { BuffDebuff } from "@/components/diario/BuffDebuff";
import { Carregando } from "@/components/diario/Carregando";
import { Abas, Cabecalho, Constelacao, Estrelas, LinkLaranja, LinkVidro, nomeSemana } from "@/components/diario/Ficha";
import { SemanaVista } from "@/components/diario/SemanaVista";
import { DIAS_SEMANA, MESES, diaDaSemana, dois, hoje, semana, semanas, totalSemanas } from "@/lib/diario/calendario";
import { habitosDoMes, notaDaSemana, questsDosDias, xpDoMes } from "@/lib/diario/dados";
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

/** "15 a 21 de março" ou "29 de março a 04 de abril" */
function periodo(inicio: string, fim: string) {
  const m1 = MESES[Number(inicio.slice(5, 7)) - 1].nome.toLowerCase();
  const m2 = MESES[Number(fim.slice(5, 7)) - 1].nome.toLowerCase();
  return m1 === m2 ? `${inicio.slice(8)} a ${fim.slice(8)} de ${m1}` : `${inicio.slice(8)} de ${m1} a ${fim.slice(8)} de ${m2}`;
}

async function SemanaPagina({ params }: { params: Promise<{ n: string }> }) {
  const { n: bruto } = await params;
  const n = /^\d{1,2}$/.test(bruto) ? Number(bruto) : NaN;
  const s = semana(n);
  if (!s) notFound();
  const userId = await exigeUsuario(`/diario/2027/semana/${n}`);
  // Hábitos são do mês do calendário; a semana 52 termina em 2028, que fica de fora.
  const mesesDaSemana = [...new Set(s.dias.filter((d) => d.startsWith("2027")).map((d) => Number(d.slice(5, 7))))];
  const [quests, nota, xp, habitos] = await Promise.all([
    questsDosDias(userId, s.inicio, s.fim),
    notaDaSemana(userId, n),
    xpDoMes(userId, s.mes),
    Promise.all(mesesDaSemana.map(async (mes) => ({ mes, ...(await habitosDoMes(userId, mes)) }))),
  ]);
  const mes = MESES[s.mes - 1];
  const dia = hoje();
  const hojeAqui = s.dias.includes(dia);
  const anterior = n > 1 ? `/diario/2027/semana/${n - 1}` : "/diario/2027/pre-missao";
  const proxima = n < totalSemanas() ? `/diario/2027/semana/${n + 1}` : null;

  return (
    <div className="flex flex-col gap-6">
      {/* Celular: ‹ Semana › */}
      <div className="flex items-center justify-between gap-2 lg:hidden">
        <Link href={anterior} aria-label={n > 1 ? `Semana ${n - 1}` : "Pré-missão"} className="botao-vidro inline-flex w-11 items-center justify-center !px-0 text-xl no-underline">
          ‹
        </Link>
        <div className="flex flex-col items-center gap-1 text-center">
          <Link href={`/diario/2027/${mes.slug}`} className="rotulo text-laranja-claro no-underline">
            Diário · {mes.nome}
          </Link>
          <h1 className="text-[28px] font-semibold leading-none">{nomeSemana(n)}</h1>
        </div>
        {proxima ? (
          <Link href={proxima} aria-label={`Semana ${n + 1}`} className="botao-vidro inline-flex w-11 items-center justify-center !px-0 text-xl no-underline">
            ›
          </Link>
        ) : (
          <span className="w-11" />
        )}
      </div>

      {/* Computador */}
      <div className="hidden flex-col gap-6 lg:flex">
        <Cabecalho
          etiqueta={`Diário de Bordo 2027 · ${mes.nome}`}
          titulo={`Semana ${dois(n)}`}
          apoio={`${periodo(s.inicio, s.fim)}${hojeAqui ? ` · ${DIAS_SEMANA[diaDaSemana(dia)]} é hoje` : ""}`}
        >
          <LinkVidro href={anterior}>‹ {n > 1 ? `Semana ${dois(n - 1)}` : "Pré-missão"}</LinkVidro>
          {!hojeAqui && <LinkLaranja href="/diario">Ir pra hoje</LinkLaranja>}
          {proxima && <LinkVidro href={proxima}>Semana {dois(n + 1)} ›</LinkVidro>}
        </Cabecalho>
        <Abas atual="semana" mes={s.mes} semana={n} />
      </div>

      <SemanaVista
        dias={s.dias.map((d) => ({ date: d, quests: quests.filter((q) => q.date === d) }))}
        hoje={dia}
        habitos={habitos}
        estrelas={
          <div className="flex items-center justify-center gap-2">
            <Estrelas pontos={xp} mes={s.mes} tamanho={20} />
            <span className="font-ficha text-xs text-areia" aria-hidden>
              {xp}/10
            </span>
          </div>
        }
        lateral={
          <>
            <div className="hidden lg:block">
              <Constelacao pontos={xp} mes={s.mes} />
            </div>
            <BuffDebuff key={n} semana={n} buff={nota.buff} debuff={nota.debuff} />
          </>
        }
      />

      {/* Celular: atalhos para as outras visões */}
      <nav aria-label="Outras visões do diário" className="grid grid-cols-3 gap-2 lg:hidden">
        <LinkVidro href={`/diario/2027/${mes.slug}`}>Mês</LinkVidro>
        <LinkVidro href={`/diario/2027/${mes.slug}/habitos`}>Hábitos</LinkVidro>
        <LinkVidro href={`/diario/2027/${mes.slug}/inventario`}>Inventário</LinkVidro>
      </nav>
    </div>
  );
}
