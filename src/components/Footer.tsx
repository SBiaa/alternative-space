import { site } from "@/config/site";

export function Footer() {
  const { discord, instagram, whatsapp, email } = site.links;
  const items = [
    discord && { label: "Discord", href: discord, text: discord.replace(/^https?:\/\//, "") },
    instagram && { label: "Instagram", href: instagram, text: instagram.replace(/^https?:\/\/(www\.)?instagram\.com\//, "@").replace(/\/$/, "") },
    whatsapp && { label: "WhatsApp", href: whatsapp, text: "Chamar no WhatsApp" },
    email && { label: "E-mail", href: `mailto:${email}`, text: email },
  ].filter(Boolean) as { label: string; href: string; text: string }[];

  return (
    <footer className="border-t-2 border-noite bg-azul px-6 py-12 text-creme">
      <div className="miolo flex flex-wrap items-start justify-between gap-7">
        <div className="flex flex-col gap-3">
          <span className="font-titulo text-[1.4rem] font-semibold">{site.name}</span>
          <span className="font-titulo text-xl">{site.tagline}</span>
        </div>
        {items.length > 0 && (
          <ul className="flex list-none flex-col gap-2 p-0 font-ficha text-sm">
            {items.map((i) => (
              <li key={i.label}>
                {i.label.toUpperCase()} ·{" "}
                <a href={i.href} className="text-creme underline">{i.text}</a>
              </li>
            ))}
          </ul>
        )}
      </div>
    </footer>
  );
}
