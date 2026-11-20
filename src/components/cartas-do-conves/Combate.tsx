"use client";

import { useCallback, useEffect, useRef, useState, type PointerEvent as PEvent } from "react";
import { CONFIG, STATUS, fraseDeIntencao } from "@/lib/cartas-do-conves/config";
import { CONTEUDO, inimigoDe } from "@/lib/cartas-do-conves/conteudo";
import { intencaoDe, precisaAlvo, vivo } from "@/lib/cartas-do-conves/motor";
import { TEXTOS } from "@/lib/cartas-do-conves/textos";
import type { Acao, Estado, InimigoEmCampo, Intencao, Status } from "@/lib/cartas-do-conves/tipos";
import { Carta } from "./Carta";
import { Icone } from "./Icone";

const T = TEXTOS.combate;

function ChipsStatus({ status }: { status: Status }) {
  const ks = Object.keys(status) as (keyof Status)[];
  if (ks.length === 0) return null;
  return (
    <ul className="m-0 flex list-none flex-wrap gap-1 p-0">
      {ks.map((k) => (
        <li key={k} title={STATUS[k].texto} aria-label={`${STATUS[k].nome} ${status[k]}: ${STATUS[k].texto}`} className="flex items-center gap-0.5 rounded-md border border-creme/40 bg-noite/60 px-1.5 py-0.5 text-[11px] text-creme">
          <Icone nome={STATUS[k].icone} className="size-3.5" />
          {STATUS[k].nome} {status[k]}
        </li>
      ))}
    </ul>
  );
}

function iconeDaIntencao(i: Intencao) {
  return i.tipo === "atacar" ? "espada" : i.tipo === "defender" ? "escudo" : STATUS[i.status].icone;
}
function curtaDaIntencao(i: Intencao) {
  const t = TEXTOS.intencaoCurta;
  return i.tipo === "atacar" ? t.atacar(i.valor, i.vezes) : i.tipo === "defender" ? t.defender(i.valor) : t.status(STATUS[i.status].nome, i.valor);
}

function Inimigo({ i, idx, alvoPossivel, onAlvo }: { i: InimigoEmCampo; idx: number; alvoPossivel: boolean; onAlvo: () => void }) {
  const def = inimigoDe(CONTEUDO, i.slug);
  const morto = !vivo(i);
  const it = intencaoDe(i);
  const pct = Math.max(0, Math.round((i.folego / i.folegoMax) * 100));
  const corpo = (
    <>
      <span className="flex items-center gap-1.5">
        <Icone nome={def.icone} className="size-8 text-creme" />
        <span className="flex flex-col">
          <span className="text-sm font-semibold leading-tight text-creme">{def.nome}</span>
          <span className="font-ficha text-[11px] text-areia">{morto ? T.caiu : `${i.folego}/${i.folegoMax}`}</span>
        </span>
      </span>
      <span className="block h-2 w-full overflow-hidden rounded-sm bg-noite/70" aria-hidden="true">
        <span className="block h-full bg-ok" style={{ width: `${pct}%` }} />
      </span>
      {!morto && (
        <>
          <span className="flex flex-wrap items-center gap-1.5 text-[12px] text-creme">
            <span className="flex items-center gap-1 rounded-md bg-laranja px-1.5 py-0.5 font-semibold text-noite">
              <Icone nome={iconeDaIntencao(it)} className="size-3.5" />
              {curtaDaIntencao(it)}
            </span>
            {i.bloqueio > 0 && (
              <span className="flex items-center gap-0.5 font-ficha text-areia">
                <Icone nome="escudo" className="size-3.5" />
                {i.bloqueio}
              </span>
            )}
          </span>
          <ChipsStatus status={i.status} />
        </>
      )}
    </>
  );
  const rotulo = morto
    ? `${def.nome}, ${T.caiu}`
    : `${def.nome}. Fôlego ${i.folego} de ${i.folegoMax}. ${T.intencao}: ${fraseDeIntencao(it)}.${i.bloqueio ? ` Bloqueio ${i.bloqueio}.` : ""}${Object.keys(i.status).length ? ` ${(Object.keys(i.status) as (keyof Status)[]).map((k) => `${STATUS[k].nome} ${i.status[k]}`).join(", ")}.` : ""}${alvoPossivel ? ` ${T.alvo(def.nome)}.` : ""}`;
  const caixa = `flex min-w-[148px] max-w-[220px] flex-1 flex-col gap-1.5 rounded-lg border-2 p-2 text-left ${morto ? "border-line opacity-40" : alvoPossivel ? "border-laranja-claro bg-surface-3" : "border-line-strong bg-surface-2"}`;
  if (alvoPossivel && !morto) {
    return (
      <button type="button" data-inimigo={idx} onClick={onAlvo} aria-label={rotulo} className={`${caixa} cursor-pointer motion-safe:animate-pulse focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-laranja-claro`}>
        {corpo}
      </button>
    );
  }
  return (
    <div data-inimigo={idx} role="group" aria-label={rotulo} className={caixa}>
      {corpo}
    </div>
  );
}

export function Combate({ estado, agir, mensagem, registro }: { estado: Estado; agir: (a: Acao) => void; mensagem: string | null; registro: string[] }) {
  const c = estado.combate!;
  // Se a mão muda (carta jogada, turno novo), a escolha antiga não vale mais: ela guarda a "chave" da mão em que foi feita.
  const maoChave = `${c.turno}:${c.mao.join("|")}`;
  const [escolha, setEscolha] = useState<{ idx: number | null; chave: string }>({ idx: null, chave: "" });
  const sel = escolha.chave === maoChave ? escolha.idx : null;
  const setSel = useCallback((idx: number | null) => setEscolha({ idx, chave: maoChave }), [maoChave]);
  const [arrasto, setArrasto] = useState<{ idx: number; dx: number; dy: number } | null>(null);
  const inicio = useRef<{ x: number; y: number; idx: number } | null>(null);
  const arrastou = useRef(false);

  const jogar = useCallback(
    (idx: number, alvo?: number) => {
      setSel(null);
      agir(alvo === undefined ? { t: "jogar", c: idx } : { t: "jogar", c: idx, a: alvo });
    },
    [agir, setSel],
  );

  const escolher = (idx: number) => {
    const carta = CONTEUDO.cartas[c.mao[idx]];
    if (sel === idx) {
      if (!precisaAlvo(carta)) jogar(idx);
      else setSel(null);
      return;
    }
    setSel(idx);
  };

  // Teclado: 1-9 escolhe a carta, Esc cancela.
  useEffect(() => {
    const aoTecla = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement && /input|textarea|select/i.test(e.target.tagName)) return;
      if (e.key === "Escape") setSel(null);
      const n = Number(e.key);
      if (Number.isInteger(n) && n >= 1 && n <= c.mao.length) {
        const carta = CONTEUDO.cartas[c.mao[n - 1]];
        if (sel === n - 1 && !precisaAlvo(carta)) jogar(n - 1);
        else setSel(n - 1);
      }
    };
    window.addEventListener("keydown", aoTecla);
    return () => window.removeEventListener("keydown", aoTecla);
  }, [c.mao, sel, jogar, setSel]);

  // Arrastar a carta até o inimigo (ou pra cima, quando a carta não tem alvo).
  const descer = (idx: number) => (e: PEvent<HTMLElement>) => {
    inicio.current = { x: e.clientX, y: e.clientY, idx };
    arrastou.current = false;
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };
  const mover = (e: PEvent<HTMLElement>) => {
    const i = inicio.current;
    if (!i) return;
    const dx = e.clientX - i.x;
    const dy = e.clientY - i.y;
    if (Math.hypot(dx, dy) > 12) {
      arrastou.current = true;
      setArrasto({ idx: i.idx, dx, dy });
    }
  };
  const soltar = (e: PEvent<HTMLElement>) => {
    const i = inicio.current;
    inicio.current = null;
    setArrasto(null);
    if (!i || !arrastou.current) return;
    const carta = CONTEUDO.cartas[c.mao[i.idx]];
    if (e.clientY - i.y > -50) return;
    if (!precisaAlvo(carta)) return jogar(i.idx);
    const alvo = document.elementsFromPoint(e.clientX, e.clientY).find((el) => el instanceof HTMLElement && el.dataset.inimigo !== undefined) as HTMLElement | undefined;
    if (alvo) jogar(i.idx, Number(alvo.dataset.inimigo));
    else setSel(i.idx);
  };

  const selCarta = sel !== null ? CONTEUDO.cartas[c.mao[sel]] : null;
  const precisa = selCarta ? precisaAlvo(selCarta) : false;
  const dica = selCarta ? (precisa ? T.escolhaAlvo : T.tocarDeNovo) : c.mao.length === 0 ? T.semMao : T.escolhaCarta;
  const pctFolego = Math.round((estado.folego / estado.folegoMax) * 100);

  return (
    <div className="flex h-full flex-col gap-1.5 overflow-y-auto px-2 pb-2 pt-12 sm:px-4 sm:pt-14">
      <div className="flex min-h-0 flex-wrap items-stretch justify-center gap-2" data-zona-jogo>
        {c.inimigos.map((i, k) => (
          <Inimigo key={k} i={i} idx={k} alvoPossivel={precisa && vivo(i)} onAlvo={() => sel !== null && jogar(sel, k)} />
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-lg bg-noite/50 px-2 py-1.5 text-creme">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="flex items-center gap-1 font-ficha text-sm">
            <Icone nome="folego" className="size-4 text-danger" />
            {estado.folego}/{estado.folegoMax}
            <span className="block h-1.5 w-14 overflow-hidden rounded-sm bg-noite" aria-hidden="true">
              <span className="block h-full bg-ok" style={{ width: `${pctFolego}%` }} />
            </span>
          </span>
          <span className="flex items-center gap-1 font-ficha text-sm">
            <Icone nome="escudo" className="size-4" />
            {T.bloqueio(c.bloqueio)}
          </span>
          <span className="flex items-center gap-1 rounded-md bg-laranja px-2 py-0.5 font-ficha text-sm font-bold text-noite">
            <Icone nome="energia" className="size-4" />
            {c.energia}/{CONFIG.energiaPorTurno}
            <span className="sr-only"> {T.energia(c.energia)}</span>
          </span>
          <ChipsStatus status={c.status} />
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-ficha text-[11px] text-areia">
          <span>{T.turno(c.turno)}</span>
          <span className="flex items-center gap-0.5">
            <Icone nome="baralho" className="size-3.5" />
            {T.compra(c.compra.length)}
          </span>
          <span>{T.descarte(c.descarte.length)}</span>
          {c.exaurida.length > 0 && <span>{T.exaurida(c.exaurida.length)}</span>}
        </div>
      </div>

      <p className="m-0 min-h-5 text-center text-[13px] text-areia" role="status">
        {mensagem ?? dica}
      </p>

      <div className="flex items-end gap-2">
        <ul className="m-0 flex min-h-[148px] flex-1 list-none items-end gap-1.5 overflow-x-auto p-0 pb-1 pt-3" aria-label={T.mao}>
          {c.mao.map((slug, idx) => {
            const carta = CONTEUDO.cartas[slug];
            const dragging = arrasto?.idx === idx;
            return (
              <li key={`${slug}-${idx}`} className="shrink-0" onPointerDown={descer(idx)} onPointerMove={mover} onPointerUp={soltar} onPointerCancel={() => { inicio.current = null; setArrasto(null); }} style={dragging ? { transform: `translate(${arrasto!.dx}px, ${arrasto!.dy}px)`, zIndex: 20, position: "relative" } : undefined}>
                <Carta carta={carta} compacta selecionada={sel === idx} apagada={carta.custo > c.energia} atalho={idx < 9 ? idx + 1 : undefined} onClick={() => { if (!arrastou.current) escolher(idx); }} />
              </li>
            );
          })}
        </ul>
        <button type="button" onClick={() => agir({ t: "fim" })} className="btn h-14 min-w-[88px] shrink-0 self-center bg-laranja px-3 text-sm font-semibold text-noite focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-laranja-claro">
          {T.fim}
        </button>
      </div>

      <ul className="sr-only" aria-live="polite" aria-label="Registro do combate">
        {registro.map((r, k) => (
          <li key={`${k}-${r}`}>{r}</li>
        ))}
      </ul>
    </div>
  );
}
