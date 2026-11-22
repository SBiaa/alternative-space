import Link from "next/link";
import { connection } from "next/server";
import { capituloPublicado } from "@/lib/fanzine/carregar";
import { TEXTOS } from "@/lib/fanzine/config";
import { resolvidosDe } from "@/lib/fanzine/dados";

/** Selo da cabine: um por capítulo resolvido. Sem capítulo resolvido, o bloco não aparece. */
export async function SeloFanzine({ userId, link = true }: { userId: string; link?: boolean }) {
  await connection(); // a data de publicação depende da hora do pedido
  const resolvidos = await resolvidosDe(userId).catch(() => []);
  const selos = resolvidos.flatMap((r) => {
    const cap = capituloPublicado(r.slug);
    return cap ? [{ slug: r.slug, ordem: cap.ordem, nome: cap.selo.nome, descricao: cap.selo.descricao, titulo: cap.titulo }] : [];
  });
  if (selos.length === 0) return null;
  const T = TEXTOS.cabine;
  return (
    <section aria-labelledby="fanzine-perdida" className="surface-vidro flex flex-col gap-3 p-5">
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <h2 id="fanzine-perdida" className="m-0 text-2xl font-bold">
          {T.titulo}
        </h2>
        {link && (
          <Link href="/jogos/fanzine" className="font-ficha text-[11px] uppercase text-creme underline">
            {T.abrir}
          </Link>
        )}
      </div>
      <ul className="m-0 flex list-none flex-wrap gap-3 p-0">
        {selos.map((s) => (
          <li key={s.slug} className="flex min-w-[200px] flex-1 flex-col gap-1 rounded-md border border-creme/30 p-3">
            <span className="font-ficha text-[11px] uppercase text-areia">✓ {T.capitulo(s.ordem)}</span>
            <strong>{s.nome}</strong>
            <span className="text-sm text-areia">{s.titulo}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
