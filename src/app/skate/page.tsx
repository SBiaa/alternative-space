import type { Metadata } from "next";
import Link from "next/link";
import { getCidades } from "@/lib/skate/jornal";
import { getManobras } from "@/lib/skate/manobras";

export const metadata: Metadata = {
  title: "Skate Universe",
  description: "Guia de manobras do básico ao avançado, mapa de pistas, picos e skate shops em qualquer cidade e a história da cena local.",
};

export default function SkateHome() {
  const manobras = getManobras().length;
  const cidades = getCidades().length;
  const cards = [
    {
      href: "/skate/manobras",
      etiqueta: `${manobras} manobras`,
      titulo: "Guia de manobras",
      texto: "Do primeiro ollie ao tre flip: passo a passo, erros comuns e o que treinar antes.",
    },
    {
      href: "/skate/mapa",
      etiqueta: "qualquer cidade",
      titulo: "Mapa de picos",
      texto: "Pistas, picos de rua e skate shops perto de você. Achou um pico novo? Cadastra e dá o nome.",
    },
    {
      href: "/skate/jornal",
      etiqueta: cidades === 1 ? "1 cidade" : `${cidades} cidades`,
      titulo: "Jornal da cena",
      texto: "A história do skate em cada cidade, dos começos até hoje.",
    },
  ];
  return (
    <section className="px-4 pb-20 pt-10 sm:px-6 sm:pt-14">
      <div className="miolo flex flex-col gap-10">
        <header className="flex max-w-[640px] flex-col gap-3">
          <span className="etiqueta text-laranja-claro">Skate Universe</span>
          <h1 className="h2 m-0 text-creme">Tudo do skate num lugar só.</h1>
          <p className="m-0 text-lg text-areia">Aprende a manobra, acha o pico e conhece quem abriu caminho na sua cidade.</p>
        </header>
        <ul className="m-0 grid list-none gap-4 p-0 md:grid-cols-3">
          {cards.map((c) => (
            <li key={c.href}>
              <Link href={c.href} className="surface-vidro flex h-full flex-col gap-3 p-5 text-creme no-underline transition-colors hover:border-laranja-claro">
                <span className="rotulo text-laranja-claro">{c.etiqueta}</span>
                <span className="font-titulo text-2xl font-semibold">{c.titulo}</span>
                <span className="text-areia">{c.texto}</span>
                <span className="mt-auto pt-2 font-semibold text-laranja-claro">Abrir →</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
