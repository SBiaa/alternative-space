import Link from "next/link";
import { site } from "@/config/site";

// Planeta com anel. O PNG da marca é azul-escuro e some no fundo novo.
export function Planeta({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 30 30" aria-hidden="true" className="shrink-0">
      <circle cx="15" cy="15" r="9" fill="#dd5d05" />
      <ellipse cx="15" cy="15" rx="14" ry="4" fill="none" stroke="#ece3be" strokeWidth="1.5" transform="rotate(-18 15 15)" />
    </svg>
  );
}

export function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} aria-label={`${site.name}, início`} className="flex min-w-0 items-center gap-2.5 py-1.5 text-creme no-underline">
      <Planeta />
      <span className="truncate text-[15px] font-semibold tracking-[-0.01em] sm:text-lg">{site.name}</span>
    </Link>
  );
}
