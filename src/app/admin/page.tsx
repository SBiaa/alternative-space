import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { banir, desbanir } from "@/app/actions/admin";
import { requireAdmin } from "@/lib/auth/admin";
import { listTripulantes, overview, quizCounts } from "@/lib/admin";
import { getResult, quizzes } from "@/lib/quiz";

export const metadata: Metadata = { title: "Painel", robots: { index: false, follow: false } };

export default function Page({ searchParams }: PageProps<"/admin">) {
  return (
    <section className="secao !pt-16">
      <div className="miolo flex flex-col gap-12">
        <Suspense fallback={<p className="font-titulo text-2xl font-bold text-azul">Abrindo o painel…</p>}>
          <Painel searchParams={searchParams} />
        </Suspense>
      </div>
    </section>
  );
}

const data = (iso: string) =>
  new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });

async function Painel({ searchParams }: { searchParams: PageProps<"/admin">["searchParams"] }) {
  const admin = await requireAdmin();
  const sp = await searchParams;
  const busca = typeof sp.busca === "string" ? sp.busca.slice(0, 100) : "";
  const [resumo, contagens, tripulantes] = await Promise.all([overview(), quizCounts(), listTripulantes(busca)]);

  const porQuiz = new Map<string, { result: string; total: number }[]>();
  for (const c of contagens) porQuiz.set(c.quiz, [...(porQuiz.get(c.quiz) ?? []), c]);

  return (
    <>
      <div className="flex flex-col gap-3">
        <span className="etiqueta text-azul">Painel de admin</span>
        <h1 className="font-titulo font-bold leading-[1] text-azul" style={{ fontSize: "clamp(2.4rem, 6vw, 4rem)" }}>
          Ponte de comando.
        </h1>
        <p className="text-lg text-tinta">Logada como {admin.email}. Só quem tem papel de admin vê esta página.</p>
      </div>

      <ul className="grid list-none grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-4 p-0">
        {[
          ["Tripulantes", resumo.tripulantes],
          ["Novos em 7 dias", resumo.novos7d],
          ["Resultados salvos", resumo.resultados],
          ["Banidos", resumo.banidos],
        ].map(([label, n]) => (
          <li key={label} className="card flex flex-col gap-1 p-5">
            <span className="etiqueta text-[13px] text-neutro">{label}</span>
            <span className="font-titulo text-[2.25rem] font-bold leading-none text-azul">{n}</span>
          </li>
        ))}
      </ul>

      <div className="flex flex-col gap-5">
        <h2 className="font-titulo text-[1.75rem] font-bold text-azul">Quizzes</h2>
        <p className="text-tinta">Conta o resultado mais recente de cada pessoa.</p>
        <ul className="grid list-none grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-4 p-0">
          {Object.entries(quizzes).map(([slug, q]) => {
            const linhas = porQuiz.get(slug) ?? [];
            const total = linhas.reduce((s, l) => s + l.total, 0);
            return (
              <li key={slug} className="card flex flex-col gap-3 p-5">
                <span className="font-titulo text-lg font-bold text-noite">{q.intro.title}</span>
                {total === 0 ? (
                  <span className="text-neutro">Ninguém fez ainda.</span>
                ) : (
                  <ul className="flex list-none flex-col gap-1 p-0">
                    {linhas.map((l) => (
                      <li key={l.result} className="flex justify-between gap-3">
                        <span>{getResult(q, l.result)?.name ?? l.result}</span>
                        <span className="font-ficha">
                          {l.total} · {Math.round((l.total / total) * 100)}%
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      </div>

      <div className="flex flex-col gap-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 className="font-titulo text-[1.75rem] font-bold text-azul">Tripulantes</h2>
          <form className="flex flex-wrap gap-2" role="search">
            <label htmlFor="busca" className="sr-only">Buscar por nome ou e-mail</label>
            <input
              id="busca"
              name="busca"
              defaultValue={busca}
              placeholder="Nome ou e-mail"
              className="rounded-xl border-2 border-noite bg-creme-claro px-4 py-2"
            />
            <button type="submit" className="btn bg-azul text-creme !px-5 !py-2">Buscar</button>
            {busca && <Link href="/admin" className="btn bg-creme-claro text-noite !px-5 !py-2">Limpar</Link>}
          </form>
        </div>

        {tripulantes.length === 0 ? (
          <p className="text-neutro">Ninguém encontrado.</p>
        ) : (
          <div className="overflow-x-auto rounded-2xl border-2 border-noite">
            <table className="w-full min-w-[640px] border-collapse text-left">
              <thead className="bg-creme-claro font-ficha text-xs uppercase tracking-wider">
                <tr>
                  <th className="p-3">Nome</th>
                  <th className="p-3">E-mail</th>
                  <th className="p-3">Entrou em</th>
                  <th className="p-3">Quizzes</th>
                  <th className="p-3">Situação</th>
                </tr>
              </thead>
              <tbody>
                {tripulantes.map((t) => (
                  <tr key={t.id} className="border-t-2 border-noite/15 align-top">
                    <td className="p-3 font-bold">
                      {t.name}
                      {t.admin && <span className="etiqueta ml-2 text-[11px] text-laranja">admin</span>}
                    </td>
                    <td className="p-3 break-all">{t.email}</td>
                    <td className="p-3 whitespace-nowrap">{data(t.createdAt)}</td>
                    <td className="p-3">{t.quizzes}</td>
                    <td className="p-3">
                      {t.id === admin.id ? (
                        <span className="text-neutro">Você</span>
                      ) : t.banned ? (
                        <form action={desbanir} className="flex items-center gap-3">
                          <input type="hidden" name="userId" value={t.id} />
                          <span className="font-bold text-red-700">Banido</span>
                          <button type="submit" className="underline">Desbanir</button>
                        </form>
                      ) : (
                        <details>
                          <summary className="cursor-pointer underline">Banir</summary>
                          <form action={banir} className="mt-2 flex flex-col gap-2">
                            <input type="hidden" name="userId" value={t.id} />
                            <label className="text-sm" htmlFor={`motivo-${t.id}`}>Motivo (opcional)</label>
                            <input
                              id={`motivo-${t.id}`}
                              name="motivo"
                              maxLength={200}
                              className="rounded-lg border-2 border-noite bg-creme-claro px-3 py-1"
                            />
                            <button type="submit" className="btn bg-noite text-creme !px-4 !py-2 !text-base">
                              Confirmar banimento
                            </button>
                          </form>
                        </details>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
