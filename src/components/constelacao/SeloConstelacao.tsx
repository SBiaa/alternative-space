import { TEXTOS } from "@/lib/constelacao/config";
import { seloDe } from "@/lib/constelacao/dados";
import { diaDe } from "@/lib/constelacao/dia";

// Selo da cabine: sequência atual e melhor. Quem nunca jogou não ganha o bloco; se o banco falhar, some sem derrubar a cabine.
export async function SeloConstelacao({ userId }: { userId: string }) {
  const s = await seloDe(userId, diaDe(new Date())).catch(() => null);
  if (!s) return null;
  const dias = TEXTOS.resultado.dias;
  return (
    <section aria-labelledby="constelacao" className="surface-vidro flex flex-col gap-2 p-4">
      <h2 id="constelacao" className="m-0 text-2xl font-semibold">{TEXTOS.cabine.titulo}</h2>
      <dl className="m-0 flex flex-wrap gap-x-8 gap-y-2">
        <div className="flex flex-col gap-0.5">
          <dt className="rotulo text-areia">{TEXTOS.cabine.atual}</dt>
          <dd className="m-0 font-ficha text-2xl">{dias(s.atual)}</dd>
        </div>
        <div className="flex flex-col gap-0.5">
          <dt className="rotulo text-areia">{TEXTOS.cabine.melhor}</dt>
          <dd className="m-0 font-ficha text-2xl">{dias(s.melhor)}</dd>
        </div>
      </dl>
    </section>
  );
}
