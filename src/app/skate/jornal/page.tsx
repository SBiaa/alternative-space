import type { Metadata } from "next";
import Link from "next/link";
import { getCidades } from "@/lib/skate/jornal";

export const metadata: Metadata = {
  title: "Jornal da cena · Skate Universe",
  description: "A história do skate em cada cidade, dos começos até hoje.",
};

export default function JornalPage() {
  const cidades = getCidades();
  return (
    <section className="px-4 pb-20 pt-10 sm:px-6">
      <div className="miolo flex flex-col gap-8">
        <header className="flex max-w-[640px] flex-col gap-3">
          <span className="etiqueta text-laranja-claro">Jornal da cena</span>
          <h1 className="h2 m-0 text-creme">Quem abriu caminho na sua cidade.</h1>
          <p className="m-0 text-areia">A história do skate local, dos começos até hoje.</p>
        </header>
        {cidades.length === 0 ? (
          <div className="surface-vidro flex max-w-[640px] flex-col gap-2 p-5">
            <p className="m-0 text-creme">As primeiras matérias estão sendo escritas.</p>
            <p className="m-0 text-areia">Conhece a história da cena da sua cidade? Chama a gente pra contar.</p>
          </div>
        ) : (
          <ul className="m-0 grid list-none gap-3 p-0 sm:grid-cols-2 lg:grid-cols-3">
            {cidades.map((c) => (
              <li key={c.slug}>
                <Link href={`/skate/jornal/${c.slug}`} className="surface-vidro flex h-full flex-col gap-2 p-5 text-creme no-underline hover:border-laranja-claro">
                  <span className="font-titulo text-2xl font-semibold">{c.nome}</span>
                  <span className="rotulo text-areia">
                    {c.total === 1 ? "1 matéria" : `${c.total} matérias`} · {c.de === c.ate ? c.de : `${c.de}–${c.ate}`}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
