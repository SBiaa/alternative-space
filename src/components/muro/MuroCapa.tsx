"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { MURO } from "@/lib/muro/config";
import { TEXTOS } from "@/lib/muro/conteudo";
import { Icone } from "./Icone";
import { useMuro } from "./useMuro";
import { Tag, brl } from "./visual";

const BASE = "/jogos/muro-livre";

export function MuroCapa() {
  const m = useMuro();
  const router = useRouter();
  const [confirmar, setConfirmar] = useState(false);
  const [erro, setErro] = useState("");
  const { prog } = m;

  const criar = async () => {
    const r = await m.nova();
    if (!r.ok) return setErro(r.erro);
    router.push(`${BASE}/caderno`);
  };

  if (!m.pronto) return <p>{TEXTOS.procurando}</p>;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="muro-titulo m-0 text-[34px] sm:text-[52px]">{TEXTOS.titulo}</h1>
      <p className="m-0 max-w-[60ch] text-lg">{TEXTOS.chamada}</p>
      <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
        {TEXTOS.regras.map((r) => (
          <li key={r} className="flex items-start gap-2"><Icone nome="check" tam={18} />{r}</li>
        ))}
      </ul>

      {prog && (
        <section className="muro-pagina" style={{ ["--inclina" as string]: "-1deg" }} aria-label="Sua crew">
          <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
            <div className="flex min-w-[180px] flex-1 flex-col gap-1">
              <span className="muro-nota">{prog.bairro}</span>
              <strong className="text-xl">Nível {prog.nivel} · dia {prog.dia + 1}</strong>
              <span className="muro-medida text-sm">{prog.entregues} murais entregues</span>
            </div>
            <dl className="m-0 flex flex-wrap gap-6">
              <div><dt className="text-sm">Caixa</dt><dd className="muro-medida m-0 text-xl font-bold">{brl(prog.dinheiro)}</dd></div>
              <div><dt className="text-sm">{TEXTOS.resumo.quebrada}</dt><dd className="muro-medida m-0 text-xl font-bold">{prog.repQuebrada.toFixed(2)}</dd></div>
              <div><dt className="text-sm">{TEXTOS.resumo.clientes}</dt><dd className="muro-medida m-0 text-xl font-bold">{prog.repClientes.toFixed(2)}</dd></div>
            </dl>
          </div>
        </section>
      )}

      <div className="flex flex-wrap items-center gap-3">
        {prog && <Link href={`${BASE}/caderno`} className="muro-btn">{TEXTOS.continuar}</Link>}
        {!prog || !confirmar ? (
          <button type="button" className={prog ? "muro-btn-sec" : "muro-btn"} disabled={m.ocupado} onClick={() => (prog ? setConfirmar(true) : void criar())}>
            {TEXTOS.novaCrew}
          </button>
        ) : (
          <div className="muro-folha flex flex-wrap items-center gap-3" role="alertdialog" aria-label={TEXTOS.recomecar}>
            <span>{TEXTOS.confirmaRecomecar}</span>
            <button type="button" className="muro-btn" onClick={() => void criar()} disabled={m.ocupado}>{TEXTOS.recomecar}</button>
            <button type="button" className="muro-btn-sec" onClick={() => setConfirmar(false)}>Cancelar</button>
          </div>
        )}
      </div>
      {erro && <p className="m-0 font-bold text-tijolo" role="alert">{erro}</p>}

      <section className="muro-folha flex flex-wrap items-center gap-4" aria-label="Sua tag">
        <div className="flex h-16 w-32 items-center justify-center rounded-[4px] border border-dashed border-noite/50 bg-papel p-2 text-azul"><Tag tag={m.tag} className="h-full w-full" cor="var(--mural-azul)" /></div>
        <div className="flex min-w-[200px] flex-1 flex-col gap-1">
          <p className="m-0">{m.tagPropria ? TEXTOS.tagPropria : TEXTOS.tagPadrao}</p>
          {!m.tagPropria && <p className="muro-nota m-0">{TEXTOS.convitesTag}</p>}
        </div>
      </section>

      {!m.logado && (
        <p className="m-0 text-sm">
          <Link href="/cadastro?next=/jogos/muro-livre" className="font-bold text-azul underline">{TEXTOS.criarConta}</Link>.
        </p>
      )}

      <section className="muro-pagina max-w-[520px] opacity-90" data-fita="azul" style={{ ["--inclina" as string]: "1deg" }} aria-label={TEXTOS.empenaTitulo}>
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="muro-titulo m-0 text-2xl">{TEXTOS.empenaTitulo}</h2>
          <span className="muro-adesivo" data-tipo="falta"><Icone nome="cadeado" tam={13} />{TEXTOS.emBreve.toUpperCase()}</span>
        </div>
        <p className="mb-1 mt-2">{TEXTOS.empenaTexto}</p>
        <p className="muro-nota m-0">{TEXTOS.empenaRequisito(MURO.empena.nivel, MURO.empena.repQuebrada, MURO.empena.repClientes)}</p>
        <button type="button" className="muro-btn-sec mt-3" disabled><Icone nome="cadeado" tam={16} />{TEXTOS.emBreve}</button>
      </section>

      <p className="m-0 text-xs">{TEXTOS.avisoDinheiro}</p>
    </div>
  );
}
