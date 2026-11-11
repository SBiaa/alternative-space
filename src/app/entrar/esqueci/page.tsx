import type { Metadata } from "next";
import Link from "next/link";
import { Star } from "@/components/Star";
import { PedirCodigoForm } from "@/components/SenhaForm";

export const metadata: Metadata = { title: "Esqueci a senha", robots: { index: false } };

export default function Page() {
  return (
    <section className="secao !pt-16">
      <div className="mx-auto grid max-w-[1000px] items-start gap-10 md:grid-cols-[1fr_1.1fr]">
        <div className="relative flex flex-col gap-4">
          <span className="etiqueta text-azul">Tripulantes</span>
          <h1 className="font-titulo font-bold leading-[1] text-azul" style={{ fontSize: "clamp(2.4rem, 6vw, 4rem)" }}>
            Esqueceu a senha?
          </h1>
          <p className="text-lg leading-relaxed text-tinta">
            Acontece. Manda seu e-mail que a gente envia um código de 6 números pra você criar uma senha nova.
          </p>
          <Star className="absolute -top-6 right-4 hidden md:block" />
        </div>
        <div className="flex flex-col gap-4">
          <PedirCodigoForm />
          <p className="text-tinta">
            Lembrou?{" "}
            <Link href="/entrar" className="font-bold text-azul">Entrar</Link>
          </p>
        </div>
      </div>
    </section>
  );
}
