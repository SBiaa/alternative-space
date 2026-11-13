"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { MIN_DIA, MURO, ehSabado, horaDe } from "@/lib/muro/config";
import { TEXTOS } from "@/lib/muro/conteudo";
import { climaDoDia, proximaChuva } from "@/lib/muro/efeitos";
import { Icone } from "./Icone";
import { useMuro } from "./useMuro";
import { Progresso, Adesivo, brl } from "./visual";

const BASE = "/jogos/muro-livre";
const ABAS = [
  { href: `${BASE}/caderno`, chave: "caderno", icone: "caderno", casa: ["/caderno", "/conversa"] },
  { href: `${BASE}/muro`, chave: "muros", icone: "muros", casa: ["/muro"] },
  { href: `${BASE}/crew`, chave: "crew", icone: "crew", casa: ["/crew"] },
  { href: `${BASE}/material`, chave: "material", icone: "material", casa: ["/material"] },
] as const;

export function MuroShell({ children }: { children: ReactNode }) {
  const m = useMuro();
  const path = usePathname();
  const [ajustes, setAjustes] = useState(false);
  const { prog } = m;
  const noJogo = !!prog && path !== BASE && !path.endsWith("/resumo");
  const dia = prog ? prog.dia + 1 : 0;
  const clima = prog ? climaDoDia(prog.seed, dia, prog.tranquilo) : null;
  const chuva = clima && prog ? proximaChuva(clima, prog.minuto) : null;

  return (
    <div className={`muro-tema relative flex min-h-[calc(100dvh-4rem)] flex-col ${m.opcoes.semInclinacao ? "sem-inclinacao" : ""}`}>
      {prog && noJogo && (
        <header className="sticky top-0 z-30 border-b-2 border-noite bg-papel-claro/95 px-3 py-2 backdrop-blur-sm" aria-label="Relógio e caixa da crew">
          <div className="mx-auto flex max-w-[1100px] flex-wrap items-center gap-x-4 gap-y-2">
            <div className="flex items-center gap-2">
              <button type="button" className="muro-btn !min-h-11 !px-3" onClick={m.alternarRelogio} disabled={prog.minuto >= MIN_DIA || m.ocupado} aria-label={m.rodando ? TEXTOS.muro.pausar : TEXTOS.muro.continuar}>
                <Icone nome={m.rodando ? "pause" : "play"} />
                <span className="hidden sm:inline">{m.rodando ? TEXTOS.muro.pausar : TEXTOS.muro.continuar}</span>
              </button>
              <button type="button" className="muro-btn-sec !px-3" onClick={m.acelerar} aria-label={TEXTOS.muro.acelerar}>
                <Icone nome="rapido" tam={16} />
                <span className="muro-medida text-sm">×{MURO.dia.velocidades[m.vel]}</span>
              </button>
            </div>
            <div className="flex flex-col" style={{ minWidth: 150 }}>
              <span className="muro-medida text-sm font-bold">
                Dia {dia} · {MURO.dia.nomesDias[(dia - 1) % 7]} · {horaDe(prog.minuto)}
              </span>
              <Progresso valor={(prog.minuto / MIN_DIA) * 100} rotulo="Andamento do dia" />
            </div>
            <dl className="m-0 flex flex-wrap items-center gap-x-4 gap-y-1">
              <div className="flex items-center gap-1" title="Dinheiro do jogo"><Icone nome="moeda" tam={16} /><dt className="sr-only">Caixa</dt><dd className="muro-medida m-0 font-bold">{brl(prog.dinheiro)}</dd></div>
              <div className="flex items-center gap-1"><Icone nome="casa" tam={16} /><dt className="text-xs">{TEXTOS.resumo.quebrada}</dt><dd className="muro-medida m-0 font-bold">{prog.repQuebrada.toFixed(2)}</dd></div>
              <div className="flex items-center gap-1"><Icone nome="estrela" tam={16} /><dt className="text-xs">{TEXTOS.resumo.clientes}</dt><dd className="muro-medida m-0 font-bold">{prog.repClientes.toFixed(2)}</dd></div>
            </dl>
            <div className="ml-auto flex items-center gap-2">
              {chuva && <Adesivo tipo="chuva">{`${TEXTOS.adesivos.chuva} ${horaDe(chuva.ini)}`}</Adesivo>}
              {ehSabado(dia) && !prog.encontro.inscrito && <Link href={`${BASE}/encontro`} className="muro-btn-sec !min-h-9 !px-2 text-xs no-underline">{TEXTOS.encontro.titulo}</Link>}
              <button type="button" className="muro-btn-sec !px-3" aria-expanded={ajustes} onClick={() => setAjustes((v) => !v)} aria-label={TEXTOS.opcoes.titulo}>
                <Icone nome="ajustes" />
              </button>
            </div>
          </div>
          {ajustes && (
            <div className="mx-auto mt-2 flex max-w-[1100px] flex-wrap gap-x-6 gap-y-2 rounded-[6px] border border-noite/40 bg-papel p-3" role="group" aria-label={TEXTOS.opcoes.titulo}>
              <label className="flex min-h-11 items-center gap-2"><input type="checkbox" className="h-5 w-5" checked={prog.tranquilo} onChange={(e) => m.definirTranquilo(e.target.checked)} /><span><strong>{TEXTOS.opcoes.tranquilo}</strong> <span className="text-sm">{TEXTOS.opcoes.tranquiloAjuda}</span></span></label>
              <label className="flex min-h-11 items-center gap-2"><input type="checkbox" className="h-5 w-5" checked={m.opcoes.semInclinacao} onChange={(e) => m.setOpcoes({ semInclinacao: e.target.checked })} />{TEXTOS.opcoes.semInclinacao}</label>
              <label className="flex min-h-11 items-center gap-2"><input type="checkbox" className="h-5 w-5" checked={!m.mudo} onChange={m.alternarSons} />{TEXTOS.opcoes.sons}</label>
              <label className="flex min-h-11 items-center gap-2"><input type="checkbox" className="h-5 w-5" checked={m.opcoes.assistida} onChange={(e) => m.setOpcoes({ assistida: e.target.checked })} />{TEXTOS.muro.assistida}</label>
              <button type="button" className="muro-btn-sec" onClick={() => void m.encerrarDia()} disabled={m.ocupado || prog.minuto >= MIN_DIA}>Encerrar o dia</button>
            </div>
          )}
        </header>
      )}
      <div className="mx-auto w-full max-w-[1100px] flex-1 px-4 pb-6 pt-5">{children}</div>

      {prog && noJogo && (
        <nav aria-label="Seções do Muro Livre" className="muro-barra sticky bottom-[calc(5rem+env(safe-area-inset-bottom))] z-30 mx-auto w-full max-w-[640px] lg:bottom-0">
          {ABAS.map((a) => {
            const ativa = a.casa.some((c) => path.startsWith(`${BASE}${c}`));
            return (
              <Link key={a.chave} href={a.href} className="muro-aba" aria-current={ativa ? "page" : undefined}>
                <Icone nome={a.icone} tam={22} />
                {TEXTOS.abas[a.chave]}
              </Link>
            );
          })}
        </nav>
      )}

      <div className="pointer-events-none fixed left-1/2 top-20 z-50 flex w-[min(92vw,420px)] -translate-x-1/2 flex-col gap-2" role="status" aria-live="polite">
        {m.toasts.map((t) => (
          <p key={t.id} className="muro-balao pointer-events-auto m-0 flex items-center gap-2 !max-w-full text-sm font-semibold" data-lado={t.tipo === "erro" ? "voce" : undefined}>
            <Icone nome={t.tipo === "chuva" ? "nuvem" : t.tipo === "erro" ? "alerta" : "check"} tam={16} />
            {t.texto}
          </p>
        ))}
      </div>
    </div>
  );
}
