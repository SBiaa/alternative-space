"use client";

import { useState } from "react";
import { CORES, MURO } from "@/lib/muro/config";
import { TEXTOS } from "@/lib/muro/conteudo";
import { atributos, nivelDe } from "@/lib/muro/efeitos";
import { capacidadeLonas, capacidadeReserva, capacidadeSpray, capacidadeTinta } from "@/lib/muro/material";
import type { CorId, ItemMaterial } from "@/lib/muro/tipos";
import { SemCrew } from "./CadernoTela";
import { Icone } from "./Icone";
import { useMuro } from "./useMuro";
import { PontoCor, Progresso, brl } from "./visual";

export function MaterialTela() {
  const m = useMuro();
  const [aba, setAba] = useState<"loja" | "melhorias">("loja");
  const [erro, setErro] = useState("");
  const [ok, setOk] = useState("");
  const prog = m.prog;
  if (!prog) return <SemCrew />;
  const T = TEXTOS.material;
  const attr = atributos(prog, m.catalogo);
  const E = prog.estoque;
  const M = MURO.material;

  const comprar = async (item: ItemMaterial, cor?: CorId) => {
    const r = await m.comprarMaterial({ item, cor });
    setErro(r.ok ? "" : r.erro);
    setOk(r.ok ? T.aprovada : "");
  };
  const melhorar = async (slug: string) => {
    const r = await m.comprarMelhoria(slug);
    setErro(r.ok ? "" : r.erro);
    setOk(r.ok ? T.aprovada : "");
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h1 className="muro-titulo m-0 text-[30px] sm:text-[40px]">{T.titulo}</h1>
        <p className="muro-nota m-0">{T.aviso}</p>
      </div>
      <div role="tablist" aria-label="Material" className="flex gap-2">
        {([["loja", T.loja], ["melhorias", T.melhorias]] as const).map(([k, rotulo]) => (
          <button key={k} type="button" role="tab" aria-selected={aba === k} className={aba === k ? "muro-btn" : "muro-btn-sec"} onClick={() => setAba(k)}>{rotulo}</button>
        ))}
      </div>
      <p className="m-0 min-h-6 font-bold" role="status">{erro ? <span className="text-tijolo">{erro}</span> : ok}</p>

      {aba === "loja" && (
        <div className="flex flex-col gap-4">
          <section className="muro-folha flex flex-col gap-3" aria-label={T.itens.tinta}>
            <h2 className="m-0 flex items-center gap-2 text-lg font-bold"><Icone nome="gota" />{T.refil(M.tintaPorCompra)} · {brl(Math.round(M.precoTinta * attr.precoTinta))}</h2>
            <p className="m-0 text-sm">{T.descricoes.tinta}</p>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {CORES.map((c) => (
                <div key={c} className="flex items-center gap-3 rounded-[6px] border border-noite/30 p-2">
                  <PontoCor cor={c} />
                  <div className="flex flex-1 flex-col gap-1">
                    <span className="text-sm font-bold">{TEXTOS.muro.cor[c]} <span className="muro-medida font-normal">{Math.round(E.tinta[c])}%</span></span>
                    <Progresso valor={(E.tinta[c] / capacidadeTinta(attr)) * 100} rotulo={`Tinta ${TEXTOS.muro.cor[c]}`} />
                  </div>
                  <button type="button" className="muro-btn !px-3" disabled={m.ocupado} onClick={() => void comprar("tinta", c)} aria-label={`${T.comprar} tinta ${TEXTOS.muro.cor[c]}`}>{T.comprar}</button>
                </div>
              ))}
            </div>
          </section>

          <section className="muro-folha flex flex-col gap-3" aria-label={T.itens.spray}>
            <h2 className="m-0 flex items-center gap-2 text-lg font-bold"><Icone nome="lata" />{T.itens.spray} · {brl(M.precoSpray)}</h2>
            <p className="m-0 text-sm">{T.descricoes.spray}</p>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {CORES.map((c) => (
                <div key={c} className="flex items-center gap-3 rounded-[6px] border border-noite/30 p-2">
                  <PontoCor cor={c} />
                  <span className="flex-1 text-sm font-bold">{TEXTOS.muro.cor[c]} <span className="muro-medida font-normal">{E.spray[c].toFixed(1)}/{capacidadeSpray(attr)}</span></span>
                  <button type="button" className="muro-btn !px-3" disabled={m.ocupado} onClick={() => void comprar("spray", c)} aria-label={`${T.comprar} spray ${TEXTOS.muro.cor[c]}`}>{T.comprar}</button>
                </div>
              ))}
            </div>
          </section>

          <div className="grid gap-4 sm:grid-cols-3">
            {([
              ["rolinho", "pincel", M.precoRolinho, `${Math.round(E.rolinho.saude)}% em uso · ${E.rolinho.reserva}/${capacidadeReserva(attr)} reserva`],
              ["bico", "lata", M.precoBico, `${Math.round(E.bico.saude)}% em uso · ${E.bico.reserva}/${capacidadeReserva(attr)} reserva`],
              ["lona", "nuvem", M.precoLona, `${E.lonas}/${capacidadeLonas(attr)} no estoque`],
            ] as const).map(([item, icone, preco, estoque]) => (
              <section key={item} className="muro-folha flex flex-col gap-2" aria-label={T.itens[item]}>
                <h2 className="m-0 flex items-center gap-2 text-lg font-bold"><Icone nome={icone} />{T.itens[item]}</h2>
                <p className="m-0 text-sm">{T.descricoes[item]}</p>
                <p className="muro-medida m-0 text-sm">{estoque}</p>
                <button type="button" className="muro-btn mt-auto" disabled={m.ocupado} onClick={() => void comprar(item)}>{T.comprar} · {brl(preco)}</button>
              </section>
            ))}
          </div>
        </div>
      )}

      {aba === "melhorias" && (
        <div className="grid gap-4 sm:grid-cols-2">
          {m.catalogo.itens.map((it) => {
            const nivel = nivelDe(prog, it.slug);
            const max = nivel >= it.maxLevel;
            const preco = it.prices[nivel];
            const nivelBaixo = prog.nivel < it.minCrewLevel;
            const semSaldo = !max && prog.dinheiro < preco;
            const motivo = max ? T.maxNivel : nivelBaixo ? TEXTOS.crew.nivelMin(it.minCrewLevel) : semSaldo ? "Saldo não cobre" : null;
            return (
              <article key={it.slug} className="muro-pagina flex flex-col gap-2" style={{ ["--inclina" as string]: "0deg" }}>
                <h2 className="muro-titulo m-0 text-lg">{it.name}</h2>
                <p className="m-0 text-sm">{it.description}</p>
                <p className="muro-medida m-0 text-sm">{T.nivel(nivel, it.maxLevel)}</p>
                <button type="button" className="muro-btn mt-auto" disabled={!!motivo || m.ocupado} onClick={() => void melhorar(it.slug)}>
                  {motivo ? <><Icone nome={max ? "check" : "cadeado"} tam={16} />{motivo}</> : `${T.comprar} · ${brl(preco)}`}
                </button>
              </article>
            );
          })}
          <article className="muro-pagina flex flex-col gap-2 opacity-80" data-fita="azul" style={{ ["--inclina" as string]: "0deg" }}>
            <h2 className="muro-titulo m-0 text-lg">{TEXTOS.empenaTitulo}</h2>
            <p className="muro-nota m-0">{TEXTOS.empenaRequisito(MURO.empena.nivel, MURO.empena.repQuebrada, MURO.empena.repClientes)}</p>
            <button type="button" className="muro-btn-sec mt-auto" disabled><Icone nome="cadeado" tam={16} />{TEXTOS.emBreve}</button>
          </article>
        </div>
      )}
    </div>
  );
}
