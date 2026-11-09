import type { Metadata } from "next";
import Link from "next/link";
import { cacheLife } from "next/cache";
import { Fliperama } from "@/components/Fliperama";
import { JogarAbas } from "@/components/JogarAbas";
import { JogoArte } from "@/components/JogoArte";
import { hrefJogo, jogoDaSemana } from "@/lib/jogos";

export const metadata: Metadata = {
  title: "Fliperama",
  description: "Joguinhos rápidos pra jogar no navegador, sem instalar nada.",
};

export default function Page() {
  return (
    <section className="px-4 pb-18 pt-5 sm:px-6 sm:pt-9">
      <div className="mx-auto flex max-w-[1240px] flex-col gap-5 sm:gap-7.5">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between sm:gap-4">
          <div className="flex flex-col gap-1 sm:gap-1.5">
            <span className="etiqueta text-[11px] text-laranja-claro sm:text-xs">Jogar</span>
            <h1 className="text-[28px] font-semibold leading-[1.05] tracking-[-0.02em] sm:text-[44px]">Fliperama</h1>
            <p className="hidden text-base text-areia sm:block">Joguinhos rápidos pra uma pausa na base.</p>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/jogos/ranking" className="btn border border-creme/35 bg-creme/8 !px-4 !py-2.75 !text-[15px] text-creme no-underline hover:bg-creme/16">Ranking</Link>
            <JogarAbas atual="fliperama" />
          </div>
        </div>
        <Destaque />
        <Fliperama />
      </div>
    </section>
  );
}

// Troca sozinho toda semana; o cache segura a página estática entre uma troca e outra.
async function Destaque() {
  "use cache";
  cacheLife("hours");
  const j = jogoDaSemana(new Date());
  return (
    <Link href={hrefJogo(j.slug)} className="painel flex overflow-hidden no-underline sm:flex-wrap">
      <JogoArte jogo={j} className="w-[120px] shrink-0 sm:min-h-[260px] sm:w-auto sm:flex-[1_1_420px]" />
      <div className="flex min-w-0 flex-1 flex-col justify-center gap-1 p-3.5 sm:flex-[1_1_360px] sm:gap-2.5 sm:p-[clamp(22px,3vw,40px)]">
        <span className="etiqueta text-[10px] text-azul sm:text-[11px]">Jogo da semana</span>
        <span className="text-[19px] font-bold leading-[1.1] tracking-[-0.015em] text-azul sm:text-[clamp(26px,2.8vw,36px)]">{j.nome}</span>
        <span className="text-[13px] leading-snug text-neutro sm:text-base sm:leading-relaxed sm:text-tinta">
          <span className="sm:hidden">{j.resumo}</span>
          <span className="hidden sm:inline">{j.texto}</span>
        </span>
        <span className="btn mt-1.5 self-start bg-laranja !px-3 !py-2 !text-sm text-noite sm:!px-5 sm:!py-3.25 sm:!text-base">Jogar agora</span>
      </div>
    </Link>
  );
}
