import type { Metadata } from "next";
import { Suspense, type ReactNode } from "react";
import { carregarMar } from "@/app/actions/mar-sem-fim";
import { MarProvider } from "@/components/mar/MarProvider";
import { T } from "@/lib/mar-sem-fim/textos";

export const metadata: Metadata = {
  title: { default: T.meta.titulo, template: `%s · ${T.meta.titulo}` },
  description: T.meta.descricao,
};

// O estado do pirata (conta ou aparelho) vive aqui e sobrevive à troca de tela dentro do jogo.
export default function Layout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<p className="px-4 py-10 text-center text-areia">{T.mundo.carregando}</p>}>
      <Carregador>{children}</Carregador>
    </Suspense>
  );
}

async function Carregador({ children }: { children: ReactNode }) {
  return <MarProvider inicial={await carregarMar()}>{children}</MarProvider>;
}
