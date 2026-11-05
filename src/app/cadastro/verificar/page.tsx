import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { Suspense } from "react";
import { Star } from "@/components/Star";
import { VerifyForm } from "@/components/VerifyForm";
import { PENDENTE, lerPendente, mascararEmail } from "@/lib/tripulante";

export const metadata: Metadata = { title: "Confirmar e-mail", robots: { index: false } };

export default function Page() {
  return (
    <section className="secao !pt-16">
      <div className="mx-auto grid max-w-[1000px] items-start gap-10 md:grid-cols-[1fr_1.1fr]">
        <div className="relative flex flex-col gap-4">
          <span className="etiqueta text-azul">Cadastro de tripulante</span>
          <h1 className="font-titulo font-bold leading-[1] text-azul" style={{ fontSize: "clamp(2.4rem, 6vw, 4rem)" }}>
            Confere seu e-mail.
          </h1>
          <p className="text-lg leading-relaxed text-tinta">
            A gente mandou um código de 6 números. É só pra ter certeza de que o e-mail é seu.
          </p>
          <Star className="absolute -top-6 right-4 hidden md:block" />
        </div>
        <Suspense fallback={<div className="card h-[360px]" />}>
          <Conteudo />
        </Suspense>
      </div>
    </section>
  );
}

async function Conteudo() {
  const p = lerPendente((await cookies()).get(PENDENTE)?.value);
  if (!p) {
    return (
      <div className="card flex flex-col gap-4 p-7 sm:p-9">
        <p className="text-tinta">Esse pedido expirou ou já foi usado.</p>
        <div className="flex flex-wrap gap-3">
          <Link href="/cadastro" className="btn bg-laranja text-noite">Fazer cadastro</Link>
          <Link href="/entrar" className="btn">Entrar</Link>
        </div>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-4">
      <VerifyForm email={mascararEmail(p.email)} />
      <p className="text-tinta">
        Esse e-mail já tinha conta?{" "}
        <Link href={`/entrar?next=${encodeURIComponent(p.next)}`} className="font-bold text-azul">Entrar</Link>
      </p>
    </div>
  );
}
