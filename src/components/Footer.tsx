import { site } from "@/config/site";
import { Planeta } from "./Logo";

export function Footer() {
  const { instagram, whatsapp, email } = site.links;
  const items = [
    instagram && { label: "Instagram", href: instagram },
    whatsapp && { label: "WhatsApp", href: whatsapp },
    email && { label: "E-mail", href: `mailto:${email}` },
  ].filter(Boolean) as { label: string; href: string }[];

  return (
    <footer className="relative border-t border-creme/15 px-6 pb-10 pt-9">
      <div className="miolo flex flex-wrap justify-between gap-6">
        <div className="flex flex-[1_1_280px] flex-col gap-2.5">
          <span className="flex items-center gap-2.5 text-lg font-semibold">
            <Planeta size={26} />
            {site.name}
          </span>
          <span className="text-sm text-areia">{site.tagline}</span>
        </div>
        {items.length > 0 && (
          <nav aria-label="Rodapé" className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
            {items.map((i) => (
              <a key={i.label} href={i.href} className="py-2.5 text-areia no-underline hover:text-creme">
                {i.label}
              </a>
            ))}
          </nav>
        )}
      </div>
    </footer>
  );
}
