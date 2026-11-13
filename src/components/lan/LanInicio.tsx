"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { LAN } from "@/lib/lan/config";
import { TEXTOS } from "@/lib/lan/conteudo";
import { useLan, type Inicial } from "./useLan";

// Apresentação: "Continuar" só aparece se já existe uma lan (da conta ou do aparelho).
export function LanInicio({ inicial }: { inicial: Inicial }) {
  const t = useLan(inicial);
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
    router.push("/jogos/lan-house/dia");
  };

  if (!t.pronto) return <p className="text-areia">{TEXTOS.procurando}</p>;

  return (
    <div className="flex flex-col gap-4">
      {prog && (
        <div className="surface-vidro flex flex-wrap items-center gap-x-8 gap-y-3 p-4">
          <div className="flex min-w-[180px] flex-1 flex-col gap-1">
            <span className="rotulo text-bege-fosforo">{prog.local}</span>
            <strong className="text-xl">Nível {prog.nivel} · {prog.dia} {prog.dia === 1 ? "dia aberto" : "dias abertos"}</strong>
            <span className="text-sm text-areia">{prog.maquinas.length} máquinas · semana {Math.floor(prog.dia / LAN.contas.dias) + 1}</span>
          </div>
          <dl className="m-0 flex gap-6">
            <div><dt className="text-sm text-areia">Caixa</dt><dd className="m-0 font-ficha text-xl">R$ {prog.dinheiro}</dd></div>
            <div><dt className="text-sm text-areia">Reputação</dt><dd className="m-0 font-ficha text-xl">{prog.reputacao.toFixed(2)} ★</dd></div>
          </dl>
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        {prog && (
          <>
            <Link href="/jogos/lan-house/dia" className="botao-laranja inline-flex items-center no-underline">{TEXTOS.continuar} · dia {prog.dia + 1}</Link>
            <Link href="/jogos/lan-house/melhorias" className="botao-vidro inline-flex items-center no-underline">Melhorias</Link>
          </>
        )}
        {!prog || !confirmar ? (
          <button type="button" className={prog ? "botao-vidro" : "botao-laranja"} disabled={ocupado} onClick={() => (prog ? setConfirmar(true) : criar())}>
            {TEXTOS.nova}
          </button>
        ) : (
          <div className="surface-vidro flex flex-wrap items-center gap-3 p-3" role="alertdialog" aria-label="Confirmar nova lan house">
            <span>{TEXTOS.confirmarNova}</span>
            <button type="button" className="botao-laranja" onClick={criar} disabled={ocupado}>Fechar e abrir outra</button>
            <button type="button" className="botao-vidro" onClick={() => setConfirmar(false)}>Cancelar</button>
          </div>
        )}
      </div>

      {erro && <p className="m-0 text-danger" role="alert">{erro}</p>}
      {!t.logado && (
        <p className="m-0 text-sm text-areia">
          {TEXTOS.guardadaAparelho} <Link href="/cadastro?next=/jogos/lan-house" className="text-bege-fosforo underline">{TEXTOS.contaGuardar}</Link>.
        </p>
      )}
    </div>
  );
}
