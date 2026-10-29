import type { Metadata } from "next";
import { home } from "@/lib/home";
import { PartnerForm } from "@/components/PartnerForm";

export const metadata: Metadata = {
  title: "Parceiros",
  description: "Revenda, afiliados e criadores: cresça com a Alternative Space.",
};

export default function PartnersPage() {
  return (
    <section className="secao">
      <div className="miolo flex flex-wrap gap-14">
        <div className="flex min-w-0 flex-[1_1_420px] flex-col gap-8">
          <div className="flex flex-col gap-3">
            <span className="etiqueta text-azul">Parceiros</span>
            <h1 className="h2 text-azul">Cresça com a gente.</h1>
            <p className="text-lg leading-relaxed text-tinta">
              Tem loja, canal ou comunidade própria? Dá pra revender, indicar ou criar peças com a sua marca.
            </p>
          </div>
          <ul className="flex list-none flex-col gap-4 p-0">
            {home.partners.map((p, i) => (
              <li key={p.title} className="flex gap-4">
                <span className="font-ficha text-2xl font-bold text-azul">{String(i + 1).padStart(2, "0")}</span>
                <div>
                  <h2 className="font-titulo text-2xl font-semibold">{p.title}</h2>
                  <p className="leading-normal text-tinta">{p.text}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
        <div className="min-w-0 flex-[1_1_380px]">
          <PartnerForm types={home.partners.map((p) => p.title)} />
        </div>
      </div>
    </section>
  );
}
