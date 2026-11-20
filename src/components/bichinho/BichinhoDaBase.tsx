import Link from "next/link";
import { TEXTOS } from "@/lib/bichinho/config";
import { abrirBase } from "@/lib/bichinho/dados";
import { JanelaBichinho } from "./JanelaBichinho";

// Bloco da base (/conta): a janela com o bichinho do tripulante logado. Abrir a base conta a visita do dia.
export async function BichinhoDaBase({ userId }: { userId: string }) {
  const pet = await abrirBase(userId).catch((e) => {
    console.error("bichinho (base):", e);
    return null;
  });
  if (!pet) {
    return (
      <section aria-labelledby="bic-base" className="bic-card flex flex-wrap items-center justify-between gap-3 p-4">
        <h2 id="bic-base" className="m-0 text-lg font-semibold">
          {TEXTOS.titulo}
        </h2>
        <Link href="/conta/bichinho" className="bic-btn inline-flex items-center no-underline">
          {TEXTOS.ovo.titulo}
        </Link>
      </section>
    );
  }
  return (
    <section aria-labelledby="bic-base" className="bic-card flex flex-wrap items-center gap-4 p-4">
      <div className="w-[140px] shrink-0">
        <JanelaBichinho especie={pet.especie} fase={pet.fase} humor={pet.humor} nome={pet.nome} equipados={pet.equipados} maxLargura={140} />
      </div>
      <div className="flex min-w-0 flex-[1_1_200px] flex-col gap-2">
        <h2 id="bic-base" className="m-0 text-lg font-semibold">
          {pet.nome}
        </h2>
        <p className="m-0 text-sm text-areia">{pet.voltou ? TEXTOS.boasVindas : pet.frase}</p>
        <Link href="/conta/bichinho" className="bic-btn-sec inline-flex w-fit items-center no-underline">
          {TEXTOS.base.ver}
        </Link>
      </div>
    </section>
  );
}
