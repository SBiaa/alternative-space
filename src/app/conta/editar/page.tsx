import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { ApagarContaForm, PerfilForm, SenhaForm } from "@/components/PerfilForms";
import { getUser } from "@/lib/auth/server";
import { CORES, avataresDe, getPerfil } from "@/lib/perfil";
import { latestResults } from "@/lib/tripulante";

export const metadata: Metadata = { title: "Editar perfil", robots: { index: false } };

export default function Page() {
  return (
    <section className="secao !pt-16">
      <div className="miolo flex max-w-[760px] flex-col gap-8">
        <Link href="/conta" className="font-titulo text-lg font-bold text-azul">← Voltar pro diário</Link>
        <h1 className="font-titulo font-bold leading-[1] text-azul" style={{ fontSize: "clamp(2.2rem, 6vw, 3.4rem)" }}>Seu perfil</h1>
        <Suspense fallback={<p className="font-titulo text-2xl font-bold text-azul">Carregando…</p>}>
          <Editar />
        </Suspense>
      </div>
    </section>
  );
}

async function Editar() {
  const user = await getUser();
  if (!user) redirect("/entrar?next=/conta/editar");
  const [perfil, saved] = await Promise.all([getPerfil(user.id), latestResults(user.id)]);

  return (
    <>
      <PerfilForm name={user.name} apelido={perfil.apelido} cor={perfil.cor} image={user.image ?? null} avatares={avataresDe(saved)} cores={CORES} />
      <p className="font-ficha text-sm text-neutro">E-mail da conta: {user.email}</p>
      <SenhaForm />
      <ApagarContaForm />
    </>
  );
}
