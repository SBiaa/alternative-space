"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { TAMANHOS, semanaDe } from "@/lib/muro/config";
import { TEXTOS, TEXTOS_ERRO } from "@/lib/muro/conteudo";
import { exigenciaOk, podeIniciar } from "@/lib/muro/negociacao";
import type { Job } from "@/lib/muro/tipos";
import type { Erro } from "@/lib/muro/trabalho";
import { Icone } from "./Icone";
import { useMuro } from "./useMuro";
import { AdesivoAuth, Croqui, PontoCor, brl } from "./visual";

const BASE = "/jogos/muro-livre";
const INCLINA = [-0.9, 0.7, -0.4, 1.1, -1.2, 0.5];

export function SemCrew() {
  const m = useMuro();
  if (!m.pronto) return <p>{TEXTOS.procurando}</p>;
  return (
    <div className="muro-folha flex flex-col items-start gap-3">
      <p className="m-0">Você ainda não tem uma crew.</p>
      <Link href={BASE} className="muro-btn">{TEXTOS.novaCrew}</Link>
    </div>
  );
}

export function PaginaEncomenda({ job, indice = 0 }: { job: Job; indice?: number }) {
  const m = useMuro();
  const router = useRouter();
  const prog = m.prog!;
  const [erro, setErro] = useState("");
  const cfg = TAMANHOS[job.tamanho];
  const t = TEXTOS.caderno;
  const dia = prog.dia + 1;
  const exigeOk = exigenciaOk(prog, job);
  const nivelOk = cfg.nivelMin <= prog.nivel;
  const pode = podeIniciar(prog, job);

  const aceitar = () => {
    const r = m.aceitar(job.id);
    setErro(r.ok ? "" : r.erro);
  };
  const comecar = () => {
    const r = m.iniciar(job.id);
    if (!r.ok) return setErro(r.erro);
    router.push(`${BASE}/muro/${job.id}`);
  };

  return (
    <article className="muro-pagina flex flex-col gap-3" style={{ ["--inclina" as string]: `${INCLINA[indice % INCLINA.length]}deg` }} data-fita={job.comunitario ? "azul" : undefined} aria-label={job.nomeCliente}>
      <header className="flex flex-col gap-1">
        <h3 className="muro-titulo m-0 text-xl">{job.nomeCliente}</h3>
        <p className="m-0 flex flex-wrap items-center gap-2 text-sm">
          <span>{job.comunitario ? t.comunitario : t.comercial}</span>
          <span aria-hidden>·</span>
          <span>{TEXTOS.tamanhos[job.tamanho]}</span>
          {job.aceita && <AdesivoAuth auth={job.auth} revisao={job.revisao} />}
        </p>
      </header>

      <Croqui job={job} tag={m.tag} templates={m.catalogo.templates} />

      <dl className="m-0 grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
        <div><dt>{t.paga}</dt><dd className="muro-medida m-0 text-base font-bold">{brl(job.pagamento)}</dd></div>
        <div><dt>Prazo</dt><dd className="muro-medida m-0 text-base font-bold">{job.aceita ? `dia ${job.prazo}${job.prazo < dia ? " (atrasado)" : ""}` : t.prazo(job.prazoDias)}</dd></div>
      </dl>

      <div className="flex flex-col gap-1 text-sm">
        <p className="m-0"><strong>{t.briefing}:</strong> {job.briefing.tema} · “{job.briefing.palavra}”</p>
        <p className="m-0 flex items-center gap-2"><span>{t.cores}:</span>{job.briefing.cores.map((c) => <PontoCor key={c} cor={c} />)}<span className="muro-nota !text-base">{job.briefing.cores.map((c) => TEXTOS.muro.cor[c]).join(", ")}</span></p>
        <p className="muro-nota m-0">“{job.briefing.obs}”</p>
      </div>

      {!job.aceita && (job.exige.clientes > 0 || job.exige.quebrada > 0) && (
        <p className="m-0 flex items-center gap-1 text-sm"><Icone nome={exigeOk ? "check" : "cadeado"} tam={14} />{exigeOk ? "Você tem a reputação pedida" : `Pede ${t.exige(job.exige.clientes, job.exige.quebrada)}`}</p>
      )}
      {cfg.artistasMin > 0 && <p className="m-0 flex items-center gap-1 text-sm"><Icone nome="crew" tam={14} />{t.crewMin(cfg.artistasMin)}</p>}
      {!nivelOk && <p className="m-0 flex items-center gap-1 text-sm"><Icone nome="cadeado" tam={14} />{t.nivelMin(cfg.nivelMin)}</p>}

      <div className="mt-auto flex flex-col gap-2">
        {!job.aceita && (
          <button type="button" className="muro-btn" onClick={aceitar} disabled={!exigeOk || !nivelOk}>{!exigeOk || !nivelOk ? t.travada : t.aceitar}</button>
        )}
        {job.aceita && job.status === "aberta" && job.auth === "falta" && (
          <Link href={`${BASE}/conversa/${job.id}`} className="muro-btn">{t.conversar}</Link>
        )}
        {job.aceita && job.status === "aberta" && job.revisao && (
          <Link href={`${BASE}/conversa/${job.id}`} className="muro-btn">{TEXTOS.conversa.revisar}</Link>
        )}
        {job.aceita && job.status === "aberta" && job.auth === "autorizado" && (
          <>
            <button type="button" className="muro-btn" onClick={comecar} disabled={!pode.ok} aria-describedby={`motivo-${job.id}`}>{t.comecar}</button>
            {!pode.ok && <p id={`motivo-${job.id}`} className="muro-nota m-0">{TEXTOS_ERRO[pode.motivo as Erro]}</p>}
          </>
        )}
        {job.status === "em_andamento" && <Link href={`${BASE}/muro/${job.id}`} className="muro-btn">{t.verMural}</Link>}
        {erro && <p className="m-0 text-sm font-bold text-tijolo" role="alert">{erro}</p>}
      </div>
    </article>
  );
}

export function CadernoTela() {
  const m = useMuro();
  const prog = m.prog;
  if (!prog) return <SemCrew />;
  const semana = semanaDe(prog.dia + 1);
  const minhas = prog.jobs.filter((j) => j.aceita && !j.encontro && (j.status === "aberta" || j.status === "em_andamento"));
  const quadro = prog.jobs.filter((j) => !j.aceita && j.status === "aberta" && !j.encontro);
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="muro-titulo m-0 text-[30px] sm:text-[40px]">{TEXTOS.caderno.titulo}</h1>
        <p className="muro-nota m-0">Semana {semana} · o que não for aceito sai do quadro no domingo</p>
      </div>
      {minhas.length > 0 && (
        <section className="flex flex-col gap-3" aria-labelledby="minhas">
          <h2 id="minhas" className="m-0 text-lg font-bold">Com a crew</h2>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{minhas.map((j, i) => <PaginaEncomenda key={j.id} job={j} indice={i} />)}</div>
        </section>
      )}
      <section className="flex flex-col gap-3" aria-labelledby="quadro">
        <h2 id="quadro" className="m-0 text-lg font-bold">No quadro</h2>
        {quadro.length === 0 ? <p className="muro-nota m-0">{TEXTOS.caderno.vazio}</p> : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{quadro.map((j, i) => <PaginaEncomenda key={j.id} job={j} indice={i + 2} />)}</div>
        )}
      </section>
    </div>
  );
}
