"use client";

import Link from "next/link";
import { useId, useMemo, useState } from "react";
import { BANDA, CLIMAS, COMPOR, ESTRUTURAS, TEMAS } from "@/lib/banda/config";
import { NOME_CLIMA, NOME_ESTRUTURA, NOME_SECAO, NOME_TEMA, TEXTOS } from "@/lib/banda/conteudo";
import { calcularMusica, sugerirTitulos } from "@/lib/banda/motor";
import type { Musica } from "@/lib/banda/tipos";
import { bip } from "./sons";
import { useBanda, type Inicial } from "./useBanda";

const BASE = "/jogos/banda-de-garagem";
const T = TEXTOS.composicao;

function Opcoes({ legenda, nome, valores, rotulo, atual, onMudar }: { legenda: string; nome: string; valores: string[]; rotulo: (v: string) => string; atual: string; onMudar: (v: string) => void }) {
  return (
    <fieldset className="m-0 border-0 p-0">
      <legend className="mb-1 font-semibold">{legenda}</legend>
      <div className="flex flex-wrap gap-2">
        {valores.map((v) => (
          <label key={v} className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-[6px] border px-3 ${atual === v ? "border-accent" : "border-line"}`}>
            <input type="radio" name={nome} checked={atual === v} onChange={() => onMudar(v)} />
            <span>{rotulo(v)}</span>
            {atual === v && <span aria-hidden="true">✓</span>}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

/** Compor: estrutura, clima e tema; a música ganha nome (sugestões ou o seu) e nota. Gasta o dia. */
export function Compor({ inicial }: { inicial: Inicial }) {
  const b = useBanda(inicial);
  const idTitulo = useId();
  const [estrutura, setEstrutura] = useState<string>(ESTRUTURAS[0].id);
  const [clima, setClima] = useState<string>(CLIMAS[0].id);
  const [tema, setTema] = useState<string>(TEMAS[0]);
  const [titulo, setTitulo] = useState("");
  const [erro, setErro] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const [feita, setFeita] = useState<Musica | null>(null);
  const { prog } = b;

  const sugestoes = useMemo(() => (prog ? sugerirTitulos(prog, tema) : []), [prog, tema]);
  const previsao = useMemo(() => (prog ? calcularMusica(prog, estrutura, clima) : null), [prog, estrutura, clima]);

  if (!b.pronto) return <p className="text-areia">{TEXTOS.procurando}</p>;
  if (!prog) return <p className="m-0">{TEXTOS.semBanda} <Link href={BASE} className="text-accent underline">{TEXTOS.criarBanda}</Link></p>;

  if (feita) {
    return (
      <div className="surface-vidro flex flex-col gap-3 p-4" role="status">
        <span className="rotulo text-accent">{T.resultado}</span>
        <h2 className="m-0 text-2xl">{feita.titulo}</h2>
        <p className="m-0 font-ficha text-3xl">{TEXTOS.nota} {feita.nota}</p>
        <p className="m-0 text-areia">{feita.nota >= COMPOR.notaBoa ? `✓ ${T.boa}` : T.fraca}</p>
        <p className="m-0">{T.bpm}: <span className="font-ficha">{feita.bpm}</span> · {NOME_CLIMA[feita.clima]} · {NOME_TEMA[feita.tema]}</p>
        <p className="m-0 text-areia">{feita.estrutura.secoes.map((s) => NOME_SECAO[s.nome] ?? s.nome).join(" · ")}</p>
        <Link href={`${BASE}/semana`} className="botao-laranja inline-flex min-h-11 items-center self-start no-underline">{T.voltarSemana}</Link>
      </div>
    );
  }

  if (prog.dia >= BANDA.diasDeSemana) {
    return <p className="m-0">{T.semDia} <Link href={`${BASE}/semana`} className="text-accent underline">{T.voltarSemana}</Link></p>;
  }

  const compor = async () => {
    setOcupado(true);
    setErro("");
    const r = await b.compor({ estrutura, clima, tema, titulo });
    setOcupado(false);
    if (!r.ok) return setErro(r.erro);
    bip(659);
    if (r.musica) setFeita(r.musica);
  };

  return (
    <form className="surface-vidro flex flex-col gap-5 p-4 sm:p-6" onSubmit={(e) => { e.preventDefault(); void compor(); }}>
      <Opcoes legenda={T.estrutura} nome="estrutura" valores={ESTRUTURAS.map((e) => e.id)} rotulo={(v) => NOME_ESTRUTURA[v]} atual={estrutura} onMudar={setEstrutura} />
      <Opcoes legenda={T.clima} nome="clima" valores={CLIMAS.map((c) => c.id)} rotulo={(v) => NOME_CLIMA[v]} atual={clima} onMudar={setClima} />
      <Opcoes legenda={T.tema} nome="tema" valores={TEMAS} rotulo={(v) => NOME_TEMA[v]} atual={tema} onMudar={setTema} />

      <div className="flex flex-col gap-2">
        <label htmlFor={idTitulo} className="font-semibold">{T.nome}</label>
        <input id={idTitulo} value={titulo} maxLength={BANDA.tituloMax} onChange={(e) => setTitulo(e.target.value)} autoComplete="off" className="min-h-11 rounded-[6px] border border-line-strong bg-bg px-3 text-ink" />
        {sugestoes.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-areia">{T.sugestoes}:</span>
            {sugestoes.map((s) => <button key={s} type="button" className="botao-vidro min-h-11" onClick={() => setTitulo(s)}>{s}</button>)}
          </div>
        )}
      </div>

      {previsao && <p className="m-0 text-areia">{TEXTOS.nota}: <span className="font-ficha text-ink">{previsao.nota}</span> · {T.bpm} <span className="font-ficha text-ink">{previsao.bpm}</span></p>}
      {erro && <p className="m-0 text-danger" role="alert">{erro}</p>}

      <div className="flex flex-wrap gap-3">
        <button type="submit" className="botao-laranja min-h-11" disabled={ocupado || titulo.trim().length === 0}>{T.compor}</button>
        <Link href={`${BASE}/semana`} className="botao-vidro inline-flex min-h-11 items-center no-underline">{T.voltarSemana}</Link>
      </div>
    </form>
  );
}
