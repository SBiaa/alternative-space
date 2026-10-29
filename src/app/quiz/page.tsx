import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Quiz" };

export default function Page() {
  return (
    <section className="secao">
      <div className="miolo flex flex-col items-start gap-5">
        <span className="etiqueta text-azul">Fase 2</span>
        <h1 className="h2 text-azul">Quiz chegando.</h1>
        <p className="text-lg">Essa parte ainda está sendo montada. Enquanto isso, passa na base.</p>
        <Link href="/" className="btn bg-laranja text-noite">Voltar pra home</Link>
      </div>
    </section>
  );
}
