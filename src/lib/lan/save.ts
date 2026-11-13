// Save da lan: schema (zod), migração de versão e checagem de integridade. Não é anti-trapaça (o jogo é solo
// e sem ranking): é pra não gravar um save quebrado ou que anda pra trás.

import { z } from "zod";
import { escolherMaisAvancado } from "../gestao/save";
import { layoutValido } from "./atributos";
import { LAN } from "./config";
import type { Catalogo, Progresso } from "./tipos";

const inteiro = (max: number) => z.number().int().min(0).max(max);

export const schemaProgresso = z.object({
  v: z.number().int().min(1),
  local: z.string().min(1).max(80),
  nivel: z.number().int().min(1).max(LAN.nivelMax),
  dinheiro: inteiro(100_000_000),
  reputacao: z.number().min(0).max(5),
  dia: inteiro(100_000),
  seed: z.string().min(1).max(40),
  layout: z.object({
    pcs: z.array(z.object({ id: z.string().min(1).max(8), x: inteiro(20), y: inteiro(20) })).max(40),
    divisoria: z.number().int().min(1).max(20).nullable(),
  }),
  maquinas: z.array(z.object({ id: z.string().min(1).max(8), tipo: z.enum(["basica", "media", "gamer"]), saude: z.number().min(0).max(100), sujeira: z.number().min(0).max(100) })).max(40),
  estoque: z.record(z.enum(["refri", "salgadinho", "bala", "misto"]), inteiro(1000)),
  frequentes: z.record(z.string().max(40), inteiro(99)),
  melhorias: z.record(z.string().max(40), z.number().int().min(1).max(20)),
  equipe: z.array(z.object({ papel: z.enum(["caixa", "tecnico", "monitor"]), nivel: z.number().int().min(1).max(3), contratadoDia: inteiro(100_000) })).max(3),
  tranquilo: z.boolean(),
});

/**
 * Leva um save de qualquer versão antiga até a atual. Devolve null se não for um save válido.
 * Quando o formato mudar: some um `if (v < N)` aqui, sem apagar os anteriores, e suba LAN.versaoSave.
 */
export function migrar(bruto: unknown): Progresso | null {
  if (!bruto || typeof bruto !== "object") return null;
  const dado = { ...(bruto as Record<string, unknown>) };
  const v = typeof dado.v === "number" ? dado.v : 1;
  if (v > LAN.versaoSave) return null;
  // v1 é a primeira versão: nada a converter ainda.
  dado.v = LAN.versaoSave;
  const r = schemaProgresso.safeParse(dado);
  return r.success ? (r.data as Progresso) : null;
}

/** Sanidade do save: disposição válida, sem funcionário repetido, dinheiro dentro do que os dias permitem. */
export function saveCoerente(p: Progresso, cat: Catalogo): boolean {
  if (p.equipe.some((m, i) => p.equipe.findIndex((x) => x.papel === m.papel) !== i)) return false;
  if (!layoutValido(p.layout, p, cat)) return false;
  const tetoPorDia = 600 + 120 * p.maquinas.length;
  return p.dinheiro <= LAN.dinheiroInicial + p.dia * tetoPorDia;
}

/** Entre o save do aparelho e o da conta, o mais avançado vence (o dia só avança pra frente). */
export const escolherSave = (local: Progresso | null, remoto: Progresso | null) => escolherMaisAvancado(local, remoto, (s) => s.dia);
