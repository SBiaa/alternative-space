import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { FichaPathfinder } from "@/components/FichaPathfinder";
import { getUser } from "@/lib/auth/server";

export const metadata: Metadata = {
  title: "Ficha de Pathfinder 2e",
  description: "Monte seu personagem de Pathfinder 2ª edição do nível 1 ao 20: ancestralidade, classe, talentos, equipamento e magias, com tudo calculado.",
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
            Seu herói, do nível 1 ao 20.
          </h1>
          <p className="m-0 text-lg leading-relaxed text-areia">
            Ancestralidade, classe, talentos, equipamento e magias. A gente faz as contas de cada nível e avisa se faltar alguma coisa.
          </p>
        </div>
        <Suspense fallback={<FichaPathfinder />}>
          <ComConta />
        </Suspense>
      </div>
    </section>
  );
}

// Sem login a ficha fica no navegador; logado, aparece o botão de salvar na conta.
async function ComConta() {
  const user = await getUser();
  return <FichaPathfinder logado={Boolean(user)} />;
}
