import type { Metadata } from "next";
import Link from "next/link";
import { FichaPathfinder } from "@/components/FichaPathfinder";

export const metadata: Metadata = {
  title: "Ficha de Pathfinder 2e",
  description: "Monte seu personagem de Pathfinder 2ª edição passo a passo: ancestralidade, antecedente, classe, atributos e perícias, com tudo calculado.",
};

export default function Page() {
  return (
    <section className="secao !pt-12">
      <div className="miolo flex flex-col gap-8">
        <div className="no-print flex max-w-[760px] flex-col gap-3">
          <Link href="/fichas" className="link-ficha text-sm">
            ← Fichas
          </Link>
          <span className="etiqueta text-laranja-claro">Pathfinder 2ª edição</span>
          <h1 className="font-titulo font-bold leading-[1] text-creme" style={{ fontSize: "clamp(2.2rem, 5.5vw, 3.8rem)" }}>
            Seu herói, nível 1.
          </h1>
          <p className="m-0 text-lg leading-relaxed text-areia">
            Seis passos. A gente soma os boosts, calcula PV, CA, salvamentos e perícias, e avisa se faltar alguma coisa.
          </p>
        </div>
        <FichaPathfinder />
      </div>
    </section>
  );
}
