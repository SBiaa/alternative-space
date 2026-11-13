"use client";

import Link from "next/link";
import { estrelas, type Partida } from "@/lib/riff/regras";

export type EstadoSalvar =
  | { tipo: "salvando" }
  | { tipo: "salvo"; recorde: boolean }
  | { tipo: "erro"; texto: string }
  | { tipo: "semConta" };

function Estrelas({ n }: { n: number }) {
  return (
    <p className="m-0 flex items-center gap-1" aria-label={`${n} de 5 estrelas`}>
      {Array.from({ length: 5 }, (_, i) => (
        <svg key={i} viewBox="-12 -12 24 24" className="size-7" aria-hidden="true">
          <path
            d={ESTRELA}
            fill={i < n ? "#dd5d05" : "none"}
            stroke={i < n ? "#dd5d05" : "#5a5a5a"}
            strokeWidth={1.5}
          />
        </svg>
      ))}
    </p>
  );
}

// Mesmo desenho da nota do canvas (estrela de quatro pontas), em SVG.
const ESTRELA = "M0 -10 Q0 0 10 0 Q0 0 0 10 Q0 0 -10 0 Q0 0 0 -10Z";

export function RiffResultado({
  partida,
  titulo,
  dificuldade,
  salvar,
  cadastroHref,
  onDeNovo,
}: {
  partida: Partida;
  titulo: string;
  dificuldade: string;
  salvar: EstadoSalvar;
  cadastroHref: string;
  onDeNovo: () => void;
}) {
  const n = estrelas(partida.accuracy);
  const linhas: [string, string][] = [
    ["Precisão", `${partida.accuracy.toLocaleString("pt-BR")}%`],
    ["Maior combo", String(partida.maxCombo)],
    ["Perfeito", String(partida.perfect)],
    ["Boa", String(partida.good)],
    ["Passou", String(partida.miss)],
  ];
  return (
    <section aria-labelledby="riff-resultado" className="surface-creme mx-auto flex w-full max-w-[440px] flex-col gap-4 p-5 text-tinta sm:p-6">
      <div className="flex flex-col gap-1">
        <span className="font-ficha text-xs uppercase tracking-wider text-neutro">
          {titulo} · {dificuldade}
        </span>
        <h2 id="riff-resultado" className="m-0 text-2xl font-semibold text-azul">Fim da partida</h2>
      </div>
      <Estrelas n={n} />
      <p className="m-0 font-ficha text-4xl font-bold text-tinta">{partida.score.toLocaleString("pt-BR")}</p>
      <dl className="m-0 grid grid-cols-2 gap-x-4 gap-y-1.5 font-ficha text-sm">
        {linhas.map(([k, v]) => (
          <div key={k} className="contents">
            <dt className="text-neutro">{k}</dt>
            <dd className="m-0 text-right font-bold text-tinta">{v}</dd>
          </div>
        ))}
      </dl>
      <div role="status" className="text-sm">
        {salvar.tipo === "salvando" && <p className="m-0 text-neutro">Guardando na cabine…</p>}
        {salvar.tipo === "salvo" && <p className="m-0 text-tinta">{salvar.recorde ? "Novo recorde guardado na cabine!" : "Partida guardada na cabine."}</p>}
        {salvar.tipo === "erro" && <p className="m-0 text-estrela">{salvar.texto}</p>}
        {salvar.tipo === "semConta" && (
          <Link href={cadastroHref} className="btn w-full justify-center no-underline">
            Crie sua conta pra guardar seu recorde na cabine
          </Link>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={onDeNovo} className="btn-contorno flex-1">
          Jogar de novo
        </button>
        <Link href="/jogos/riff-estelar" className="btn-contorno flex-1 justify-center no-underline">
          Outras músicas
        </Link>
      </div>
    </section>
  );
}
