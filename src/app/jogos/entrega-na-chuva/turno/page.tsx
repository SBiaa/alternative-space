import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { EntregaTurno } from "@/components/entrega/EntregaTurno";
import { getUser } from "@/lib/auth/server";
import { TEXTOS } from "@/lib/entrega/config";
import { equipadosDe } from "@/lib/entrega/dados";
import { aplicarImplantes } from "@/lib/entrega/regras";

export const metadata: Metadata = { title: `${TEXTOS.nome} · turno`, robots: { index: false } };

export default function Page() {
  return (
    <section className="bg-noite px-2 pb-6 pt-2 sm:px-4">
      <div className="mx-auto flex max-w-[1200px] flex-col gap-2">
        <Link href="/jogos/entrega-na-chuva" className="etiqueta text-[11px] text-laranja-claro no-underline max-[900px]:landscape:hidden">
          ← {TEXTOS.nome}
        </Link>
        <Suspense fallback={null}>
          <Jogo />
        </Suspense>
      </div>
    </section>
  );
}

// Sem conta: moto básica. Com conta: atributos com os implantes equipados.
async function Jogo() {
  const user = await getUser();
  const equipados = user ? await equipadosDe(user.id).catch(() => []) : [];
  return <EntregaTurno atributos={aplicarImplantes(equipados)} logado={Boolean(user)} />;
}
