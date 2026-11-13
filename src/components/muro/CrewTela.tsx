"use client";

import { useState } from "react";
import { CAMADAS, MURO } from "@/lib/muro/config";
import { TEXTOS } from "@/lib/muro/conteudo";
import { atributos, vagasDe } from "@/lib/muro/efeitos";
import { penalCansaco } from "@/lib/muro/trabalho";
import { SemCrew } from "./CadernoTela";
import { Icone } from "./Icone";
import { useMuro } from "./useMuro";
import { Progresso, brl } from "./visual";

export function CrewTela() {
  const m = useMuro();
  const [erro, setErro] = useState("");
  const prog = m.prog;
  if (!prog) return <SemCrew />;
  const T = TEXTOS.crew;
  const attr = atributos(prog, m.catalogo);
  const vagas = vagasDe(prog.nivel, attr);
  const emAndamento = prog.jobs.filter((j) => j.status === "em_andamento");
  const contratados = new Set(prog.equipe.map((a) => a.arquetipo));
  const disponiveis = m.catalogo.arquetipos.filter((a) => !contratados.has(a.slug));

  const contratar = async (slug: string) => {
    const r = await m.contratar(slug);
    setErro(r.ok ? "" : r.erro);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <h1 className="muro-titulo m-0 text-[30px] sm:text-[40px]">{T.titulo}</h1>
        <p className="muro-medida m-0 font-bold">{T.vagas(prog.equipe.length, vagas)}</p>
      </div>
      {erro && <p className="m-0 font-bold text-tijolo" role="alert">{erro}</p>}

      <section className="flex flex-col gap-3" aria-label="Na crew">
        <article className="muro-folha flex flex-wrap items-center gap-3">
          <Icone nome="pincel" tam={26} />
          <div className="flex-1"><strong>Você</strong><p className="m-0 text-sm">Pinta à mão ou escala a crew e supervisiona.</p></div>
        </article>
        {prog.equipe.map((a, i) => {
          const arq = m.catalogo.arquetipos.find((x) => x.slug === a.arquetipo);
          const cansada = a.cansaco >= MURO.artista.cansacoLimiar;
          return (
            <article key={a.id} className="muro-pagina flex flex-col gap-3" style={{ ["--inclina" as string]: `${(i % 2 ? 0.6 : -0.6)}deg` }}>
              <header className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h2 className="muro-titulo m-0 text-lg">{arq?.nome ?? a.arquetipo}</h2>
                  <p className="m-0 text-sm">{arq?.especialidade ? T.esp[arq.especialidade] : T.espNenhuma} · nível {a.nivel}</p>
                </div>
                <span className="muro-medida font-bold">{arq ? T.salario(arq.salario) : ""}</span>
              </header>
              <dl className="m-0 grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-4">
                {(Object.keys(T.habilidades) as (keyof typeof T.habilidades)[]).map((k) => (
                  <div key={k}><dt>{T.habilidades[k]}</dt><dd className="muro-medida m-0 font-bold">{a.hab[k] + (k === "tecnica" ? attr.treino : 0)}</dd></div>
                ))}
              </dl>
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between text-sm"><span className="flex items-center gap-1"><Icone nome={cansada ? "alerta" : "check"} tam={14} />{T.cansaco}</span><span className="muro-medida">{Math.round(a.cansaco)}%</span></div>
                <Progresso valor={a.cansaco} tom={cansada ? "tijolo" : undefined} rotulo={`${T.cansaco} de ${arq?.nome ?? a.arquetipo}`} />
                {(cansada || penalCansaco(a.cansaco) > 0) && <p className="muro-nota m-0">{T.cansadaAviso}</p>}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <label className="flex min-h-11 items-center gap-2 text-sm font-bold">
                  {T.escalar}
                  <select className="min-h-11 rounded-[6px] border-2 border-noite bg-papel-claro px-2" value={a.escala ? `${a.escala.jobId}|${a.escala.camada}` : ""} disabled={a.folga}
                    onChange={(e) => { const [j, c] = e.target.value.split("|"); void (j ? m.escalar(a.id, j, c as never) : m.escalar(a.id, null)); }}>
                    <option value="">{T.semMural}</option>
                    {emAndamento.flatMap((j) => [
                      <option key={`${j.id}|auto`} value={`${j.id}|auto`}>{j.nomeCliente} · {T.escalaAuto}</option>,
                      ...CAMADAS.map((c) => <option key={`${j.id}|${c}`} value={`${j.id}|${c}`}>{j.nomeCliente} · {TEXTOS.muro.camada[c]}</option>),
                    ])}
                  </select>
                </label>
                <button type="button" className="muro-btn-sec" onClick={() => m.folga(a.id, !a.folga)} aria-pressed={a.folga}>{a.folga ? T.voltar : T.descansar}</button>
                {a.folga && <span className="muro-adesivo"><Icone nome="check" tam={13} />{T.folga}</span>}
              </div>
            </article>
          );
        })}
        {prog.equipe.length === 0 && <p className="muro-nota m-0">Você começa sozinho. Contrate artistas quando o caixa deixar.</p>}
      </section>

      <section className="flex flex-col gap-3" aria-labelledby="contratar">
        <h2 id="contratar" className="m-0 text-lg font-bold">{T.contratar}</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {disponiveis.map((a) => {
            const nivelOk = prog.nivel >= a.nivelMin;
            const cheio = prog.equipe.length >= vagas;
            const semSaldo = prog.dinheiro < a.contratacao;
            const motivo = !nivelOk ? T.nivelMin(a.nivelMin) : cheio ? "Sem vaga" : semSaldo ? "Saldo não cobre" : null;
            return (
              <article key={a.slug} className="muro-folha flex flex-col gap-2">
                <h3 className="muro-titulo m-0 text-lg">{a.nome}</h3>
                <p className="m-0 text-sm">{a.descricao}</p>
                <p className="muro-medida m-0 text-sm">{a.especialidade ? T.esp[a.especialidade] : T.espNenhuma}</p>
                <p className="muro-medida m-0 text-sm">{T.salario(a.salario)} · {T.contratacao(a.contratacao)}</p>
                <button type="button" className="muro-btn mt-auto" disabled={!!motivo || m.ocupado} onClick={() => void contratar(a.slug)}>{motivo ? <><Icone nome="cadeado" tam={16} />{motivo}</> : `${T.contratar} · ${brl(a.contratacao)}`}</button>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
