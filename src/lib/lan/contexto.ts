// Monta o contexto da simulação a partir da lan e do catálogo.

import { sortear } from "../gestao/rng";
import { atributos } from "./atributos";
import { CATALOGO_ARQUETIPOS, CATALOGO_ITENS } from "./catalogo";
import type { Ctx } from "./motor";
import type { Catalogo, Progresso } from "./tipos";

export const CATALOGO_PADRAO: Catalogo = { itens: CATALOGO_ITENS, arquetipos: CATALOGO_ARQUETIPOS };

/** Chance de a companhia de luz avisar (e a luz cair mais) num dia. */
export const CHANCE_ENERGIA_INSTAVEL = 0.2;

export function criarCtx(p: Progresso, cat: Catalogo = CATALOGO_PADRAO): Ctx {
  const dia = p.dia + 1;
  return {
    seed: p.seed, dia, nivel: p.nivel, reputacao: p.reputacao, tranquilo: p.tranquilo, attr: atributos(p, cat),
    arquetipos: cat.arquetipos, frequentes: p.frequentes, maquinas: p.maquinas,
    energiaInstavel: sortear(p.seed, dia, "aviso-luz") < CHANCE_ENERGIA_INSTAVEL,
  };
}
