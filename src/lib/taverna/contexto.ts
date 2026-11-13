// Monta o contexto da simulação a partir da taverna e do catálogo.

import { atributos } from "./atributos";
import { CATALOGO_ARQUETIPOS, CATALOGO_ITENS } from "./catalogo";
import type { Ctx } from "./motor";
import type { Catalogo, Progresso } from "./tipos";

export const CATALOGO_PADRAO: Catalogo = { itens: CATALOGO_ITENS, arquetipos: CATALOGO_ARQUETIPOS };

export function criarCtx(p: Progresso, cat: Catalogo = CATALOGO_PADRAO): Ctx {
  return { seed: p.seed, noite: p.noite + 1, nivel: p.nivel, reputacao: p.reputacao, tranquila: p.tranquila, attr: atributos(p, cat), arquetipos: cat.arquetipos };
}
