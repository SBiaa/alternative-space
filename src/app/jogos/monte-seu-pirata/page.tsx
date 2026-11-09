import type { Metadata } from "next";
import { Suspense } from "react";
import { JogoPagina } from "@/components/JogoPagina";
import { MonteSeuPirata } from "@/components/MonteSeuPirata";
import { getUser } from "@/lib/auth/server";

export const metadata: Metadata = {
  title: "Monte seu Pirata",
  description: "Escolha chapéu, cicatriz, arma, roupa e bichinho de estimação. O pirata vira o avatar do seu perfil.",
};

export default function Page() {
  return (
    <JogoPagina
      slug="monte-seu-pirata"
      largo
      comoJogar={
        <p className="m-0">
          Lembra dos jogos de vestir bonequinho? Escolhe chapéu, cicatriz, arma, roupa e bichinho. Quando ficar do seu jeito, ele vira o avatar do seu perfil.
        </p>
      }
    >
      <Suspense fallback={<MonteSeuPirata logado={false} inicial={null} />}>
        <ComConta />
      </Suspense>
    </JogoPagina>
  );
}

async function ComConta() {
  const user = await getUser();
  return <MonteSeuPirata logado={Boolean(user)} inicial={user?.image ?? null} />;
}
