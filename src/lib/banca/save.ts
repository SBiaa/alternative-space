// Save da banca: schema (zod), migração de versão e checagem de integridade. Não é anti-trapaça (o jogo é solo e sem
// ranking): é pra não gravar um save quebrado ou que anda pra trás. Saldo e progresso de verdade passam pelo servidor.

import { z } from "zod";
import { escolherMaisAvancado } from "../gestao/save";
import { BANCA, EVENTOS, MELHORIAS, PRODUTOS } from "./config";
import { tetoDeItens } from "./economia";
import { atributos, layoutValido, lerItem } from "./mesa";
import type { Progresso } from "./tipos";

const inteiro = (max: number) => z.number().int().min(0).max(max);
const chave = z.string().min(3).max(60);

export const schemaProgresso = z.object({
  v: z.number().int().min(1),
  dinheiro: inteiro(BANCA.dinheiroMax),
  reputacao: z.number().min(0).max(BANCA.reputacaoMax),
  semana: z.number().int().min(1).max(BANCA.semanaMax),
  seed: z.string().min(1).max(40),
  estoque: z.object({
    itens: z.record(chave, inteiro(100_000)),
    diasUsados: inteiro(100),
    gastoMaterial: inteiro(BANCA.dinheiroMax),
  }),
  layout: z.object({
    celulas: z.array(chave.nullable()).max(40),
    precos: z.record(z.string().max(20), inteiro(1000)),
  }),
  melhorias: z.record(z.string().max(40), z.number().int().min(1).max(20)),
  tranquilo: z.boolean(),
});

/**
 * Leva um save de qualquer versão antiga até a atual. Devolve null se não for um save válido.
 * Quando o formato mudar: some um `if (v < N)` aqui, sem apagar os anteriores, e suba BANCA.versaoSave.
 */
export function migrar(bruto: unknown): Progresso | null {
  if (!bruto || typeof bruto !== "object") return null;
  const dado = { ...(bruto as Record<string, unknown>) };
  const v = typeof dado.v === "number" ? dado.v : 1;
  if (v > BANCA.versaoSave) return null;
  // v1 é a primeira versão: nada a converter ainda.
  dado.v = BANCA.versaoSave;
  const r = schemaProgresso.safeParse(dado);
  return r.success ? (r.data as Progresso) : null;
}

/** Quanto dinheiro um evento pode render no máximo (o maior teto de itens ao preço mais alto). */
const tetoPorSemana = Math.max(...EVENTOS.map(tetoDeItens)) * Math.max(...PRODUTOS.map((p) => p.precoMax));

/** Sanidade do save: itens e melhorias que existem, layout válido, dias de ateliê e dinheiro dentro do que as semanas permitem. */
export function saveCoerente(p: Progresso): boolean {
  if (Object.keys(p.estoque.itens).some((k) => lerItem(k) === null)) return false;
  for (const [slug, nivel] of Object.entries(p.melhorias)) {
    const m = MELHORIAS.find((x) => x.slug === slug);
    if (!m || nivel > m.niveis.length) return false;
  }
  if (p.estoque.diasUsados > atributos(p.melhorias).diasAtelie) return false;
  if (!layoutValido(p.layout, p)) return false;
  return p.dinheiro <= BANCA.dinheiroInicial + (p.semana - 1) * tetoPorSemana;
}

/** Entre o save do aparelho e o da conta, o mais avançado vence (a semana só anda pra frente). */
export const escolherSave = (local: Progresso | null, remoto: Progresso | null) => escolherMaisAvancado(local, remoto, (s) => s.semana);
