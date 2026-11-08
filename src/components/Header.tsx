import Link from "next/link";
import { Suspense } from "react";
import { Logo } from "./Logo";
import { Avatar } from "./Avatar";
import { Navegacao } from "./Navegacao";
import { site } from "@/config/site";
import { getUser } from "@/lib/auth/server";
import { isAdminRole } from "@/lib/auth/admin";

export function Header() {
  return (
    <header className="relative z-10 border-b border-creme/15 px-4 py-3 sm:px-6">
      <div className="mx-auto flex max-w-[1240px] items-center justify-between gap-x-3 gap-y-2 sm:gap-x-6">
        {/* A sessão só existe na hora do pedido; até lá, mostra a versão de quem não entrou. */}
        <Suspense fallback={<Publico />}>
          <ComSessao />
        </Suspense>
      </div>
    </header>
  );
}

function Publico() {
  return (
    <>
      <Logo />
      <Navegacao links={site.nav} logado={false} entrar>
        <Link href="/entrar" className="hidden px-2.5 py-3 text-[15px] font-medium text-creme no-underline hover:text-laranja-claro sm:inline-block">
          Entrar
        </Link>
        <Link href="/cadastro" className="btn bg-laranja !px-3 !py-3 !text-[15px] whitespace-nowrap text-noite sm:!px-3.5">
          Criar conta
        </Link>
      </Navegacao>
    </>
  );
}

async function ComSessao() {
  const user = await getUser();
  if (!user) return <Publico />;
  // Só decide se o link aparece. Quem protege o painel é requireAdmin(), que confere no banco.
  const admin = isAdminRole((user as { role?: unknown }).role);
  const links = [{ label: "Base", href: "/conta" }, ...site.nav, ...(admin ? [{ label: "Painel", href: "/admin" }] : [])];
  return (
    <>
      <Logo href="/conta" />
      <Navegacao links={links} logado entrar={false}>
        <Link href="/conta" aria-label={`Sua base (${user.name})`} className="flex items-center gap-2.5 py-1 text-creme no-underline">
          <span className="hidden max-w-[160px] truncate text-sm text-areia sm:inline">{user.name}</span>
          <Avatar name={user.name} image={user.image} size={40} />
        </Link>
      </Navegacao>
    </>
  );
}
