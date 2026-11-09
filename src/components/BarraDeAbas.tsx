"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ativo, type ItemMenu } from "@/lib/menu";

const logado: ItemMenu[] = [
  { label: "Base", href: "/conta", exato: true },
  { label: "Jogar", href: "/jogos", tambem: ["/quiz"] },
  { label: "Fichas", href: "/fichas" },
  { label: "Cabine", href: "/conta/editar" },
];

const publico: ItemMenu[] = [
  { label: "Início", href: "/" },
  { label: "Jogar", href: "/jogos", tambem: ["/quiz"] },
  { label: "Fichas", href: "/fichas" },
  { label: "Entrar", href: "/entrar", tambem: ["/cadastro"] },
];

// Abas fixas no pé da tela, só no celular. No computador o menu de cima já mostra tudo.
export function BarraDeAbas({ entrou }: { entrou: boolean }) {
  const path = usePathname();
  const itens = entrou ? logado : publico;
  return (
    <nav
      aria-label="Navegação da base"
      className="fixed inset-x-4 bottom-3.5 z-30 rounded-lg bg-espaco shadow-[0_-16px_24px_var(--color-espaco)] lg:hidden print:hidden"
      style={{ marginBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="grid grid-cols-4 rounded-lg border border-creme/18 bg-creme/8 p-1 text-xs font-medium">
        {itens.map((i) => {
          const atual = ativo(path, i);
          return (
            <Link
              key={i.href}
              href={i.href}
              aria-current={atual ? "page" : undefined}
              className={`rounded-md py-3 text-center no-underline ${atual ? "bg-laranja-claro text-noite" : "text-areia hover:text-creme"}`}
            >
              {i.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
