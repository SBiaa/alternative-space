"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { COMO_JOGAR, TEXTOS } from "@/lib/banca/conteudo";
import { useBanca, type Inicial } from "./useBanca";

const BASE = "/jogos/banca-na-feira";

// Capa: "Continuar" só aparece se já existe uma banca (da conta ou do aparelho).
export function BancaInicio({ inicial }: { inicial: Inicial }) {
  const t = useBanca(inicial);
  const router = useRouter();
  const [confirmar, setConfirmar] = useState(false);
  const [erro, setErro] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const { prog } = t;

  const criar = async () => {
    setOcupado(true);
    const r = await t.nova();
    setOcupado(false);
    if (!r.ok) return setErro(r.erro);
    router.push(`${BASE}/atelie`);
  };

  if (!t.pronto) return <p className="text-areia">{TEXTOS.carregando}</p>;

  return (
    <div className="flex flex-col gap-4">
      {prog && (
        <div className="surface-vidro flex flex-wrap items-center gap-x-8 gap-y-3 p-4">
          <div className="flex min-w-[180px] flex-1 flex-col gap-1">
            <span className="rotulo text-bege-fosforo">Sua banca</span>
            <strong className="text-xl">Semana {prog.semana}</strong>
          </div>
          <dl className="m-0 flex gap-6">
            <div><dt className="text-sm text-areia">Caixa</dt><dd className="m-0 font-ficha text-xl">R$ {prog.dinheiro}</dd></div>
            <div><dt className="text-sm text-areia">Reputação</dt><dd className="m-0 font-ficha text-xl">{prog.reputacao.toFixed(2)} ★</dd></div>
          </dl>
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        {prog && <Link href={`${BASE}/atelie`} className="botao-laranja inline-flex min-h-[44px] items-center no-underline">{TEXTOS.continuar}</Link>}
        {!prog || !confirmar ? (
          <button type="button" className={`min-h-[44px] ${prog ? "botao-vidro" : "botao-laranja"}`} disabled={ocupado} onClick={() => (prog ? setConfirmar(true) : criar())}>
            {TEXTOS.nova}
          </button>
        ) : (
          <div className="surface-vidro flex flex-wrap items-center gap-3 p-3" role="alertdialog" aria-label="Confirmar nova banca">
            <span>{TEXTOS.confirmarNova}</span>
            <button type="button" className="botao-laranja min-h-[44px]" onClick={criar} disabled={ocupado}>{TEXTOS.fecharEAbrir}</button>
            <button type="button" className="botao-vidro min-h-[44px]" onClick={() => setConfirmar(false)}>{TEXTOS.cancelar}</button>
          </div>
        )}
      </div>

      {erro && <p className="m-0 text-danger" role="alert">{erro}</p>}
      {!t.logado && (
        <p className="m-0 text-sm text-areia">
          {TEXTOS.guardadaAparelho} <Link href={`/cadastro?next=${BASE}`} className="text-bege-fosforo underline">{TEXTOS.contaGuardar}</Link>.
        </p>
      )}

      <details className="surface-vidro p-4">
        <summary className="min-h-[44px] cursor-pointer text-lg font-semibold">{TEXTOS.comoJogar}</summary>
        <ol className="m-0 mt-3 flex list-none flex-col gap-3 p-0">
          {COMO_JOGAR.passos.map((p, i) => (
            <li key={p.t} className="flex gap-3">
              <span className="font-ficha text-bege-fosforo" aria-hidden="true">{i + 1}</span>
              <span><strong>{p.t}.</strong> {p.d}</span>
            </li>
          ))}
        </ol>
      </details>
    </div>
  );
}
