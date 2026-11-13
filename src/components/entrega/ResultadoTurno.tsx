import Link from "next/link";
import { TEXTOS } from "@/lib/entrega/config";
import type { Resumo } from "@/lib/entrega/regras";

const T = TEXTOS.resultado;

export type EstadoSalvar = { tipo: "salvando" } | { tipo: "salvo"; recorde: boolean } | { tipo: "semConta" } | { tipo: "erro"; erro: string };

export function ResultadoTurno({ r, salvar, onDeNovo, cadastroHref }: { r: Resumo; salvar: EstadoSalvar; onDeNovo: () => void; cadastroHref: string }) {
  const linhas: [string, number][] = [
    [T.entregas, r.deliveries],
    [T.noPrazo, r.onTime],
    [T.atrasadas, r.late],
    [T.canceladas, r.cancelled],
    [T.gorjetas, r.tipsTotal],
    [T.sequencia, r.bestStreak],
  ];
  return (
    <div className="surface-creme mx-auto flex w-full max-w-[420px] flex-col gap-4 p-5" role="dialog" aria-labelledby="fim-turno">
      <h2 id="fim-turno" className="m-0 text-2xl font-semibold text-azul">
        {T.titulo}
      </h2>
      <p className="m-0 font-ficha text-3xl font-bold">
        +{r.creditsEarned} <span className="text-base font-normal">{T.creditos.toLowerCase()}</span>
      </p>
      {salvar.tipo === "salvo" && salvar.recorde && <p className="rotulo m-0 text-laranja">★ {T.recorde}</p>}
      {r.relaxed && <p className="m-0 text-sm">⏱ {T.relaxado}</p>}
      <dl className="m-0 grid grid-cols-2 gap-x-4 gap-y-1 font-ficha text-sm">
        {linhas.map(([k, v]) => (
          <div key={k} className="contents">
            <dt>{k}</dt>
            <dd className="m-0 text-right font-bold">{v}</dd>
          </div>
        ))}
      </dl>
      <p role="status" className="m-0 text-sm">
        {salvar.tipo === "salvando" ? T.salvando : salvar.tipo === "salvo" ? T.salvo : salvar.tipo === "erro" ? salvar.erro : null}
      </p>
      {salvar.tipo === "semConta" && (
        <Link href={cadastroHref} className="botao-laranja flex items-center justify-center text-center no-underline">
          {T.criarConta}
        </Link>
      )}
      <div className="flex gap-2">
        <button type="button" className="botao-laranja flex-1" onClick={onDeNovo}>
          {T.denovo}
        </button>
        <Link href="/jogos/entrega-na-chuva/oficina" className="flex min-h-11 flex-1 items-center justify-center rounded-md border border-noite text-noite no-underline">
          {TEXTOS.oficina}
        </Link>
      </div>
    </div>
  );
}
