import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { sair } from "@/app/actions/tripulante";
import { Avatar } from "@/components/Avatar";
import { sistemasAtivos } from "@/config/fichas";
import { getUser } from "@/lib/auth/server";
import { anteriores, getPerfil, historico, totalQuizzes } from "@/lib/perfil";
import { getResult, quizzes, resultTheme } from "@/lib/quiz";

export const metadata: Metadata = { title: "Sua base", robots: { index: false } };

export default function Page() {
  return (
    <section className="relative px-6 pb-16 pt-9">
      <div className="mx-auto max-w-[1240px]">
        <Suspense fallback={<p className="text-2xl font-semibold">Abrindo a base…</p>}>
          <Base />
        </Suspense>
      </div>
    </section>
  );
}

const data = (d: string | Date) => new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });

function saudacao() {
  const hora = Number(new Intl.DateTimeFormat("pt-BR", { hour: "numeric", hourCycle: "h23", timeZone: "America/Sao_Paulo" }).format(new Date()));
  if (hora >= 5 && hora < 12) return "Bom dia";
  if (hora >= 12 && hora < 18) return "Boa tarde";
  return "Boa noite";
}

function Titulo({ id, children, link }: { id: string; children: React.ReactNode; link?: { href: string; label: string } }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <h2 id={id} className="text-[22px] font-semibold">{children}</h2>
      {link && <Link href={link.href} className="link-ficha !text-xs">{link.label}</Link>}
    </div>
  );
}

async function Base() {
  const user = await getUser();
  if (!user) redirect("/entrar?next=/conta");
  const [perfil, hist] = await Promise.all([getPerfil(user.id), historico(user.id)]);

  // O histórico vem do mais novo pro mais antigo: o primeiro de cada quiz é o atual.
  const atual = new Map<string, (typeof hist)[number]>();
  for (const h of hist) if (!atual.has(h.quiz)) atual.set(h.quiz, h);
  const antes = anteriores(hist);
  const feitos = [...atual.keys()].filter((q) => q in quizzes).length;
  const proximo = Object.entries(quizzes).find(([slug]) => !atual.has(slug));
  const desde = (user as { createdAt?: string | Date }).createdAt;
  const ultimo = hist.find((h) => h.quiz in quizzes);
  const ultimoNome = ultimo && getResult(quizzes[ultimo.quiz], ultimo.result)?.name;
  const sistemas = sistemasAtivos();
  const primeiroNome = user.name.trim().split(/\s+/)[0] || user.name;

  return (
    <div className="flex flex-wrap items-start gap-7">
      <div className="flex min-w-0 flex-[999_1_560px] flex-col gap-7">
        <div className="flex flex-col gap-1.5">
          <span className="etiqueta text-laranja-claro">Sua base</span>
          <h1 className="text-[clamp(2rem,3.4vw,2.75rem)] font-semibold leading-[1.05] tracking-[-0.02em]">
            {saudacao()}, {primeiroNome}
          </h1>
          <span className="text-base text-areia">A luz da cabine tá acesa.</span>
        </div>

        {/* Próximo passo: o primeiro quiz que falta, ou o aviso de que fez todos. */}
        <div className="painel flex flex-wrap items-center justify-between gap-4 px-[22px] py-5">
          <div className="flex min-w-0 flex-[1_1_280px] flex-col gap-1.5">
            <span className="font-ficha text-[11px] tracking-[0.14em] text-azul">{proximo ? "PRÓXIMO QUIZ" : "MISSÃO CUMPRIDA"}</span>
            <span className="text-2xl font-bold text-azul">{proximo ? proximo[1].intro.title : "Todos os quizzes feitos. Respeito."}</span>
            <span className="text-sm text-neutro">Você fez {feitos} de {totalQuizzes} quizzes</span>
            <div
              className="mt-1 h-2 max-w-[360px] overflow-hidden rounded-full bg-creme-escuro"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={totalQuizzes}
              aria-valuenow={feitos}
              aria-label="Quizzes feitos"
            >
              <div className="h-full rounded-full bg-laranja" style={{ width: `${(feitos / totalQuizzes) * 100}%` }} />
            </div>
          </div>
          <Link href={proximo ? `/quiz/${proximo[0]}` : "/quiz"} className="btn bg-laranja !px-[18px] !py-[13px] !text-[15px] text-noite">
            {proximo ? "Fazer agora" : "Ver os quizzes"}
          </Link>
        </div>

        <section aria-labelledby="resultados" className="flex flex-col gap-3.5">
          <Titulo id="resultados" link={{ href: "/quiz", label: "Ver quizzes" }}>Seus resultados</Titulo>
          <ul className="grid list-none grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-3.5 p-0">
            {Object.entries(quizzes).map(([slug, q]) => {
              const s = atual.get(slug);
              const r = s && getResult(q, s.result);
              if (!r) {
                return (
                  <li key={slug}>
                    <Link href={`/quiz/${slug}`} className="flex h-full flex-col gap-1.5 rounded-lg border border-dashed border-laranja-claro/70 p-4 text-creme no-underline hover:bg-creme/5">
                      <span className="font-ficha text-[11px] uppercase text-poeira">{q.intro.title}</span>
                      <span className="text-[17px] font-semibold">Ainda não fez</span>
                      <span className="mt-auto pt-1 text-sm font-medium text-laranja-claro">Fazer agora →</span>
                    </Link>
                  </li>
                );
              }
              const theme = resultTheme[r.color] ?? resultTheme.azul;
              const ja = (antes.get(slug) ?? []).map((id) => getResult(q, id)?.name).filter(Boolean).slice(0, 3);
              return (
                <li key={slug}>
                  <Link href={`/quiz/${slug}/${s.result}`} className={`flex h-full flex-col gap-1.5 rounded-lg p-4 no-underline ${theme.card}`}>
                    <span className={`font-ficha text-[11px] uppercase ${theme.label}`}>{q.intro.title}</span>
                    <span className="text-xl font-bold leading-tight">{r.name}</span>
                    <span className="text-sm leading-snug">{r.tagline}</span>
                    {ja.length > 0 && <span className="text-[13px] opacity-85">Antes: {ja.join(", ")}</span>}
                    <span className="mt-auto pt-1 font-ficha text-[11px] uppercase opacity-80">{data(s.created_at)}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>

        {sistemas.length > 0 && (
          <section aria-labelledby="fichas" className="flex flex-col gap-3.5">
            <Titulo id="fichas" link={{ href: "/fichas", label: "Abrir a mesa" }}>Fichas</Titulo>
            <ul className="grid list-none grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-3.5 p-0">
              {sistemas.map((s) => (
                <li key={s.slug}>
                  {/* <a> e não <Link>: cada sistema é outro app, a navegação precisa recarregar a página. */}
                  <a href={`/fichas/${s.slug}`} className="card flex h-full items-center gap-3 p-4 text-creme no-underline hover:bg-creme/10">
                    <span className="flex size-[52px] shrink-0 items-center justify-center rounded-md bg-cabine font-ficha text-lg text-laranja-claro" aria-hidden="true">
                      {s.name.trim()[0]}
                    </span>
                    <span className="flex min-w-0 flex-col gap-0.5">
                      <span className="text-base font-semibold">{s.name}</span>
                      <span className="text-[13px] text-areia">Criar um personagem novo</span>
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      <aside aria-label="Sua cabine" className="flex min-w-0 flex-[1_1_300px] flex-col gap-4">
        <div className="painel overflow-hidden">
          <div className="flex justify-center bg-cabine p-[18px]">
            <div className="relative size-[120px] rounded-full bg-creme p-2">
              <svg viewBox="0 0 104 104" aria-hidden="true" className="block size-[104px] rounded-full">
                <rect width="104" height="104" fill="#0b2340" />
                <circle cx="58" cy="58" r="24" fill="#dd5d05" />
                <ellipse cx="58" cy="58" rx="40" ry="10" fill="none" stroke="#ece3be" strokeWidth="1.5" transform="rotate(-16 58 58)" />
                <circle cx="20" cy="24" r="1.2" fill="#ece3be" />
                <circle cx="84" cy="18" r="1" fill="#ece3be" />
              </svg>
              <span className="absolute -bottom-1 -right-2.5 rounded-full border-[3px] border-cabine">
                <Avatar name={user.name} image={user.image} cor={perfil.cor} size={52} />
              </span>
            </div>
          </div>
          <div className="flex flex-col gap-3 px-[18px] pb-[18px] pt-4">
            <div className="flex flex-col gap-0.5">
              <span className="font-ficha text-[10px] tracking-[0.14em] text-azul">A CABINE DE</span>
              <span className="text-[22px] font-bold text-azul">{user.name}</span>
              <span className="text-[13px] text-neutro">
                {perfil.apelido ? `@${perfil.apelido}` : "Sem apelido ainda"}
                {desde && ` · a bordo desde ${new Date(desde).toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}`}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href="/conta/editar" className="btn btn-contorno flex-1 !px-3 !py-[11px] text-center !text-sm">Editar perfil</Link>
              <form action={sair} className="flex">
                <button type="submit" className="btn btn-contorno !px-3 !py-[11px] !text-sm">Sair</button>
              </form>
            </div>
          </div>
        </div>

        <div className="card flex flex-col gap-2.5 px-[18px] py-4">
          <span className="font-ficha text-[10px] tracking-[0.14em] text-laranja-claro">DIÁRIO DE BORDO</span>
          <div className="flex justify-between gap-2.5 text-sm">
            <span className="text-areia">Último quiz</span>
            <span className="text-right font-semibold">{ultimoNome ?? "Nenhum ainda"}</span>
          </div>
          {ultimo && (
            <div className="flex justify-between gap-2.5 border-t border-creme/12 pt-2.5 text-sm">
              <span className="text-areia">Feito em</span>
              <span className="text-right font-semibold">{data(ultimo.created_at)}</span>
            </div>
          )}
          <div className="flex justify-between gap-2.5 border-t border-creme/12 pt-2.5 text-sm">
            <span className="text-areia">Quizzes feitos</span>
            <span className="text-right font-semibold">{feitos} de {totalQuizzes}</span>
          </div>
        </div>
      </aside>
    </div>
  );
}
