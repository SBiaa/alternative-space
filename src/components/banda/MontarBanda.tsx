"use client";

import { useId, useMemo, useState } from "react";
import { gerarCandidatos } from "@/lib/banda/candidatos";
import { BANDA, ESTILOS, PAPEIS } from "@/lib/banda/config";
import { NOME_ESTILO, NOME_FORMA, NOME_PAPEL, TEXTOS } from "@/lib/banda/conteudo";
import type { Logo, Montagem, Papel } from "@/lib/banda/tipos";
import { CartaoIntegrante } from "./Cartao";
import { LogoBanda } from "./LogoBanda";

type Props = { seed: string; ocupado: boolean; erro: string; onCriar: (m: Montagem) => void; onCancelar: () => void };

/** Montar a banda em três passos: nome e estilo, logo, e um integrante por papel entre três candidatos. */
export function MontarBanda({ seed, ocupado, erro, onCriar, onCancelar }: Props) {
  const idNome = useId();
  const [passo, setPasso] = useState(0);
  const [nome, setNome] = useState("");
  const [estilo, setEstilo] = useState<string>(ESTILOS[0].id);
  const [logo, setLogo] = useState<Logo>({ forma: BANDA.logo.formas[0], corFundo: BANDA.logo.cores[0], corForma: BANDA.logo.cores[1] });
  const candidatos = useMemo(() => Object.fromEntries(PAPEIS.map((p) => [p, gerarCandidatos(seed, p)])) as Record<Papel, ReturnType<typeof gerarCandidatos>>, [seed]);
  const [escolhidos, setEscolhidos] = useState<Partial<Record<Papel, string>>>({});

  const nomeOk = nome.trim().length >= 1;
  const completo = PAPEIS.every((p) => escolhidos[p]);
  const pode = passo === 0 ? nomeOk : passo === 1 ? true : completo;
  const passos = [TEXTOS.passoNome, TEXTOS.passoLogo, TEXTOS.passoMembros];

  return (
    <form
      className="surface-vidro flex flex-col gap-5 p-4 sm:p-6"
      onSubmit={(e) => {
        e.preventDefault();
        if (passo < 2) return setPasso(passo + 1);
        if (completo) onCriar({ nome, estilo, logo, escolhidos: escolhidos as Record<Papel, string> });
      }}
    >
      <ol className="m-0 flex list-none flex-wrap gap-2 p-0" aria-label={TEXTOS.criarBanda}>
        {passos.map((t, i) => (
          <li key={t} aria-current={i === passo ? "step" : undefined} className={`rounded-[6px] border px-3 py-1 text-sm ${i === passo ? "border-accent text-accent" : "border-line text-areia"}`}>
            {i + 1}. {t}
          </li>
        ))}
      </ol>

      {passo === 0 && (
        <div className="flex flex-col gap-4">
          <label htmlFor={idNome} className="flex flex-col gap-1">
            <span>{TEXTOS.nomeBanda}</span>
            <input id={idNome} value={nome} maxLength={BANDA.nomeMax} onChange={(e) => setNome(e.target.value)} autoComplete="off" className="min-h-11 rounded-[6px] border border-line-strong bg-bg px-3 text-ink" />
          </label>
          <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
            <legend className="mb-1">{TEXTOS.estilo}</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {ESTILOS.map((e) => (
                <label key={e.id} className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-[6px] border px-3 ${estilo === e.id ? "border-accent" : "border-line"}`}>
                  <input type="radio" name="estilo" value={e.id} checked={estilo === e.id} onChange={() => setEstilo(e.id)} />
                  <span>{NOME_ESTILO[e.id]}</span>
                  {estilo === e.id && <span className="ml-auto text-sm text-accent">✓ {TEXTOS.escolhido}</span>}
                </label>
              ))}
            </div>
          </fieldset>
        </div>
      )}

      {passo === 1 && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <LogoBanda logo={logo} tamanho={96} />
            <strong className="text-xl">{nome.trim()}</strong>
          </div>
          <fieldset className="m-0 border-0 p-0">
            <legend className="mb-1">{TEXTOS.formaLogo}</legend>
            <div className="flex flex-wrap gap-2">
              {BANDA.logo.formas.map((f) => (
                <label key={f} className={`flex min-h-11 min-w-11 cursor-pointer items-center gap-2 rounded-[6px] border px-3 ${logo.forma === f ? "border-accent" : "border-line"}`}>
                  <input type="radio" name="forma" className="sr-only" checked={logo.forma === f} onChange={() => setLogo({ ...logo, forma: f })} />
                  <span>{NOME_FORMA[f]}</span>
                  {logo.forma === f && <span aria-hidden="true">✓</span>}
                </label>
              ))}
            </div>
          </fieldset>
          {(["corFundo", "corForma"] as const).map((campo) => (
            <fieldset key={campo} className="m-0 border-0 p-0">
              <legend className="mb-1">{campo === "corFundo" ? TEXTOS.corFundo : TEXTOS.corForma}</legend>
              <div className="flex flex-wrap gap-2">
                {BANDA.logo.cores.map((c, i) => (
                  <label key={c} className={`flex size-11 cursor-pointer items-center justify-center rounded-[6px] border-2 ${logo[campo] === c ? "border-accent" : "border-line"}`} style={{ background: c }}>
                    <input type="radio" name={campo} className="sr-only" checked={logo[campo] === c} onChange={() => setLogo({ ...logo, [campo]: c })} aria-label={`Cor ${i + 1}`} />
                    {logo[campo] === c && <span aria-hidden="true" className="rounded-[4px] bg-bg px-1 text-xs text-ink">✓</span>}
                  </label>
                ))}
              </div>
            </fieldset>
          ))}
        </div>
      )}

      {passo === 2 && (
        <div className="flex flex-col gap-5">
          {PAPEIS.map((p) => (
            <fieldset key={p} className="m-0 flex flex-col gap-2 border-0 p-0">
              <legend className="mb-1 font-semibold">{NOME_PAPEL[p]}</legend>
              <div className="grid gap-2">
                {candidatos[p].map((c) => {
                  const marcado = escolhidos[p] === c.id;
                  return (
                    <label key={c.id} className={`flex cursor-pointer flex-col gap-2 rounded-[6px] border p-3 ${marcado ? "border-accent" : "border-line"}`}>
                      <CartaoIntegrante m={c} />
                      <span className="flex items-center gap-2 text-sm">
                        <input type="radio" name={`papel-${p}`} checked={marcado} onChange={() => setEscolhidos({ ...escolhidos, [p]: c.id })} />
                        {marcado ? `✓ ${TEXTOS.escolhido}` : TEXTOS.escolher}
                      </span>
                    </label>
                  );
                })}
              </div>
            </fieldset>
          ))}
        </div>
      )}

      {erro && <p className="m-0 text-danger" role="alert">{erro}</p>}

      <div className="flex flex-wrap gap-3">
        <button type="button" className="botao-vidro min-h-11" onClick={() => (passo === 0 ? onCancelar() : setPasso(passo - 1))}>{passo === 0 ? TEXTOS.cancelar : TEXTOS.anterior}</button>
        <button type="submit" className="botao-laranja min-h-11" disabled={!pode || ocupado}>{passo < 2 ? TEXTOS.proximo : TEXTOS.criarBanda}</button>
      </div>
    </form>
  );
}
