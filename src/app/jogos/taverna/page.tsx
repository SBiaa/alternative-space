import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { carregarTaverna } from "@/app/actions/taverna";
import { TavernaInicio } from "@/components/taverna/TavernaInicio";
import { EQUIPE, TAVERNA } from "@/lib/taverna/config";

export const metadata: Metadata = {
  title: "Taverna do Dragão Cansado",
  description: "Gestão de taverna: receba aventureiros, sirva, cobre e use o ouro das noites pra melhorar o salão, o cardápio e a equipe.",
};

export default function Page() {
  return (
    <section className="bg-lareira-madeira relative px-4 pb-18 pt-5 sm:px-6 sm:pt-9">
      <div className="mx-auto flex max-w-[720px] flex-col gap-5">
        <Link href="/jogos" className="etiqueta text-[11px] text-lareira-brasa no-underline sm:text-xs">← Fliperama</Link>
        <h1 className="m-0 text-[28px] font-semibold leading-[1.05] tracking-[-0.02em] sm:text-[44px]">{TAVERNA.textos.titulo}</h1>
        <p className="m-0 text-base text-areia">{TAVERNA.textos.chamada}</p>
        <ul className="m-0 flex list-none flex-col gap-1.5 p-0 text-creme">
          <li>Cada noite dura cerca de {Math.round(TAVERNA.noite.duracaoSeg / 60)} minutos, e dá pra pausar quando quiser.</li>
          <li>Acomode o grupo, anote o pedido, busque no balcão, sirva e cobre. Quem espera demais vai embora sem pagar.</li>
          <li>A cada {TAVERNA.guilda.dias} noites chega a taxa da guilda. Fechar a semana no azul é a meta.</li>
          <li>Com o ouro, troque a mobília, melhore as receitas e contrate {Object.values(EQUIPE).length} tipos de ajuda.</li>
        </ul>
        <Suspense fallback={<p className="text-areia">Procurando a taverna…</p>}>
          <Inicio />
        </Suspense>
        <p className="m-0 text-xs text-poeira">{TAVERNA.textos.avisoOuro}</p>
      </div>
    </section>
  );
}

async function Inicio() {
  return <TavernaInicio inicial={await carregarTaverna()} />;
}
