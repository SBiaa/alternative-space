import type { Metadata } from "next";
import Link from "next/link";
import { SugestaoDrop } from "@/components/SugestaoDrop";

export const metadata: Metadata = { title: "Próximo drop" };

export default function Page() {
  return (
    <section className="secao">
      <div className="miolo flex flex-col items-start gap-5">
        <span className="etiqueta text-azul">Próximo drop</span>
        <h1 className="h2 text-azul">Você escolhe o que vem aí.</h1>
        <p className="text-lg">A votação das opções ainda está sendo montada. Enquanto isso, conta o que você quer ver na próxima coleção.</p>
        <SugestaoDrop />
        <Link href="/" className="link-ficha">Voltar pra home</Link>
      </div>
    </section>
  );
}
