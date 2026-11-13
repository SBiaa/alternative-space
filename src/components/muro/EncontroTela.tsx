"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { MURO, ehSabado, semanaDe } from "@/lib/muro/config";
import { TEXTOS } from "@/lib/muro/conteudo";
import { temaDaSemana } from "@/lib/muro/encontro";
import { SemCrew } from "./CadernoTela";
import { Icone } from "./Icone";
import { useMuro } from "./useMuro";
import { PontoCor, brl } from "./visual";

const BASE = "/jogos/muro-livre";

export function EncontroTela() {
  const m = useMuro();
  const router = useRouter();
  const [erro, setErro] = useState("");
  const prog = m.prog;
  if (!prog) return <SemCrew />;
  const T = TEXTOS.encontro;
  const E = MURO.encontro;
  const dia = prog.dia + 1;
  const sabado = ehSabado(dia);
  const tema = temaDaSemana(prog.seed, semanaDe(dia));

  const inscrever = () => {
    const r = m.inscrever();
    if (!r.ok) return setErro(r.erro);
    router.push(`${BASE}/muro/${`e${semanaDe(dia)}`}`);
  };

  return (
    <div className="flex max-w-[640px] flex-col gap-5">
      <h1 className="muro-titulo m-0 text-[30px] sm:text-[40px]">{T.titulo}</h1>
      <p className="m-0">{T.texto}</p>
      <section className="muro-pagina flex flex-col gap-2" style={{ ["--inclina" as string]: "-0.8deg" }}>
        <h2 className="muro-titulo m-0 text-xl">Tema: {tema.tema}</h2>
        <p className="m-0 flex items-center gap-2 text-sm">Cores: {tema.cores.map((c) => <PontoCor key={c} cor={c} />)} · palavra “{tema.palavra}”</p>
        <p className="muro-medida m-0 text-sm">{T.taxa(E.taxa, E.tempoMin)} · {T.tempo(E.duracaoMin)}</p>
        <p className="muro-medida m-0 text-sm">Caixa: {brl(prog.dinheiro)}</p>
        {!sabado && <p className="muro-nota m-0">{T.soSabado}</p>}
        {prog.encontro.inscrito ? (
          <>
            <p className="m-0 flex items-center gap-2 font-bold"><Icone nome="check" tam={16} />{T.inscrito}</p>
            <Link href={`${BASE}/muro/${prog.encontro.jobId}`} className="muro-btn">{TEXTOS.caderno.verMural}</Link>
          </>
        ) : (
          <button type="button" className="muro-btn" onClick={inscrever} disabled={!sabado || prog.dinheiro < E.taxa}>{T.inscrever}</button>
        )}
        {erro && <p className="m-0 font-bold text-tijolo" role="alert">{erro}</p>}
      </section>
      <Link href={`${BASE}/caderno`} className="muro-btn-sec w-fit">{TEXTOS.conversa.voltar}</Link>
    </div>
  );
}
