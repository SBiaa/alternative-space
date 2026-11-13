"use client";

import Link from "next/link";
import { useState } from "react";
import { MURO } from "@/lib/muro/config";
import { TEXTOS } from "@/lib/muro/conteudo";
import { atributos } from "@/lib/muro/efeitos";
import { dialogoDe } from "@/lib/muro/negociacao";
import { SemCrew } from "./CadernoTela";
import { Icone } from "./Icone";
import { useMuro } from "./useMuro";
import { AdesivoAuth, Croqui } from "./visual";

const BASE = "/jogos/muro-livre";

export function ConversaTela({ id }: { id: string }) {
  const m = useMuro();
  const [erro, setErro] = useState("");
  const prog = m.prog;
  if (!prog) return <SemCrew />;
  const job = prog.jobs.find((j) => j.id === id);
  if (!job || !job.aceita) return <div className="muro-folha"><p className="m-0">Essa encomenda não está com a crew.</p><Link href={`${BASE}/caderno`} className="muro-btn mt-3">{TEXTOS.conversa.voltar}</Link></div>;
  const dialogo = dialogoDe(m.catalogo, job);
  const T = TEXTOS.conversa;
  const respondeu = job.negociacao.respostas;
  const etapa = respondeu.length;
  const acabou = !!job.negociacao.resultado;
  const quem = T.responsavel[dialogo?.kind ?? ""] ?? "Responsável";
  const minRevisao = atributos(prog, m.catalogo).croqui > 0 ? MURO.negociacao.revisaoMinMesa : MURO.negociacao.revisaoMin;

  const escolher = (i: number) => {
    const r = m.responder(job.id, i);
    setErro(r.ok ? "" : r.erro);
  };

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-col gap-1">
        <Link href={`${BASE}/caderno`} className="inline-flex min-h-11 items-center gap-1 text-sm font-bold text-azul no-underline"><Icone nome="voltar" tam={16} />{T.voltar}</Link>
        <h1 className="muro-titulo m-0 text-[28px] sm:text-[36px]">{T.titulo}: {quem}</h1>
        <p className="m-0 flex flex-wrap items-center gap-2"><span>{job.nomeCliente}</span><AdesivoAuth auth={job.auth} revisao={job.revisao} /></p>
      </header>

      <div className="grid gap-5 md:grid-cols-[1fr_260px]">
        <section className="flex flex-col gap-3" aria-label="Conversa" aria-live="polite">
          {dialogo && dialogo.steps.slice(0, etapa + (acabou ? 0 : 1)).map((s, i) => {
            const r = respondeu[i];
            const op = r !== undefined ? s.opcoes[r] : null;
            return (
              <div key={i} className="flex flex-col gap-2">
                <p className="muro-balao m-0">{s.fala}</p>
                {op && <p className="muro-balao m-0" data-lado="voce"><span className="muro-nota !text-sm block">{T.voce}</span>{op.texto}</p>}
                {op && <p className="muro-balao m-0">{op.resposta}</p>}
              </div>
            );
          })}

          {dialogo && !acabou && etapa < dialogo.steps.length && (
            <div className="flex flex-col gap-2" role="group" aria-label="Suas respostas">
              {dialogo.steps[etapa].opcoes.map((o, i) => {
                const bloqueada = o.minQuebrada !== undefined && prog.repQuebrada < o.minQuebrada;
                return (
                  <div key={i}>
                    <button type="button" className={i === 0 ? "muro-btn w-full !justify-start text-left" : "muro-btn-sec w-full !justify-start text-left"} onClick={() => escolher(i)} disabled={bloqueada}>
                      {bloqueada && <Icone nome="cadeado" tam={16} />}{o.texto}
                    </button>
                    {bloqueada && <p className="muro-nota m-0">{T.bloqueada}</p>}
                  </div>
                );
              })}
            </div>
          )}

          {acabou && job.negociacao.resultado && (
            <div className="muro-pagina flex flex-col gap-2" data-fita={job.negociacao.resultado === "recusado" ? "azul" : undefined}>
              <p className="m-0 text-lg font-bold">{T.resultado[job.negociacao.resultado]}</p>
              {job.revisao && <p className="muro-nota m-0">{T.revisaoTexto(minRevisao)}</p>}
              <div className="flex flex-wrap gap-2">
                {job.revisao && <button type="button" className="muro-btn" onClick={() => { const r = m.revisar(job.id); setErro(r.ok ? "" : r.erro); }}>{T.revisar}</button>}
                <Link href={`${BASE}/caderno`} className={job.revisao ? "muro-btn-sec" : "muro-btn"}>{T.voltar}</Link>
              </div>
            </div>
          )}
          {!dialogo && <p className="m-0">Essa encomenda não precisa de conversa.</p>}
          {erro && <p className="m-0 font-bold text-tijolo" role="alert">{erro}</p>}
        </section>

        <aside className="flex flex-col gap-2" aria-label={T.croqui}>
          <h2 className="m-0 text-sm font-bold uppercase">{T.croqui}</h2>
          <Croqui job={job} tag={m.tag} templates={m.catalogo.templates} />
          <p className="muro-medida m-0 text-xs">Croqui {Math.round(job.croqui * 100)}%</p>
        </aside>
      </div>
    </div>
  );
}
