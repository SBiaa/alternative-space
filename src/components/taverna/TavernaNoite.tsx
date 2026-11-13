"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { humorDoDragao } from "@/lib/taverna/atributos";
import { EQUIPE, TAVERNA } from "@/lib/taverna/config";
import { criarCtx } from "@/lib/taverna/contexto";
import { agir, criarNoite, passo, proximaAcao, resumoDaNoite, type Acao, type Grupo, type NoiteEstado } from "@/lib/taverna/motor";
import type { RespostaNoite } from "@/app/actions/taverna";
import type { Leitura } from "./salao";
import { useTaverna, type Inicial } from "./useTaverna";

const SalaoPhaser = dynamic(() => import("./SalaoPhaser"), { ssr: false, loading: () => <p className="p-4 text-areia">Acendendo a lareira…</p> });

const CHAVE_NOITE = "taverna-do-dragao:noite";
const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

const reduzidoAgora = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function TavernaNoite({ inicial }: { inicial: Inicial }) {
  const t = useTaverna(inicial);
  const { prog, catalogo } = t;
  const [fase, setFase] = useState<"pre" | "jogando" | "fechando" | "resumo">("pre");
  const [pausado, setPausado] = useState(false);
  const [vista, setVista] = useState<NoiteEstado | null>(null);
  const [selecionado, setSelecionado] = useState<number | null>(null);
  const [foco, setFoco] = useState<string | null>(null);
  const [mensagem, setMensagem] = useState("");
  const [resultado, setResultado] = useState<RespostaNoite | null>(null);
  const [guardada, setGuardada] = useState<NoiteEstado | null>(null);
  const [repAntes, setRepAntes] = useState(0);

  const ctx = useMemo(() => (prog ? criarCtx(prog, catalogo) : null), [prog, catalogo]);
  const eRef = useRef<NoiteEstado | null>(null);
  const ctxRef = useRef(ctx);
  const selRef = useRef<number | null>(null);
  const focoRef = useRef<string | null>(null);
  const reduzido = useRef(false);
  useEffect(() => {
    ctxRef.current = ctx;
    selRef.current = selecionado;
    focoRef.current = foco;
  });
  useEffect(() => {
    reduzido.current = reduzidoAgora();
  }, []);

  // Noite guardada na pausa: se a de agora for a mesma, dá pra retomar.
  useEffect(() => {
    if (!prog) return;
    let achada: NoiteEstado | null = null;
    try {
      const bruto = localStorage.getItem(CHAVE_NOITE);
      const e = bruto ? (JSON.parse(bruto) as NoiteEstado) : null;
      achada = e && e.v === 1 && e.noite === prog.noite + 1 ? e : null;
    } catch {}
    queueMicrotask(() => setGuardada(achada));
  }, [prog]);

  const ler = useCallback((): Leitura | null => {
    const e = eRef.current;
    const c = ctxRef.current;
    if (!e || !c) return null;
    return { e, ctx: c, selecionado: selRef.current, foco: focoRef.current, reduzido: reduzido.current, humor: humorDoDragao(c.reputacao) };
  }, []);

  const abrir = (retomar: boolean) => {
    if (!ctx) return;
    const e = retomar && guardada ? guardada : criarNoite(ctx);
    eRef.current = e;
    setVista(e);
    setRepAntes(ctx.reputacao);
    setSelecionado(null);
    setMensagem("");
    setPausado(false);
    setFase("jogando");
  };

  const finalizar = useCallback(async () => {
    const e = eRef.current;
    const c = ctxRef.current;
    if (!e || !c) return;
    setFase("fechando");
    try {
      localStorage.removeItem(CHAVE_NOITE);
    } catch {}
    setGuardada(null);
    setResultado(await t.fechar(resumoDaNoite(e, c)));
    setVista(e);
    setFase("resumo");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t.fechar]);

  // Relógio da noite: passo com tempo real (até 0,25 s por quadro), HUD atualizado ~4 vezes por segundo.
  useEffect(() => {
    if (fase !== "jogando" || pausado || !ctx) return;
    let raf = 0;
    let ultimo = performance.now();
    let acc = 0;
    const quadro = (agora: number) => {
      const dt = Math.min(0.25, (agora - ultimo) / 1000);
      ultimo = agora;
      const e = passo(eRef.current!, ctx, dt);
      eRef.current = e;
      acc += dt;
      if (e.fim) {
        setVista(e);
        void finalizar();
        return;
      }
      if (acc >= 0.25) {
        acc = 0;
        setVista(e);
      }
      raf = requestAnimationFrame(quadro);
    };
    raf = requestAnimationFrame(quadro);
    return () => cancelAnimationFrame(raf);
  }, [fase, pausado, ctx, finalizar]);

  const pausar = (v: boolean) => {
    setPausado(v);
    if (v && eRef.current) {
      try {
        localStorage.setItem(CHAVE_NOITE, JSON.stringify(eRef.current)); // salva na pausa
      } catch {}
    }
  };

  const pausadoRef = useRef(false);
  useEffect(() => {
    pausadoRef.current = pausado;
  }, [pausado]);

  const fazer = useCallback((a: Acao) => {
    const e = eRef.current;
    const c = ctxRef.current;
    if (!e || !c || pausadoRef.current) return;
    const r = agir(e, c, a);
    eRef.current = r.estado;
    setVista(r.estado);
    setMensagem(r.erro ?? "");
    if (!r.erro && a.tipo === "acomodar") setSelecionado(null);
  }, []);
  const tocarMesa = useCallback(
    (id: string) => {
      const e = eRef.current;
      if (!e) return;
      setFoco(id);
      if (selRef.current !== null) return fazer({ tipo: "acomodar", grupoId: selRef.current, mesaId: id });
      const a = proximaAcao(e, id);
      if (a) fazer({ tipo: a.tipo, mesaId: id });
    },
    [fazer],
  );
  const tocarGrupo = useCallback((id: number) => setSelecionado((s) => (s === id ? null : id)), []);

  if (!t.pronto) return <p className="text-areia">Abrindo a taverna…</p>;
  if (!prog || !ctx) {
    return (
      <div className="surface-vidro flex max-w-[560px] flex-col gap-3 p-5">
        <p className="m-0">Você ainda não tem uma taverna.</p>
        <Link href="/jogos/taverna" className="botao-laranja inline-flex items-center no-underline">{TAVERNA.textos.novaTaverna}</Link>
      </div>
    );
  }

  const nomeArq = (slug: string) => ctx.arquetipos.find((a) => a.slug === slug);

  // ---------- antes de abrir ----------
  if (fase === "pre") {
    return (
      <div className="flex max-w-[720px] flex-col gap-4">
        <div className="flex flex-col gap-1">
          <span className="rotulo text-lareira-brasa">{prog.cidade}</span>
          <h2 className="m-0 text-2xl font-semibold">Noite {prog.noite + 1}</h2>
        </div>
        <dl className="m-0 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Dado rotulo="Ouro" valor={String(prog.ouro)} />
          <Dado rotulo="Reputação" valor={`${prog.reputacao.toFixed(2)} / 5`} />
          <Dado rotulo="Nível" valor={String(prog.nivel)} />
          <Dado rotulo="Lugares" valor={String(ctx.attr.lugares)} />
        </dl>
        <p className="m-0 text-areia">
          Equipe hoje: {prog.equipe.length === 0 ? "só você" : prog.equipe.map((m) => `${EQUIPE[m.papel].icone} ${EQUIPE[m.papel].nome}`).join(", ")}.
        </p>
        <label className="flex min-h-11 items-center gap-3">
          <input type="checkbox" className="size-5" checked={prog.tranquila} onChange={(ev) => t.definirTranquila(ev.target.checked)} />
          <span>Noite tranquila: a paciência dos clientes cai mais devagar (aparece no resumo).</span>
        </label>
        <div className="flex flex-wrap gap-3">
          {guardada && <button type="button" className="botao-laranja" onClick={() => abrir(true)}>Retomar a noite pausada</button>}
          <button type="button" className={guardada ? "botao-vidro" : "botao-laranja"} onClick={() => abrir(false)}>{guardada ? "Começar do zero" : "Abrir a taverna"}</button>
          <Link href="/jogos/taverna/melhorias" className="botao-vidro inline-flex items-center no-underline">Melhorias</Link>
        </div>
        <p className="m-0 text-xs text-poeira">Dica: toque num grupo na porta e depois numa mesa livre pra acomodar. Depois, anote o pedido, busque no balcão, sirva e cobre.</p>
      </div>
    );
  }

  if (!vista) return null;
  const e = vista;

  // ---------- resumo ----------
  if (fase === "fechando") return <p className="text-areia">Fechando as contas da noite…</p>;
  if (fase === "resumo") {
    if (!resultado || !resultado.ok) {
      return (
        <div className="surface-vidro flex max-w-[560px] flex-col gap-3 p-5" role="alert">
          <h2 className="m-0 text-xl font-semibold">Noite encerrada, mas não foi guardada</h2>
          <p className="m-0">{resultado?.ok === false ? resultado.erro : "Algo deu errado."}</p>
          {resultado?.ok === false && resultado.semConta && <Link href="/entrar?next=/jogos/taverna/noite" className="botao-laranja inline-flex items-center no-underline">Entrar</Link>}
          <button type="button" className="botao-vidro" onClick={() => setFase("pre")}>Voltar</button>
        </div>
      );
    }
    const r = resultado.registro;
    const melhor = nomeArq(r.melhorArquetipo ?? "");
    return (
      <div className="surface-creme flex max-w-[720px] flex-col gap-4 p-5" aria-live="polite">
        <div>
          <span className="rotulo text-azul">Resumo da noite {r.noite}</span>
          <h2 className="m-0 text-2xl font-semibold text-azul">{r.saldo >= 0 ? "A casa fechou no azul" : "A casa fechou no vermelho"}</h2>
          {r.tranquila && <p className="m-0 mt-1 text-sm">Noite tranquila ligada: paciência com queda mais lenta.</p>}
        </div>
        <dl className="m-0 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <DadoClaro rotulo="Atendidos" valor={String(r.servidos)} />
          <DadoClaro rotulo="Foram embora" valor={String(r.foram)} />
          <DadoClaro rotulo="Ouro das vendas" valor={String(r.ganhos)} />
          <DadoClaro rotulo="Gorjetas" valor={String(r.gorjetas)} />
          <DadoClaro rotulo="Ingredientes" valor={`− ${r.gastos.ingredientes}`} />
          <DadoClaro rotulo="Salários" valor={`− ${r.gastos.salarios}`} />
          <DadoClaro rotulo="Reparos" valor={`− ${r.gastos.reparos}`} />
          <DadoClaro rotulo="Saldo da noite" valor={`${r.saldo >= 0 ? "+" : "−"} ${Math.abs(r.saldo)}`} />
          <DadoClaro rotulo="Reputação" valor={`${repAntes.toFixed(2)} → ${r.reputacaoFim.toFixed(2)}`} />
        </dl>
        <p className="m-0">Mais satisfeito: {melhor ? `${melhor.icone} ${melhor.name}` : "ninguém foi atendido"}.</p>
        {resultado.subiuDeNivel && <p className="m-0 font-semibold text-azul">A taverna subiu pro nível {resultado.prog.nivel}: novas melhorias e clientes à vista.</p>}
        {resultado.semana && (
          <p className="m-0 font-semibold text-azul">
            Fim da semana {resultado.semana.semana}: taxa da guilda de {resultado.semana.taxa} ouro {resultado.semana.paga ? "paga." : "não coube no caixa. O caixa zerou e a reputação caiu."}
          </p>
        )}
        <div className="flex flex-wrap gap-3">
          <Link href="/jogos/taverna/melhorias" className="botao-laranja inline-flex items-center no-underline">Melhorias</Link>
          <button type="button" className="chip" onClick={() => { setResultado(null); setFase("pre"); }}>Próxima noite</button>
        </div>
        {!t.logado && <p className="m-0 text-sm">{TAVERNA.textos.contaGuardar}. <Link href="/cadastro?next=/jogos/taverna" className="text-azul underline">Criar conta</Link></p>}
      </div>
    );
  }

  // ---------- a noite ----------
  const naPorta = e.grupos.filter((g) => g.fase === "fila");
  const ganhosAgora = e.ganhos + e.gorjetas;
  const prontos = e.grupos.filter((g) => g.fase === "pediu" && e.t >= g.prontoEm && !g.retirado);
  const comboMult = 1 + Math.min(e.combo, TAVERNA.combo.max) * TAVERNA.combo.bonusPorPonto;

  return (
    <div className="flex flex-col gap-3 landscape:max-lg:flex-row">
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2" role="group" aria-label="Painel da noite">
          <span className="font-ficha text-lg" aria-label={`Faltam ${mmss(Math.max(0, e.duracao - e.t))} pra fechar`}>⏱ {e.fechada ? "Fechando" : mmss(Math.max(0, e.duracao - e.t))}</span>
          <span className="font-ficha text-lg">💰 {ganhosAgora}</span>
          <span className="font-ficha text-lg" title="Combo de serviço">🔥 ×{comboMult.toFixed(1)}</span>
          <span className="font-ficha text-sm text-areia">Atendidos {e.servidos} · Foram {e.foram}</span>
          <button type="button" className="botao-vidro ml-auto" onClick={() => pausar(!pausado)} aria-pressed={pausado}>{pausado ? "Continuar" : "Pausar"}</button>
        </div>
        <div className="relative h-[52dvh] min-h-[280px] overflow-hidden rounded-md border border-lareira-couro bg-lareira-madeira landscape:max-lg:h-[calc(100dvh-140px)]">
          <SalaoPhaser ler={ler} toques={{ mesa: tocarMesa, grupo: tocarGrupo }} />
          {pausado && <div className="absolute inset-0 grid place-items-center bg-noite/70 text-xl font-semibold" role="status">Pausado</div>}
        </div>
        <p className="m-0 min-h-6 text-sm text-lareira-brasa" role="status" aria-live="polite">{mensagem}</p>
      </div>

      <div className="flex w-full flex-col gap-3 landscape:max-lg:w-[44%] lg:w-[340px] lg:shrink-0">
        <section aria-labelledby="porta" className="surface-vidro flex flex-col gap-2 p-3">
          <h3 id="porta" className="rotulo m-0 text-lareira-brasa">Porta ({naPorta.length})</h3>
          {naPorta.length === 0 ? <p className="m-0 text-sm text-areia">Ninguém esperando.</p> : (
            <ul className="m-0 flex list-none flex-col gap-2 p-0">
              {naPorta.map((g) => <ItemGrupo key={g.id} g={g} selecionado={selecionado === g.id} aoTocar={() => tocarGrupo(g.id)} nome={nomeArq} />)}
            </ul>
          )}
          {selecionado !== null && <p className="m-0 text-sm">Agora escolha uma mesa livre.</p>}
        </section>

        <section aria-labelledby="mesas" className="surface-vidro flex flex-col gap-2 p-3">
          <h3 id="mesas" className="rotulo m-0 text-lareira-brasa">Mesas</h3>
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {ctx.attr.mesas.map((m, i) => {
              const est = e.mesas.find((x) => x.id === m.id)!;
              const g = e.grupos.find((x) => x.id === est.grupoId);
              const prox = proximaAcao(e, m.id);
              const livre = !est.suja && est.grupoId === null;
              const acomodar = selecionado !== null && livre;
              const grupoSel = naPorta.find((x) => x.id === selecionado);
              const cabe = grupoSel ? grupoSel.clientes.filter((c) => c.saiu === null).length <= m.lugares : true;
              return (
                <li key={m.id}>
                  <button
                    type="button"
                    onClick={() => tocarMesa(m.id)}
                    onFocus={() => setFoco(m.id)}
                    disabled={pausado || (selecionado === null && !prox) || (selecionado !== null && (!livre || !cabe))}
                    className="botao-vidro flex w-full flex-col items-start gap-0.5 py-2 text-left"
                  >
                    <span className="font-semibold">Mesa {i + 1} · {m.lugares} lugares · {textoMesa(est.suja, g, e)}</span>
                    {g && <span className="text-sm text-areia">{g.clientes.filter((c) => c.saiu === null).map((c) => nomeArq(c.arq)?.icone).join(" ")}</span>}
                    <span className="text-sm text-lareira-brasa">{acomodar ? (cabe ? "Acomodar o grupo aqui" : "Grupo grande demais") : prox ? prox.rotulo : "—"}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>

        <section aria-labelledby="balcao" className="surface-vidro flex flex-col gap-2 p-3">
          <h3 id="balcao" className="rotulo m-0 text-lareira-brasa">Balcão e cozinha</h3>
          {e.grupos.some((g) => g.fase === "pediu") ? (
            <ul className="m-0 flex list-none flex-col gap-1 p-0 text-sm">
              {e.grupos.filter((g) => g.fase === "pediu").map((g) => {
                const i = ctx.attr.mesas.findIndex((m) => m.id === g.mesaId) + 1;
                return <li key={g.id}>Mesa {i}: {e.t >= g.prontoEm ? (g.retirado ? "na sua mão, falta servir" : "pronto pra buscar") : `preparando, ${Math.ceil(g.prontoEm - e.t)}s`}</li>;
              })}
            </ul>
          ) : <p className="m-0 text-sm text-areia">Nenhum pedido em preparo.</p>}
          {prontos.length > 0 && <p className="m-0 text-xs text-poeira">Toque na mesa pra buscar o pedido pronto e de novo pra servir.</p>}
        </section>

        <p className="m-0 text-xs text-poeira" aria-live="polite">Dragão: {{ ronca: "ronca tranquilo, a casa vai bem.", dorme: "dorme sem pressa.", umOlho: "abriu um olho: a reputação anda baixa." }[humorDoDragao(ctx.reputacao)]}</p>
      </div>
    </div>
  );
}

function textoMesa(suja: boolean, g: Grupo | undefined, e: NoiteEstado): string {
  if (suja) return "suja";
  if (!g) return "livre";
  switch (g.fase) {
    case "sentado": return "quer pedir";
    case "pediu": return e.t >= g.prontoEm ? (g.retirado ? "pedido na mão" : "pedido pronto") : "preparando";
    case "comendo": return "comendo";
    case "cobrar": return "quer pagar";
    default: return "livre";
  }
}

function ItemGrupo({ g, selecionado, aoTocar, nome }: { g: Grupo; selecionado: boolean; aoTocar: () => void; nome: (s: string) => { icone: string; name: string; quirk: { rotulo: string } } | undefined }) {
  const ativos = g.clientes.filter((c) => c.saiu === null);
  const min = Math.ceil(Math.min(...ativos.map((c) => c.pac)));
  return (
    <li>
      <button type="button" onClick={aoTocar} aria-pressed={selecionado} className={`botao-vidro flex w-full flex-col items-start gap-0.5 py-2 text-left ${selecionado ? "!border-lareira-vela !bg-lareira-vela/20" : ""}`}>
        <span className="font-semibold">Grupo de {ativos.length} · paciência {min}s</span>
        {ativos.map((c) => <span key={c.id} className="text-sm text-areia">{nome(c.arq)?.icone} {nome(c.arq)?.name}: {nome(c.arq)?.quirk.rotulo}</span>)}
      </button>
    </li>
  );
}

const Dado = ({ rotulo, valor }: { rotulo: string; valor: string }) => (
  <div className="surface-vidro p-3"><dt className="text-sm text-areia">{rotulo}</dt><dd className="m-0 font-ficha text-xl">{valor}</dd></div>
);
const DadoClaro = ({ rotulo, valor }: { rotulo: string; valor: string }) => (
  <div><dt className="text-sm">{rotulo}</dt><dd className="m-0 font-ficha text-xl">{valor}</dd></div>
);
