"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { ALCANCE_M, CAMADAS, CORES, MIN_DIA, TAMANHOS, horaDe } from "@/lib/muro/config";
import { TEXTOS, TEXTOS_ERRO } from "@/lib/muro/conteudo";
import { atributos, chuvaEm, climaDoDia, habilidadeMax, proximaChuva } from "@/lib/muro/efeitos";
import { alcanceDoNivel } from "@/lib/muro/geometria";
import { usaSpray } from "@/lib/muro/material";
import { minutosDeMontagem, podeIniciar } from "@/lib/muro/negociacao";
import { concluida, motivoTravada, qualidadeFinal, templateDe } from "@/lib/muro/pintura";
import { minutoAbsoluto } from "@/lib/muro/config";
import type { Camada, CorId, Job } from "@/lib/muro/tipos";
import { corDaCamada, type Erro } from "@/lib/muro/trabalho";
import { SemCrew } from "./CadernoTela";
import { Icone } from "./Icone";
import { useMuro } from "./useMuro";
import { Adesivo, AdesivoAuth, PontoCor, Progresso, VAR_COR, brl } from "./visual";

const MuroCanvas = dynamic(() => import("./MuroCanvas").then((m) => m.MuroCanvas), { ssr: false, loading: () => <p>Preparando o muro…</p> });
const BASE = "/jogos/muro-livre";

function primeiraCamada(job: Job, attr: ReturnType<typeof atributos>, cat: Parameters<typeof motivoTravada>[2]): Camada {
  return CAMADAS.find((c) => motivoTravada(job, c, cat, attr) === null) ?? "detalhe";
}

export function MuroPintura({ id }: { id: string }) {
  const m = useMuro();
  const prog = m.prog;
  const job = prog?.jobs.find((j) => j.id === id);
  const attr = useMemo(() => (prog ? atributos(prog, m.catalogo) : null), [prog, m.catalogo]);
  const [camadaSel, setCamadaSel] = useState<Camada | null>(null);
  const [corSel, setCorSel] = useState<{ camada: Camada; cor: CorId } | null>(null);
  const [erro, setErro] = useState("");
  const [entregue, setEntregue] = useState<{ pago: number; qualidade: number } | null>(null);

  const camada = camadaSel ?? (job && attr ? primeiraCamada(job, attr, m.catalogo) : "fundo");
  const corBriefing = job ? corDaCamada(job, camada) : "laranja";
  const cor = corSel && corSel.camada === camada ? corSel.cor : corBriefing;

  if (!prog || !job || !attr) return <SemCrew />;
  const t = templateDe(m.catalogo, job);
  const cfg = TAMANHOS[job.tamanho];
  const T = TEXTOS.muro;
  const emAndamento = job.status === "em_andamento";
  const pode = podeIniciar(prog, job);
  const agora = minutoAbsoluto(prog.dia, prog.minuto);
  const clima = climaDoDia(prog.seed, prog.dia + 1, prog.tranquilo);
  const chuvaAgora = chuvaEm(clima, prog.minuto);
  const proxima = proximaChuva(clima, prog.minuto);
  const travada = motivoTravada(job, camada, m.catalogo, attr);
  const fimEncontro = job.encontro && prog.minuto >= prog.encontro.fimMinuto;
  const habilitado = emAndamento && !travada && !fimEncontro && prog.minuto < MIN_DIA && !m.opcoes.assistida;
  const motivoTexto = !emAndamento ? "O mural ainda não começou." : fimEncontro ? TEXTOS_ERRO.fim : travada === "anterior" ? TEXTOS_ERRO.camada : travada === "andaime" ? TEXTOS_ERRO.andaime : travada === "coberta" ? TEXTOS_ERRO.coberto : travada === "pronta" ? "Camada pronta." : m.opcoes.assistida ? T.assistidaAjuda : null;
  const temDiaFim = prog.minuto >= MIN_DIA;
  const alcance = alcanceDoNivel(attr.alcanceNivel);
  const molhada = CAMADAS.some((c) => job.camadas[c].secaAte > agora && job.camadas[c].progresso > 0);
  const usarSpray = usaSpray(camada);

  const pintar = (celulas: number, precisao: number) => {
    const r = m.pintar({ jobId: job.id, camada, celulas, precisao, cor });
    setErro(r.ok ? "" : r.erro);
    return { ok: r.ok };
  };
  const aprovar = () => {
    const r = m.aprovar(job.id, camada, cor);
    setErro(r.ok ? "" : r.erro);
  };
  const entregar = async () => {
    const r = await m.entregar(job.id);
    if (!r.ok) return setErro(r.erro);
    const j = (m.prog ?? prog).jobs.find((x) => x.id === job.id);
    setEntregue({ pago: j?.pago ?? 0, qualidade: j?.qualFinal ?? 0 });
  };
  const comecar = () => {
    const r = m.iniciar(job.id);
    setErro(r.ok ? "" : r.erro);
  };

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-wrap items-end justify-between gap-2">
        <div className="flex flex-col gap-1">
          <Link href={`${BASE}/muro`} className="inline-flex min-h-11 items-center gap-1 text-sm font-bold text-azul no-underline"><Icone nome="voltar" tam={16} />{TEXTOS.abas.muros}</Link>
          <h1 className="muro-titulo m-0 text-[26px] sm:text-[34px]">{job.nomeCliente}</h1>
          <p className="m-0 flex flex-wrap items-center gap-2 text-sm">
            <span>{TEXTOS.tamanhos[job.tamanho]}</span>
            <span className="muro-medida">{job.encontro ? "Encontro" : `${brl(job.pagamento)} · prazo dia ${job.prazo}`}</span>
            <AdesivoAuth auth={job.auth} revisao={job.revisao} />
            {chuvaAgora && <Adesivo tipo="chuva" />}
            {molhada && <Adesivo tipo="fresca" />}
          </p>
          <p className="m-0 text-sm"><strong>Briefing:</strong> {job.briefing.tema} · “{job.briefing.palavra}” · {job.briefing.cores.map((c) => T.cor[c]).join(", ")}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Aviso de chuva">
          {proxima ? (
            <p className="muro-nota m-0 flex items-center gap-1"><Icone nome="nuvem" tam={18} />{T.chuvaAviso(horaDe(proxima.ini), Math.round(proxima.intensidade * 100))}</p>
          ) : <p className="muro-nota m-0 flex items-center gap-1"><Icone nome="check" tam={18} />{T.semChuva}</p>}
          {emAndamento && (job.coberto
            ? <button type="button" className="muro-btn-sec" onClick={() => m.descobrir(job.id)}>{T.descobrir}</button>
            : <button type="button" className="muro-btn-sec" onClick={() => { const r = m.cobrir(job.id); setErro(r.ok ? "" : r.erro); }} disabled={prog.estoque.lonas < 1}>{T.cobrir} ({prog.estoque.lonas})</button>)}
        </div>
      </header>

      <div className="grid gap-4 md:grid-cols-[1fr_300px] [@media(orientation:landscape)]:grid-cols-[1fr_260px]">
        <section className="muro-folha flex flex-col gap-2" aria-label="Muro">
          {entregue ? (
            <div className="muro-pagina flex flex-col gap-2">
              <p className="muro-titulo m-0 text-2xl">{T.entregueEm(entregue.qualidade)}</p>
              <p className="muro-medida m-0 text-lg">{brl(entregue.pago)}</p>
              <div className="flex flex-wrap gap-2"><Link href={`${BASE}/caderno`} className="muro-btn">{TEXTOS.abas.caderno}</Link><Link href={`${BASE}/muro`} className="muro-btn-sec">{TEXTOS.abas.muros}</Link></div>
            </div>
          ) : (
            <MuroCanvas job={job} template={t} prog={prog} attr={attr} tag={m.tag} camada={camada} cor={cor} habilitado={habilitado} motivo={motivoTexto} onPintar={pintar} />
          )}
          {erro && <p className="m-0 font-bold text-tijolo" role="alert">{erro}</p>}
        </section>

        <aside className="flex flex-col gap-3" aria-label="Caderno do muro">
          {!emAndamento && job.status === "aberta" && (
            <div className="muro-pagina flex flex-col gap-2" style={{ ["--inclina" as string]: "0deg" }}>
              <button type="button" className="muro-btn" onClick={comecar} disabled={!pode.ok}>{T.comecarMural}</button>
              {!pode.ok && <p className="muro-nota m-0">{TEXTOS_ERRO[pode.motivo as Erro]}</p>}
              {pode.ok && minutosDeMontagem(job, prog, m.catalogo) > 0 && <p className="muro-nota m-0">{T.montando(minutosDeMontagem(job, prog, m.catalogo))}</p>}
            </div>
          )}

          <section className="muro-folha flex flex-col gap-2" aria-label={T.camadas}>
            <h2 className="m-0 text-sm font-bold uppercase">{T.camadas}</h2>
            {CAMADAS.map((c) => {
              const trava = motivoTravada(job, c, m.catalogo, attr);
              const l = job.camadas[c];
              const estado = trava === "pronta" ? `${T.estado.pronta} · ${Math.round(l.qualidade)}` : trava === "anterior" ? T.estado.anterior : trava === "andaime" ? T.estado.andaime : trava === "coberta" ? T.estado.coberta : `${Math.round(l.progresso)}%`;
              return (
                <button key={c} type="button" onClick={() => setCamadaSel(c)} aria-pressed={camada === c} className={`flex min-h-11 flex-col gap-1 rounded-[6px] border-2 p-2 text-left ${camada === c ? "border-noite bg-laranja-claro/40" : "border-noite/25"}`}>
                  <span className="flex items-center justify-between text-sm font-bold"><span className="flex items-center gap-1"><Icone nome={trava === "pronta" ? "check" : trava ? "cadeado" : "pincel"} tam={14} />{T.camada[c]}</span><span className="muro-medida text-xs font-normal">{estado}</span></span>
                  <Progresso valor={l.progresso} rotulo={`${T.camada[c]}`} />
                </button>
              );
            })}
          </section>

          <section className="muro-folha flex flex-col gap-2" aria-label={usarSpray ? T.spray : T.tinta}>
            <h2 className="m-0 text-sm font-bold uppercase">{usarSpray ? `${T.spray} · ${T.ferramenta.spray}` : `${T.tinta} · ${T.ferramenta.rolinho}`}</h2>
            <div className="flex flex-wrap gap-2">
              {CORES.map((c) => {
                const nivel = usarSpray ? prog.estoque.spray[c] : prog.estoque.tinta[c];
                const rotulo = usarSpray ? `${nivel.toFixed(1)}` : `${Math.round(nivel)}%`;
                return (
                  <button key={c} type="button" onClick={() => setCorSel({ camada, cor: c })} aria-pressed={cor === c} aria-label={`${T.cor[c]} ${rotulo}${c === corBriefing ? " (do briefing)" : ""}`}
                    className={`flex min-h-11 min-w-14 flex-col items-center justify-center gap-0.5 rounded-[6px] border-2 px-1 ${cor === c ? "border-noite bg-laranja-claro" : "border-noite/30 bg-papel-claro"}`}>
                    <span className="relative block h-7 w-4 rounded-t-[3px] border-2 border-noite" style={{ background: "var(--color-papel-claro)" }}>
                      <span className="absolute inset-x-0 bottom-0 block" style={{ height: `${usarSpray ? Math.min(100, (nivel % 1 || (nivel > 0 ? 1 : 0)) * 100) : nivel}%`, background: VAR_COR[c] }} />
                    </span>
                    <span className="muro-medida text-[10px]">{rotulo}{c === corBriefing ? " ★" : ""}</span>
                  </button>
                );
              })}
            </div>
            <p className="m-0 flex items-center gap-2 text-xs"><PontoCor cor={corBriefing} />★ = cor do briefing</p>
            <p className="muro-medida m-0 text-xs">{usarSpray ? `${T.bico} ${Math.round(prog.estoque.bico.saude)}% · reserva ${prog.estoque.bico.reserva}` : `${T.rolinho} ${Math.round(prog.estoque.rolinho.saude)}% · reserva ${prog.estoque.rolinho.reserva}`}</p>
          </section>

          <section className="muro-folha flex items-center gap-3" aria-label={T.andaime}>
            <svg width="26" height="86" viewBox="0 0 26 86" aria-hidden>
              <rect x="10" y="4" width="6" height="78" fill="var(--color-reboco-sombra)" stroke="var(--color-noite)" />
              {ALCANCE_M.map((_, i) => (
                <line key={i} x1="3" x2="23" y1={82 - (i + 0.5) * (78 / ALCANCE_M.length)} y2={82 - (i + 0.5) * (78 / ALCANCE_M.length)} stroke={i <= attr.alcanceNivel ? "var(--color-laranja)" : "var(--color-noite)"} strokeWidth={i <= attr.alcanceNivel ? 3 : 1} opacity={i <= attr.alcanceNivel ? 1 : 0.4} />
              ))}
            </svg>
            <div><strong className="text-sm">{T.andaime}</strong><p className="muro-medida m-0 text-sm">{T.nivelAndaime(attr.alcanceNivel, alcance)}</p><p className="muro-medida m-0 text-xs">Muro: {cfg.alturaM.toLocaleString("pt-BR")} m</p></div>
          </section>

          {emAndamento && (
            <section className="muro-folha flex flex-col gap-2" aria-label={T.assistida}>
              <label className="flex min-h-11 items-center gap-2 text-sm font-bold"><input type="checkbox" className="h-5 w-5" checked={m.opcoes.assistida} onChange={(e) => m.setOpcoes({ assistida: e.target.checked })} />{T.assistida}</label>
              {m.opcoes.assistida && (
                <>
                  <p className="m-0 text-xs">{T.assistidaAjuda}</p>
                  <button type="button" className="muro-btn" onClick={aprovar} disabled={!!travada || fimEncontro || temDiaFim}>{T.aprovar}</button>
                </>
              )}
            </section>
          )}

          {emAndamento && prog.equipe.length > 0 && (
            <section className="muro-folha flex flex-col gap-2" aria-label={T.crewPintando}>
              <h2 className="m-0 text-sm font-bold uppercase">{T.crewPintando}</h2>
              {prog.equipe.map((a) => {
                const arq = m.catalogo.arquetipos.find((x) => x.slug === a.arquetipo);
                return (
                  <label key={a.id} className="flex flex-col gap-1 text-xs font-bold">
                    <span className="flex justify-between"><span>{arq?.nome ?? a.arquetipo}</span><span className="muro-medida font-normal">{Math.round(a.cansaco)}% cansaço{a.folga ? " · folga" : ""}</span></span>
                    <select className="min-h-11 rounded-[6px] border-2 border-noite bg-papel-claro px-2 text-sm font-normal" disabled={a.folga} value={a.escala?.jobId === job.id ? a.escala.camada : ""}
                      onChange={(e) => void (e.target.value ? m.escalar(a.id, job.id, e.target.value as Camada | "auto") : m.escalar(a.id, null))}>
                      <option value="">{T.ninguem}</option>
                      <option value="auto">Automático</option>
                      {CAMADAS.map((c) => <option key={c} value={c}>{T.camada[c]}</option>)}
                    </select>
                  </label>
                );
              })}
            </section>
          )}

          {emAndamento && !job.encontro && (
            <button type="button" className="muro-btn" onClick={() => void entregar()} disabled={!concluida(job)}>{T.entregar}{concluida(job) ? ` · nota ${Math.round(qualidadeFinal(job))}` : ""}</button>
          )}
          {job.encontro && emAndamento && <p className="muro-nota m-0">O julgamento sai no fim do dia. Nota provisória {Math.round(qualidadeFinal(job))}.</p>}
          <p className="muro-medida m-0 text-xs">Habilidade da crew: {habilidadeMax(prog, attr)}</p>
        </aside>
      </div>
    </div>
  );
}
