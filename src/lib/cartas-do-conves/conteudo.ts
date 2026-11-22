// Monta o conteúdo do jogo a partir de content/cartas-do-conves/*.json. O schema que confere esses arquivos está em schema.ts.

import cartasJson from "../../../content/cartas-do-conves/cartas.json";
import oficiosJson from "../../../content/cartas-do-conves/oficios.json";
import inimigosJson from "../../../content/cartas-do-conves/inimigos.json";
import reliquiasJson from "../../../content/cartas-do-conves/reliquias.json";
import eventosJson from "../../../content/cartas-do-conves/eventos.json";
import type { Carta, Conteudo, Encontro, Evento, InimigoDef, Oficio, Reliquia } from "./tipos";

export const BRUTO = { cartasJson, oficiosJson, inimigosJson, reliquiasJson, eventosJson };

export function montarConteudo(b: typeof BRUTO = BRUTO): Conteudo {
  const listaCartas = b.cartasJson.cartas as Carta[];
  const listaReliquias = b.reliquiasJson.reliquias as Reliquia[];
  const inimigos = Object.fromEntries((b.inimigosJson.inimigos as InimigoDef[]).map((i) => [i.slug, i]));
  return {
    listaCartas,
    cartas: Object.fromEntries(listaCartas.map((c) => [c.slug, c])),
    oficios: b.oficiosJson.oficios as Oficio[],
    inimigos,
    chefe: b.inimigosJson.chefe as InimigoDef,
    encontros: b.inimigosJson.encontros as Encontro[],
    listaReliquias,
    reliquias: Object.fromEntries(listaReliquias.map((r) => [r.slug, r])),
    eventos: b.eventosJson.eventos as Evento[],
  };
}

export const CONTEUDO: Conteudo = montarConteudo();

/** Acha um inimigo (comum ou o chefe) pelo slug. */
export const inimigoDe = (C: Conteudo, slug: string) => (slug === C.chefe.slug ? C.chefe : C.inimigos[slug]);
