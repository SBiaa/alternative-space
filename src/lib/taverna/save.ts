// Save da taverna: schema (zod), migração de versão e checagem de integridade. Não é anti-trapaça (o jogo é solo
// e sem ranking): é pra não gravar um save quebrado ou que anda pra trás.

import { z } from "zod";
import { TAVERNA } from "./config";
import { tetoDaNoite } from "./economia";
import type { Catalogo, Progresso } from "./tipos";

const papel = z.enum(["atendente", "garcom", "cozinheiro", "ajudante", "seguranca", "bardo"]);

export const schemaProgresso = z.object({
  v: z.number().int().min(1),
  cidade: z.string().min(1).max(80),
  nivel: z.number().int().min(1).max(TAVERNA.nivelMax),
  ouro: z.number().int().min(0).max(100_000_000),
  reputacao: z.number().min(0).max(5),
  noite: z.number().int().min(0).max(100_000),
  seed: z.string().min(1).max(40),
  layout: z.array(z.object({ id: z.string().min(1).max(12), tipo: z.string().min(1).max(40), x: z.number().int().min(0).max(30), y: z.number().int().min(0).max(30) })).max(60),
  melhorias: z.record(z.string(), z.number().int().min(1).max(20)),
  equipe: z.array(z.object({ papel, nivel: z.number().int().min(1).max(3), contratadaNoite: z.number().int().min(0) })).max(6),
  tranquila: z.boolean(),
});

/**
 * Leva um save de qualquer versão antiga até a atual. Devolve null se não for um save válido.
 * Quando o formato mudar: some um `if (v < N)` aqui, sem apagar os anteriores.
 */
export function migrar(bruto: unknown): Progresso | null {
  if (!bruto || typeof bruto !== "object") return null;
  const dado = { ...(bruto as Record<string, unknown>) };
  const v = typeof dado.v === "number" ? dado.v : 1;
  dado.v = v;
  // v1 é a primeira versão: nada a converter ainda.
  dado.v = TAVERNA.versaoSave;
  const r = schemaProgresso.safeParse(dado);
  return r.success ? (r.data as Progresso) : null;
}

/** Sanidade do save: ouro dentro do que as noites jogadas permitem. */
export function saveCoerente(p: Progresso, cat: Catalogo): boolean {
  if (p.equipe.some((m, i) => p.equipe.findIndex((x) => x.papel === m.papel) !== i)) return false;
  const teto = tetoDaNoite(p, cat).ouro;
  return p.ouro <= TAVERNA.ouroInicial + p.noite * teto;
}

/** Entre o save do aparelho e o da conta, o mais avançado vence (a noite só avança pra frente). */
export function escolherSave(local: Progresso | null, remoto: Progresso | null): { save: Progresso | null; origem: "local" | "remoto" | "nenhum" } {
  if (!local && !remoto) return { save: null, origem: "nenhum" };
  if (!remoto) return { save: local, origem: "local" };
  if (!local) return { save: remoto, origem: "remoto" };
  return local.noite > remoto.noite ? { save: local, origem: "local" } : { save: remoto, origem: "remoto" };
}
