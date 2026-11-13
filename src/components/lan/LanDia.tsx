"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { RespostaDia } from "@/app/actions/lan";
import { LAN } from "@/lib/lan/config";
import { criarCtx } from "@/lib/lan/contexto";
import { ACOES_CONSERTO, EQUIPE_TEXTO, NOME_PC, PROBLEMAS, PRODUTOS, ROTULOS_SALAO, SERVICOS, TEXTOS } from "@/lib/lan/conteudo";
import { contatos as listarContatos, recadoDasContas, recadosDaManha, recadosDoDia, type Recado } from "@/lib/lan/conversanet";
import {
  agir, consertosPara, criarDia, diaDaSemana, ehSabado, encerrar, escolherVizinhas, horaTexto, pacoteSugerido, passo, precoPacote, resumoDoDia,
  type Acao, type Conserto, type DiaEstado, type Grupo,
} from "@/lib/lan/motor";
import { guardarOpcoes, lerOpcoes, tocar, type OpcoesSom, type SomLan } from "@/lib/lan/sons";
import type { ResumoDia } from "@/lib/lan/tipos";
import { ConversaNet } from "./ConversaNet";
import type { Leitura } from "./salao";
import { useLan, type Inicial } from "./useLan";

const SalaoLanPhaser = dynamic(() => import("./SalaoLanPhaser"), { ssr: false, loading: () => <p className="p-4 text-areia">{TEXTOS.carregandoSalao}</p> });

const CHAVE_TRANQUILO = "lan-house-2005:tranquilo";
const reduzidoAgora = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const pct = (v: number) => `${Math.round(v * 100)}%`;

export function LanDia({ inicial }: { inicial: Inicial }) {
  const t = useLan(inicial);
  const { prog, catalogo } = t;
  const [fase, setFase] = useState<"pre" | "jogando" | "fechando" | "resumo">("pre");
  const [pausado, setPausado] = useState(false);
  const [vel, setVel] = useState(1);
  const [vista, setVista] = useState<DiaEstado | null>(null);
  const [selecionado, setSelecionado] = useState<number | null>(null);
  const [pacote, setPacote] = useState<string>("1h");
  const [maqAberta, setMaqAberta] = useState<string | null>(null);
  const [mensagem, setMensagem] = useState("");
  const [resultado, setResultado] = useState<RespostaDia | null>(null);
  const [resumo, setResumo] = useState<ResumoDia | null>(null);
  const [guardado, setGuardado] = useState<DiaEstado | null>(null);
  const [cnAberto, setCnAberto] = useState(true);
  const [sons, setSons] = useState<OpcoesSom>({ modem: true, mensagem: true, efeitos: true });
  const [repAntes, setRepAntes] = useState(0);

  const ctx = useMemo(() => (prog ? criarCtx(prog, catalogo) : null), [prog, catalogo]);
  const eRef = useRef<DiaEstado | null>(null);
  const ctxRef = useRef(ctx);
  const selRef = useRef<number | null>(null);
  const focoRef = useRef<string | null>(null);
  const reduzido = useRef(false);
  const sonsRef = useRef(sons);
  useEffect(() => {
    ctxRef.current = ctx;
    selRef.current = selecionado;
    sonsRef.current = sons;
  });

  // Opções guardadas no aparelho (sons e dia tranquilo).
  useEffect(() => {
    reduzido.current = reduzidoAgora();
    const o = lerOpcoes();
    let tranq = false;
    try {
      tranq = localStorage.getItem(CHAVE_TRANQUILO) === "1";
    } catch {}
    queueMicrotask(() => setSons(o));
    if (t.pronto && prog && prog.tranquilo !== tranq) t.definirTranquilo(tranq);
    // só na primeira vez que a lan fica pronta
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t.pronto]);

  const som = useCallback((s: SomLan) => tocar(s, sonsRef.current), []);

  // Dia guardado na pausa: se for o mesmo dia, dá pra retomar.
  useEffect(() => {
    if (!prog) return;
    let achado: DiaEstado | null = null;
    try {
      const bruto = localStorage.getItem(LAN.chaveDia);
      const e = bruto ? (JSON.parse(bruto) as DiaEstado) : null;
      achado = e && e.v === 1 && e.dia === prog.dia + 1 && !e.fim ? e : null;
    } catch {}
    queueMicrotask(() => setGuardado(achado));
  }, [prog]);

  // Laço do jogo: passos fixos da simulação, a tela do React atualiza umas 10 vezes por segundo.
  useEffect(() => {
    if (fase !== "jogando" || pausado) return;
    let raf = 0;
    let ultimo = performance.now();
    let acumulado = 0;
    const tick = (agora: number) => {
      const dt = Math.min(0.25, (agora - ultimo) / 1000);
      ultimo = agora;
      const e = eRef.current;
      const c = ctxRef.current;
      if (e && c) {
        const antes = e.nAviso;
        const novo = passo(e, c, dt * vel);
        eRef.current = novo;
        if (novo.nAviso > antes) {
          const ult = novo.avisos.at(-1)!;
          if (ult.tipo === "bom") som("moeda");
          else if (ult.tipo === "ruim") som("erro");
        }
        acumulado += dt;
        if (acumulado > 0.1 || novo.fim) {
          acumulado = 0;
          setVista(novo);
        }
        if (novo.fim) {
          setFase("fechando");
          return;
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [fase, pausado, vel, som]);

  // Fim do dia: manda o resumo pra conferir e gravar.
  useEffect(() => {
    if (fase !== "fechando" || !ctx || !eRef.current) return;
    const r = resumoDoDia(eRef.current, ctx);
    let vivo = true;
    (async () => {
      const res = await t.fechar(r);
      if (!vivo) return;
      try {
        localStorage.removeItem(LAN.chaveDia);
      } catch {}
      setResumo(r);
      setResultado(res);
      setFase("resumo");
    })();
    return () => {
      vivo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fase]);

  const recadosManha = useMemo(() => (prog && ctx ? recadosDaManha(prog, catalogo.arquetipos, Boolean(ctx.energiaInstavel)) : []), [prog, ctx, catalogo]);
  const contatos = useMemo(() => (prog ? listarContatos(prog, catalogo.arquetipos) : []), [prog, catalogo]);
  const [recadosFim, setRecadosFim] = useState<Recado[]>([]);
  const recados = useMemo(() => {
    const doDia = vista && prog ? recadosDoDia(vista, prog.seed) : [];
    return [...recadosManha, ...doDia, ...recadosFim];
  }, [recadosManha, vista, prog, recadosFim]);
  useEffect(() => {
    if (resultado?.ok && prog) queueMicrotask(() => setRecadosFim(recadoDasContas(resultado.semana, prog.seed, resultado.registro.dia)));
  }, [resultado, prog]);
  const aoNovoRecado = useCallback((r: Recado) => som(r.chamarAtencao ? "atencao" : "mensagem"), [som]);

  if (!t.pronto) return <p className="text-areia">{TEXTOS.procurando}</p>;
  if (!prog || !ctx) {
    return (
      <div className="flex flex-col gap-3">
        <p className="m-0 text-areia">Ainda não tem lan aberta.</p>
        <Link href="/jogos/lan-house" className="botao-laranja inline-flex w-fit items-center no-underline">{TEXTOS.nova}</Link>
      </div>
    );
  }

  const nomeDia = LAN.dia.nomesDias[diaDaSemana(prog.dia + 1)];

  const comecar = (retomar: DiaEstado | null) => {
    const e = retomar ?? criarDia(ctx);
    eRef.current = e;
    setVista(e);
    setRepAntes(prog.reputacao);
    setFase("jogando");
    setPausado(false);
    setCnAberto(false);
    if (!retomar) som("modem");
  };

  const pausar = (v: boolean) => {
    setPausado(v);
    if (v && eRef.current) {
      try {
        localStorage.setItem(LAN.chaveDia, JSON.stringify(eRef.current));
      } catch {}
    }
  };

  const fazer = (a: Acao) => {
    const e = eRef.current;
    if (!e) return false;
    const r = agir(e, ctx, a);
    if (r.erro) {
      setMensagem(r.erro === "ocupado" ? "Você ainda está ocupado." : r.erro === "maquinas" ? "Não tem máquinas livres suficientes ali." : r.erro === "estoque" ? "Acabou o estoque desse lanche." : "Não deu pra fazer isso agora.");
      return false;
    }
    eRef.current = r.estado;
    setVista(r.estado);
    setMensagem("");
    return true;
  };

  const tocarMaquina = (id: string) => {
    const e = eRef.current;
    if (!e) return;
    const m = e.maquinas.find((x) => x.id === id);
    if (selecionado !== null) {
      const g = e.grupos.find((x) => x.id === selecionado);
      if (!g) return;
      const ids = escolherVizinhas(e, id, g.n);
      if (!ids) return setMensagem("Não tem máquinas livres suficientes ali.");
      if (fazer({ tipo: "atender", grupo: g.id, maquinas: ids, pacote })) setSelecionado(null);
      return;
    }
    if (m) setMaqAberta(maqAberta === id ? null : id);
  };

  const tocarGrupo = (id: number) => {
    const e = eRef.current;
    const g = e?.grupos.find((x) => x.id === id);
    if (!g) return;
    if (g.fase === "cobrar") {
      fazer({ tipo: "cobrar", grupo: id });
      return;
    }
    if (g.fase === "fila") {
      setSelecionado(selecionado === id ? null : id);
      setPacote(pacoteSugerido(g));
      setMaqAberta(null);
    }
  };

  const leitura = (): Leitura | null => (eRef.current && ctxRef.current ? { e: eRef.current, ctx: ctxRef.current, selecionado: selRef.current, foco: focoRef.current, reduzido: reduzido.current } : null);

  // ---------- antes de abrir ----------
  if (fase === "pre") {
    return (
      <div className="mx-auto flex w-full max-w-[720px] flex-col gap-4">
        <div className="surface-vidro flex flex-wrap items-center justify-between gap-3 p-4">
          <div>
            <span className="rotulo text-bege-fosforo">{prog.local}</span>
            <h2 className="m-0 text-2xl font-semibold">Dia {prog.dia + 1} · {nomeDia}{ehSabado(prog.dia + 1) ? " · camp" : ""}</h2>
          </div>
          <dl className="m-0 flex gap-6">
            <div><dt className="text-sm text-areia">Caixa</dt><dd className="m-0 font-ficha text-xl">R$ {prog.dinheiro}</dd></div>
            <div><dt className="text-sm text-areia">Reputação</dt><dd className="m-0 font-ficha text-xl">{prog.reputacao.toFixed(2)} ★</dd></div>
          </dl>
        </div>
        <ConversaNet contatos={contatos} recados={recadosManha} aberto={cnAberto} onAlternar={() => setCnAberto(!cnAberto)} onNovo={aoNovoRecado} />
        <fieldset className="surface-vidro m-0 flex flex-col gap-2 p-4">
          <legend className="rotulo px-1 text-bege-fosforo">Opções</legend>
          <label className="flex min-h-[44px] items-center gap-3">
            <input type="checkbox" className="size-5" checked={prog.tranquilo} onChange={(ev) => {
              t.definirTranquilo(ev.target.checked);
              try { localStorage.setItem(CHAVE_TRANQUILO, ev.target.checked ? "1" : "0"); } catch {}
            }} />
            <span>{TEXTOS.diaTranquilo} <span className="block text-sm text-areia">{TEXTOS.diaTranquiloAjuda}</span></span>
          </label>
          <label className="flex min-h-[44px] items-center gap-3">
            <input type="checkbox" className="size-5" checked={sons.modem && sons.mensagem} onChange={(ev) => {
              const o = { ...sons, modem: ev.target.checked, mensagem: ev.target.checked };
              setSons(o);
              guardarOpcoes(o);
            }} />
            <span>{TEXTOS.sons}</span>
          </label>
        </fieldset>
        <div className="flex flex-wrap gap-3">
          {guardado && <button type="button" className="botao-laranja" onClick={() => comecar(guardado)}>Retomar o dia ({horaTexto(guardado.t)})</button>}
          <button type="button" className={guardado ? "botao-vidro" : "botao-laranja"} onClick={() => comecar(null)}>Abrir a lan</button>
          <Link href="/jogos/lan-house/melhorias" className="botao-vidro inline-flex items-center no-underline">Melhorias</Link>
        </div>
      </div>
    );
  }

  // ---------- resumo ----------
  if (fase === "resumo" || fase === "fechando") {
    return <Resumo resumo={resumo} resultado={resultado} repAntes={repAntes} catalogo={catalogo} recados={recados} contatos={contatos} onDeNovo={() => {
      setFase("pre");
      setResumo(null);
      setResultado(null);
      setRecadosFim([]);
      setCnAberto(true);
    }} />;
  }

  // ---------- jogando ----------
  const e = vista!;
  const voce = e.agentes.find((a) => a.papel === "voce")!;
  const ocupado = e.t < voce.ocupadoAte;
  const fila = e.grupos.filter((g) => g.fase === "fila");
  const cobrar = e.grupos.filter((g) => g.fase === "cobrar");
  const chamados = e.grupos.filter((g) => g.fase === "usando" && g.chamado);
  const ganhos = e.ganhosTempo + e.ganhosServicos + e.ganhosLanches + e.gorjetas - e.reembolsos;
  const arq = (g: Grupo) => ctx.arquetipos.find((a) => a.slug === g.arq)!;
  const sel = e.grupos.find((g) => g.id === selecionado && g.fase === "fila") ?? null;
  const maq = maqAberta ? e.maquinas.find((m) => m.id === maqAberta) : null;

  return (
    <div className="flex flex-col gap-3">
      {/* barra do dia */}
      <div className="surface-vidro flex flex-wrap items-center gap-x-5 gap-y-2 p-2 sm:p-3">
        <span className="font-ficha text-lg" aria-label={`Hora ${horaTexto(e.t)}`}>🕒 {horaTexto(e.t)}</span>
        <span className="font-ficha">Dia: R$ {ganhos}</span>
        <span className="font-ficha">★ {(prog.reputacao + e.repDelta).toFixed(2)}</span>
        <span className="font-ficha text-sm">👥 {e.servidos} · 🚪 {e.foram}</span>
        {prog.tranquilo && <span className="text-sm text-bege-fosforo">{TEXTOS.diaTranquilo}</span>}
        <div className="ml-auto flex gap-2">
          <button type="button" className="botao-vidro" onClick={() => pausar(!pausado)} aria-pressed={pausado}>{pausado ? "▶ Continuar" : "⏸ Pausar"}</button>
          <button type="button" className="botao-vidro" onClick={() => setVel(vel === 1 ? 2 : 1)} aria-pressed={vel === 2}>⏩ {vel}x</button>
        </div>
      </div>

      <p className="m-0 text-sm text-areia sm:hidden landscape:hidden">Gire o celular pra ver o salão inteiro.</p>

      <div className="grid gap-3 lg:grid-cols-[minmax(0,1.6fr)_minmax(320px,1fr)]">
        <div className="relative h-[52vh] min-h-[260px] overflow-hidden rounded-[8px] lg:h-[560px]">
          <SalaoLanPhaser ler={leitura} toques={{ maquina: tocarMaquina, grupo: tocarGrupo }} />
          {pausado && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/60">
              <div className="flex flex-col items-center gap-3">
                <strong className="text-2xl">Pausado</strong>
                <button type="button" className="botao-laranja" onClick={() => pausar(false)}>Continuar</button>
                <button type="button" className="botao-vidro" onClick={() => {
                  if (eRef.current) {
                    eRef.current = encerrar(eRef.current, ctx);
                    setVista(eRef.current);
                    setPausado(false);
                    setFase("fechando");
                  }
                }}>Fechar a lan mais cedo</button>
              </div>
            </div>
          )}
        </div>

        {/* painel: tudo que o canvas faz, em botões de verdade */}
        <div className="flex flex-col gap-3">
          <p className="m-0 min-h-6 text-sm" role="status" aria-live="polite">
            {ocupado ? `Você está ${voce.tarefa ?? "ocupado"}… (${Math.ceil(voce.ocupadoAte - e.t)}s)` : mensagem || e.avisos.at(-1)?.texto || "Tudo calmo."}
          </p>

          {sel ? (
            <section className="surface-creme flex flex-col gap-2 p-3" aria-label="Atender grupo">
              <h3 className="m-0 text-lg text-azul">{arq(sel).icone} {arq(sel).name} ×{sel.n}</h3>
              <p className="m-0 text-sm">{arq(sel).quirk.rotulo}. Quer ficar uns {Math.round((sel.querSeg * LAN.minutosPorSeg) / 10) * 10} min.</p>
              <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Pacote de tempo">
                {LAN.pacotes.map((p) => (
                  <button key={p.id} type="button" role="radio" aria-checked={pacote === p.id} onClick={() => setPacote(p.id)}
                    className={`min-h-[44px] rounded-[6px] border px-3 text-sm ${pacote === p.id ? "border-noite bg-laranja-claro font-semibold" : "border-noite/40 bg-white"}`}>
                    {p.rotulo} · R$ {precoPacote("basica", p.id)}+
                  </button>
                ))}
              </div>
              <p className="m-0 text-sm">Agora escolha a máquina (no salão ou na lista abaixo). Grupo senta junto, a partir dela.</p>
              <div className="flex gap-2">
                <button type="button" className="min-h-[44px] rounded-[6px] border border-noite px-3" onClick={() => setSelecionado(null)}>Cancelar</button>
                <button type="button" className="min-h-[44px] rounded-[6px] border border-noite px-3" onClick={() => { fazer({ tipo: "recusar", grupo: sel.id }); setSelecionado(null); }}>Dispensar</button>
              </div>
            </section>
          ) : null}

          <Lista titulo={`Fila (${fila.length})`}>
            {fila.length === 0 && <li className="text-sm text-areia">Ninguém esperando.</li>}
            {fila.map((g) => (
              <li key={g.id}>
                <button type="button" className={`flex min-h-[44px] w-full items-center gap-2 rounded-[6px] border px-3 text-left ${selecionado === g.id ? "border-laranja bg-laranja/20" : "border-creme/30"}`}
                  onClick={() => tocarGrupo(g.id)} onFocus={() => (focoRef.current = `g${g.id}`)} onBlur={() => (focoRef.current = null)} aria-pressed={selecionado === g.id}>
                  <span aria-hidden="true">{arq(g).icone}</span>
                  <span className="flex-1">{arq(g).name} ×{g.n}</span>
                  <Paciencia g={g} />
                </button>
              </li>
            ))}
          </Lista>

          {(cobrar.length > 0 || chamados.length > 0) && (
            <Lista titulo="Balcão e chamados">
              {cobrar.map((g) => (
                <li key={g.id}><button type="button" className="botao-laranja w-full text-left" disabled={ocupado} onClick={() => tocarGrupo(g.id)}>{ROTULOS_SALAO.cobrar}: {arq(g).icone} {arq(g).name} ×{g.n}</button></li>
              ))}
              {chamados.map((g) => (
                <li key={g.id} className="flex flex-wrap items-center gap-2">
                  <span className="flex-1 text-sm">{g.chamado === "lanche" ? ROTULOS_SALAO.chamadoLanche : ROTULOS_SALAO.chamadoAjuda} · {arq(g).icone} máq. {g.maquinas.map((m) => m.replace("pc", "")).join(", ")}</span>
                  {g.chamado === "lanche"
                    ? LAN.produtos.filter((p) => ctx.attr.lanches[p]).map((p) => (
                      <button key={p} type="button" className="botao-vidro text-sm" disabled={ocupado || !(e.estoque[p] ?? 0)} onClick={() => fazer({ tipo: "chamado", grupo: g.id, produto: p })}>
                        {PRODUTOS[p].icone} R$ {ctx.attr.lanches[p]!.preco} ({e.estoque[p] ?? 0})
                      </button>
                    ))
                    : <button type="button" className="botao-vidro text-sm" disabled={ocupado} onClick={() => fazer({ tipo: "chamado", grupo: g.id })}>Ajudar</button>}
                </li>
              ))}
            </Lista>
          )}

          <Lista titulo="Máquinas">
            {e.maquinas.map((m) => {
              const g = e.grupos.find((x) => x.id === m.grupo);
              const estado = m.problema ? `${PROBLEMAS[m.problema].icone} ${PROBLEMAS[m.problema].rotulo}` : m.formatando ? ROTULOS_SALAO.formatando : e.t < m.paradaAte ? ROTULOS_SALAO.reiniciando : g ? `${arq(g).icone} em uso` : "livre";
              return (
                <li key={m.id}>
                  <button type="button" className={`flex min-h-[44px] w-full items-center gap-2 rounded-[6px] border px-3 text-left text-sm ${maqAberta === m.id ? "border-laranja" : "border-creme/30"}`}
                    onClick={() => tocarMaquina(m.id)} onFocus={() => (focoRef.current = m.id)} onBlur={() => (focoRef.current = null)}>
                    <span className="font-ficha">{m.id.replace("pc", "")}</span>
                    <span>{NOME_PC[m.tipo]}</span>
                    <span className="flex-1 text-right">{estado}</span>
                    <span className="font-ficha text-xs" title="Saúde do sistema">♥ {Math.round(m.saude)}%</span>
                  </button>
                  {maq?.id === m.id && !sel && (
                    <div className="mt-1 flex flex-wrap gap-2 pl-2">
                      {(m.problema ? consertosPara(m) : (["formatar"] as Conserto[])).map((c) => (
                        <button key={c} type="button" className="botao-vidro text-sm" disabled={ocupado || e.t < m.paradaAte} onClick={() => { if (fazer({ tipo: "consertar", maquina: m.id, como: c })) setMaqAberta(null); }}>
                          {ACOES_CONSERTO[c]}
                        </button>
                      ))}
                      {!ctx.attr.mouseOptico && m.sujeira > 50 && !m.problema && <span className="self-center text-xs text-areia">mouse sujo {Math.round(m.sujeira)}%</span>}
                    </div>
                  )}
                </li>
              );
            })}
          </Lista>

          {Object.keys(ctx.attr.equipe).length > 0 && (
            <p className="m-0 text-xs text-areia">
              Equipe: {e.agentes.filter((a) => a.papel !== "voce").map((a) => `${EQUIPE_TEXTO[a.papel as keyof typeof EQUIPE_TEXTO].icone} ${EQUIPE_TEXTO[a.papel as keyof typeof EQUIPE_TEXTO].nome}${a.tarefa && e.t < a.ocupadoAte ? ` (${a.tarefa})` : ""}`).join(" · ")}
            </p>
          )}

          <ConversaNet contatos={contatos} recados={recados} aberto={cnAberto} onAlternar={() => setCnAberto(!cnAberto)} onNovo={aoNovoRecado} />
        </div>
      </div>
    </div>
  );
}

function Lista({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="surface-vidro p-3">
      <h3 className="rotulo m-0 mb-2 text-bege-fosforo">{titulo}</h3>
      <ul className="m-0 flex list-none flex-col gap-1.5 p-0">{children}</ul>
    </section>
  );
}

/** Paciência com barra, número e texto (não só cor). */
function Paciencia({ g }: { g: Grupo }) {
  const v = Math.max(0, g.pac / g.pacMax);
  const rotulo = v > 0.5 ? "calmo" : v > 0.25 ? "impaciente" : "quase indo";
  return (
    <span className="flex items-center gap-1 font-ficha text-[11px]" aria-label={`Paciência ${pct(v)}, ${rotulo}`}>
      <span aria-hidden="true">{v > 0.5 ? "🙂" : v > 0.25 ? "😐" : "😤"}</span>{pct(v)}
    </span>
  );
}

function Resumo({ resumo, resultado, repAntes, catalogo, recados, contatos, onDeNovo }: {
  resumo: ResumoDia | null;
  resultado: RespostaDia | null;
  repAntes: number;
  catalogo: Inicial["catalogo"];
  recados: Recado[];
  contatos: ReturnType<typeof listarContatos>;
  onDeNovo: () => void;
}) {
  const [cn, setCn] = useState(true);
  if (!resumo || !resultado) return <p className="text-areia" role="status">Fechando o caixa…</p>;
  if (!resultado.ok) {
    return (
      <div className="surface-vidro flex flex-col gap-3 p-4" role="alert">
        <p className="m-0">{resultado.erro}</p>
        <button type="button" className="botao-laranja w-fit" onClick={onDeNovo}>Voltar</button>
      </div>
    );
  }
  const r = resultado.registro;
  const melhor = r.melhorArquetipo ? catalogo.arquetipos.find((a) => a.slug === r.melhorArquetipo) : null;
  const servicos = Object.entries(resumo.servicos).filter(([, n]) => n);
  const incidentes = Object.entries(resumo.incidentes).filter(([, n]) => n);
  return (
    <div className="mx-auto flex w-full max-w-[760px] flex-col gap-4">
      <section className="surface-creme flex flex-col gap-3 p-4 sm:p-5" aria-labelledby="resumo-dia">
        <h2 id="resumo-dia" className="m-0 text-2xl text-azul">Fim do dia {r.dia}{r.tranquilo ? ` · ${TEXTOS.diaTranquilo}` : ""}</h2>
        <dl className="m-0 grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-3">
          <Item t="Clientes atendidos" v={r.servidos} />
          <Item t="Foram embora" v={r.foram} />
          <Item t="Horas vendidas" v={r.horasVendidas.toFixed(1)} />
          <Item t="Lanches" v={r.lanchesVendidos} />
          <Item t="Ganhos" v={`R$ ${r.ganhos}`} />
          <Item t="Gorjetas" v={`R$ ${resumo.gorjetas}`} />
          <Item t="Estoque" v={`− R$ ${r.gastos.estoque}`} />
          <Item t="Salários" v={`− R$ ${r.gastos.salarios}`} />
          <Item t="Consertos" v={`− R$ ${r.gastos.consertos}`} />
          <Item t="Saldo do dia" v={`${r.saldo >= 0 ? "+" : "−"} R$ ${Math.abs(r.saldo)}`} />
          <Item t="Reputação" v={`${repAntes.toFixed(2)} → ${r.reputacaoFim.toFixed(2)} ★`} />
          <Item t="Caixa" v={`R$ ${resultado.prog.dinheiro}`} />
        </dl>
        {servicos.length > 0 && <p className="m-0 text-sm">Serviços: {servicos.map(([s, n]) => `${SERVICOS[s as keyof typeof SERVICOS].icone} ${SERVICOS[s as keyof typeof SERVICOS].nome} ×${n}`).join(" · ")}</p>}
        {incidentes.length > 0 && <p className="m-0 text-sm">Problemas: {incidentes.map(([s, n]) => `${PROBLEMAS[s as keyof typeof PROBLEMAS].icone} ${PROBLEMAS[s as keyof typeof PROBLEMAS].rotulo} ×${n}`).join(" · ")}</p>}
        {melhor && <p className="m-0">Cliente mais satisfeito: <strong>{melhor.icone} {melhor.name}</strong> ({pct(resumo.porArquetipo[melhor.slug].sat)})</p>}
        {resultado.semana && (
          <p className="m-0 rounded-[6px] bg-creme-escuro p-3">
            Contas da semana {resultado.semana.semana}: aluguel R$ {resultado.semana.contas.aluguel}, luz R$ {resultado.semana.contas.luz}, internet R$ {resultado.semana.contas.internet}.{" "}
            <strong>{resultado.semana.paga ? "Semana fechada no azul!" : "Faltou dinheiro pras contas."}</strong>
          </p>
        )}
        {resultado.subiuDeNivel && <p className="m-0 font-semibold text-azul">A lan subiu pro nível {resultado.prog.nivel}! Tem melhoria e cliente novo liberado.</p>}
      </section>
      <ConversaNet contatos={contatos} recados={recados} aberto={cn} onAlternar={() => setCn(!cn)} />
      <div className="flex flex-wrap gap-3">
        <button type="button" className="botao-laranja" onClick={onDeNovo}>Próximo dia</button>
        <Link href="/jogos/lan-house/melhorias" className="botao-vidro inline-flex items-center no-underline">Melhorias</Link>
      </div>
    </div>
  );
}

const Item = ({ t, v }: { t: string; v: string | number }) => (
  <div><dt className="text-sm">{t}</dt><dd className="m-0 font-ficha text-lg">{v}</dd></div>
);
