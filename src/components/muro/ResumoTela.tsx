"use client";

import Link from "next/link";
import { TEXTOS } from "@/lib/muro/conteudo";
import { SemCrew } from "./CadernoTela";
import { Icone } from "./Icone";
import { useMuro } from "./useMuro";
import { Adesivo, brl } from "./visual";

const BASE = "/jogos/muro-livre";

export function ResumoTela() {
  const m = useMuro();
  const r = m.resumo;
  const prog = m.prog;
  const T = TEXTOS.resumo;
  if (!prog) return <SemCrew />;
  if (!r) {
    return (
      <div className="muro-folha flex flex-col items-start gap-3">
        <p className="m-0">Ainda não fechamos nenhum dia por aqui.</p>
        <Link href={`${BASE}/caderno`} className="muro-btn">{TEXTOS.abas.caderno}</Link>
      </div>
    );
  }
  const { registro: d, semana: s } = r;
  const pendentes = prog.jobs.filter((j) => j.aceita && !j.encontro && (j.status === "aberta" || j.status === "em_andamento"));
  const gastosLinhas = (Object.keys(d.gastos) as (keyof typeof d.gastos)[]).filter((k) => d.gastos[k] > 0);
  return (
    <div className="flex flex-col gap-5">
      <h1 className="muro-titulo m-0 text-[30px] sm:text-[40px]">{T.tituloDia(d.dia)}</h1>
      <div className="flex flex-wrap items-center gap-2">
        {d.tranquilo && <span className="muro-adesivo"><Icone nome="check" tam={13} />{T.tranquilo}</span>}
        {d.ruinasChuva > 0 && <Adesivo tipo="chuva">{`${T.chuva}: ${d.ruinasChuva}`}</Adesivo>}
        {r.subiu && <span className="muro-adesivo"><Icone nome="estrela" tam={13} />{T.subiu(prog.nivel)}</span>}
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <section className="muro-pagina flex flex-col gap-3" aria-label="Contas do dia" style={{ ["--inclina" as string]: "-0.6deg" }}>
          <dl className="m-0 grid grid-cols-2 gap-3">
            <div><dt className="text-sm">{T.entregues}</dt><dd className="muro-medida m-0 text-2xl font-bold">{d.entregues}</dd></div>
            <div><dt className="text-sm">{T.ganhos}</dt><dd className="muro-medida m-0 text-2xl font-bold">{brl(d.ganhos)}</dd></div>
            <div><dt className="text-sm">{T.saldo}</dt><dd className="muro-medida m-0 text-2xl font-bold">{d.saldo < 0 ? "−" : ""}{brl(Math.abs(d.saldo))}</dd></div>
            <div><dt className="text-sm">Caixa agora</dt><dd className="muro-medida m-0 text-2xl font-bold">{brl(prog.dinheiro)}</dd></div>
          </dl>
          <div>
            <h2 className="m-0 text-sm font-bold uppercase">{T.gastos}</h2>
            {gastosLinhas.length === 0 ? <p className="m-0 text-sm">Nenhum gasto.</p> : (
              <ul className="m-0 mt-1 list-none p-0 text-sm">
                {gastosLinhas.map((k) => <li key={k} className="muro-medida flex justify-between"><span className="font-texto">{T.gastosNomes[k]}</span><span>{brl(d.gastos[k])}</span></li>)}
              </ul>
            )}
          </div>
        </section>

        <section className="muro-pagina flex flex-col gap-3" data-fita="azul" aria-label={T.reputacao} style={{ ["--inclina" as string]: "0.7deg" }}>
          <h2 className="m-0 text-sm font-bold uppercase">{T.reputacao}</h2>
          <dl className="m-0 grid grid-cols-2 gap-3">
            <div><dt className="text-sm">{T.quebrada}</dt><dd className="muro-medida m-0 text-2xl font-bold">{d.repQuebradaFim.toFixed(2)}</dd></div>
            <div><dt className="text-sm">{T.clientes}</dt><dd className="muro-medida m-0 text-2xl font-bold">{d.repClientesFim.toFixed(2)}</dd></div>
          </dl>
          <div>
            <h2 className="m-0 text-sm font-bold uppercase">{T.pendente}</h2>
            {pendentes.length === 0 ? <p className="m-0 text-sm">{T.nada}</p> : (
              <ul className="m-0 mt-1 flex list-none flex-col gap-1 p-0 text-sm">
                {pendentes.map((j) => <li key={j.id}>{j.nomeCliente} · prazo dia {j.prazo}{j.prazo < prog.dia + 1 ? " (atrasada)" : ""}</li>)}
              </ul>
            )}
            {d.atrasados > 0 && <p className="muro-nota m-0 mt-1">{T.atraso(d.atrasados)}</p>}
          </div>
        </section>
      </div>

      {s && (
        <section className="muro-pagina flex flex-col gap-1" style={{ ["--inclina" as string]: "0deg" }} aria-label={T.tituloSemana(s.semana)}>
          <h2 className="muro-titulo m-0 text-xl">{T.tituloSemana(s.semana)}</h2>
          <p className="muro-medida m-0">{T.contas}: {brl(s.contas)}</p>
          <p className={`m-0 flex items-center gap-2 font-bold ${s.paga ? "" : "text-tijolo"}`}><Icone nome={s.paga ? "check" : "alerta"} tam={16} />{s.paga ? T.contasPagas : T.contasFaltou}</p>
        </section>
      )}

      {r.julgamento && (
        <section className="muro-pagina flex flex-col gap-2" style={{ ["--inclina" as string]: "0deg" }} aria-label={TEXTOS.encontro.titulo}>
          <h2 className="muro-titulo m-0 text-xl">{TEXTOS.encontro.titulo}: {TEXTOS.encontro.resultado[r.julgamento.resultado]}</h2>
          <p className="muro-medida m-0">{TEXTOS.encontro.posicao(r.julgamento.posicao)}</p>
          <dl className="m-0 flex gap-6 text-sm">
            {(Object.keys(r.julgamento.score) as (keyof typeof r.julgamento.score)[]).map((k) => <div key={k}><dt>{TEXTOS.encontro.nota[k]}</dt><dd className="muro-medida m-0 font-bold">{r.julgamento!.score[k]}</dd></div>)}
          </dl>
        </section>
      )}

      <div className="flex flex-wrap gap-3">
        <Link href={`${BASE}/caderno`} className="muro-btn" onClick={m.iniciarRelogio}>{T.proximo}</Link>
        <Link href={`${BASE}/material`} className="muro-btn-sec">{TEXTOS.abas.material}</Link>
      </div>
    </div>
  );
}
