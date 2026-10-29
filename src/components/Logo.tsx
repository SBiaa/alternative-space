import Image from "next/image";
import Link from "next/link";
import { site } from "@/config/site";

export function Logo() {
  return (
    <Link href="/" aria-label={`${site.name}, início`} className="flex">
      <Image src="/logo300x.png" alt={site.name} width={1888} height={582} priority className="h-auto w-[150px] md:w-[170px]" />
    </Link>
  );
}
