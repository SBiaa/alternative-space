"use client";

import { usePathname } from "next/navigation";
import { Suspense, type ReactNode } from "react";

// Lê o endereço da página dentro de um <Suspense>. Fora dele, o Next não consegue pré-renderizar
// páginas com endereço dinâmico (ex.: /fichas/<id>) e o build falha. Até o endereço chegar,
// desenha com caminho vazio (nada destacado).
export function ComCaminho({ render }: { render: (path: string) => ReactNode }) {
  return (
    <Suspense fallback={render("")}>
      <Ler render={render} />
    </Suspense>
  );
}

function Ler({ render }: { render: (path: string) => ReactNode }) {
  return render(usePathname());
}
