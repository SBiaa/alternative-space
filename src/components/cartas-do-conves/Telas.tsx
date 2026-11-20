"use client";

import { useState, type ReactNode } from "react";
import { CONFIG } from "@/lib/cartas-do-conves/config";
import { CONTEUDO, inimigoDe } from "@/lib/cartas-do-conves/conteudo";
import { TRECHOS } from "@/lib/cartas-do-conves/nomes-mar";
import { TEXTOS } from "@/lib/cartas-do-conves/textos";
import type { Acao, Estado } from "@/lib/cartas-do-conves/tipos";
import { Carta } from "./Carta";
import { Icone } from "./Icone";

const caixa = "mx-auto flex h-full w-full max-w-[880px] flex-col gap-3 overflow-y-auto px-4 pb-8 pt-14 text-creme";
const botaoPrimario = "btn min-h-12 bg-laranja px-5 text-base font-semibold text-noite focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-laranja-claro disabled:opacity-50";
const botaoVidro = "botao-vidro min-h-12 px-4 text-base focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-laranja-claro disabled:opacity-50";

function Titulo({ children, sub }: { children: ReactNode; sub?: ReactNode }) {
  return (
    <header className="flex flex-col gap-1">
      <h2 className="m-0 text-2xl font-semibold leading-tight sm:text-3xl">{children}</h2>
      {sub && <p className="m-0 text-areia">{sub}</p>}
    </header>
  );
}

// ---------- Ofício ----------
export function EscolherOficio({ onEscolher, onVoltar, ocupado }: { onEscolher: (id: string) => void; onVoltar: () => void; ocupado: boolean }) {
  const T = TEXTOS.oficio;
  return (
    <div className="mx-auto flex w-full max-w-[1000px] flex-col gap-3 px-4 pb-8 pt-5 text-creme">
      <Titulo sub={T.texto}>{T.titulo}</Titulo>
      <ul className="m-0 grid list-none gap-3 p-0 sm:grid-cols-2 lg:grid-cols-3">
        {CONTEUDO.oficios.map((o) => {
          const cartas = [...new Set(o.baralho)].map((s) => CONTEUDO.cartas[s]);
          return (
            <li key={o.id} className="surface-vidro flex flex-col gap-2 p-3">
              <div className="flex items-center gap-2">
                <span className="grid size-11 place-items-center rounded-lg bg-laranja text-noite">
                  <Icone nome={o.icone} className="size-7" />
                </span>
                <h3 className="m-0 text-xl font-semibold">{o.nome}</h3>
              </div>
              <p className="m-0 text-sm text-areia">{o.descricao}</p>
              <p className="m-0 text-sm">
                <strong className="text-laranja-claro">{T.passiva}:</strong> {o.passiva.texto}
              </p>
              <details className="text-sm">
                <summary className="min-h-11 cursor-pointer content-center font-semibold">{T.baralho}</summary>
                <ul className="m-0 flex list-none flex-col gap-0.5 p-0 text-areia">
                  {cartas.map((c) => (
                    <li key={c.slug}>
                      {o.baralho.filter((s) => s === c.slug).length}× {c.nome} <span className="font-ficha text-[11px]">(custo {c.custo})</span>
                    </li>
                  ))}
                </ul>
              </details>
              <button type="button" disabled={ocupado} onClick={() => onEscolher(o.id)} className={`${botaoPrimario} mt-auto`}>
                {T.escolher(o.nome)}
              </button>
            </li>
          );
        })}
      </ul>
      <div>
        <button type="button" onClick={onVoltar} className={botaoVidro}>
          {T.cancelar}
        </button>
      </div>
    </div>
  );
}

// ---------- Recompensa ----------
export function Recompensa({ estado, agir }: { estado: Estado; agir: (a: Acao) => void }) {
  const T = TEXTOS.recompensa;
  const r = estado.recompensa!;
  return (
    <div className={caixa}>
      <Titulo sub={T.ouro(r.ouro)}>{T.titulo}</Titulo>
      <h3 className="m-0 text-lg font-semibold">{T.escolha}</h3>
      <ul className="m-0 flex list-none flex-wrap justify-center gap-3 p-0">
        {r.opcoes.map((s, i) => (
          <li key={`${s}-${i}`}>
            <Carta carta={CONTEUDO.cartas[s]} onClick={() => agir({ t: "escolher", i })} rotuloExtra={T.pegar(CONTEUDO.cartas[s].nome)} />
          </li>
        ))}
      </ul>
      <div className="flex justify-center">
        <button type="button" onClick={() => agir({ t: "escolher", i: null })} className={botaoVidro}>
          {T.pular}
        </button>
      </div>
    </div>
  );
}

// ---------- Evento ----------
export function Evento({ estado, agir }: { estado: Estado; agir: (a: Acao) => void }) {
  const ev = CONTEUDO.eventos.find((e) => e.slug === estado.evento)!;
  return (
    <div className={caixa}>
      <Titulo sub={TEXTOS.evento.titulo}>{ev.nome}</Titulo>
      <p className="m-0 max-w-[60ch] text-lg">{ev.texto}</p>
      <ul className="m-0 flex list-none flex-col gap-2 p-0">
        {ev.escolhas.map((e, i) => {
          const falta = e.exige && estado.ouro < e.exige.ouro;
          return (
            <li key={i}>
              <button type="button" disabled={Boolean(falta)} onClick={() => agir({ t: "evento", i })} className={`${botaoVidro} w-full justify-start text-left`}>
                {e.texto}
                {falta && e.exige ? ` (${TEXTOS.evento.exige(e.exige.ouro)})` : ""}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// ---------- Baralho ----------
export function ListaBaralho({ baralho, onPick, rotulo }: { baralho: string[]; onPick?: (idx: number) => void; rotulo?: (nome: string) => string }) {
  if (baralho.length === 0) return <p className="m-0 text-areia">{TEXTOS.baralho.vazio}</p>;
  return (
    <ul className="m-0 flex list-none flex-wrap justify-center gap-2 p-0">
      {baralho.map((s, i) => (
        <li key={`${s}-${i}`}>
          <Carta carta={CONTEUDO.cartas[s]} compacta onClick={onPick ? () => onPick(i) : undefined} rotuloExtra={onPick && rotulo ? rotulo(CONTEUDO.cartas[s].nome) : undefined} />
        </li>
      ))}
    </ul>
  );
}

export function Baralho({ estado, onFechar }: { estado: Estado; onFechar: () => void }) {
  return (
    <div className={caixa} role="dialog" aria-modal="true" aria-label={TEXTOS.baralho.titulo}>
      <Titulo sub={TEXTOS.hud.baralho(estado.baralho.length)}>{TEXTOS.baralho.titulo}</Titulo>
      <ListaBaralho baralho={[...estado.baralho].sort((a, b) => CONTEUDO.cartas[a].tipo.localeCompare(CONTEUDO.cartas[b].tipo) || CONTEUDO.cartas[a].custo - CONTEUDO.cartas[b].custo)} />
      <div>
        <button type="button" onClick={onFechar} className={botaoPrimario} autoFocus>
          {TEXTOS.baralho.fechar}
        </button>
      </div>
    </div>
  );
}

// ---------- Porto ----------
export function Porto({ estado, agir }: { estado: Estado; agir: (a: Acao) => void }) {
  const T = TEXTOS.porto;
  const p = estado.porto!;
  const [removendo, setRemovendo] = useState(false);
  const cura = Math.ceil(estado.folegoMax * CONFIG.porto.curarFracao);
  const podeRemover = !p.removeu && estado.ouro >= CONFIG.porto.remover && estado.baralho.length > CONFIG.baralhoMinimo;

  if (removendo) {
    return (
      <div className={caixa}>
        <Titulo>{T.removerTitulo}</Titulo>
        <ListaBaralho baralho={estado.baralho} rotulo={T.removerCarta} onPick={(c) => { setRemovendo(false); agir({ t: "remover", c }); }} />
        <div>
          <button type="button" onClick={() => setRemovendo(false)} className={botaoVidro}>
            {T.cancelar}
          </button>
        </div>
      </div>
    );
  }
  return (
    <div className={caixa}>
      <Titulo sub={T.texto}>{T.titulo}</Titulo>
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={p.curou || estado.folego >= estado.folegoMax} onClick={() => agir({ t: "curar" })} className={botaoVidro}>
          <Icone nome="folego" className="mr-1.5 size-5" />
          {p.curou ? T.curado : T.curar(cura)}
        </button>
        <button type="button" disabled={!podeRemover} onClick={() => setRemovendo(true)} className={botaoVidro}>
          <Icone nome="exaurir" className="mr-1.5 size-5" />
          {p.removeu ? T.removido : T.remover(CONFIG.porto.remover)}
        </button>
      </div>
      <h3 className="m-0 text-lg font-semibold">{T.loja}</h3>
      <ul className="m-0 flex list-none flex-wrap justify-center gap-3 p-0">
        {p.loja.map((item, i) => {
          const sem = estado.ouro < item.preco;
          return (
            <li key={`${item.slug}-${i}`} className="flex flex-col items-center gap-1.5">
              <Carta carta={CONTEUDO.cartas[item.slug]} bloqueada={item.vendido} />
              <button type="button" disabled={item.vendido || sem} onClick={() => agir({ t: "comprar", i })} className={botaoVidro}>
                <Icone nome="ouro" className="mr-1.5 size-5" />
                {item.vendido ? T.vendido : sem ? `${item.preco} · ${T.semOuro}` : T.comprar(item.preco)}
              </button>
            </li>
          );
        })}
      </ul>
      <div className="mt-2 flex justify-end">
        <button type="button" onClick={() => agir({ t: "sair" })} className={botaoPrimario}>
          {T.sair}
        </button>
      </div>
    </div>
  );
}

// ---------- Tesouro ----------
export function Tesouro({ agir }: { agir: (a: Acao) => void }) {
  return (
    <div className={`${caixa} items-center justify-center text-center`}>
      <Icone nome="bau" className="size-20 text-laranja-claro" />
      <Titulo sub={TEXTOS.tesouro.texto}>{TEXTOS.tesouro.titulo}</Titulo>
      <button type="button" onClick={() => agir({ t: "abrir" })} className={botaoPrimario}>
        {TEXTOS.tesouro.abrir}
      </button>
    </div>
  );
}

// ---------- Fim ----------
export type SituacaoEnvio = "enviando" | "ok" | "erro" | "local";

export function Fim({ estado, situacao, novas, previa, onNova, onSair, logado }: { estado: Estado; situacao: SituacaoEnvio; novas: string[]; previa: string[]; onNova: () => void; onSair: () => void; logado: boolean }) {
  const T = TEXTOS.fim;
  const venceu = estado.resultado === "vitoria";
  const oficio = CONTEUDO.oficios.find((o) => o.id === estado.oficio)!;
  const lista = situacao === "local" ? previa : novas;
  return (
    <div className={caixa}>
      <Titulo sub={venceu ? T.textoVitoria : T.textoDerrota}>{venceu ? T.vitoria : T.derrota}</Titulo>
      <section aria-labelledby="resumo" className="surface-vidro flex flex-col gap-2 p-3">
        <h3 id="resumo" className="m-0 text-lg font-semibold">
          {T.resumo}
        </h3>
        <dl className="m-0 grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-4">
          <div><dt className="text-areia">{T.ofício}</dt><dd className="m-0 font-ficha">{oficio.nome}</dd></div>
          <div><dt className="text-areia">{T.trecho}</dt><dd className="m-0 font-ficha">{estado.trechoMax} · {TRECHOS[estado.trechoMax - 1].ilha}</dd></div>
          <div><dt className="text-areia">{T.cartasNoBaralho}</dt><dd className="m-0 font-ficha">{estado.baralho.length}</dd></div>
          <div><dt className="text-areia">{T.reliquias}</dt><dd className="m-0 font-ficha">{estado.reliquias.length}</dd></div>
        </dl>
        {estado.derrotados.length > 0 && (
          <p className="m-0 text-sm">
            <strong>{T.derrotados}:</strong> {estado.derrotados.map((s) => inimigoDe(CONTEUDO, s).nome).join(", ")}
          </p>
        )}
      </section>

      <section aria-labelledby="liberadas" className="flex flex-col gap-2" aria-live="polite">
        <h3 id="liberadas" className="m-0 text-lg font-semibold">
          {situacao === "local" ? T.previa : T.liberadas}
        </h3>
        {situacao === "enviando" ? (
          <p className="m-0 text-areia">{T.guardando}</p>
        ) : situacao === "erro" ? (
          <p className="m-0 text-danger" role="alert">{T.erro}</p>
        ) : lista.length === 0 ? (
          <p className="m-0 text-areia">{T.nenhuma}</p>
        ) : (
          <ul className="m-0 flex list-none flex-wrap justify-center gap-3 p-0">
            {lista.map((s) => (
              <li key={s}>
                <Carta carta={CONTEUDO.cartas[s]} compacta />
              </li>
            ))}
          </ul>
        )}
      </section>

      {!logado && (
        <p className="m-0 rounded-lg border border-laranja-claro/60 p-3 text-sm">
          <a href="/cadastro" className="font-semibold text-laranja-claro underline">
            {T.criarConta}
          </a>
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={onNova} className={botaoPrimario}>
          {T.jogarDeNovo}
        </button>
        <button type="button" onClick={onSair} className={botaoVidro}>
          {T.sair}
        </button>
      </div>
    </div>
  );
}
