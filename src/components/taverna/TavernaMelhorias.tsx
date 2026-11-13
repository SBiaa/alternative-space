"use client";

import Link from "next/link";
import { useState } from "react";
import { gradeDe, mesasCompradas, nivelDe } from "@/lib/taverna/atributos";
import { EQUIPE, TAVERNA, ordemPapeis } from "@/lib/taverna/config";
import { vagasDe } from "@/lib/taverna/economia";
import { descreverEfeito } from "@/lib/taverna/rotulos";
import type { ItemCatalogo, MesaLayout, Papel, TipoItem } from "@/lib/taverna/tipos";
import { useTaverna, type Inicial } from "./useTaverna";

type Aba = "mobilia" | "receita" | "equipe" | "ambiente" | "expansao";
const ABAS: { id: Aba; nome: string }[] = [
  { id: "mobilia", nome: "Mobília" },
  { id: "receita", nome: "Cardápio" },
  { id: "equipe", nome: "Equipe" },
  { id: "ambiente", nome: "Ambiente" },
  { id: "expansao", nome: "Expansão" },
];

export function TavernaMelhorias({ inicial }: { inicial: Inicial }) {
  const t = useTaverna(inicial);
  const { prog, catalogo } = t;
  const [aba, setAba] = useState<Aba>("mobilia");
  const [escolhido, setEscolhido] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ texto: string; erro: boolean }>({ texto: "", erro: false });
  const [ocupado, setOcupado] = useState(false);
  const [movendo, setMovendo] = useState<string | null>(null);

  if (!t.pronto) return <p className="text-areia">Abrindo a oficina…</p>;
  if (!prog) {
    return (
      <div className="surface-vidro flex max-w-[560px] flex-col gap-3 p-5">
        <p className="m-0">Você ainda não tem uma taverna.</p>
        <Link href="/jogos/taverna" className="botao-laranja inline-flex items-center no-underline">{TAVERNA.textos.novaTaverna}</Link>
      </div>
    );
  }

  const rodar = async (f: () => Promise<{ ok: true } | { ok: false; erro: string }>, sucesso: string) => {
    setOcupado(true);
    const r = await f();
    setOcupado(false);
    setMsg(r.ok ? { texto: sucesso, erro: false } : { texto: r.erro, erro: true });
  };

  const itens = catalogo.itens.filter((i) => i.kind === (aba as TipoItem));

  return (
    <div className="flex max-w-[980px] flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <span className="rotulo text-lareira-brasa">{prog.cidade} · nível {prog.nivel} · noite {prog.noite}</span>
          <h2 className="m-0 text-2xl font-semibold">Melhorias</h2>
        </div>
        <p className="m-0 font-ficha text-2xl" aria-label={`Ouro: ${prog.ouro}`}>💰 {prog.ouro}</p>
      </div>
      <p className="m-0 text-xs text-poeira">{TAVERNA.textos.avisoOuro}</p>

      <div role="tablist" aria-label="Tipos de melhoria" className="flex flex-wrap gap-1 border-b line-sutil">
        {ABAS.map((a) => (
          <button key={a.id} type="button" role="tab" id={`aba-${a.id}`} aria-selected={aba === a.id} aria-controls="painel-melhorias" className="aba" onClick={() => { setAba(a.id); setEscolhido(null); }} {...(aba === a.id ? { "aria-current": "page" as const } : {})}>
            {a.nome}
          </button>
        ))}
      </div>

      <p className={`m-0 min-h-6 text-sm ${msg.erro ? "text-danger" : "text-ok"}`} role="status" aria-live="polite">{msg.texto}</p>

      <div id="painel-melhorias" role="tabpanel" aria-labelledby={`aba-${aba}`} className="flex flex-col gap-3">
        {aba === "equipe" ? (
          equipe()
        ) : (
          <ul className="m-0 grid list-none gap-3 p-0 sm:grid-cols-2">
            {itens.map((it) => cartao(it))}
          </ul>
        )}

        {aba === "mobilia" && grade()}

        {aba === "expansao" && (
          <section aria-labelledby="filial" className="surface-vidro flex flex-col gap-2 border-dashed p-4">
            <div className="flex flex-wrap items-center gap-3">
              <h3 id="filial" className="m-0 text-lg font-semibold">🔒 {TAVERNA.textos.filialTitulo}</h3>
              <span className="rotulo rounded-[4px] border border-lareira-brasa px-2 py-1 text-lareira-brasa">{TAVERNA.textos.filialAviso}</span>
            </div>
            <p className="m-0 text-sm text-areia">Requisito: reputação {TAVERNA.filial.reputacao.toFixed(1)} e taverna no nível {TAVERNA.filial.nivel}. Você está com reputação {prog.reputacao.toFixed(2)} e nível {prog.nivel}.</p>
            <button type="button" className="botao-vidro self-start" disabled aria-disabled="true">Ainda não dá pra abrir filial</button>
          </section>
        )}
      </div>
    </div>
  );

  function cartao(it: ItemCatalogo) {
    const nivel = nivelDe(prog!, it.slug);
    const maximo = nivel >= it.maxLevel;
    const sel = escolhido === it.slug;
    const trava = prog!.nivel < it.minTavernLevel;
    const preco = it.prices[nivel];
    const proximo = it.effects[Math.min(nivel, it.effects.length - 1)];
    return (
      <li key={it.slug}>
        <div className={`${sel ? "surface-creme" : "surface-vidro"} flex h-full flex-col gap-2 p-4`}>
          <button type="button" onClick={() => setEscolhido(sel ? null : it.slug)} aria-expanded={sel} className="flex min-h-11 w-full cursor-pointer items-center justify-between gap-3 bg-transparent p-0 text-left text-inherit">
            <span className={`text-lg font-semibold ${sel ? "text-azul" : ""}`}>{it.name}</span>
            <span className="font-ficha text-sm">nível {nivel}/{it.maxLevel}</span>
          </button>
          <p className="m-0 text-sm">{it.description}</p>
          {it.kind === "mobilia" && it.effects[0]?.lugares ? <p className="m-0 text-sm">Mesas deste tipo: {nivel} (cada nível é mais uma mesa).</p> : null}
          {(sel || maximo || trava) && (
            <p className="m-0 text-sm">
              {maximo ? "No nível máximo." : <>Próximo nível: {descreverEfeito(it.kind, proximo)}.</>}
              {trava && !maximo ? ` Pede taverna no nível ${it.minTavernLevel}.` : ""}
            </p>
          )}
          {!maximo && (
            <button
              type="button"
              className="botao-laranja mt-auto self-start"
              disabled={ocupado || trava || prog!.ouro < preco}
              onClick={() => rodar(() => t.comprar(it.slug), `${it.name} agora no nível ${nivel + 1}.`)}
            >
              {nivel === 0 ? "Liberar" : "Melhorar"} · <span className="font-ficha">{preco}</span> de ouro
            </button>
          )}
        </div>
      </li>
    );
  }

  function equipe() {
    const vagas = vagasDe(prog!.nivel);
    return (
      <>
        <p className="m-0 text-sm text-areia">Vagas: {prog!.equipe.length} de {vagas} (sobem com o nível da taverna). Cada funcionário recebe salário por noite, mesmo quando a casa vai mal.</p>
        <ul className="m-0 grid list-none gap-3 p-0 sm:grid-cols-2">
          {ordemPapeis.map((papel) => {
            const d = EQUIPE[papel];
            const m = prog!.equipe.find((x) => x.papel === papel);
            const sel = escolhido === papel;
            const trava = prog!.nivel < d.nivelTaverna;
            const preco = m ? d.precos[m.nivel] : d.precos[0];
            const max = m ? m.nivel >= d.precos.length : false;
            return (
              <li key={papel}>
                <div className={`${sel ? "surface-creme" : "surface-vidro"} flex h-full flex-col gap-2 p-4`}>
                  <button type="button" onClick={() => setEscolhido(sel ? null : papel)} aria-expanded={sel} className="flex min-h-11 w-full cursor-pointer items-center justify-between gap-3 bg-transparent p-0 text-left text-inherit">
                    <span className={`text-lg font-semibold ${sel ? "text-azul" : ""}`}>{d.icone} {d.nome}</span>
                    <span className="font-ficha text-sm">{m ? `nível ${m.nivel}/${d.precos.length}` : "não contratado"}</span>
                  </button>
                  <p className="m-0 text-sm">{d.descricao}</p>
                  <p className="m-0 text-sm">Salário por noite: <span className="font-ficha">{d.salario[(m?.nivel ?? 1) - 1]}</span> de ouro{m && !max ? ` (sobe pra ${d.salario[m.nivel]} no próximo nível)` : ""}. {trava ? `Pede taverna no nível ${d.nivelTaverna}.` : ""}</p>
                  {!max && (
                    <button
                      type="button"
                      className="botao-laranja mt-auto self-start"
                      disabled={ocupado || trava || prog!.ouro < preco || (!m && prog!.equipe.length >= vagas)}
                      onClick={() => rodar(() => (m ? t.melhorar(papel as Papel) : t.contratar(papel as Papel)), m ? `${d.nome} subiu de nível.` : `${d.nome} contratado.`)}
                    >
                      {m ? "Melhorar" : "Contratar"} · <span className="font-ficha">{preco}</span> de ouro
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </>
    );
  }

  function grade() {
    const g = gradeDe(prog!, catalogo);
    const comprado = mesasCompradas(prog!, catalogo);
    const nomeTipo = (slug: string) => catalogo.itens.find((i) => i.slug === slug)?.name ?? slug;
    const naCasa = (x: number, y: number) => prog!.layout.find((m) => m.x === x && m.y === y);
    const foraDoSalao = Object.entries(comprado).flatMap(([slug, n]) => Array.from({ length: Math.max(0, n - prog!.layout.filter((m) => m.tipo === slug).length) }, () => slug));

    const clicar = async (x: number, y: number) => {
      const aqui = naCasa(x, y);
      if (aqui) return setMovendo((v) => (v === aqui.id ? null : aqui.id));
      if (!movendo) return;
      const novo: MesaLayout[] = prog!.layout.map((m) => (m.id === movendo ? { ...m, x, y } : m));
      setMovendo(null);
      await rodar(() => t.salvarLayout(novo), "Mesa de lugar. Salão guardado.");
    };

    return (
      <section aria-labelledby="salao" className="surface-vidro flex flex-col gap-3 p-4">
        <h3 id="salao" className="m-0 text-lg font-semibold">Disposição do salão</h3>
        <p className="m-0 text-sm text-areia">Escolha uma mesa e depois uma casa vazia pra mudar de lugar. {movendo ? "Agora escolha a casa." : ""}</p>
        <div role="group" aria-label="Grade do salão" className="grid gap-1" style={{ gridTemplateColumns: `repeat(${g.colunas}, minmax(44px, 84px))` }}>
          {Array.from({ length: g.linhas }, (_, y) => Array.from({ length: g.colunas }, (_, x) => {
            const m = naCasa(x, y);
            return (
              <button
                key={`${x}-${y}`}
                type="button"
                aria-pressed={m ? movendo === m.id : undefined}
                aria-label={`Coluna ${x + 1}, linha ${y + 1}: ${m ? nomeTipo(m.tipo) : "vazia"}`}
                onClick={() => clicar(x, y)}
                disabled={ocupado}
                className={`min-h-11 rounded-[4px] border p-1 text-xs ${m ? "border-lareira-vela bg-lareira-madeira-2" : "border-dashed border-lareira-couro bg-lareira-madeira"} ${m && movendo === m.id ? "!border-lareira-brasa !bg-lareira-brasa/30" : ""}`}
              >
                {m ? `🪑 ${nomeTipo(m.tipo).replace("Mesa ", "")}` : "·"}
              </button>
            );
          }))}
        </div>
        {foraDoSalao.length > 0 && <p className="m-0 text-sm text-lareira-brasa">Há mesas compradas sem lugar no salão: amplie a grade ou libere uma casa.</p>}
      </section>
    );
  }
}
