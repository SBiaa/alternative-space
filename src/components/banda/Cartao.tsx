import { HUMOR } from "@/lib/banda/config";
import { NOME_MANIA, NOME_PAPEL, TEXTOS } from "@/lib/banda/conteudo";
import type { Candidato, Integrante } from "@/lib/banda/tipos";
import { Silhueta } from "./Silhueta";

/** Barra com o número escrito: a informação nunca depende só da cor. */
export function Medidor({ rotulo, valor, max = 100 }: { rotulo: string; valor: number; max?: number }) {
  return (
    <div className="flex flex-col gap-0.5 text-sm">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-areia">{rotulo}</span>
        <span className="font-ficha">{Math.round(valor)}</span>
      </div>
      <div className="h-2 w-full rounded-[4px] bg-line" role="meter" aria-label={rotulo} aria-valuemin={0} aria-valuemax={max} aria-valuenow={valor}>
        <div className="h-2 rounded-[4px] bg-accent" style={{ width: `${Math.max(0, Math.min(100, (valor / max) * 100))}%` }} />
      </div>
    </div>
  );
}

type Dados = Candidato | Integrante;

export function CartaoIntegrante({ m }: { m: Dados }) {
  const completo = "cansaco" in m ? m : null;
  const noLimite = completo && completo.humor <= HUMOR.aviso;
  const cansado = completo && completo.cansaco > HUMOR.limiarCansaco;
  return (
    <div className="flex flex-col gap-3 sm:flex-row">
      <Silhueta papel={m.papel} variante={m.silhueta} />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex flex-wrap items-baseline gap-x-2">
          <strong className="text-base">{m.nome}</strong>
          <span className="rotulo text-accent">{NOME_PAPEL[m.papel]}</span>
        </div>
        <span className="text-sm text-areia">{TEXTOS.mania}: {NOME_MANIA[m.mania]}</span>
        <Medidor rotulo={TEXTOS.tecnica} valor={m.tecnica} />
        <Medidor rotulo={TEXTOS.presenca} valor={m.presenca} />
        <Medidor rotulo={TEXTOS.criatividade} valor={m.criatividade} />
        <Medidor rotulo={TEXTOS.humor} valor={m.humor} />
        {completo && <Medidor rotulo={TEXTOS.cansaco} valor={completo.cansaco} />}
        {noLimite && <p className="m-0 text-sm text-warn" role="status">⚠ {TEXTOS.avisoHumor}</p>}
        {cansado && !noLimite && <p className="m-0 text-sm text-warn">● {TEXTOS.alertaCansaco}</p>}
      </div>
    </div>
  );
}
