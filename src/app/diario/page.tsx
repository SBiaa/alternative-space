import Link from "next/link";
import { Suspense } from "react";
import { BarraXP, FichaCaixa, LinkFicha } from "@/components/diario/Ficha";
import { Carregando } from "@/components/diario/Carregando";
import { ANO, MESES, diaCurto, dois, hoje, semanaDaData, semanasDoMes } from "@/lib/diario/calendario";
import { xpDoAno } from "@/lib/diario/dados";
import { exigeUsuario } from "@/lib/diario/sessao";

export const metadata = { title: "Índice" };

export default function Page() {
  return (
    <Suspense fallback={<Carregando />}>
      <Indice />
    </Suspense>
  );
}

async function Indice() {
  const userId = await exigeUsuario("/diario");
  const xp = await xpDoAno(userId);
  const dia = hoje();
  const atual = semanaDaData(dia); // 0 = pré-missão, null = fora de 2027
  const antes = dia < `${ANO}-01-01`;

  const destaque =
    atual === 0 || (atual === null && antes)
      ? { href: "/diario/2027/pre-missao", titulo: "Pré-missão", texto: antes ? "A missão começa em 01/jan/2027. Dá pra deixar tudo pronto." : "01 a 03/jan" }
      : atual === null
        ? { href: "/diario/2027/semana/52", titulo: "Semana 52", texto: "A última semana da missão." }
        : { href: `/diario/2027/semana/${atual}`, titulo: `Semana ${dois(atual)}`, texto: "Sua semana atual." };

  return (
    <>
      <h1 className="diario-titulo mb-1 text-4xl sm:text-5xl">Diário de Bordo {ANO}</h1>
      <p className="ficha-rotulo mb-6">Índice da missão</p>

      <Link href={destaque.href} className="ficha-caixa mb-8 block bg-[#fffbe8] p-5 hover:bg-white">
        <span className="ficha-rotulo">{atual !== null && atual > 0 ? "Você está aqui" : "Comece por aqui"}</span>
        <span className="diario-titulo mt-1 block text-3xl">{destaque.titulo} →</span>
        <span className="mt-1 block">{destaque.texto}</span>
      </Link>

      <h2 className="diario-titulo mb-3 text-2xl">Meses e semanas</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {MESES.map((m, i) => {
          const mes = i + 1;
          return (
            <FichaCaixa key={m.slug} titulo={<Link href={`/diario/2027/${m.slug}`} className="underline-offset-4 hover:underline">{m.nome}</Link>} id={`mes-${m.slug}`}>
              <div className="mb-3">
                <BarraXP pontos={xp[mes] ?? 0} />
              </div>
              <ul className="flex flex-wrap gap-2">
                {mes === 1 && (
                  <li>
                    <LinkFicha href="/diario/2027/pre-missao" className={atual === 0 ? "!bg-laranja-claro" : ""}>
                      Pré
                    </LinkFicha>
                  </li>
                )}
                {semanasDoMes(mes).map((s) => (
                  <li key={s.n}>
                    <LinkFicha href={`/diario/2027/semana/${s.n}`} className={s.n === atual ? "!bg-laranja-claro" : ""}>
                      <span aria-hidden>S{dois(s.n)}</span>
                      <span className="sr-only">
                        Semana {s.n}, {diaCurto(s.inicio)} a {diaCurto(s.fim)}
                        {s.n === atual ? " (semana atual)" : ""}
                      </span>
                    </LinkFicha>
                  </li>
                ))}
              </ul>
            </FichaCaixa>
          );
        })}
      </div>
    </>
  );
}
