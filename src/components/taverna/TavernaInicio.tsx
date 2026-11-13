"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { humorDoDragao } from "@/lib/taverna/atributos";
import { TAVERNA } from "@/lib/taverna/config";
import { useTaverna, type Inicial } from "./useTaverna";

// Apresentação: "Continuar" só aparece se já existe uma taverna (da conta ou do aparelho).
export function TavernaInicio({ inicial }: { inicial: Inicial }) {
  const t = useTaverna(inicial);
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
    router.push("/jogos/taverna/noite");
  };

  if (!t.pronto) return <p className="text-areia">Procurando a taverna…</p>;

  return (
    <div className="flex flex-col gap-4">
      {prog && (
        <div className="surface-vidro flex flex-wrap items-center gap-x-8 gap-y-3 p-4">
          <div className="flex min-w-[180px] flex-1 flex-col gap-1">
            <span className="rotulo text-lareira-brasa">{prog.cidade}</span>
            <strong className="text-xl">Nível {prog.nivel} · {prog.noite} {prog.noite === 1 ? "noite aberta" : "noites abertas"}</strong>
            <span className="text-sm text-areia">Dragão: {{ ronca: "ronca tranquilo", dorme: "dorme sem pressa", umOlho: "abriu um olho" }[humorDoDragao(prog.reputacao)]}</span>
          </div>
          <dl className="m-0 flex gap-6">
            <div><dt className="text-sm text-areia">Ouro</dt><dd className="m-0 font-ficha text-xl">{prog.ouro}</dd></div>
            <div><dt className="text-sm text-areia">Reputação</dt><dd className="m-0 font-ficha text-xl">{prog.reputacao.toFixed(2)}</dd></div>
          </dl>
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        {prog && (
          <>
            <Link href="/jogos/taverna/noite" className="botao-laranja inline-flex items-center no-underline">{TAVERNA.textos.continuar} · noite {prog.noite + 1}</Link>
            <Link href="/jogos/taverna/melhorias" className="botao-vidro inline-flex items-center no-underline">Melhorias</Link>
          </>
        )}
        {!prog || !confirmar ? (
          <button type="button" className={prog ? "botao-vidro" : "botao-laranja"} disabled={ocupado} onClick={() => (prog ? setConfirmar(true) : criar())}>
            {TAVERNA.textos.novaTaverna}
          </button>
        ) : (
          <div className="surface-vidro flex flex-wrap items-center gap-3 p-3" role="alertdialog" aria-label="Confirmar nova taverna">
            <span>Isso apaga a taverna atual. Começar outra?</span>
            <button type="button" className="botao-laranja" onClick={criar} disabled={ocupado}>Apagar e começar</button>
            <button type="button" className="botao-vidro" onClick={() => setConfirmar(false)}>Cancelar</button>
          </div>
        )}
      </div>

      {erro && <p className="m-0 text-danger" role="alert">{erro}</p>}
      {!t.logado && (
        <p className="m-0 text-sm text-areia">
          Sua taverna fica guardada neste aparelho. <Link href="/cadastro?next=/jogos/taverna" className="text-lareira-brasa underline">{TAVERNA.textos.contaGuardar}</Link>.
        </p>
      )}
    </div>
  );
}
