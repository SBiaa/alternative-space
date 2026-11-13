import Link from "next/link";
import { TEXTOS } from "@/lib/entrega/config";
import { implantesDe, recordeDe } from "@/lib/entrega/dados";

// Selo da cabine: melhor turno e implantes equipados. Sem turno gravado, não aparece.
export async function SeloEntrega({ userId }: { userId: string }) {
  const [recorde, implantes] = await Promise.all([recordeDe(userId).catch(() => null), implantesDe(userId).catch(() => [])]);
  if (!recorde) return null;
  const equipados = implantes.filter((i) => i.equipped);
  return (
    <section aria-labelledby="selo-entrega" className="surface-vidro flex flex-col gap-2 p-4">
      <h2 id="selo-entrega" className="m-0 text-lg font-semibold">
        <Link href="/jogos/entrega-na-chuva" className="text-creme">
          {TEXTOS.nome}
        </Link>
      </h2>
      <p className="m-0 font-ficha text-sm">
        {TEXTOS.recorde}: <strong>{recorde.creditsEarned}</strong> {TEXTOS.resultado.creditos.toLowerCase()} · {recorde.deliveries} {TEXTOS.resultado.entregas.toLowerCase()} ·{" "}
        {TEXTOS.resultado.sequencia.toLowerCase()}: {recorde.bestStreak}
      </p>
      {equipados.length > 0 && (
        <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
          {equipados.map((i) => (
            <li key={i.slug} className="rotulo rounded border border-creme/30 px-2 py-1">
              {i.name} {"◆".repeat(i.level)}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
