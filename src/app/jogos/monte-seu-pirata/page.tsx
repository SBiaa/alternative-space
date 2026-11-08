import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { MonteSeuPirata } from "@/components/MonteSeuPirata";
import { getUser } from "@/lib/auth/server";

export const metadata: Metadata = {
  title: "Monte seu Pirata",
  description: "Escolha chapéu, cicatriz, arma, roupa e bichinho de estimação. O pirata vira o avatar do seu perfil.",
};

export default function Page() {
  return (
    <section className="secao !pt-12">
      <div className="miolo flex flex-col gap-8">
        <div className="flex flex-col gap-2">
          <Link href="/jogos" className="etiqueta text-azul no-underline hover:underline">← Jogos</Link>
          <h1 className="font-titulo font-bold leading-[1] text-azul" style={{ fontSize: "clamp(2.2rem, 5vw, 3.6rem)" }}>
            Monte seu Pirata
          </h1>
          <p className="max-w-[640px] text-lg leading-relaxed text-tinta">
            Lembra dos jogos de vestir bonequinho? Escolhe chapéu, cicatriz, arma, roupa e bichinho. Quando ficar do seu jeito, ele vira o avatar do seu perfil.
          </p>
        </div>
        <Suspense fallback={<MonteSeuPirata logado={false} inicial={null} />}>
          <ComConta />
        </Suspense>
      </div>
    </section>
  );
}

async function ComConta() {
  const user = await getUser();
  return <MonteSeuPirata logado={Boolean(user)} inicial={user?.image ?? null} />;
}
