import Link from "next/link";
import { TEXTOS } from "@/lib/laje/conteudo";
import { LAJE, planta } from "@/lib/laje/config";
import { lerLaje, plantaFavorita } from "@/lib/laje/dados";
import { relogio } from "@/lib/laje/tempo";
import { montarVisao } from "@/lib/laje/visao";
import { VasoSvg } from "./arte";
import "./laje.css";

/** Selo da cabine: miniatura da laje e a planta favorita. Sem laje, o bloco não aparece. */
export async function SeloLaje({ userId, link = true }: { userId: string; link?: boolean }) {
  const salva = await lerLaje(userId).catch(() => null);
  if (!salva) return null;
  const visao = montarVisao(salva.save, relogio());
  const fav = await plantaFavorita(userId).catch(() => null);
  const plantados = salva.save.vasos.filter((v) => v.planta).length;
  return (
    <section aria-labelledby="laje-verde" className="surface-vidro tema-laje flex flex-wrap items-center gap-x-8 gap-y-3 p-5">
      <div className="flex min-w-[180px] flex-1 flex-col gap-1">
        <span className="rotulo text-laranja-claro">{TEXTOS.cabineTitulo}</span>
        <h2 id="laje-verde" className="m-0 text-2xl font-bold">
          {TEXTOS.cabineFavorita}: {fav ? (planta(fav.planta)?.nome ?? fav.planta) : TEXTOS.cabineSemFavorita}
        </h2>
        {fav && <p className="m-0 font-ficha text-xs text-areia">{TEXTOS.cabineColheitas(fav.colheitas)}</p>}
        <p className="m-0 font-ficha text-xs text-areia">{TEXTOS.cabineVasos(plantados, LAJE.vasos)}</p>
        {link && (
          <Link href="/jogos/laje-verde" className="font-ficha text-[11px] uppercase text-creme underline">
            {TEXTOS.cabineLink}
          </Link>
        )}
      </div>
      <ul className="laje-chao m-0 grid w-[168px] list-none grid-cols-4 gap-1 rounded-md p-1.5" aria-hidden="true">
        {salva.save.vasos.map((v) => (
          <li key={v.slot} className="flex justify-center">
            <div className="origin-top scale-[0.55] [margin-bottom:-32px]">
              <VasoSvg nivel={v.nivel} planta={v.planta} fase={visao.infos[v.slot]?.fase ?? null} murcha={visao.infos[v.slot]?.murcha ?? false} />
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
