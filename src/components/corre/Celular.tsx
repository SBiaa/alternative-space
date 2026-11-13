"use client";

import { useState } from "react";
import { bairroPorId, CORRE, eventoPorId, lugarPorId, reais, relogio, restaurantePorId, totalContas, type TipoLugar } from "@/lib/corre/config";
import { diaDaSemana, type Acao, type Estado } from "@/lib/corre/motor";

type Aba = "ofertas" | "carteira" | "mapa" | "mensagens";
const ABAS: { id: Aba; nome: string }[] = [
  { id: "ofertas", nome: "Entregas" },
  { id: "carteira", nome: "Carteira" },
  { id: "mapa", nome: "Lugares" },
  { id: "mensagens", nome: "Avisos" },
];
const NOME_TIPO: Record<TipoLugar, string> = { posto: "Posto", oficina: "Oficina", comida: "Comer", descanso: "Descanso" };

const btn = "min-h-11 rounded-md px-4 text-[15px] font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ft-app-acao)] disabled:opacity-50";

function Barra({ rotulo, valor, invertido = false }: { rotulo: string; valor: number; invertido?: boolean }) {
  const ruim = invertido ? valor >= 70 : valor <= 30;
  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between text-[13px]">
        <span>
          {ruim ? "⚠ " : ""}
          {rotulo}
        </span>
        <span className="font-ficha">{Math.round(valor)}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-sm bg-black/10" role="progressbar" aria-label={rotulo} aria-valuenow={Math.round(valor)} aria-valuemin={0} aria-valuemax={100}>
        <div className="h-full" style={{ width: `${valor}%`, background: ruim ? "var(--ft-app-alerta)" : "var(--ft-app-acao)" }} />
      </div>
    </div>
  );
}

export function Celular({ e, agir }: { e: Estado; agir: (a: Acao) => void }) {
  const [aba, setAba] = useState<Aba>("ofertas");
  const noMapa = e.fase === "rodando";
  const o = e.oferta;
  const evento = e.evento ? eventoPorId(e.evento.id) : null;
  const dds = diaDaSemana(e.dia);

  return (
    <div className="tema-fim-de-tarde flex h-full flex-col overflow-hidden rounded-lg border border-black/20 text-[color:var(--ft-app-tinta)]" style={{ background: "var(--ft-app-fundo)" }}>
      <header className="flex items-center justify-between px-4 py-2.5 text-[color:#f6f0d6]" style={{ background: "var(--ft-app-acao)" }}>
        <strong className="text-[17px]">{CORRE.nomeApp}</strong>
        <span className="font-ficha text-sm" aria-label={`Hora ${relogio(e.minuto)}`}>{relogio(e.minuto)}</span>
      </header>

      <div role="tablist" aria-label="Seções do celular" className="grid grid-cols-4 border-b border-black/15">
        {ABAS.map((a) => (
          <button key={a.id} role="tab" aria-selected={aba === a.id} onClick={() => setAba(a.id)} className={`min-h-11 text-[13px] font-semibold ${aba === a.id ? "border-b-2 border-[var(--ft-app-acao)]" : "opacity-70"}`}>
            {a.nome}
          </button>
        ))}
      </div>

      <div role="tabpanel" className="flex-1 overflow-y-auto p-4">
        {aba === "ofertas" && (
          <div className="flex flex-col gap-3">
            {evento && (
              <section aria-labelledby="ev" className="flex flex-col gap-2 rounded-md border-2 p-3" style={{ borderColor: "var(--ft-app-alerta)" }}>
                <h2 id="ev" className="m-0 text-base font-bold">⚠ {evento.titulo}</h2>
                <p className="m-0 text-sm">{evento.texto}</p>
                {evento.opcoes.map((op) => (
                  <button key={op.id} onClick={() => agir({ tipo: "escolher", opcao: op.id })} className={`${btn} border text-left`} style={{ borderColor: "var(--ft-app-acao)" }}>
                    {op.texto}
                  </button>
                ))}
              </section>
            )}
            {e.fase === "casa" && <p className="m-0 text-sm">Você está em casa. Saia quando quiser começar. Ofertas só chegam na rua.</p>}
            {e.fase === "viagem" && e.viagem && (
              <p className="m-0 text-sm" role="status">
                {e.viagem.tipo === "entrega" && e.viagem.oferta
                  ? `Entregando de ${restaurantePorId(e.viagem.oferta.restaurante)?.nome} pra ${bairroPorId(e.viagem.oferta.destino)?.nome}. Prazo: ${e.viagem.oferta.prazo} min, andou ${Math.floor(e.viagem.decorrido)} min.`
                  : e.viagem.tipo === "casa"
                    ? "Voltando pra casa."
                    : `Indo pra ${lugarPorId(e.viagem.lugar ?? "")?.nome}.`}
              </p>
            )}
            {noMapa && !o && <p className="m-0 text-sm">Procurando ofertas… {e.aceitacao < 50 && "Sua taxa de aceitação está baixa, chegam menos ofertas."}</p>}
            {noMapa && o && (
              <section aria-labelledby="of" className="flex flex-col gap-2 rounded-md border p-3" style={{ borderColor: "var(--ft-app-acao)" }}>
                <h2 id="of" className="m-0 text-base font-bold">{restaurantePorId(o.restaurante)?.nome}</h2>
                <p className="m-0 text-sm">Para {bairroPorId(o.destino)?.nome} · <span className="font-ficha">{o.km.toFixed(1)} km</span> · prazo <span className="font-ficha">{o.prazo} min</span></p>
                <p className="m-0 font-ficha text-xl font-bold">{reais(o.valor + o.bonusChuva + o.bonusPico)}</p>
                <ul className="m-0 flex list-none flex-wrap gap-1.5 p-0 text-xs">
                  {o.bonusChuva > 0 && <li className="rounded-sm bg-black/10 px-1.5 py-0.5">☔ Bônus de chuva {reais(o.bonusChuva)}</li>}
                  {o.bonusPico > 0 && <li className="rounded-sm bg-black/10 px-1.5 py-0.5">⏰ Horário de pico {reais(o.bonusPico)}</li>}
                  {o.premium && <li className="rounded-sm bg-black/10 px-1.5 py-0.5">★ Oferta premium</li>}
                </ul>
                <p className="m-0 text-xs">Expira às <span className="font-ficha">{relogio(o.expira)}</span></p>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => agir({ tipo: "aceitar" })} className={`${btn} text-[#f6f0d6]`} style={{ background: "var(--ft-app-acao)" }}>Aceitar</button>
                  <button onClick={() => agir({ tipo: "recusar" })} className={`${btn} border`} style={{ borderColor: "var(--ft-app-acao)" }}>Recusar</button>
                </div>
              </section>
            )}
            {e.ultimoResultado && <p role="status" className="m-0 rounded-md bg-black/10 p-3 text-sm">{e.ultimoResultado}</p>}
          </div>
        )}

        {aba === "carteira" && (
          <div className="flex flex-col gap-3">
            <p className="m-0 text-sm">Saldo</p>
            <p className="m-0 font-ficha text-3xl font-bold">{reais(e.dinheiro)}</p>
            <dl className="m-0 grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
              <dt>Ganhos de hoje</dt><dd className="m-0 text-right font-ficha">{reais(e.diaAtual.ganhos)}</dd>
              <dt>Gastos de hoje</dt><dd className="m-0 text-right font-ficha">{reais(e.diaAtual.gastos)}</dd>
              <dt>Entregas</dt><dd className="m-0 text-right font-ficha">{e.diaAtual.entregas}</dd>
              <dt>Avaliação</dt><dd className="m-0 text-right font-ficha">★ {e.avaliacao.toFixed(2)}</dd>
              <dt>Aceitação</dt><dd className="m-0 text-right font-ficha">{Math.round(e.aceitacao)}%</dd>
            </dl>
            <section aria-labelledby="ct" className="rounded-md border border-black/20 p-3">
              <h2 id="ct" className="m-0 text-sm font-bold">Contas da semana ({7 - dds} dia(s) até chegarem)</h2>
              <ul className="m-0 mt-1 list-none p-0 text-sm">
                {CORRE.contas.map((c) => (
                  <li key={c.id} className="flex justify-between"><span>{c.nome}</span><span className="font-ficha">{reais(c.valor)}</span></li>
                ))}
                {e.divida > 0 && <li className="flex justify-between"><span>Atrasado</span><span className="font-ficha">{reais(e.divida)}</span></li>}
              </ul>
              <p className="m-0 mt-1 flex justify-between text-sm font-bold"><span>Total</span><span className="font-ficha">{reais(totalContas() + e.divida)}</span></p>
            </section>
            <section aria-labelledby="ob" className="rounded-md border border-black/20 p-3">
              <h2 id="ob" className="m-0 text-sm font-bold">Objetivo: {CORRE.objetivo.nome}</h2>
              <p className="m-0 font-ficha text-sm">{reais(e.objetivo.guardado)} de {reais(CORRE.objetivo.valor)}</p>
              <div className="my-2 h-2 overflow-hidden rounded-sm bg-black/10" role="progressbar" aria-label="Progresso do objetivo" aria-valuenow={Math.round((e.objetivo.guardado / CORRE.objetivo.valor) * 100)} aria-valuemin={0} aria-valuemax={100}>
                <div className="h-full" style={{ width: `${Math.min(100, (e.objetivo.guardado / CORRE.objetivo.valor) * 100)}%`, background: "var(--ft-app-acao)" }} />
              </div>
              <button disabled={e.dinheiro < CORRE.objetivo.metaSemanal} onClick={() => agir({ tipo: "guardar", valor: CORRE.objetivo.metaSemanal })} className={`${btn} border`} style={{ borderColor: "var(--ft-app-acao)" }}>
                Guardar {reais(CORRE.objetivo.metaSemanal)}
              </button>
              <p className="m-0 mt-1 text-xs">Meta da semana: guardar {reais(CORRE.objetivo.metaSemanal)} depois de pagar as contas.</p>
            </section>
            <section aria-labelledby="mt" className="flex flex-col gap-2">
              <h2 id="mt" className="m-0 text-sm font-bold">{e.modeloMoto}</h2>
              <Barra rotulo="Combustível" valor={e.combustivel} />
              <Barra rotulo="Pneu" valor={e.moto.pneu} />
              <Barra rotulo="Freio" valor={e.moto.freio} />
              <Barra rotulo="Óleo" valor={e.moto.oleo} />
              <Barra rotulo="Cansaço" valor={e.cansaco} invertido />
            </section>
          </div>
        )}

        {aba === "mapa" && (
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {CORRE.lugares.map((l) => {
              const s = CORRE.servicos[l.tipo];
              const preco = "preco" in s ? reais(s.preco) : l.tipo === "posto" ? `${reais(s.precoPorPorcento)}/1%` : `${reais(s.precoPorPorcento)}/ponto`;
              return (
                <li key={l.id} className="flex items-center justify-between gap-2 rounded-md border border-black/20 p-2.5">
                  <div className="text-sm">
                    <strong>{l.nome}</strong>
                    <div className="text-xs">{NOME_TIPO[l.tipo]} · {bairroPorId(l.bairro)?.nome} · <span className="font-ficha">{s.minutos} min · {preco}</span></div>
                  </div>
                  <button disabled={!noMapa} onClick={() => agir({ tipo: "irPara", lugar: l.id })} className={`${btn} border`} style={{ borderColor: "var(--ft-app-acao)" }}>Ir</button>
                </li>
              );
            })}
            {!noMapa && <li className="text-xs">Só dá pra escolher um lugar enquanto você está na rua, sem corrida em andamento.</li>}
          </ul>
        )}

        {aba === "mensagens" && (
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {e.mensagens.map((m) => (
              <li key={m.id} className="rounded-md border border-black/15 p-2.5 text-sm" style={m.tipo === "alerta" ? { borderColor: "var(--ft-app-alerta)" } : undefined}>
                <span className="font-ficha text-xs">{relogio(m.minuto)}{m.tipo === "alerta" ? " · ⚠ Alerta" : ""}</span>
                <div>{m.texto}</div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <footer className="border-t border-black/15 p-3">
        {e.fase === "casa" ? (
          <button onClick={() => agir({ tipo: "sair" })} className={`${btn} w-full text-[#f6f0d6]`} style={{ background: "var(--ft-app-acao)" }}>Sair pra rua</button>
        ) : (
          <button disabled={!noMapa} onClick={() => agir({ tipo: "voltarPraCasa" })} className={`${btn} w-full border`} style={{ borderColor: "var(--ft-app-acao)" }}>Voltar pra casa e encerrar o dia</button>
        )}
      </footer>
    </div>
  );
}
