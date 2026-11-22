"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { NOME_PALCO, TEXTO_AVISO, TEXTO_MOMENTO, TEXTOS, TIPO_PALCO } from "@/lib/banda/conteudo";
import { PALCOS } from "@/lib/banda/config";
import type { RegistroShow } from "@/lib/banda/tipos";
import { BotaoSom } from "./BotaoSom";
import { CHAVE_ULTIMO_SHOW } from "./QuadroSemana";
import { bip } from "./sons";
import { useBanda, type Inicial } from "./useBanda";

const BASE = "/jogos/banda-de-garagem";
type Extras = { semana: number; faltou: string[]; saidas: { nome: string; entrou: string }[] };

function lerExtras(semana: number): Extras | null {
  try {
    const x = JSON.parse(sessionStorage.getItem(CHAVE_ULTIMO_SHOW) ?? "null") as Extras | null;
    return x && x.semana === semana ? x : null;
  } catch {
    return null;
  }
}

/** Resumo do último show: os números aparecem em sequência (tudo de uma vez se o sistema pede menos movimento). */
export function ResumoShow({ inicial }: { inicial: Inicial }) {
  const b = useBanda(inicial);
  const registro: RegistroShow | undefined = b.prog?.shows.at(-1);
  const [passo, setPasso] = useState(0);
  const [extras, setExtras] = useState<Extras | null>(null);
  const total = registro ? 3 + registro.momentos.length : 0;

  useEffect(() => {
    if (!registro) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sessionStorage só existe no navegador
    setExtras(lerExtras(registro.semana));
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setPasso(total);
      return;
    }
    let n = 0;
    const id = window.setInterval(() => {
      n++;
      setPasso(n);
      bip(330 + n * 60, 0.08);
      if (n >= total) window.clearInterval(id);
    }, 900);
    return () => window.clearInterval(id);
  }, [registro, total]);

  if (!b.pronto) return <p className="text-areia">{TEXTOS.procurando}</p>;
  if (!registro) return <p className="m-0">{TEXTOS.nenhumShow} <Link href={`${BASE}/semana`} className="text-accent underline">{TEXTOS.proximaSemana}</Link></p>;

  const palco = PALCOS.find((p) => p.slug === registro.palco);
  const musicas = b.prog!.musicas.filter((m) => registro.repertorio.includes(m.slot));
  const feito = passo >= total;
  const num = (rotulo: string, valor: string, quando: number) => (
    <div className="surface-vidro flex flex-col gap-1 p-3" aria-hidden={passo < quando ? true : undefined} style={{ visibility: passo < quando ? "hidden" : "visible" }}>
      <dt className="text-sm text-areia">{rotulo}</dt>
      <dd className="m-0 font-ficha text-2xl">{valor}</dd>
    </div>
  );

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <span className="rotulo text-accent">{TEXTOS.semana} {registro.semana} · {TIPO_PALCO[registro.palco]}</span>
        <h2 className="m-0 text-2xl">{NOME_PALCO[registro.palco]}</h2>
        <p className="m-0 text-areia" role="status">{feito ? "" : TEXTOS.ouvindoOPublico}</p>
      </div>

      <dl className="m-0 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {num(TEXTOS.publico, `${registro.publico}${palco ? ` / ${palco.capacidade}` : ""}`, 1)}
        {num(TEXTOS.energia, String(registro.energia), 2)}
        {num(TEXTOS.cache, `R$ ${registro.cache}`, 3)}
        {num(TEXTOS.famaGanha, `${registro.famaDelta > 0 ? "+" : ""}${registro.famaDelta}`, 3)}
      </dl>

      <section aria-labelledby="mom" className="surface-vidro flex flex-col gap-2 p-4">
        <h3 id="mom" className="m-0 text-lg">{TEXTOS.momentos}</h3>
        <ol className="m-0 flex list-none flex-col gap-2 p-0">
          {registro.momentos.map((m, i) => (
            <li key={m} style={{ visibility: passo >= 4 + i ? "visible" : "hidden" }}>{TEXTO_MOMENTO[m] ?? m}</li>
          ))}
        </ol>
        <p className="m-0 text-areia">{TEXTOS.nota}: <span className="font-ficha text-ink">{registro.nota}</span> · {musicas.map((m) => m.titulo).join(" · ")}</p>
      </section>

      {extras && (extras.faltou.length > 0 || extras.saidas.length > 0) && (
        <ul className="m-0 flex list-none flex-col gap-1 p-0 text-warn" role="status">
          {extras.faltou.map((n) => <li key={n}>⚠ {TEXTO_AVISO.faltou(n)}</li>)}
          {extras.saidas.map((s) => <li key={s.nome}>⚠ {TEXTO_AVISO.saiu(s.nome, s.entrou)}</li>)}
        </ul>
      )}

      <div className="flex flex-wrap gap-3">
        <Link href={`${BASE}/semana`} className="botao-laranja inline-flex min-h-11 items-center no-underline">{TEXTOS.proximaSemana}</Link>
        <BotaoSom />
      </div>
    </div>
  );
}
