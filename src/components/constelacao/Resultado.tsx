"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CAMINHOS, PARTIDA, TEXTOS } from "@/lib/constelacao/config";
import { textoCompartilhar, urlDaImagem } from "@/lib/constelacao/compartilhar";
import { formatarContagem } from "@/lib/constelacao/dia";
import type { Estado } from "@/lib/constelacao/retorno";
import type { EstadoDoDia } from "@/lib/constelacao/servico";
import { caminhoEstrela } from "./Estrela";

const t = TEXTOS.resultado;

// Linhas de constelação: liga, na ordem de leitura, as estrelas acesas (as certas) da partida.
function Constelacao({ retornos }: { retornos: Estado[][] }) {
  const cols = retornos[0]?.length ?? 5;
  const passoX = 44;
  const passoY = 36;
  const w = cols * passoX;
  const h = retornos.length * passoY;
  const pt = (i: number, j: number) => ({ x: passoX / 2 + j * passoX, y: passoY / 2 + i * passoY });
  const acesas: { x: number; y: number }[] = [];
  retornos.forEach((linha, i) => linha.forEach((e, j) => e === "certa" && acesas.push(pt(i, j))));
  const resumo = retornos.map((l, i) => `${TEXTOS.linha(i + 1)}: ${l.filter((e) => e === "certa").length} certas`).join(". ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} role="img" aria-label={`${t.constelacao}. ${resumo}`} className="mx-auto h-auto w-full max-w-[320px]">
      {acesas.slice(1).map((p, k) => (
        <line key={k} x1={acesas[k].x} y1={acesas[k].y} x2={p.x} y2={p.y} strokeWidth={1.5} className="stroke-carta-linha" opacity={0.7} />
      ))}
      {retornos.map((linha, i) =>
        linha.map((e, j) => {
          const { x, y } = pt(i, j);
          if (e === "certa") return <path key={`${i}-${j}`} d={caminhoEstrela(x, y, 8)} className="fill-carta-estrela stroke-noite" strokeWidth={1} />;
          if (e === "outro") return <path key={`${i}-${j}`} d={caminhoEstrela(x, y, 6)} className="fill-none stroke-carta-estrela" strokeWidth={1.2} strokeDasharray="2 2" />;
          return <circle key={`${i}-${j}`} cx={x} cy={y} r={1.6} className="fill-creme/25" />;
        }),
      )}
    </svg>
  );
}

function Contagem({ proximoEm }: { proximoEm: number }) {
  const [restante, setRestante] = useState(proximoEm);
  useEffect(() => {
    // Parte do horário do servidor, não do relógio do aparelho.
    const fim = Date.now() + proximoEm;
    const id = setInterval(() => {
      const r = fim - Date.now();
      setRestante(Math.max(0, r));
      if (r <= 0) {
        clearInterval(id);
        window.location.reload();
      }
    }, 1000);
    return () => clearInterval(id);
  }, [proximoEm]);
  return (
    <p className="m-0 text-areia">
      {t.proximo} <span className="font-ficha text-lg text-creme" role="timer">{formatarContagem(restante)}</span>
    </p>
  );
}

export function Resultado({ estado }: { estado: EstadoDoDia }) {
  const p = estado.partida;
  const [aviso, setAviso] = useState("");
  const [texto, setTexto] = useState<string | null>(null);
  // Só depois de montar: o servidor não sabe se o aparelho tem o compartilhar nativo.
  const [nativo, setNativo] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNativo("share" in navigator);
  }, []);
  if (!p?.finalizada) return null;

  const montar = () =>
    textoCompartilhar({ dia: estado.dia, solved: p.solved, retornos: p.retornos, url: `${window.location.origin}${CAMINHOS.jogo}` });

  async function compartilhar() {
    const txt = montar();
    try {
      if (navigator.share) {
        await navigator.share({ text: txt });
        return;
      }
      await navigator.clipboard.writeText(txt);
      setAviso(t.copiado);
      setTexto(null);
    } catch (e) {
      if ((e as Error)?.name === "AbortError") return;
      setAviso(t.naoCopiou);
      setTexto(txt);
    }
  }

  const d = estado.distribuicao;
  const maior = d ? Math.max(1, ...d.porTentativa, d.falhas) : 1;
  const botao = "btn border border-creme/35 bg-creme/8 !px-4 !py-2.75 !text-[15px] text-creme no-underline hover:bg-creme/16";

  return (
    <section aria-labelledby="resultado" className="surface-vidro flex flex-col gap-4 p-4 sm:p-5">
      <div className="flex flex-col gap-1">
        <h2 id="resultado" className="m-0 text-2xl font-semibold" aria-live="polite">
          {p.solved ? t.acertou(p.tentativas) : t.errou}
        </h2>
        {!p.solved && p.resposta && <p className="m-0 text-areia">{t.resposta(p.resposta)}</p>}
      </div>

      <Constelacao retornos={p.retornos} />

      <dl className="m-0 grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-0.5">
          <dt className="rotulo text-areia">{`${t.sequencia} · ${t.sequenciaAtual}`}</dt>
          <dd className="m-0 font-ficha text-2xl text-creme">{t.dias(estado.sequencia.current)}</dd>
        </div>
        <div className="flex flex-col gap-0.5">
          <dt className="rotulo text-areia">{`${t.sequencia} · ${t.melhor}`}</dt>
          <dd className="m-0 font-ficha text-2xl text-creme">{t.dias(estado.sequencia.best)}</dd>
        </div>
      </dl>

      {d && (
        <div className="flex flex-col gap-1.5">
          <h3 className="m-0 text-base font-semibold">{t.distribuicao}</h3>
          <ul className="m-0 flex list-none flex-col gap-1 p-0">
            {d.porTentativa.map((n, i) => (
              <li key={i} className="flex items-center gap-2 text-sm" aria-label={t.distribuicaoItem(i + 1, n)}>
                <span aria-hidden="true" className="w-4 font-ficha text-areia">{i + 1}</span>
                <span aria-hidden="true" className={`h-4 rounded-sm ${p.solved && p.tentativas === i + 1 ? "bg-carta-estrela" : "bg-creme/25"}`} style={{ width: `${Math.max(4, (n / maior) * 100)}%` }} />
                <span aria-hidden="true" className="font-ficha text-areia">{n}</span>
              </li>
            ))}
            <li className="flex items-center gap-2 text-sm" aria-label={`${t.falhas}: ${d.falhas}`}>
              <span aria-hidden="true" className="w-4 font-ficha text-areia">×</span>
              <span aria-hidden="true" className="h-4 rounded-sm bg-creme/15" style={{ width: `${Math.max(4, (d.falhas / maior) * 100)}%` }} />
              <span aria-hidden="true" className="font-ficha text-areia">{d.falhas}</span>
            </li>
          </ul>
        </div>
      )}

      <Contagem proximoEm={estado.proximoEm} />

      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={compartilhar} className={`${botao} cursor-pointer`}>
          {nativo ? t.compartilhar : t.copiar}
        </button>
        <a href={urlDaImagem({ dia: estado.dia, solved: p.solved, retornos: p.retornos })} download="constelacao-do-dia.png" className={botao}>
          {t.imagem}
        </a>
        <span role="status" className="text-sm text-areia">{aviso}</span>
      </div>
      {texto && <textarea readOnly value={texto} rows={PARTIDA.tentativas + 2} className="w-full rounded-md border border-creme/25 bg-noite/40 p-2 font-ficha text-sm text-creme" aria-label={t.compartilhar} />}

      {!estado.logado && (
        <div className="flex flex-col gap-1 border-t border-creme/15 pt-3">
          <Link href={CAMINHOS.cadastro} className="btn w-fit bg-laranja-claro !px-4 !py-2.75 !text-[15px] text-noite no-underline">
            {TEXTOS.conta.texto}
          </Link>
          <p className="m-0 text-sm text-areia">{TEXTOS.conta.detalhe}</p>
        </div>
      )}
    </section>
  );
}
