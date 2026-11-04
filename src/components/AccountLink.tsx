import Link from "next/link";
import { getUser } from "@/lib/auth/server";

const cls = "py-2.5 font-ficha text-sm uppercase tracking-wider text-noite no-underline hover:underline";

export function AccountLinkFallback() {
  return <Link href="/entrar" className={cls}>Entrar</Link>;
}

// Fica dentro de <Suspense> no cabeçalho: a sessão só existe na hora do pedido.
export async function AccountLink() {
  const user = await getUser();
  if (!user) return <AccountLinkFallback />;
  return (
    <Link href="/conta" className={cls}>
      Meu diário <span className="sr-only">({user.name})</span>
    </Link>
  );
}
