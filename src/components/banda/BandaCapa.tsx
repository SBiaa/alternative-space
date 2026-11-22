"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { NOME_ESTILO, TEXTOS } from "@/lib/banda/conteudo";
import type { Montagem } from "@/lib/banda/tipos";
import { LogoBanda } from "./LogoBanda";
import { MontarBanda } from "./MontarBanda";
import { useBanda, type Inicial } from "./useBanda";

const BASE = "/jogos/banda-de-garagem";

/** Capa: "Continuar" só aparece com uma banda salva (da conta ou do aparelho). "Nova banda" abre a montagem. */
export function BandaCapa({ inicial }: { inicial: Inicial }) {
  const b = useBanda(inicial);
  const router = useRouter();
  const [montando, setMontando] = useState(false);
  const [confirmar, setConfirmar] = useState(false);
  const [seed, setSeed] = useState("");
  const [erro, setErro] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const { prog } = b;

  const abrirMontagem = () => {
    setSeed(b.novaSeed()); // só no clique: a seed nunca é sorteada no servidor, então não há diferença de hidratação
    setErro("");
    setConfirmar(false);
    setMontando(true);
  };

  const criar = async (m: Montagem) => {
    setOcupado(true);
    const r = await b.nova(seed, m);
    setOcupado(false);
    if (!r.ok) return setErro(r.erro);
    router.push(`${BASE}/semana`);
  };

  if (!b.pronto) return <p className="text-areia">{TEXTOS.procurando}</p>;

  if (montando) return <MontarBanda seed={seed} ocupado={ocupado} erro={erro} onCriar={criar} onCancelar={() => setMontando(false)} />;

  return (
    <div className="flex flex-col gap-4">
      {prog && (
        <div className="surface-vidro flex flex-wrap items-center gap-x-6 gap-y-3 p-4">
          <LogoBanda logo={prog.logo} tamanho={72} />
          <div className="flex min-w-[180px] flex-1 flex-col gap-1">
            <span className="rotulo text-accent">{NOME_ESTILO[prog.estilo]}</span>
            <strong className="text-xl">{prog.nome}</strong>
            <span className="text-sm text-areia">{TEXTOS.semana} {prog.semana} · {prog.musicas.length} {TEXTOS.musicas.toLowerCase()}</span>
          </div>
          <dl className="m-0 flex gap-6">
            <div><dt className="text-sm text-areia">{TEXTOS.caixa}</dt><dd className="m-0 font-ficha text-xl">R$ {prog.dinheiro}</dd></div>
            <div><dt className="text-sm text-areia">{TEXTOS.fama}</dt><dd className="m-0 font-ficha text-xl">{prog.fama}</dd></div>
          </dl>
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        {prog && <Link href={`${BASE}/semana`} className="botao-laranja inline-flex min-h-11 items-center no-underline">{TEXTOS.continuar}</Link>}
        {!prog || !confirmar ? (
          <button type="button" className={`min-h-11 ${prog ? "botao-vidro" : "botao-laranja"}`} onClick={() => (prog ? setConfirmar(true) : abrirMontagem())}>{TEXTOS.nova}</button>
        ) : (
          <div className="surface-vidro flex flex-wrap items-center gap-3 p-3" role="alertdialog" aria-label={TEXTOS.nova}>
            <span>{TEXTOS.confirmarNova}</span>
            <button type="button" className="botao-laranja min-h-11" onClick={abrirMontagem}>{TEXTOS.confirmarNovaBotao}</button>
            <button type="button" className="botao-vidro min-h-11" onClick={() => setConfirmar(false)}>{TEXTOS.cancelar}</button>
          </div>
        )}
      </div>

      <details className="surface-vidro p-4">
        <summary className="min-h-11 cursor-pointer font-semibold">{TEXTOS.comoJogar}</summary>
        <div className="mt-2 flex flex-col gap-2 text-areia">
          {TEXTOS.comoJogarTexto.map((t) => <p key={t} className="m-0">{t}</p>)}
        </div>
      </details>

      {!b.logado && (
        <p className="m-0 text-sm text-areia">
          {TEXTOS.guardadaAparelho} <Link href={`/cadastro?next=${BASE}`} className="text-accent underline">{TEXTOS.contaGuardar}</Link>.
        </p>
      )}
    </div>
  );
}
