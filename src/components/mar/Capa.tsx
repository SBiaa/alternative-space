"use client";

import Link from "next/link";
import { T } from "@/lib/mar-sem-fim/textos";
import { MUNDO } from "@/lib/mar-sem-fim/conteudo";
import { AvisoConta, BASE } from "./Navegacao";
import { useMar } from "./MarProvider";

/** Arte da capa: o globo visto de lado, com a Espinha vermelha de polo a polo e a Corrente Anelar no equador. */
export function CapaArte() {
  const m = MUNDO;
  return (
    <svg viewBox="0 0 320 320" role="img" aria-label={T.capa.artaAlt} className="mx-auto w-full max-w-[360px]">
      <defs>
        <radialGradient id="ms-esfera" cx="38%" cy="32%" r="80%">
          <stop offset="0" stopColor={m.corrente.corBrilho} stopOpacity=".35" />
          <stop offset=".45" stopColor={m.planeta.corOceano} />
          <stop offset="1" stopColor={m.planeta.corFundo} />
        </radialGradient>
        <clipPath id="ms-corte"><circle cx="160" cy="160" r="140" /></clipPath>
      </defs>
      <circle cx="160" cy="160" r="150" fill={m.planeta.corAtmosfera} opacity=".12" />
      <circle cx="160" cy="160" r="140" fill="url(#ms-esfera)" />
      <g clipPath="url(#ms-corte)">
        <rect x="0" y="136" width="320" height="48" fill={m.corrente.cor} opacity=".8" />
        <rect x="0" y="96" width="320" height="34" fill={m.parados.cor} opacity=".9" />
        <rect x="0" y="190" width="320" height="34" fill={m.parados.cor} opacity=".9" />
        <path d="M156 20 Q132 160 156 300 L170 300 Q148 160 170 20 Z" fill={m.espinha.cor} />
        <path d="M160 24 Q140 160 160 296" fill="none" stroke={m.espinha.corRelevo} strokeWidth="2" opacity=".7" />
        <g fill={m.planeta.corIlha}>
          <circle cx="212" cy="156" r="4" /><circle cx="244" cy="166" r="4" /><circle cx="270" cy="152" r="4" />
        </g>
        <g fill={m.planeta.corIlhaPonto}>
          <circle cx="212" cy="156" r="1.8" /><circle cx="244" cy="166" r="1.8" /><circle cx="270" cy="152" r="1.8" />
        </g>
      </g>
      <circle cx="160" cy="160" r="140" fill="none" stroke="#ece3be" strokeOpacity=".35" strokeWidth="1.5" />
    </svg>
  );
}

export function CapaAcoes() {
  const { estado, pronto } = useMar();
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2.5">
        <Link href={estado ? `${BASE}/mundo` : `${BASE}/novo`} className="btn bg-laranja text-tinta no-underline" aria-disabled={!pronto}>
          {estado ? T.capa.continuar : T.capa.zarpar}
        </Link>
      </div>
      <AvisoConta />
    </div>
  );
}
