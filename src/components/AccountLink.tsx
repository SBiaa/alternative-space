import Link from "next/link";
import { getUser } from "@/lib/auth/server";
import { isAdminRole } from "@/lib/auth/admin";
import { Avatar } from "./Avatar";

const cls = "py-2.5 font-ficha text-sm uppercase tracking-wider text-noite no-underline hover:underline";

export function AccountLinkFallback() {
  return <Link href="/entrar" className={cls}>Entrar</Link>;
}

// Fica dentro de <Suspense> no cabeçalho: a sessão só existe na hora do pedido.
export async function AccountLink() {
  const user = await getUser();
  if (!user) return <AccountLinkFallback />;
  // Só decide se o link aparece. Quem protege o painel é requireAdmin(), que confere no banco.
  const admin = isAdminRole((user as { role?: unknown }).role);
  return (
    <>
      {admin && <Link href="/admin" className={cls}>Painel</Link>}
      <Link href="/conta" className={`${cls} inline-flex items-center gap-2`}>
        <Avatar name={user.name} image={user.image} size={28} />
        Meu diário <span className="sr-only">({user.name})</span>
      </Link>
    </>
  );
}
