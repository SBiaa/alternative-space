import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { LocalWizard } from "@/components/fichas/wizard/LocalWizard";
import { getUser } from "@/lib/auth/server";

export const metadata: Metadata = {
  title: "Ficha de Shadowrun",
  description: "Assistente passo a passo para criar personagens de Shadowrun 5ª edição pelo sistema de prioridades, pensado para iniciantes.",
};

// Sem login a ficha fica no navegador. Quem entra depois pode guardar ela na conta pela página /fichas.
export default function Page() {
  return (
    <LocalWizard
      account={
        <Suspense fallback={null}>
          <Conta />
        </Suspense>
      }
    />
  );
}

const link =
  "inline-flex items-center whitespace-nowrap rounded-md px-2 py-2 text-sm font-medium text-muted no-underline transition hover:bg-surface-2 hover:text-ink sm:px-3.5";

async function Conta() {
  const user = await getUser();
  if (user) {
    return (
      <Link href="/fichas" className={link}>
        Minhas fichas
      </Link>
    );
  }
  return (
    <Link href="/entrar?next=/fichas" className={link}>
      Entrar pra salvar
    </Link>
  );
}
