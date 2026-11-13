"use client";

import { CORRE, reais } from "@/lib/corre/config";
import type { ResumoDia, ResumoSemana } from "@/lib/corre/motor";

const MOTIVO: Record<ResumoDia["motivo"], string> = {
  casa: "Você voltou pra casa.",
  cansaco: "Você chegou no limite e o dia acabou sozinho. Descansar antes teria rendido mais.",
  meiaNoite: "Meia-noite. O dia acabou.",
};

function Linha({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-3 border-b line-sutil py-2 text-[15px]">
      <dt>{k}</dt>
      <dd className="m-0 font-ficha">{v}</dd>
    </div>
  );
}

export function ResumoDiaCard({ r, onContinuar, salvo }: { r: ResumoDia; onContinuar: () => void; salvo: string }) {
  return (
    <section aria-labelledby="rd" className="surface-vidro mx-auto flex max-w-[520px] flex-col gap-3 p-5">
      <h2 id="rd" className="m-0 text-2xl font-semibold">Resumo do dia {r.dia}</h2>
      <p className="m-0 text-areia">{MOTIVO[r.motivo]}{r.ritmoTranquilo ? " · Ritmo tranquilo ligado" : ""}</p>
      <dl className="m-0">
        <Linha k="Ganhos" v={reais(r.ganhos)} />
        <Linha k="Gastos" v={reais(r.gastos)} />
        <Linha k="Saldo do dia" v={reais(r.saldo)} />
        <Linha k="Entregas" v={`${r.entregas} (${r.noPrazo} no prazo, ${r.atrasadas} atrasadas)`} />
        <Linha k="Ofertas recusadas" v={String(r.recusadas)} />
        <Linha k="Avaliação" v={`★ ${r.avaliacao.toFixed(2)}`} />
        <Linha k="Cansaço" v={`${r.cansaco}%`} />
        <Linha k="Moto" v={`pneu ${r.moto.pneu}% · freio ${r.moto.freio}% · óleo ${r.moto.oleo}%`} />
        <Linha k="Combustível" v={`${r.combustivel}%`} />
      </dl>
      {salvo && <p role="status" className="m-0 text-sm text-areia">{salvo}</p>}
      <button onClick={onContinuar} className="btn bg-laranja text-noite">Próximo dia</button>
    </section>
  );
}

export function ResumoSemanaCard({ r, onContinuar, salvo }: { r: ResumoSemana; onContinuar: () => void; salvo: string }) {
  return (
    <section aria-labelledby="rs" className="surface-vidro mx-auto flex max-w-[520px] flex-col gap-3 p-5">
      <h2 id="rs" className="m-0 text-2xl font-semibold">Fim da semana {r.semana}</h2>
      <p className="m-0 text-areia">{CORRE.textos.folga}</p>
      <dl className="m-0">
        {r.contas.map((c) => <Linha key={c.id} k={c.nome} v={reais(c.valor)} />)}
        {r.dividaAnterior > 0 && <Linha k="Atrasado da semana passada (+juros)" v={reais(r.totalCobrado - r.contas.reduce((s, c) => s + c.valor, 0))} />}
        <Linha k="Total cobrado" v={reais(r.totalCobrado)} />
        <Linha k="Pago" v={reais(r.pago)} />
        <Linha k="Ainda devendo" v={reais(r.divida)} />
        <Linha k="Saldo" v={reais(r.saldo)} />
        <Linha k="Guardado na semana" v={reais(r.guardadoSemana)} />
        <Linha k={CORRE.objetivo.nome} v={`${r.progressoObjetivo.toFixed(1)}%`} />
      </dl>
      <p className="m-0 text-[15px] font-semibold" role="status">
        {r.contasPagas ? "✔ Contas pagas." : "✖ Contas não fecharam: o que faltou vira dívida com juros."}{" "}
        {r.metaCumprida ? "✔ Meta da semana cumprida." : "✖ Meta da semana não cumprida."}
      </p>
      {salvo && <p role="status" className="m-0 text-sm text-areia">{salvo}</p>}
      <button onClick={onContinuar} className="btn bg-laranja text-noite">Começar a próxima semana</button>
    </section>
  );
}
