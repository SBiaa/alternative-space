"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ARQUETIPOS, BANCA, DENOMINACOES_TROCO, EVENTO, eventoDe } from "@/lib/banca/config";
import { EVENTO_TXT, TEXTOS } from "@/lib/banca/conteudo";
import { calendario } from "@/lib/banca/economia";
import { celulasDaMesa, ehExpositor, layoutValido } from "@/lib/banca/mesa";
import { alternarPlaca, atender, criarEvento, darTroco, decidirDesconto, passo, repor, resumoDoEvento } from "@/lib/banca/motor";
import type { EventoEstado, Progresso, Visitante } from "@/lib/banca/tipos";
import { nomeDoItem, ProdutoIcone } from "./ProdutoIcone";
import { ResumoView, type ResumoSalvo } from "./ResumoView";
import { bipe, guardarOpcoes, lerOpcoes } from "./sons";
import { useBanca, type Inicial } from "./useBanca";

const BASE = "/jogos/banca-na-feira";

// Tema do jogo "Pavilhão": só vale dentro da mesa. Fora dela, tokens do design system da plataforma.
const PAV = { chao: "#3a4047", chaoLinha: "#454c54", toalha: "#c9743a", toalhaBorda: "#f2a66e", arame: "#aab4bd", placa: "#f6efd3", placaTinta: "#01121e", silhueta: "#7d8791" };

export function EventoView({ inicial }: { inicial: Inicial }) {
  const t = useBanca(inicial);
  const { prog } = t;
  if (!t.pronto) return <p className="text-areia">{TEXTOS.carregando}</p>;
  if (!prog) return <Link href={BASE} className="botao-laranja inline-flex min-h-[44px] w-fit items-center no-underline">{TEXTOS.nova}</Link>;
  return <Jogo t={t} prog={prog} />;
}

function Jogo({ t, prog }: { t: ReturnType<typeof useBanca>; prog: Progresso }) {
  const params = useSearchParams();
  const escolhido = params.get("e");
  const opcao = calendario(prog).find((o) => o.def.slug === escolhido) ?? calendario(prog).find((o) => o.liberado && o.pagavel);
  const [e, setE] = useState<EventoEstado | null>(null);
  const [pausado, setPausado] = useState(false);
  const [resumo, setResumo] = useState<ResumoSalvo | null>(null);
  const [erro, setErro] = useState("");
  const [som, setSom] = useState(true);
  const [encerrando, setEncerrando] = useState(false);
  const enviado = useRef(false);
  const ultimaReceita = useRef(0);

  useEffect(() => setSom(lerOpcoes().som), []);

  // O tempo do evento: um passo a cada EVENTO.passoSeg. Pausa sozinho se a aba some.
  const rodando = e !== null && !e.fim && !pausado;
  useEffect(() => {
    if (!rodando) return;
    const id = setInterval(() => setE((s) => (s ? passo(s) : s)), EVENTO.passoSeg * 1000);
    return () => clearInterval(id);
  }, [rodando]);
  useEffect(() => {
    const aoSair = () => document.hidden && setPausado(true);
    document.addEventListener("visibilitychange", aoSair);
    return () => document.removeEventListener("visibilitychange", aoSair);
  }, []);

  useEffect(() => {
    if (e && e.receita > ultimaReceita.current) bipe("venda", som);
    if (e) ultimaReceita.current = e.receita;
  }, [e, som]);

  // Fim do evento: manda o resumo pro servidor (ou fecha no aparelho) e mostra o resultado.
  useEffect(() => {
    if (!e?.fim || enviado.current) return;
    enviado.current = true;
    bipe("fim", som);
    (async () => {
      const r = await t.fechar(resumoDoEvento(e));
      if (!r.ok) return setErro(r.erro);
      const salvo: ResumoSalvo = { registro: r.registro, subiu: r.subiu };
      try {
        localStorage.setItem(BANCA.chaveResumo, JSON.stringify(salvo));
      } catch {}
      setResumo(salvo);
    })();
  }, [e, som, t]);

  if (resumo) return <ResumoView {...resumo} />;
  if (e?.fim) {
    return erro ? (
      <div className="flex flex-col gap-3">
        <p className="m-0 text-danger" role="alert">{erro}</p>
        <Link href={`${BASE}/atelie`} className="botao-vidro inline-flex min-h-[44px] w-fit items-center no-underline">{EVENTO_TXT.voltarAtelie}</Link>
      </div>
    ) : <p className="text-areia" role="status">{EVENTO_TXT.fechando}</p>;
  }

  if (!e) {
    const def = opcao?.def ?? eventoDe(escolhido ?? "");
    const motivo = !def ? EVENTO_TXT.escolhaEvento : !opcao?.liberado ? EVENTO_TXT.naoLiberado : !opcao.pagavel ? EVENTO_TXT.faltaTaxa :
      !layoutValido(prog.layout, prog) || prog.layout.celulas.every((c) => c === null) ? EVENTO_TXT.poeNaMesa : "";
    return (
      <div className="flex max-w-[560px] flex-col gap-3">
        {def && <h2 className="m-0 text-2xl font-semibold">{def.nome}</h2>}
        {def && <p className="m-0 text-areia">{def.descricao}</p>}
        {def && <p className="m-0 font-ficha">{EVENTO_TXT.taxaLinha(def.taxaMesa, Math.round((def.duracaoSeg / 60) * 10) / 10)}</p>}
        {motivo && <p className="m-0 text-laranja-claro" role="alert">{motivo}</p>}
        <label className="surface-vidro flex min-h-[44px] items-start gap-3 p-3">
          <input type="checkbox" className="mt-1 size-5" checked={prog.tranquilo} onChange={(x) => t.definirTranquilo(x.target.checked)} />
          <span><strong>{TEXTOS.tranquilo}</strong><br /><span className="text-sm text-areia">{TEXTOS.tranquiloAjuda}</span></span>
        </label>
        <div className="flex flex-wrap gap-3">
          <button type="button" className="botao-laranja min-h-[44px]" disabled={Boolean(motivo)} onClick={() => def && setE(criarEvento(prog, def.slug))}>{EVENTO_TXT.iniciar}</button>
          <Link href={`${BASE}/atelie`} className="botao-vidro inline-flex min-h-[44px] items-center no-underline">{EVENTO_TXT.voltarAtelie}</Link>
        </div>
      </div>
    );
  }

  const v = e.atendendo === null ? undefined : e.visitantes.find((x) => x.id === e.atendendo);
  const restante = e.duracao - e.t;
  const olhando = e.visitantes.filter((x) => x.fase === "olhando").length;
  const aplicar = (f: (s: EventoEstado) => EventoEstado) => setE((s) => (s ? f(s) : s));
  const trocarSom = () => {
    const novo = !som;
    setSom(novo);
    guardarOpcoes({ som: novo });
  };

  return (
    <div className="flex flex-col gap-3">
      <p className="m-0 text-sm text-areia landscape:hidden">{EVENTO_TXT.girar}</p>
      <div className="surface-vidro flex flex-wrap items-center gap-x-5 gap-y-2 p-2">
        <span className="font-ficha text-lg" aria-label={EVENTO_TXT.restante}>⏱ {EVENTO_TXT.relogio(restante)}</span>
        <span className="font-ficha" aria-label={EVENTO_TXT.receita}>R$ {e.receita}</span>
        <span className="text-sm">{EVENTO_TXT.fila(e.fila.length)}</span>
        {olhando > 0 && <span className="text-sm text-areia">{EVENTO_TXT.olhando}: {olhando}</span>}
        <span className="ml-auto flex flex-wrap gap-2">
          <button type="button" className="botao-vidro min-h-[44px]" onClick={() => setPausado((p) => !p)} aria-pressed={pausado}>{pausado ? EVENTO_TXT.continuar : EVENTO_TXT.pausar}</button>
          <button type="button" className="botao-vidro min-h-[44px]" onClick={trocarSom} aria-pressed={som}>{som ? EVENTO_TXT.somLigado : EVENTO_TXT.somDesligado}</button>
          {encerrando ? (
            <button type="button" className="botao-laranja min-h-[44px]" onClick={() => aplicar((s) => passo(s, s.duracao + s.graca + 40))}>{EVENTO_TXT.confirmarEncerrar}</button>
          ) : (
            <button type="button" className="botao-vidro min-h-[44px]" onClick={() => setEncerrando(true)}>{EVENTO_TXT.encerrar}</button>
          )}
        </span>
      </div>
      {pausado && <p className="m-0 font-semibold text-laranja-claro" role="status">{EVENTO_TXT.pausado}</p>}

      <div className="grid gap-3 landscape:grid-cols-[minmax(0,1fr)_280px] lg:grid-cols-[minmax(0,1fr)_340px]">
        <Cena e={e} aplicar={aplicar} />
        <Balcao e={e} v={v} aplicar={aplicar} />
      </div>
    </div>
  );
}

// ---------- a mesa vista de cima ----------

function Cena({ e, aplicar }: { e: EventoEstado; aplicar: (f: (s: EventoEstado) => EventoEstado) => void }) {
  const a = e.attrs;
  const mesaN = celulasDaMesa(a);
  const linhas = Array.from({ length: a.linhas }, (_, r) => r).reverse(); // a frente fica embaixo, perto da fila
  const celula = (idx: number) => {
    const c = e.celulas[idx];
    const vazia = !c.item;
    const esgotou = !vazia && c.un === 0;
    const caixa = c.item ? (e.caixa[c.item] ?? 0) : 0;
    return (
      <div key={idx} className="flex min-h-[112px] flex-col gap-1 rounded-[6px] border-2 p-1.5 text-noite"
        style={{ background: vazia ? "transparent" : PAV.toalhaBorda, borderColor: PAV.arame, borderStyle: vazia ? "dashed" : "solid" }}>
        {vazia ? <span className="m-auto text-xs" style={{ color: PAV.arame }}>{EVENTO_TXT.vazio}</span> : (
          <>
            <div className="flex items-center gap-1.5">
              <ProdutoIcone item={c.item!} tamanho={32} />
              <span className="text-xs font-semibold leading-tight">{nomeDoItem(c.item!)}</span>
            </div>
            <div className="flex items-center justify-between font-ficha text-xs">
              <span>{c.un}/{BANCA.capacidadeCelula}</span>
              <span title={EVENTO_TXT.caixaRepos}>cx {caixa}</span>
            </div>
            {(esgotou || c.placa) && (
              <span className="w-fit rounded-[3px] px-1.5 text-xs font-bold" style={{ background: PAV.placa, color: PAV.placaTinta }}>
                {c.placa ? EVENTO_TXT.placaOn : EVENTO_TXT.esgotou}
              </span>
            )}
            <div className="mt-auto flex gap-1">
              <button type="button" className="botao-vidro min-h-[44px] flex-1 !px-1 text-xs" disabled={c.repondoAte !== null || c.un >= BANCA.capacidadeCelula || caixa <= 0} onClick={() => aplicar((s) => repor(s, idx))}>
                {c.repondoAte !== null ? EVENTO_TXT.repondo : EVENTO_TXT.repor}
              </button>
              <button type="button" className="botao-vidro min-h-[44px] flex-1 !px-1 text-xs" aria-pressed={c.placa} onClick={() => aplicar((s) => alternarPlaca(s, idx))}>
                {EVENTO_TXT.placa}
              </button>
            </div>
          </>
        )}
      </div>
    );
  };

  const fila = e.fila.map((id) => e.visitantes.find((v) => v.id === id)!).filter(Boolean);
  return (
    <section aria-label={EVENTO_TXT.sala} className="flex flex-col gap-3 rounded-[8px] p-3"
      style={{ background: `repeating-linear-gradient(90deg, ${PAV.chao} 0 38px, ${PAV.chaoLinha} 38px 40px), ${PAV.chao}` }}>
      <div className="flex gap-3">
        <div className="flex flex-1 flex-col gap-1.5 rounded-[6px] p-2" style={{ background: PAV.toalha }}>
          {linhas.map((r) => (
            <div key={r} className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${a.colunas}, minmax(0, 1fr))` }}>
              {Array.from({ length: a.colunas }, (_, c) => celula(r * a.colunas + c))}
            </div>
          ))}
          <span className="font-ficha text-[11px] text-noite">▼ {a.linhas > 1 ? EVENTO_TXT.frente : EVENTO_TXT.frenteUnica}</span>
        </div>
        {a.expositor > 0 && (
          <div className="flex w-[34%] flex-col gap-1.5 rounded-[6px] border-2 p-2" style={{ borderColor: PAV.arame }} aria-label={EVENTO_TXT.expositor}>
            <span className="font-ficha text-[11px]" style={{ color: PAV.arame }}>{EVENTO_TXT.expositor}</span>
            {Array.from({ length: a.expositor }, (_, i) => (ehExpositor(mesaN + i, a) ? celula(mesaN + i) : null))}
          </div>
        )}
      </div>

      <div className="flex min-h-[96px] items-end gap-2 overflow-x-auto pb-1" aria-label={EVENTO_TXT.fila(e.fila.length)} role="list">
        {fila.length === 0 && <span className="text-sm" style={{ color: PAV.arame }}>{EVENTO_TXT.filaVazia}</span>}
        {fila.slice(0, 10).map((v) => <Silhueta key={v.id} v={v} />)}
        {fila.length > 10 && <span className="font-ficha text-sm text-creme">+{fila.length - 10}</span>}
      </div>
    </section>
  );
}

/** Visitante em silhueta simples. O arquétipo vem escrito (nunca só pela forma ou cor) e a paciência tem barra e número. */
function Silhueta({ v }: { v: Visitante }) {
  const arq = ARQUETIPOS.find((a) => a.slug === v.arq)!;
  const pct = Math.max(0, Math.round((v.pac / v.pacMax) * 100));
  return (
    <div role="listitem" className="flex w-[64px] shrink-0 flex-col items-center gap-0.5" aria-label={`${arq.nome}, ${EVENTO_TXT.paciencia.toLowerCase()} ${pct}%`}>
      <svg width="40" height="48" viewBox="0 0 40 48" aria-hidden="true" focusable="false">
        <circle cx="20" cy={v.arq === "familia" ? 14 : 12} r="8" fill={PAV.silhueta} />
        <path d="M6 46c0-12 6-20 14-20s14 8 14 20z" fill={PAV.silhueta} />
        {v.arq === "familia" && <circle cx="34" cy="34" r="5" fill={PAV.silhueta} />}
        {v.arq === "cosplayer" && <path d="M12 6l8-6 8 6" stroke={PAV.silhueta} strokeWidth="3" fill="none" />}
        {v.arq === "colecionador" && <rect x="26" y="28" width="10" height="14" rx="2" fill="#5c656e" />}
      </svg>
      <span className="text-[11px] leading-none text-creme">{arq.rotulo}</span>
      <div className="h-1.5 w-full rounded-[2px] bg-black/40" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label={EVENTO_TXT.paciencia}>
        <div className="h-full rounded-[2px]" style={{ width: `${pct}%`, background: pct > 50 ? "#9fd3a8" : pct > 25 ? "#f2a66e" : "#f08a8a" }} />
      </div>
      <span className="font-ficha text-[10px] text-creme">{pct}%</span>
    </div>
  );
}

// ---------- o balcão: atender, desconto e troco ----------

function Balcao({ e, v, aplicar }: { e: EventoEstado; v: Visitante | undefined; aplicar: (f: (s: EventoEstado) => EventoEstado) => void }) {
  const arq = v ? ARQUETIPOS.find((a) => a.slug === v.arq) : undefined;
  return (
    <aside className="surface-vidro flex flex-col gap-3 p-3" aria-label={EVENTO_TXT.balcao}>
      <h2 className="m-0 text-lg font-semibold">{EVENTO_TXT.balcao}</h2>
      {!v ? (
        <>
          <p className="m-0 text-areia">{EVENTO_TXT.semFila}</p>
          <button type="button" className="botao-laranja min-h-[44px]" disabled={e.fila.length === 0} onClick={() => aplicar(atender)}>{EVENTO_TXT.atender}</button>
        </>
      ) : (
        <>
          <p className="m-0"><strong>{arq?.nome}</strong>{v.troca ? EVENTO_TXT.querTrocar : ""}</p>
          <ul className="m-0 flex list-none flex-col gap-1 p-0 text-sm">
            {v.pedido.map((p) => (
              <li key={p.item} className="flex items-center gap-2"><ProdutoIcone item={p.item} tamanho={22} /><span className="flex-1">{nomeDoItem(p.item)}</span><span className="font-ficha">×{p.qtd}</span></li>
            ))}
          </ul>
          {v.fase === "atendido" && <p className="m-0 text-areia" role="status">{EVENTO_TXT.atendendo}</p>}
          {v.fase === "desconto" && (
            <div className="flex flex-col gap-2">
              <p className="m-0 font-semibold" role="status">{EVENTO_TXT.desconto(Math.round(v.pedeDesconto * 100))}</p>
              <div className="flex flex-wrap gap-2">
                <button type="button" className="botao-laranja min-h-[44px]" onClick={() => aplicar((s) => decidirDesconto(s, "aceitar"))}>{EVENTO_TXT.aceitar}</button>
                <button type="button" className="botao-vidro min-h-[44px]" onClick={() => aplicar((s) => decidirDesconto(s, "contraproposta"))}>{EVENTO_TXT.contraproposta}</button>
                <button type="button" className="botao-vidro min-h-[44px]" onClick={() => aplicar((s) => decidirDesconto(s, "recusar"))}>{EVENTO_TXT.recusar}</button>
              </div>
              <p className="m-0 text-xs text-areia">{EVENTO_TXT.contraAjuda}</p>
            </div>
          )}
          {v.fase === "troco" && <Troco key={`${v.id}-${e.errosTroco}`} v={v} erro={e.errosTroco > 0} dar={(valores) => aplicar((s) => darTroco(s, valores))} />}
        </>
      )}
      {v && <p className="m-0 text-xs text-areia">{EVENTO_TXT.fila(e.fila.length)}</p>}
    </aside>
  );
}

/** Minipuzzle do troco: escolha notas e moedas até fechar o valor. */
function Troco({ v, erro, dar }: { v: Visitante; erro: boolean; dar: (valores: number[]) => void }) {
  const [montado, setMontado] = useState<number[]>([]);
  const soma = montado.reduce((s, x) => s + x, 0);
  return (
    <div className="flex flex-col gap-2">
      <p className="m-0 text-sm">{EVENTO_TXT.total} <span className="font-ficha">R$ {v.total}</span> · {EVENTO_TXT.pagou} <span className="font-ficha">R$ {v.entregou}</span></p>
      <p className="m-0 font-semibold">{EVENTO_TXT.troco}: <span className="font-ficha text-xl">R$ {v.troco}</span></p>
      {erro && <p className="m-0 text-sm text-laranja-claro" role="alert">{EVENTO_TXT.trocoErrado}</p>}
      <div className="grid grid-cols-3 gap-2" role="group" aria-label={EVENTO_TXT.notasEMoedas}>
        {DENOMINACOES_TROCO.map((d) => (
          <button key={d} type="button" className="botao-vidro min-h-[44px] font-ficha" onClick={() => setMontado((m) => [...m, d])}>
            {d >= 5 ? EVENTO_TXT.nota : EVENTO_TXT.moeda} {d}
          </button>
        ))}
      </div>
      <p className="m-0 text-sm" aria-live="polite">{EVENTO_TXT.entregue}: <span className="font-ficha">R$ {soma}</span>{montado.length > 0 && <span className="text-areia"> ({montado.join(" + ")})</span>}</p>
      <div className="flex gap-2">
        <button type="button" className="botao-laranja min-h-[44px] flex-1" onClick={() => dar(montado)}>{EVENTO_TXT.darTroco}</button>
        <button type="button" className="botao-vidro min-h-[44px]" onClick={() => setMontado([])}>{EVENTO_TXT.limpar}</button>
      </div>
    </div>
  );
}
