import { TEXTOS } from "@/lib/bichinho/config";
import { verPublico } from "@/lib/bichinho/dados";
import { JanelaBichinho } from "./JanelaBichinho";

// Cabine pública (/t/[usuario]): só mostra, não conta visita nem mexe nas barras. Sem bichinho, não aparece.
export async function BichinhoDaCabine({ userId, apelido }: { userId: string; apelido: string }) {
  const pet = await verPublico(userId).catch(() => null);
  if (!pet) return null;
  return (
    <section aria-labelledby="bic-cabine" className="flex flex-col gap-3">
      <h2 id="bic-cabine" className="m-0 text-2xl font-semibold">
        {TEXTOS.cabine.titulo(pet.nome)}
      </h2>
      <div className="w-full max-w-[280px]">
        <JanelaBichinho especie={pet.especie} fase={pet.fase} humor={pet.humor} nome={pet.nome} equipados={pet.equipados} maxLargura={280} />
      </div>
      <p className="m-0 font-ficha text-xs text-areia">
        {TEXTOS.faseRotulo}: {pet.fraseFase} · {TEXTOS.humor[pet.humor]} · @{apelido}
      </p>
    </section>
  );
}
