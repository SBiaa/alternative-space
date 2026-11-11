import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { Suspense } from "react";
import { Star } from "@/components/Star";
import { NovaSenhaForm } from "@/components/SenhaForm";
import { SENHA, mascararEmail } from "@/lib/tripulante";

export const metadata: Metadata = { title: "Nova senha", robots: { index: false } };

export default function Page() {
  return (
    <section className="secao !pt-16">
      <div className="mx-auto grid max-w-[1000px] items-start gap-10 md:grid-cols-[1fr_1.1fr]">
        <div className="relative flex flex-col gap-4">
          <span className="etiqueta text-azul">Tripulantes</span>
          <h1 className="font-titulo font-bold leading-[1] text-azul" style={{ fontSize: "clamp(2.4rem, 6vw, 4rem)" }}>
            Senha nova.
          </h1>
          <p className="text-lg leading-relaxed text-tinta">
            Se o e-mail tiver conta, o código já está chegando. Digita ele aqui junto com a senha nova.
          </p>
          <Star className="absolute -top-6 right-4 hidden md:block" />
        </div>
        <Suspense fallback={<div className="card h-[440px]" />}>
          <Conteudo />
        </Suspense>
      </div>
    </section>
  );
}

async function Conteudo() {
  const email = (await cookies()).get(SENHA)?.value;
  if (!email?.includes("@")) {
    return (
      <div className="card flex flex-col gap-4 p-7 sm:p-9">
        <p className="text-tinta">Esse pedido expirou ou já foi usado.</p>
        <div className="flex flex-wrap gap-3">
          <Link href="/entrar/esqueci" className="btn bg-laranja text-noite">Pedir código</Link>
          <Link href="/entrar" className="btn">Entrar</Link>
        </div>
      </div>
    );
  }
  return <NovaSenhaForm email={mascararEmail(email)} />;
}
