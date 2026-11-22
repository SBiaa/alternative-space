// As ações que a tela pode pedir, em um lugar só: o servidor (laje da conta) e o aparelho (laje local) usam o mesmo código.

import { z } from "zod";
import { colher, comprarDecoracao, comprarSemente, espantar, melhorarVaso, plantar, posicionar, regar, trocar, vender, vizinhoDeHoje } from "./motor";
import { diaDe } from "./tempo";
import type { Resultado, Save } from "./tipos";

export const schemaAcao = z.discriminatedUnion("tipo", [
  z.object({ tipo: z.literal("plantar"), slot: z.number().int(), planta: z.string().max(40) }),
  z.object({ tipo: z.literal("regar"), slot: z.number().int() }),
  z.object({ tipo: z.literal("colher"), slot: z.number().int() }),
  z.object({ tipo: z.literal("vender"), planta: z.string().max(40), qtd: z.number().int() }),
  z.object({ tipo: z.literal("comprarSemente"), planta: z.string().max(40), qtd: z.number().int() }),
  z.object({ tipo: z.literal("melhorar"), slot: z.number().int() }),
  z.object({ tipo: z.literal("comprarDecoracao"), slug: z.string().max(40) }),
  z.object({ tipo: z.literal("posicionar"), encaixe: z.string().max(40), slug: z.string().max(40).nullable() }),
  z.object({ tipo: z.literal("trocar") }),
  z.object({ tipo: z.literal("espantar") }),
]);
export type AcaoLaje = z.infer<typeof schemaAcao>;

export type AcaoLog = "plant" | "water" | "harvest" | "trade" | "sell" | "buy" | "shoo" | "place";

export type Aplicada = {
  r: Resultado<Save & Record<string, unknown>>;
  log: AcaoLog;
  payload: Record<string, unknown>;
  evento?: { kind: string; payload: Record<string, unknown> };
};

/** Aplica a ação ao save. Os extras (`colhido`, `troca`) que o motor devolve saem antes de gravar. */
export function aplicarAcao(s: Save, agora: number, a: AcaoLaje): Aplicada {
  switch (a.tipo) {
    case "plantar":
      return { r: plantar(s, agora, a.slot, a.planta), log: "plant", payload: { slot: a.slot, planta: a.planta } };
    case "regar":
      return { r: regar(s, agora, a.slot), log: "water", payload: { slot: a.slot } };
    case "colher": {
      const r = colher(s, agora, a.slot);
      const c = r.ok ? r.save.colhido : null;
      return { r, log: "harvest", payload: { slot: a.slot, ...(c ?? {}) }, evento: c ? { kind: "garden_harvest", payload: { ...c, slot: a.slot } } : undefined };
    }
    case "vender":
      return { r: vender(s, agora, a.planta, a.qtd), log: "sell", payload: { planta: a.planta, qtd: a.qtd } };
    case "comprarSemente":
      return { r: comprarSemente(s, agora, a.planta, a.qtd), log: "buy", payload: { tipo: "semente", planta: a.planta, qtd: a.qtd } };
    case "melhorar":
      return { r: melhorarVaso(s, agora, a.slot), log: "buy", payload: { tipo: "vaso", slot: a.slot } };
    case "comprarDecoracao":
      return { r: comprarDecoracao(s, agora, a.slug), log: "buy", payload: { tipo: "decoracao", slug: a.slug } };
    case "posicionar":
      return { r: posicionar(s, agora, a.encaixe, a.slug), log: "place", payload: { encaixe: a.encaixe, slug: a.slug } };
    case "trocar":
      return { r: trocar(s, agora), log: "trade", payload: { dia: diaDe(agora), proposta: vizinhoDeHoje(s, agora).proposta.id } };
    case "espantar":
      return { r: espantar(s, agora), log: "shoo", payload: { dia: diaDe(agora) } };
  }
}

export function semExtras(r: Save & Record<string, unknown>): Save {
  const { colhido: _c, troca: _t, ...resto } = r;
  void _c;
  void _t;
  return resto as unknown as Save;
}
