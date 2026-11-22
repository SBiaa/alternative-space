"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITENS = [
  { href: "/skate", label: "Início", exato: true },
  { href: "/skate/manobras", label: "Manobras" },
  { href: "/skate/mapa", label: "Mapa", tambem: ["/skate/picos"] },
  { href: "/skate/jornal", label: "Jornal" },
];

const dentro = (p: string, h: string) => p === h || p.startsWith(`${h}/`);

// Abas do módulo, no topo de todas as páginas de /skate.
export function NavSkate() {
  const path = usePathname();
  return (
    <nav aria-label="Skate Universe" className="border-b line-sutil">
      <div className="miolo flex items-center gap-1 overflow-x-auto px-4 sm:px-6">
        <span className="etiqueta mr-3 whitespace-nowrap py-3 text-laranja-claro">Skate Universe</span>
        {ITENS.map((i) => {
          const ativo = i.exato ? path === i.href : [i.href, ...(i.tambem ?? [])].some((h) => dentro(path, h));
          return (
            <Link
              key={i.href}
              href={i.href}
              aria-current={ativo ? "page" : undefined}
              className={`whitespace-nowrap border-b-2 px-3 py-3 text-[15px] no-underline ${ativo ? "border-laranja text-creme" : "border-transparent text-areia hover:text-creme"}`}
            >
              {i.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
