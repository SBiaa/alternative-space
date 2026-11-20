import { BARRAS, MECANICA, TEXTOS, type Stats } from "@/lib/bichinho/config";
import "./bichinho.css";

// Três barras com ícone, número e texto (Space Mono nos números). Nunca só cor: o valor está escrito.
export function BarrasDoBichinho({ stats }: { stats: Stats }) {
  return (
    <ul className="m-0 flex list-none flex-col gap-3 p-0">
      {BARRAS.map((b) => {
        const t = TEXTOS.barras[b];
        const v = Math.round(stats[b]);
        return (
          <li key={b} className="flex flex-col gap-1">
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-[15px] font-semibold text-creme">
                <span aria-hidden="true" className="mr-2 text-laranja-claro">
                  {t.icone}
                </span>
                {t.nome}
              </span>
              <span className="font-ficha text-sm text-creme">
                {v}/{MECANICA.teto}
              </span>
            </div>
            <div className="bic-barra-trilho" role="progressbar" aria-label={TEXTOS.barraTexto(t.nome, v)} aria-valuemin={0} aria-valuemax={MECANICA.teto} aria-valuenow={v}>
              <div className="bic-barra-fill" style={{ width: `${v}%` }} />
            </div>
            <span className="text-xs text-areia">{t.sobe}</span>
          </li>
        );
      })}
    </ul>
  );
}
