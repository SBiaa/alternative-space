import type { Metadata } from "next";
import Link from "next/link";
import { CorreInicio } from "@/components/corre/CorreInicio";
import { CORRE, reais, totalContas } from "@/lib/corre/config";

export const metadata: Metadata = {
  title: "O Corre",
  description: "Simulação de motoboy: escolha os pedidos, cuide da moto, do dinheiro e de você, e feche a semana com as contas pagas.",
};

export default function Page() {
  return (
    <section className="bg-ceu relative px-4 pb-18 pt-5 sm:px-6 sm:pt-9">
      <div className="mx-auto flex max-w-[720px] flex-col gap-5">
        <Link href="/jogos" className="etiqueta text-[11px] text-laranja-claro no-underline sm:text-xs">← Fliperama</Link>
        <h1 className="m-0 text-[28px] font-semibold leading-[1.05] tracking-[-0.02em] sm:text-[44px]">{CORRE.textos.titulo}</h1>
        <p className="m-0 text-base text-areia">{CORRE.textos.chamada}</p>
        <ul className="m-0 flex list-none flex-col gap-1.5 p-0 text-creme">
          <li>Semana de {CORRE.semana.diasTrabalho} dias de trabalho e 1 de folga.</li>
          <li>Contas da semana: <span className="font-ficha">{reais(totalContas())}</span>. Objetivo: {CORRE.objetivo.nome.toLowerCase()}.</li>
          <li>Recusar muito baixa a aceitação; aceitar tudo cansa e atrasa. Descansar e cuidar da moto compensa.</li>
          <li>Dá pra pausar a qualquer momento e ligar o ritmo tranquilo.</li>
        </ul>
        <CorreInicio />
        <p className="m-0 text-xs text-poeira">{CORRE.textos.avisoDinheiro}</p>
      </div>
    </section>
  );
}
