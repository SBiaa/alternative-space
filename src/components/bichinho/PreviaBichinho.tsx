import Link from "next/link";
import { ESPECIES, TEXTOS } from "@/lib/bichinho/config";
import { JanelaBichinho } from "./JanelaBichinho";

// Sem login: uma prévia do bichinho e o convite pra criar conta. Não grava nada.
export function PreviaBichinho() {
  const e = ESPECIES[0];
  return (
    <section aria-labelledby="bic-previa" className="bic-card flex flex-col items-center gap-4 p-5 text-center sm:flex-row sm:text-left">
      <div className="w-full max-w-[240px]">
        <JanelaBichinho especie={e.slug} fase={1} humor="feliz" nome={e.nome} maxLargura={240} />
      </div>
      <div className="flex flex-col items-center gap-3 sm:items-start">
        <h2 id="bic-previa" className="m-0 text-2xl font-semibold">
          {TEXTOS.previa.titulo}
        </h2>
        <p className="m-0 text-areia">{TEXTOS.previa.texto}</p>
        <Link href="/cadastro" className="bic-btn inline-flex items-center no-underline">
          {TEXTOS.previa.botao}
        </Link>
      </div>
    </section>
  );
}
