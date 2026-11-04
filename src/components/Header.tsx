import Link from "next/link";
import { Suspense } from "react";
import { Logo } from "./Logo";
import { AccountLink, AccountLinkFallback } from "./AccountLink";
import { site, joinHref } from "@/config/site";

export function Header() {
  return (
    <header className="border-b-2 border-noite bg-creme px-6 py-4">
      <div className="miolo flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
        <Logo />
        <nav
          aria-label="Principal"
          className="order-3 flex flex-1 basis-full flex-wrap justify-center gap-x-5 gap-y-1 font-ficha text-sm uppercase tracking-wider md:order-2 md:basis-auto"
        >
          {site.nav.map((n) => (
            <Link key={n.href} href={n.href} className="py-2.5 text-noite no-underline hover:underline">
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="order-2 flex items-center gap-5 md:order-3">
          <Suspense fallback={<AccountLinkFallback />}>
            <AccountLink />
          </Suspense>
          <a href={joinHref} className="btn bg-laranja text-noite !px-5 !py-3 !text-[1.05rem] !shadow-duro-sm">
            Receber novidades
          </a>
        </div>
      </div>
    </header>
  );
}
