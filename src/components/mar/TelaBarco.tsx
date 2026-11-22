"use client";

import Link from "next/link";
import { useState } from "react";
import { custoDoReparo } from "@/lib/mar-sem-fim/barco";
import { CATALOGO, ILHA, MELHORIAS, MUNDO, oficioDe } from "@/lib/mar-sem-fim/conteudo";
import { emViagem, limitesDoBarco } from "@/lib/mar-sem-fim/estado";
import { T, formatarNumero, textoDoErro } from "@/lib/mar-sem-fim/textos";
import { Icone } from "./Icone";
import { useMar } from "./MarProvider";
import { AvisoConta, BASE, NavMar } from "./Navegacao";
import { Barra, BandeiraArte, Carta, PirataArte } from "./Pecas";

const B = T.barco;

export function TelaBarco() {
  const { estado, pronto, ocupado, executar } = useMar();
  const [erro, setErro] = useState<string | null>(null);
  if (!pronto) return <p className="text-areia">{T.mundo.carregando}</p>;
  if (!estado) {
    return (
      <div className="flex flex-col gap-4">
        <NavMar atual="barco" />
        <p className="m-0 text-areia">{T.mundo.semPirata}</p>
        <Link href={`${BASE}/novo`} className="btn bg-laranja self-start text-tinta no-underline">{T.mundo.criarPirata}</Link>
      </div>
    );
  }

  const lim = limitesDoBarco(estado);
  const ilha = ILHA[estado.barco.ilhaAtual];
  const viajando = emViagem(estado);
  const oficio = oficioDe(estado.oficio);

  async function fazer(a: Parameters<typeof executar>[0]) {
    setErro(null);
    const r = await executar(a);
    if (!r.ok) setErro(textoDoErro(r.erro));
  }

  return (
    <div className="flex flex-col gap-4">
      <NavMar atual="barco" />
      <header className="flex flex-col gap-1">
        <h1 className="m-0 text-[28px] font-semibold leading-[1.05] tracking-[-0.02em] sm:text-[44px]">{estado.barco.nome}</h1>
        <p className="m-0 text-areia">{B.chamada}</p>
      </header>

      <div className="grid gap-4 sm:grid-cols-[1fr_1.2fr]">
        <Carta rotuloRegiao={B.tripulante}>
          <div className="flex items-end gap-4">
            <BandeiraArte bandeira={estado.barco.bandeira} rotulo={estado.barco.nome} className="block w-[96px] shrink-0" />
            <PirataArte aparencia={estado.aparencia} rotulo={estado.nome} className="block w-[84px] shrink-0" />
          </div>
          <p className="m-0 mt-3 text-lg font-semibold text-azul">{estado.nome}</p>
          {oficio && <p className="m-0 flex items-center gap-1.5 text-sm text-tinta"><Icone nome={oficio.icone} tamanho={15} />{oficio.nome}</p>}
          <dl className="font-ficha m-0 mt-3 grid grid-cols-2 gap-2 text-xs">
            <div><dt className="text-neutro">{B.ouro}</dt><dd className="m-0 text-base text-noite">{formatarNumero(estado.ouro)}</dd></div>
            <div><dt className="text-neutro">{B.recompensa}</dt><dd className="m-0 text-base text-noite">{formatarNumero(estado.recompensa)}</dd></div>
          </dl>
        </Carta>

        <Carta rotuloRegiao={B.estado}>
          <h2 className="m-0 mb-3 text-xl font-semibold text-azul">{B.estado}</h2>
          <div className="flex flex-col gap-3">
            <Barra rotulo={T.unidades.casco} valor={estado.barco.casco} max={lim.casco} />
            <Barra rotulo={T.unidades.mantimentos} valor={estado.barco.mantimentos} max={lim.mantimentos} tom="laranja" />
          </div>
          <p className="m-0 mt-3 text-sm text-tinta">{B.ilhaAtual}: <strong>{ilha.nome}</strong></p>
          {viajando ? (
            <p role="status" className="m-0 mt-2 text-sm text-estrela">{B.emViagemAviso}</p>
          ) : (
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button" disabled={ocupado || !ilha.servicos.estaleiro || estado.barco.casco >= lim.casco}
                onClick={() => fazer({ t: "reparar" })} className="btn btn-contorno min-h-11 disabled:opacity-50"
              >
                {B.reparar} <span className="font-ficha text-xs">({custoDoReparo(estado).toFixed(1).replace(".0", "")} {T.unidades.ouro} {B.reparoCusto})</span>
              </button>
              <button
                type="button" disabled={ocupado || !ilha.servicos.mercado || estado.barco.mantimentos >= lim.mantimentos}
                onClick={() => fazer({ t: "abastecer" })} className="btn btn-contorno min-h-11 disabled:opacity-50"
              >
                {B.abastecer} <span className="font-ficha text-xs">({MUNDO.barco.custoMantimentoPorPonto} {T.unidades.ouro} {B.mantimentoCusto})</span>
              </button>
            </div>
          )}
          {!viajando && (!ilha.servicos.estaleiro || !ilha.servicos.mercado) && (
            <p className="m-0 mt-2 text-xs text-neutro">{[!ilha.servicos.estaleiro && B.semEstaleiro, !ilha.servicos.mercado && B.semMercado].filter(Boolean).join(" ")}</p>
          )}
        </Carta>
      </div>

      {erro && <p role="alert" className="m-0 text-danger">{erro}</p>}

      <section aria-labelledby="ms-melhorias" className="flex flex-col gap-3">
        <h2 id="ms-melhorias" className="m-0 text-2xl font-semibold">{B.melhorias}</h2>
        {!ilha.servicos.estaleiro && <p className="m-0 text-sm text-areia">{B.semEstaleiroMelhoria}</p>}
        <ul className="m-0 grid list-none gap-3 p-0 sm:grid-cols-2">
          {MELHORIAS.map((m) => {
            const tem = estado.barco.melhorias.includes(m.id);
            return (
              <li key={m.id}>
                <Carta className="h-full">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="m-0 text-lg font-semibold text-azul">{m.nome}</h3>
                    {m.emBreve && <span className="etiqueta rounded-[4px] border border-azul/40 px-1.5 py-0.5 text-[10px] text-azul">{B.emBreve}</span>}
                  </div>
                  <p className="m-0 mt-1 text-sm text-tinta">{m.descricao}</p>
                  {m.emBreve ? (
                    <p className="m-0 mt-2 text-xs text-neutro">{m.requisito}</p>
                  ) : (
                    <div className="mt-3 flex flex-wrap items-center gap-3">
                      <span className="font-ficha text-sm text-noite">{B.custo}: {formatarNumero(m.custo)} {T.unidades.ouro}</span>
                      {tem ? (
                        <span className="inline-flex items-center gap-1 text-sm font-semibold text-azul"><Icone nome="check" tamanho={16} />{B.comprada}</span>
                      ) : (
                        <button
                          type="button" onClick={() => fazer({ t: "melhoria", id: m.id })}
                          disabled={ocupado || viajando || !ilha.servicos.estaleiro || estado.ouro < m.custo}
                          className="btn min-h-11 bg-laranja px-4 py-2 text-tinta disabled:opacity-50"
                        >
                          {B.comprar}
                        </button>
                      )}
                    </div>
                  )}
                </Carta>
              </li>
            );
          })}
        </ul>
      </section>

      <section aria-labelledby="ms-bau" className="flex flex-col gap-3">
        <h2 id="ms-bau" className="m-0 text-2xl font-semibold">{B.bau}</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Carta rotuloRegiao={B.itens}>
            <h3 className="m-0 mb-2 text-lg font-semibold text-azul">{B.itens}</h3>
            {estado.itens.length === 0 ? <p className="m-0 text-sm text-neutro">{B.vazio}</p> : (
              <ul className="m-0 flex list-none flex-col gap-2 p-0">
                {estado.itens.map((i) => (
                  <li key={i} className="text-sm"><strong className="text-azul">{CATALOGO.itens[i]?.nome}</strong><br /><span className="text-tinta">{CATALOGO.itens[i]?.descricao}</span></li>
                ))}
              </ul>
            )}
          </Carta>
          <Carta rotuloRegiao={B.aliados}>
            <h3 className="m-0 mb-2 text-lg font-semibold text-azul">{B.aliados}</h3>
            {estado.aliados.length === 0 ? <p className="m-0 text-sm text-neutro">{B.vazio}</p> : (
              <ul className="m-0 flex list-none flex-col gap-2 p-0">
                {estado.aliados.map((a) => (
                  <li key={a} className="text-sm"><strong className="text-azul">{CATALOGO.aliados[a]?.nome}</strong><br /><span className="text-tinta">{CATALOGO.aliados[a]?.descricao}</span></li>
                ))}
              </ul>
            )}
          </Carta>
        </div>
      </section>

      <AvisoConta />
      <p className="m-0 text-xs text-poeira">{T.aviso}</p>
    </div>
  );
}
