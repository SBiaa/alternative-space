// Save da laje: schema (zod), migração de versão e checagem de integridade do save local antes de ir pra conta.

import { z } from "zod";
import { escolherMaisAvancado } from "../gestao/save";
import { DECORACOES, ENCAIXES, LAJE, PLANTAS } from "./config";
import { DIA, diaDe } from "./tempo";
import type { Save } from "./tipos";

const inteiro = (max: number) => z.number().int().min(0).max(max);
const contagens = z.record(z.string().max(40), inteiro(100_000));

const schemaVaso = z.object({
  slot: z.number().int().min(0).max(LAJE.vasos - 1),
  planta: z.string().max(40).nullable(),
  plantadoEm: z.number().int().min(0).nullable(),
  agua: z.number().min(0).max(LAJE.aguaMax),
  aguaEm: z.number().int().min(0),
  nivel: z.number().int().min(1).max(LAJE.vaso.preco.length),
  crescimentoMs: z.number().min(0),
});

export const schemaSave = z.object({
  v: z.number().int().min(1),
  seed: z.string().min(1).max(40),
  moedas: inteiro(100_000_000),
  criadoEm: z.number().int().min(0),
  inventario: z.object({
    sementes: contagens,
    colheita: contagens,
    decoracoes: contagens,
    meta: z.object({
      pomboDia: z.number().int(),
      espantadoDia: z.number().int().nullable(),
      ultimaTrocaDia: z.number().int().nullable(),
      bicados: z.array(z.number().int().min(0).max(LAJE.vasos - 1)).max(LAJE.vasos),
    }),
  }),
  decoracoes: z.record(z.string().max(40), z.string().max(40)),
  vasos: z.array(schemaVaso).length(LAJE.vasos),
});

/**
 * Leva um save de qualquer versão antiga até a atual. Devolve null se não for um save válido.
 * Quando o formato mudar: some um `if (v < N)` aqui, sem apagar os anteriores, e suba LAJE.versaoSave.
 */
export function migrar(bruto: unknown): Save | null {
  if (!bruto || typeof bruto !== "object") return null;
  const dado = { ...(bruto as Record<string, unknown>) };
  const v = typeof dado.v === "number" ? dado.v : 1;
  if (v > LAJE.versaoSave) return null;
  // v1 é a primeira versão: nada a converter ainda.
  dado.v = LAJE.versaoSave;
  const r = schemaSave.safeParse(dado);
  return r.success ? (r.data as Save) : null;
}

/** Sanidade do save: só planta e decoração que existem, encaixes válidos e moedas dentro do que os dias permitem. */
export function saveCoerente(s: Save, agora: number): boolean {
  const plantas = new Set(PLANTAS.map((p) => p.slug));
  if (s.vasos.some((v, i) => v.slot !== i || (v.planta !== null && !plantas.has(v.planta)))) return false;
  if (Object.keys(s.inventario.sementes).concat(Object.keys(s.inventario.colheita)).some((k) => !plantas.has(k))) return false;
  const decos = new Set(DECORACOES.map((d) => d.slug));
  const encaixes = new Set<string>(ENCAIXES.map((e) => e.id));
  if (Object.keys(s.inventario.decoracoes).some((k) => !decos.has(k))) return false;
  if (Object.entries(s.decoracoes).some(([e, d]) => !encaixes.has(e) || !decos.has(d))) return false;
  const dias = Math.max(1, Math.ceil((agora - s.criadoEm) / DIA) + 1);
  return s.moedas <= LAJE.tetoMoedas + dias * LAJE.tetoMoedasPorDia;
}

/** Save local vira save de conta: a partir daqui o relógio é o do servidor, então nada pode estar no futuro. */
export function normalizarImportado(s: Save, agora: number): Save {
  const c = structuredClone(s);
  c.criadoEm = Math.min(c.criadoEm, agora);
  c.vasos = c.vasos.map((v) => ({ ...v, plantadoEm: v.plantadoEm === null ? null : Math.min(v.plantadoEm, agora), aguaEm: Math.min(v.aguaEm, agora) }));
  const meta = c.inventario.meta;
  const hoje = diaDe(agora);
  meta.pomboDia = Math.min(meta.pomboDia, hoje);
  if (meta.ultimaTrocaDia !== null) meta.ultimaTrocaDia = Math.min(meta.ultimaTrocaDia, hoje);
  return c;
}

/** Entre o save do aparelho e o da conta, o mais avançado vence. Empate: a conta. */
export const escolherSave = (local: Save | null, remoto: Save | null) => escolherMaisAvancado(local, remoto, passoDe);

/** "Quanto o save já andou": cresce com o jogo e não com a data, pra o save local não ganhar só por ser mais novo. */
export const passoDe = (s: Save) =>
  s.vasos.reduce((a, v) => a + (v.planta ? 1 : 0) + v.nivel, 0) +
  Object.values(s.inventario.colheita).reduce((a, n) => a + n, 0) +
  Object.keys(s.decoracoes).length +
  s.moedas / 100;
