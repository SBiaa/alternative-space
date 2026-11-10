import Link from "next/link";
import { Suspense } from "react";
import { Carregando } from "@/components/diario/Carregando";
import { Abas, Cabecalho, Estrelas, LinkLaranja } from "@/components/diario/Ficha";
import { ANO, MESES, diaCurto, dois, hoje, mesDaData, semanaDaData, semanasDoMes } from "@/lib/diario/calendario";
import { xpDoAno } from "@/lib/diario/dados";
import { exigeUsuario } from "@/lib/diario/sessao";

export const metadata = { title: "Visão do ano" };

export default function Page() {
  return (
    <Suspense fallback={<Carregando />}>
      <Indice />
    </Suspense>
  );
}

const chip = "inline-flex min-h-11 min-w-11 items-center justify-center rounded px-2 font-ficha text-xs no-underline";

async function Indice() {
  const userId = await exigeUsuario("/diario/2027");
  const xp = await xpDoAno(userId);
  const dia = hoje();
  const atual = semanaDaData(dia); // 0 = pré-missão, null = fora de 2027
  const mesAtual = mesDaData(dia) ?? 1;

  return (
    <div className="flex flex-col gap-6">
      <Cabecalho etiqueta={`Diário de Bordo ${ANO}`} titulo="Visão do ano" apoio="12 meses, 52 semanas e a Pré-missão.">
        <LinkLaranja href="/diario">Ir pra hoje</LinkLaranja>
      </Cabecalho>
      <Abas atual="ano" mes={mesAtual} semana={atual ?? 1} />

      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {MESES.map((m, i) => {
          const mes = i + 1;
          const esteMes = atual !== null && mes === mesAtual;
          return (
            <li key={m.slug} className={`${esteMes ? "surface-creme" : "surface-vidro"} flex flex-col gap-3 p-4`}>
              <div className="flex items-baseline justify-between gap-2">
                <Link href={`/diario/2027/${m.slug}`} className={`text-[22px] font-semibold no-underline hover:underline ${esteMes ? "text-azul" : "text-creme"}`}>
                  {m.nome}
                </Link>
                <span className={`font-ficha text-xs ${esteMes ? "text-[#4a4a4a]" : "text-poeira"}`}>{xp[mes] ?? 0}/10</span>
              </div>
              {esteMes ? (
                <div className="w-fit rounded bg-cabine px-2 py-1.5">
                  <Estrelas pontos={xp[mes] ?? 0} mes={mes} tamanho={14} />
                </div>
              ) : (
                <Estrelas pontos={xp[mes] ?? 0} mes={mes} tamanho={14} />
              )}
              <ul className="flex flex-wrap gap-1.5" aria-label={`Semanas de ${m.nome.toLowerCase()}`}>
                {mes === 1 && (
                  <li>
                    <Link href="/diario/2027/pre-missao" aria-current={atual === 0 ? "page" : undefined} className={`${chip} ${atual === 0 ? "bg-laranja-claro text-noite" : esteMes ? "border border-noite/30 text-noite" : "border border-creme/30 text-creme"}`}>
                      Pré
                    </Link>
                  </li>
                )}
                {semanasDoMes(mes).map((s) => {
                  const agora = s.n === atual;
                  return (
                    <li key={s.n}>
                      <Link
                        href={`/diario/2027/semana/${s.n}`}
                        aria-current={agora ? "page" : undefined}
                        className={`${chip} ${agora ? "bg-laranja-claro text-noite" : esteMes ? "border border-noite/30 text-noite hover:bg-noite/8" : "border border-creme/30 text-creme hover:bg-creme/10"}`}
                      >
                        <span aria-hidden>S{dois(s.n)}</span>
                        <span className="sr-only">
                          Semana {s.n}, {diaCurto(s.inicio)} a {diaCurto(s.fim)}
                          {agora ? " (semana atual)" : ""}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
