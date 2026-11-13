import Link from "next/link";
import { site } from "@/config/site";
import { Planeta } from "./Logo";

type Item = { label: string; href: string };

function Coluna({ titulo, itens }: { titulo: string; itens: Item[] }) {
  if (itens.length === 0) return null;
  return (
    <nav aria-label={titulo} className="flex flex-col gap-1 text-[15px]">
      <span className="etiqueta mb-1 text-laranja-claro">{titulo}</span>
      {itens.map((i) =>
        i.href.startsWith("/") ? (
          <Link key={i.label} href={i.href} className="self-start py-1.5 text-areia no-underline hover:text-creme">{i.label}</Link>
        ) : (
          <a key={i.label} href={i.href} target={i.href.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer" className="self-start py-1.5 text-areia no-underline hover:text-creme">{i.label}</a>
        ),
      )}
    </nav>
  );
}

// Rodapé em colunas: marca, Explorar, Comunidade e Legal. Link vazio em site.ts some sozinho.
export function Footer() {
  const { instagram, whatsapp, email } = site.links;
  const comunidade = [
    instagram && { label: "Instagram", href: instagram },
    whatsapp && { label: "WhatsApp", href: whatsapp },
    email && { label: "E-mail", href: `mailto:${email}` },
    ...site.navMais,
  ].filter(Boolean) as Item[];

  return (
    <footer className="relative border-t border-creme/15 px-6">
      <div className="miolo grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-8 pb-10 pt-12">
        <div className="flex flex-col gap-2.5">
          <span className="flex items-center gap-2.5 text-[17px] font-bold">
            <Planeta size={28} />
            {site.name}
          </span>
          <span className="text-[15px] text-areia">{site.tagline}</span>
        </div>
        <Coluna titulo="Explorar" itens={site.nav} />
        <Coluna titulo="Comunidade" itens={comunidade} />
        <Coluna titulo="Legal" itens={site.legal} />
      </div>
    </footer>
  );
}
