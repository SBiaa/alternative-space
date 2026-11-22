import type { Metadata } from "next";
import Link from "next/link";
import { COLUNA, LINK_VOLTAR, MESA, PAPEL } from "@/components/bolso/tema";
import { ATRIBUTOS, BASE, FAIXAS, REGRAS, TEXTOS } from "@/lib/bolso/config";
import { textoDaConta } from "@/lib/bolso/regras";

// A conta de exemplo sai da mesma função que explica as rolagens de verdade.
const EXEMPLO = textoDaConta({ n: 1, dados: [3, 4], soma: 7, atributo: "mente", valorAtributo: 2, bonusTalento: 0, total: 9, dificuldade: 8, faixa: "sucesso" });

export const metadata: Metadata = {
  title: "Como jogar · Mesa de Bolso",
  description: "As regras da Mesa de Bolso: atributos, talentos, testes de dados e Fôlego.",
};

export default function Page() {
  return (
    <section className={MESA}>
      <div className={COLUNA}>
        <Link href={BASE} className={LINK_VOLTAR}>← {TEXTOS.titulo}</Link>
        <h1 className="m-0 text-[28px] font-semibold leading-[1.05] tracking-[-0.02em] sm:text-[40px]">Como jogar</h1>
        <div className={`${PAPEL} flex flex-col gap-3`}>
          {TEXTOS.comoJogar.map((t) => (
            <p key={t} className="m-0">{t}</p>
          ))}
        </div>

        <div className={`${PAPEL} flex flex-col gap-3`}>
          <h2 className="m-0 text-xl font-semibold">Os três atributos</h2>
          <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
            {ATRIBUTOS.map((a) => (
              <li key={a.id}>
                <strong>{a.nome}.</strong> {a.dica}
              </li>
            ))}
          </ul>
          <p className="m-0 text-sm">
            Cada atributo vai de {REGRAS.atributoMin} a {REGRAS.atributoMax}, somando {REGRAS.atributoPontos} pontos. Você começa com {REGRAS.folegoInicial} de Fôlego e escolhe {REGRAS.talentosEscolhidos} talentos.
          </p>
        </div>

        <div className={`${PAPEL} flex flex-col gap-3`}>
          <h2 className="m-0 text-xl font-semibold">O resultado de um teste</h2>
          <dl className="m-0 flex flex-col gap-2">
            {(["sucesso", "custo", "falha"] as const).map((f) => (
              <div key={f}>
                <dt className="font-semibold">{FAIXAS[f].rotulo}</dt>
                <dd className="m-0">{FAIXAS[f].explica}</dd>
              </div>
            ))}
          </dl>
          <p className="m-0 font-ficha text-sm">{EXEMPLO}</p>
          <p className="m-0 text-sm">É assim que a conta aparece na tela depois de cada rolagem.</p>
        </div>

        <Link href={BASE} className="btn bg-laranja min-h-11 self-start text-noite">Escolher uma aventura</Link>
      </div>
    </section>
  );
}
