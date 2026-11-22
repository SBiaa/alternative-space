"use client";

import Link from "next/link";
import { useState } from "react";
import { COMPOR, DEMO } from "@/lib/banda/config";
import { TEXTOS } from "@/lib/banda/conteudo";
import { musicasBoas } from "@/lib/banda/motor";
import { bip } from "./sons";
import { useBanda, type Inicial } from "./useBanda";

const BASE = "/jogos/banda-de-garagem";
const T = TEXTOS.demo;

/** Demo: com 4 músicas boas e dinheiro, grava e abre os palcos maiores (a fama continua mandando). */
export function Demo({ inicial }: { inicial: Inicial }) {
  const b = useBanda(inicial);
  const [erro, setErro] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const { prog } = b;

  if (!b.pronto) return <p className="text-areia">{TEXTOS.procurando}</p>;
  if (!prog) return <p className="m-0">{TEXTOS.semBanda} <Link href={BASE} className="text-accent underline">{TEXTOS.criarBanda}</Link></p>;

  const boas = musicasBoas(prog);
  const pode = !prog.demo && boas.length >= COMPOR.musicasParaDemo && prog.dinheiro >= DEMO.custo;

  const gravar = async () => {
    setOcupado(true);
    setErro("");
    const r = await b.demo();
    setOcupado(false);
    if (!r.ok) return setErro(r.erro);
    bip(784);
  };

  return (
    <div className="surface-vidro flex flex-col gap-4 p-4 sm:p-6">
      <p className="m-0 text-areia">{T.chamada}</p>
      <dl className="m-0 flex flex-wrap gap-8">
        <div><dt className="text-sm text-areia">{T.boas}</dt><dd className="m-0 font-ficha text-2xl">{boas.length} / {COMPOR.musicasParaDemo}</dd></div>
        <div><dt className="text-sm text-areia">{T.custo}</dt><dd className="m-0 font-ficha text-2xl">R$ {DEMO.custo}</dd></div>
        <div><dt className="text-sm text-areia">{TEXTOS.caixa}</dt><dd className="m-0 font-ficha text-2xl">R$ {prog.dinheiro}</dd></div>
      </dl>
      {boas.length > 0 && (
        <ul className="m-0 flex list-none flex-col gap-1 p-0">
          {boas.map((m) => <li key={m.slot}>✓ {m.titulo} <span className="font-ficha text-areia">{m.nota}</span></li>)}
        </ul>
      )}
      {prog.demo ? <p className="m-0 text-ok" role="status">✓ {T.pronta}</p> : (
        <>
          <p className="m-0 text-sm text-areia">{TEXTOS.demoAjuda}</p>
          <button type="button" className="botao-laranja min-h-11 self-start" disabled={!pode || ocupado} onClick={gravar}>{T.gravar}</button>
          {boas.length < COMPOR.musicasParaDemo && <p className="m-0 text-warn">{T.precisa}</p>}
        </>
      )}
      {erro && <p className="m-0 text-danger" role="alert">{erro}</p>}
      <Link href={`${BASE}/semana`} className="botao-vidro inline-flex min-h-11 items-center self-start no-underline">{TEXTOS.composicao.voltarSemana}</Link>
    </div>
  );
}
