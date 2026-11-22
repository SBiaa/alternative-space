"use client";

import Link from "next/link";
import { useState } from "react";
import { DECORACOES, ENCAIXES, PLANTAS, planta, troca } from "@/lib/laje/config";
import { DICA_FASE, NOMES_CLIMA, NOMES_FASE, TEXTOS, TEXTO_MURCHA } from "@/lib/laje/conteudo";
import { precoMelhoria, rendimentoDe } from "@/lib/laje/motor";
import type { Visao } from "@/lib/laje/visao";
import { CenaCeu, DecoSvg, GotaSvg, PomboSvg, VasoSvg } from "./arte";
import "./laje.css";
import { useLaje } from "./useLaje";

type Aba = "cesto" | "feira" | "enfeites" | "vizinho";
const ABAS: { id: Aba; nome: string }[] = [
  { id: "cesto", nome: TEXTOS.cesto },
  { id: "feira", nome: TEXTOS.feira },
  { id: "enfeites", nome: TEXTOS.decoracao },
  { id: "vizinho", nome: TEXTOS.vizinho },
];

const BTN = "btn min-h-11 px-4 py-2.5 text-[15px] disabled:cursor-not-allowed disabled:opacity-50";
const BTN_PRIMARIO = `${BTN} bg-laranja text-noite`;
const BTN_SEC = `${BTN} btn-contorno`;

export function LajeJogo({ inicial }: { inicial: { logado: boolean; visao: Visao | null } }) {
  const { visao, modo, pronto, aviso, erro, ocupado, agir } = useLaje(inicial);
  const [sel, setSel] = useState<number | null>(null);
  const [aba, setAba] = useState<Aba | null>(null);

  if (!pronto || !visao) {
    return (
      <div className="tema-laje">
        <p role="status" className="m-0 text-areia">
          {erro ?? TEXTOS.carregando}
        </p>
      </div>
    );
  }

  const s = visao.save;
  const clima = NOMES_CLIMA[visao.clima.tipo];
  const enfeiteDe = (id: string) => s.decoracoes[id];
  const vaso = sel !== null ? s.vasos[sel] : null;
  const infoSel = sel !== null ? visao.infos[sel] : null;

  return (
    <div className="tema-laje mx-auto flex w-full max-w-[480px] flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="laje-numeros m-0 rounded-md border border-creme/30 px-2.5 py-1.5 text-sm" aria-label={TEXTOS.moedinhasValor(s.moedas)}>
          <span className="text-areia">{TEXTOS.moedinhas}</span> <strong className="text-creme">{s.moedas}</strong>
        </p>
        <p className="m-0 rounded-md border border-creme/30 px-2.5 py-1.5 text-sm text-creme" title={clima.dica}>
          <span aria-hidden="true">{visao.clima.tipo === "chuva" ? "☂ " : visao.clima.tipo === "solForte" ? "☀☀ " : visao.clima.tipo === "sol" ? "☀ " : "☁ "}</span>
          {clima.nome}
        </p>
      </div>
      <p className="m-0 text-sm text-areia">{clima.dica}</p>

      {modo === "local" && (
        <div className="painel flex flex-col gap-2 px-4 py-3">
          <p className="m-0 text-sm">{TEXTOS.localAviso}</p>
          <Link href="/cadastro" className="btn min-h-11 self-start bg-laranja px-4 py-2.5 text-[15px] text-noite">
            {TEXTOS.criarConta}
          </Link>
        </div>
      )}

      <p role="status" aria-live="polite" className={`m-0 min-h-6 text-sm ${erro ? "text-laranja-claro" : "text-creme"}`}>
        {erro ?? aviso ?? ""}
      </p>

      {/* Céu, cidade, caixa d'água e varal */}
      <div className="relative overflow-hidden rounded-t-lg">
        <CenaCeu clima={visao.clima.tipo} enfeites={{ varal: enfeiteDe("varal"), mureta: enfeiteDe("mureta") }} />
        {visao.pombo.aqui && (
          <button
            type="button"
            className="laje-pombo absolute right-[26%] top-[38%] flex min-h-11 min-w-11 items-center justify-center rounded-md bg-creme/90 p-1 text-noite"
            onClick={() => void agir({ tipo: "espantar" }, TEXTOS.espantou)}
            disabled={ocupado}
            aria-label={TEXTOS.espantar}
          >
            <PomboSvg />
          </button>
        )}
      </div>
      {visao.pombo.aqui && (
        <p role="alert" className="m-0 rounded-md bg-creme px-3 py-2 text-sm text-noite">
          {TEXTOS.pomboAqui}
        </p>
      )}

      {/* Chão da laje: 12 vasos */}
      <div className="laje-chao -mt-3 rounded-b-lg p-3">
        <ul className="m-0 grid list-none grid-cols-3 gap-2 p-0">
          {s.vasos.map((v) => {
            const info = visao.infos[v.slot];
            const nome = v.planta ? (planta(v.planta)?.nome ?? v.planta) : null;
            const bicado = visao.bicados.includes(v.slot);
            const rotulo = nome && info ? `${TEXTOS.vaso(v.slot + 1)}: ${nome}, ${NOMES_FASE[info.fase]}${info.murcha ? `, ${TEXTO_MURCHA}` : ""}, ${TEXTOS.aguaRotulo(info.agua)}` : `${TEXTOS.vaso(v.slot + 1)}: ${TEXTOS.vazio}`;
            return (
              <li key={v.slot}>
                <button type="button" className="laje-vaso flex min-h-[132px] w-full flex-col items-center gap-0.5 px-1 py-2" aria-pressed={sel === v.slot} aria-label={rotulo} onClick={() => setSel(sel === v.slot ? null : v.slot)}>
                  <VasoSvg nivel={v.nivel} planta={v.planta} fase={info?.fase ?? null} murcha={info?.murcha ?? false} />
                  <span className="text-[12px] font-semibold leading-tight">{nome && info ? NOMES_FASE[info.fase] : TEXTOS.vazio}</span>
                  {info ? (
                    <span className="laje-numeros inline-flex items-center gap-1 text-[12px]">
                      <GotaSvg className="h-3 w-3" />
                      {info.agua}%{info.murcha && <span aria-hidden="true"> ↓</span>}
                    </span>
                  ) : (
                    <span className="text-[12px] text-noite/70">{TEXTOS.nivelVaso(v.nivel)}</span>
                  )}
                  {info?.murcha && <span className="text-[11px] font-semibold leading-tight">{TEXTO_MURCHA}</span>}
                  {bicado && <span className="text-[11px] font-semibold leading-tight">{TEXTOS.bicado}</span>}
                </button>
              </li>
            );
          })}
        </ul>
        <ul className="m-0 mt-3 flex list-none flex-wrap justify-center gap-3 p-0" aria-label={TEXTOS.decoracao}>
          {ENCAIXES.filter((e) => e.id !== "varal" && e.id !== "mureta").map((e) => (
            <li key={e.id} className="flex h-16 min-w-16 items-end justify-center rounded-md border border-dashed border-noite/40 px-2" title={e.nome}>
              {enfeiteDe(e.id) ? (
                <>
                  <DecoSvg slug={enfeiteDe(e.id)} className="h-14 w-14" />
                  <span className="sr-only">{DECORACOES.find((d) => d.slug === enfeiteDe(e.id))?.nome}, {e.nome}</span>
                </>
              ) : (
                <span className="self-center text-[11px] text-noite/70">{e.nome.split(",")[0]}</span>
              )}
            </li>
          ))}
        </ul>
      </div>

      {/* Painel do vaso escolhido */}
      {vaso && sel !== null ? (
        <section className="painel flex flex-col gap-3 px-4 py-4" aria-label={TEXTOS.vaso(sel + 1)}>
          {!vaso.planta || !infoSel ? (
            <>
              <h2 className="m-0 text-lg font-semibold">{TEXTOS.escolherSemente(sel + 1)}</h2>
              {PLANTAS.some((p) => (s.inventario.sementes[p.slug] ?? 0) > 0) ? (
                <ul className="m-0 flex list-none flex-col gap-2 p-0">
                  {PLANTAS.filter((p) => (s.inventario.sementes[p.slug] ?? 0) > 0).map((p) => (
                    <li key={p.slug}>
                      <button type="button" className={`${BTN_SEC} flex w-full items-center justify-between gap-2`} disabled={ocupado} onClick={() => void agir({ tipo: "plantar", slot: sel, planta: p.slug }, TEXTOS.plantado(p.nome))}>
                        <span>{TEXTOS.plantar} {p.nome}</span>
                        <span className="laje-numeros text-sm">×{s.inventario.sementes[p.slug]}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="m-0 text-sm">{TEXTOS.semSementes}</p>
              )}
            </>
          ) : (
            <>
              <h2 className="m-0 text-lg font-semibold">{planta(vaso.planta)?.nome}</h2>
              <p className="m-0 text-sm">
                {NOMES_FASE[infoSel.fase]}: {DICA_FASE[infoSel.fase]}.{" "}
                <span className="laje-numeros inline-flex items-center gap-1">
                  <GotaSvg />
                  {TEXTOS.aguaRotulo(infoSel.agua)}
                </span>
                {infoSel.murcha && <strong> {TEXTO_MURCHA}.</strong>}
              </p>
              {infoSel.fase === "pronta" && <p className="laje-numeros m-0 text-sm">{TEXTOS.rendimento(rendimentoDe(vaso, visao.bicados.includes(vaso.slot)))}</p>}
              <div className="flex flex-wrap gap-2">
                <button type="button" className={BTN_SEC} disabled={ocupado} onClick={() => void agir({ tipo: "regar", slot: sel }, TEXTOS.regado)}>
                  {TEXTOS.regar}
                </button>
                {infoSel.fase === "pronta" && (
                  <button
                    type="button"
                    className={BTN_PRIMARIO}
                    disabled={ocupado}
                    onClick={() => {
                      const qtd = rendimentoDe(vaso, visao.bicados.includes(vaso.slot));
                      void agir({ tipo: "colher", slot: sel }, TEXTOS.colhido(qtd, planta(vaso.planta!)?.nome ?? ""));
                    }}
                  >
                    {TEXTOS.colher}
                  </button>
                )}
              </div>
            </>
          )}
          {(() => {
            const preco = precoMelhoria(vaso);
            return preco === null ? (
              <p className="m-0 text-sm text-noite/80">{TEXTOS.nivelVaso(vaso.nivel)} (máximo)</p>
            ) : (
              <button type="button" className={`${BTN_SEC} self-start`} disabled={ocupado || s.moedas < preco} onClick={() => void agir({ tipo: "melhorar", slot: sel }, TEXTOS.melhorou(vaso.nivel + 1))}>
                {TEXTOS.melhorar} <span className="laje-numeros">({preco})</span>
              </button>
            );
          })()}
        </section>
      ) : (
        <p className="m-0 text-center text-sm text-areia">{TEXTOS.tocar}</p>
      )}

      {/* Cesto, feira, enfeites e vizinho */}
      <div role="tablist" aria-label="Seções da laje" className="grid grid-cols-4 gap-1.5">
        {ABAS.map((a) => (
          <button key={a.id} type="button" role="tab" id={`aba-${a.id}`} aria-selected={aba === a.id} aria-controls="painel-laje" className={`min-h-11 rounded-md border px-1 text-[13px] font-semibold ${aba === a.id ? "border-laranja bg-laranja text-noite" : "border-creme/40 text-creme"}`} onClick={() => setAba(aba === a.id ? null : a.id)}>
            {a.nome}
          </button>
        ))}
      </div>
      {aba && (
        <section id="painel-laje" role="tabpanel" aria-labelledby={`aba-${aba}`} className="painel flex flex-col gap-3 px-4 py-4">
          {aba === "cesto" && <Cesto visao={visao} />}
          {aba === "feira" && <Feira visao={visao} ocupado={ocupado} agir={agir} />}
          {aba === "enfeites" && <Enfeites visao={visao} ocupado={ocupado} agir={agir} />}
          {aba === "vizinho" && <Vizinho visao={visao} ocupado={ocupado} agir={agir} />}
        </section>
      )}

      <p className="m-0 text-xs text-poeira">{TEXTOS.avisoMoeda}</p>
    </div>
  );
}

type Agir = ReturnType<typeof useLaje>["agir"];

function Cesto({ visao }: { visao: Visao }) {
  const inv = visao.save.inventario;
  const colheita = PLANTAS.filter((p) => (inv.colheita[p.slug] ?? 0) > 0);
  const sementes = PLANTAS.filter((p) => (inv.sementes[p.slug] ?? 0) > 0);
  return (
    <>
      <h2 className="m-0 text-lg font-semibold">{TEXTOS.cesto}</h2>
      {colheita.length ? (
        <ul className="m-0 flex list-none flex-col gap-1 p-0">
          {colheita.map((p) => (
            <li key={p.slug} className="flex justify-between text-sm">
              <span>{p.nome}</span>
              <span className="laje-numeros">×{inv.colheita[p.slug]}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="m-0 text-sm">{TEXTOS.cestoVazio}</p>
      )}
      <h3 className="m-0 text-base font-semibold">{TEXTOS.sementes}</h3>
      {sementes.length ? (
        <ul className="m-0 flex list-none flex-col gap-1 p-0">
          {sementes.map((p) => (
            <li key={p.slug} className="flex justify-between text-sm">
              <span>{p.nome}</span>
              <span className="laje-numeros">×{inv.sementes[p.slug]}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="m-0 text-sm">{TEXTOS.semSementes}</p>
      )}
    </>
  );
}

function Feira({ visao, ocupado, agir }: { visao: Visao; ocupado: boolean; agir: Agir }) {
  const s = visao.save;
  const colheita = PLANTAS.filter((p) => (s.inventario.colheita[p.slug] ?? 0) > 0);
  return (
    <>
      <h2 className="m-0 text-lg font-semibold">{TEXTOS.vender}</h2>
      {colheita.length ? (
        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          {colheita.map((p) => {
            const n = s.inventario.colheita[p.slug];
            return (
              <li key={p.slug} className="flex items-center justify-between gap-2 text-sm">
                <span>
                  {p.nome} <span className="laje-numeros">×{n}</span> <span className="laje-numeros text-noite/70">({p.precoVenda} cada)</span>
                </span>
                <button type="button" className={BTN_SEC} disabled={ocupado} onClick={() => void agir({ tipo: "vender", planta: p.slug, qtd: n }, TEXTOS.vendido(n, p.nome, n * p.precoVenda))}>
                  {TEXTOS.venderTudo}
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="m-0 text-sm">{TEXTOS.cestoVazio}</p>
      )}
      <h2 className="m-0 mt-1 text-lg font-semibold">{TEXTOS.sementes}</h2>
      <ul className="m-0 flex list-none flex-col gap-2 p-0">
        {PLANTAS.map((p) => (
          <li key={p.slug} className="flex items-center justify-between gap-2 text-sm">
            <span>
              {p.nome} <span className="laje-numeros text-noite/70">({TEXTOS.rendimento(p.rendimento)})</span>
            </span>
            <button type="button" className={BTN_SEC} disabled={ocupado || s.moedas < p.precoSemente} onClick={() => void agir({ tipo: "comprarSemente", planta: p.slug, qtd: 1 }, TEXTOS.comprado(`semente de ${p.nome}`))}>
              {TEXTOS.comprar} <span className="laje-numeros">{TEXTOS.preco(p.precoSemente)}</span>
            </button>
          </li>
        ))}
      </ul>
    </>
  );
}

function Enfeites({ visao, ocupado, agir }: { visao: Visao; ocupado: boolean; agir: Agir }) {
  const s = visao.save;
  const [escolha, setEscolha] = useState<Record<string, string>>({});
  return (
    <>
      <h2 className="m-0 text-lg font-semibold">{TEXTOS.decoracao}</h2>
      <ul className="m-0 flex list-none flex-col gap-3 p-0">
        {DECORACOES.map((d) => {
          const guardado = (s.inventario.decoracoes[d.slug] ?? 0) > 0;
          const encaixeAtual = Object.entries(s.decoracoes).find(([, slug]) => slug === d.slug)?.[0];
          const tem = guardado || Boolean(encaixeAtual);
          const opcoes = ENCAIXES.filter((e) => d.encaixes.includes(e.id));
          const alvo = escolha[d.slug] ?? opcoes[0].id;
          return (
            <li key={d.slug} className="flex items-center gap-3">
              <DecoSvg slug={d.slug} className="h-12 w-12 shrink-0" />
              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                <span className="text-sm font-semibold">{d.nome}</span>
                {!tem && (
                  <button type="button" className={`${BTN_SEC} self-start`} disabled={ocupado || s.moedas < d.preco} onClick={() => void agir({ tipo: "comprarDecoracao", slug: d.slug }, TEXTOS.comprado(d.nome))}>
                    {TEXTOS.comprar} <span className="laje-numeros">{TEXTOS.preco(d.preco)}</span>
                  </button>
                )}
                {guardado && (
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="sr-only" htmlFor={`enc-${d.slug}`}>{`Onde pôr ${d.nome}`}</label>
                    <select id={`enc-${d.slug}`} className="min-h-11 rounded-md border border-noite bg-creme-claro px-2 text-sm" value={alvo} onChange={(e) => setEscolha({ ...escolha, [d.slug]: e.target.value })}>
                      {opcoes.map((e) => (
                        <option key={e.id} value={e.id}>
                          {e.nome}
                        </option>
                      ))}
                    </select>
                    <button type="button" className={BTN_PRIMARIO} disabled={ocupado} onClick={() => void agir({ tipo: "posicionar", encaixe: alvo, slug: d.slug }, TEXTOS.posicionou)}>
                      {TEXTOS.posicionar}
                    </button>
                  </div>
                )}
                {encaixeAtual && (
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <span>{ENCAIXES.find((e) => e.id === encaixeAtual)?.nome}</span>
                    <button type="button" className={BTN_SEC} disabled={ocupado} onClick={() => void agir({ tipo: "posicionar", encaixe: encaixeAtual, slug: null }, TEXTOS.tirou)}>
                      {TEXTOS.tirar}
                    </button>
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </>
  );
}

function Vizinho({ visao, ocupado, agir }: { visao: Visao; ocupado: boolean; agir: Agir }) {
  const t = troca(visao.vizinho.propostaId);
  const s = visao.save;
  if (!t) return <p className="m-0 text-sm">{TEXTOS.semProposta}</p>;
  const pede = planta(t.pede.colheita)?.nome ?? t.pede.colheita;
  const da = t.da.tipo === "moedas" ? TEXTOS.vizinhoDaMoedas(t.da.qtd) : TEXTOS.vizinhoDa(t.da.qtd, `semente de ${planta(t.da.slug)?.nome ?? t.da.slug}`);
  const tem = s.inventario.colheita[t.pede.colheita] ?? 0;
  return (
    <>
      <h2 className="m-0 text-lg font-semibold">{TEXTOS.vizinho}</h2>
      <p className="m-0 text-sm">{TEXTOS.vizinhoFala}</p>
      <p className="m-0 text-base font-semibold">
        {TEXTOS.vizinhoPede(t.pede.qtd, pede)} → {da}
      </p>
      <p className="laje-numeros m-0 text-sm text-noite/80">
        {pede}: {tem}/{t.pede.qtd}
      </p>
      {visao.vizinho.jaTrocou ? (
        <p className="m-0 text-sm">{TEXTOS.jaTrocou}</p>
      ) : (
        <button type="button" className={`${BTN_PRIMARIO} self-start`} disabled={ocupado || tem < t.pede.qtd} onClick={() => void agir({ tipo: "trocar" }, TEXTOS.trocou)}>
          {TEXTOS.aceitar}
        </button>
      )}
    </>
  );
}
