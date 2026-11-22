import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { agendarPalavra, removerPalavra } from "@/app/actions/constelacao";
import { requireAdmin } from "@/lib/auth/admin";
import { CAMINHOS, LIMITES, TEMAS, TEMAS_LISTA, TEXTOS } from "@/lib/constelacao/config";
import { agenda } from "@/lib/constelacao/dados";
import { dataBR, diaDe, somarDias } from "@/lib/constelacao/dia";

export const metadata: Metadata = { title: TEXTOS.admin.titulo, robots: { index: false } };

type Props = { searchParams: Promise<{ ok?: string; erro?: string }> };

const t = TEXTOS.admin;
const MENSAGENS: Record<string, string> = {
  salvo: t.salvo, removido: t.removido, palavra: t.erroPalavra, data: t.erroData, tema: t.erroTema, passado: t.erroPassado, generico: t.erroGenerico,
};

export default function Page({ searchParams }: Props) {
  return (
    <section className="px-4 pb-16 pt-6 sm:px-6">
      <div className="mx-auto flex max-w-[900px] flex-col gap-4">
        <Link href="/admin" className="etiqueta text-[11px] text-laranja-claro no-underline">{t.voltar}</Link>
        <h1 className="m-0 text-3xl font-semibold">{t.titulo}</h1>
        <Suspense fallback={<p className="text-areia">{TEXTOS.carregando}</p>}>
          <Agenda searchParams={searchParams} />
        </Suspense>
      </div>
    </section>
  );
}

const campo = "w-full rounded-md border border-creme/30 bg-noite/40 px-3 py-2.5 text-creme";

async function Agenda({ searchParams }: Props) {
  await requireAdmin(CAMINHOS.admin);
  const { ok, erro } = await searchParams;
  const hoje = diaDe(new Date());
  const aviso = LIMITES.agendaDiasAviso;
  const futuros = await agenda(hoje, somarDias(hoje, 90));
  const passados = await agenda(somarDias(hoje, -7), somarDias(hoje, -1));
  const marcados = new Set(futuros.map((p) => p.date));
  const faltam = Array.from({ length: aviso + 1 }, (_, i) => somarDias(hoje, i)).filter((d) => !marcados.has(d));
  const mensagem = MENSAGENS[ok ?? erro ?? ""];

  return (
    <>
      {mensagem && (
        <p role="status" className={`m-0 rounded-md border px-3 py-2 ${erro ? "border-danger text-danger" : "border-ok text-ok"}`}>{mensagem}</p>
      )}

      <section aria-labelledby="aviso" className={`surface-vidro flex flex-col gap-2 p-4 ${faltam.length ? "border-warn" : ""}`}>
        <h2 id="aviso" className="m-0 text-lg font-semibold">{t.avisoTitulo}</h2>
        {faltam.length === 0 ? (
          <p className="m-0 text-areia">{t.avisoOk}</p>
        ) : (
          <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
            {faltam.map((d) => (
              <li key={d} className="rounded-md border border-warn px-2 py-1 font-ficha text-sm text-warn">
                {dataBR(d)} · {t.semPalavra}
              </li>
            ))}
          </ul>
        )}
      </section>

      <form action={agendarPalavra} className="surface-vidro grid gap-3 p-4 sm:grid-cols-2">
        <h2 className="m-0 text-lg font-semibold sm:col-span-2">{t.novo}</h2>
        <label className="flex flex-col gap-1 text-sm">{t.data}
          <input type="date" name="date" required min={somarDias(hoje, 1)} defaultValue={faltam.find((d) => d > hoje) ?? somarDias(hoje, 1)} className={campo} />
        </label>
        <label className="flex flex-col gap-1 text-sm">{t.palavra}
          <input name="answer" required minLength={5} maxLength={7} pattern="[A-Za-z]{5,7}" autoComplete="off" spellCheck={false} className={`${campo} font-ficha uppercase`} />
        </label>
        <label className="flex flex-col gap-1 text-sm">{t.tema}
          <select name="theme" required className={campo}>
            {TEMAS_LISTA.map((k) => <option key={k} value={k}>{TEMAS[k]}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">{t.dica}
          <input name="hint" maxLength={120} className={campo} />
        </label>
        <p className="m-0 text-sm text-areia sm:col-span-2">{t.revisao}</p>
        <button type="submit" className="btn w-fit cursor-pointer bg-laranja-claro !px-4 !py-2.75 text-noite">{t.salvar}</button>
      </form>

      <section aria-labelledby="prox" className="flex flex-col gap-2">
        <h2 id="prox" className="m-0 text-xl font-semibold">{t.proximos}</h2>
        {futuros.length === 0 ? <p className="m-0 text-areia">{t.vazio}</p> : (
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {futuros.map((p) => (
              <li key={p.id} className="surface-vidro flex flex-wrap items-center justify-between gap-2 p-3">
                <span className="flex flex-wrap items-baseline gap-x-3">
                  <span className="font-ficha text-sm text-areia">{dataBR(p.date)}</span>
                  <strong className="font-ficha text-lg">{p.answer}</strong>
                  <span className="text-sm text-areia">{TEMAS[p.theme]}{p.hint ? ` · ${p.hint}` : ""}</span>
                </span>
                {p.date > hoje && (
                  <form action={removerPalavra}>
                    <input type="hidden" name="date" value={p.date} />
                    <button type="submit" className="cursor-pointer rounded-md border border-creme/30 px-3 py-2 text-sm text-creme">{t.remover}</button>
                  </form>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {passados.length > 0 && (
        <section aria-labelledby="pass" className="flex flex-col gap-2">
          <h2 id="pass" className="m-0 text-xl font-semibold">{t.passados}</h2>
          <ul className="m-0 flex list-none flex-col gap-1 p-0 text-areia">
            {passados.map((p) => (
              <li key={p.id} className="font-ficha text-sm">{dataBR(p.date)} · {p.answer} · {TEMAS[p.theme]}</li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
