import { z } from "zod";
import {
  ACESSORIOS,
  BARRAS,
  EVENTOS,
  ESPECIES,
  FASES,
  FUSO,
  MECANICA,
  TEXTOS,
  VERSAO_STATS,
  type Campo,
  type Fase,
  type Humor,
  type Slot,
  type Stats,
} from "./config";

// Regras do bichinho em TypeScript puro: sem banco, sem React. Tudo é calculado no servidor.

export type EventoPet = { kind: string; created_at: string | Date };
export type Resumo = Record<Campo, number>;

export const limita = (n: number) => Math.min(MECANICA.teto, Math.max(0, Math.round(n * 100) / 100));

export const statsIniciais = (): Stats => ({ energy: MECANICA.inicial, curiosity: MECANICA.inicial, affection: MECANICA.inicial });

// ---- stats guardados (JSON com versão) ----
const barraSchema = z.number().finite();
const statsV1 = z.object({ v: z.literal(1), energy: barraSchema, curiosity: barraSchema, affection: barraSchema });

/** Lê o JSON do banco. Versão desconhecida ou lixo volta pros valores iniciais, nunca quebra a tela. */
export function lerStats(raw: unknown): Stats {
  const bruto = typeof raw === "string" ? safeParse(raw) : raw;
  // Sem "v" = formato antes do versionamento: trata como v1.
  const comVersao = bruto && typeof bruto === "object" && !("v" in bruto) ? { v: 1, ...(bruto as object) } : bruto;
  const r = statsV1.safeParse(comVersao);
  if (!r.success) return statsIniciais();
  return { energy: limita(r.data.energy), curiosity: limita(r.data.curiosity), affection: limita(r.data.affection) };
}
export const guardarStats = (s: Stats) => ({ v: VERSAO_STATS, energy: s.energy, curiosity: s.curiosity, affection: s.affection });

function safeParse(s: string): unknown {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}

// ---- tempo ----
/** Data (AAAA-MM-DD) no fuso de São Paulo. */
export function hojeSP(agora: Date | string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: FUSO, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(agora));
}

/** 1 petisco por dia: libera se nunca deu ou se a última data é anterior a hoje. */
export function podeDarPetisco(ultima: string | Date | null, agora: Date | string): boolean {
  if (!ultima) return true;
  const u = typeof ultima === "string" ? ultima.slice(0, 10) : hojeSP(ultima);
  return u < hojeSP(agora);
}

// ---- barras ----
/** Queda com o tempo. Nunca passa do piso e nunca "sobe" uma barra que já estava abaixo dele. */
export function aplicarQueda(stats: Stats, horas: number): Stats {
  const h = Math.max(0, Number.isFinite(horas) ? horas : 0);
  const out = { ...stats };
  for (const b of BARRAS) {
    const atual = stats[b];
    out[b] = atual <= MECANICA.piso ? atual : limita(Math.max(MECANICA.piso, atual - MECANICA.queda[b] * h));
  }
  return out;
}

/** Soma o que cada evento rende às barras (sem aplicar teto) e o XP deles. */
export function efeitosDe(eventos: EventoPet[]): { ganho: Stats; xp: number } {
  const ganho: Stats = { energy: 0, curiosity: 0, affection: 0 };
  let xp = 0;
  for (const e of eventos) {
    const cfg = EVENTOS[e.kind];
    if (!cfg) continue;
    for (const b of BARRAS) ganho[b] += cfg.ganho[b] ?? 0;
    xp += cfg.xp;
  }
  return { ganho, xp };
}

export const xpDe = (eventos: EventoPet[]) => efeitosDe(eventos).xp;

export function faseParaXp(xp: number): Fase {
  let fase: Fase = 0;
  for (const f of FASES) if (xp >= f.xp) fase = f.fase;
  return fase;
}

// ---- avanço preguiçoso ----
export type Estado = { stats: Stats; xp: number; stage: Fase; lastTickAt: Date | string };
export type Avanco = {
  stats: Stats;
  xp: number;
  stage: Fase;
  /** Fases em que ele entrou agora (0→1 é a eclosão). */
  evolucoes: { de: Fase; para: Fase }[];
  horas: number;
  voltou: boolean;
};

/**
 * Leva o estado de `lastTickAt` até `agora`: primeiro a queda do tempo, depois os ganhos dos eventos do intervalo.
 * `eventos` deve conter só o que aconteceu depois de lastTickAt (o servidor filtra). A fase nunca desce.
 */
export function avancar(estado: Estado, eventos: EventoPet[], agora: Date | string): Avanco {
  const horas = Math.max(0, (new Date(agora).getTime() - new Date(estado.lastTickAt).getTime()) / 3_600_000);
  const caiu = aplicarQueda(estado.stats, horas);
  const { ganho, xp } = efeitosDe(eventos);
  const stats: Stats = { energy: 0, curiosity: 0, affection: 0 };
  for (const b of BARRAS) stats[b] = limita(caiu[b] + ganho[b]);
  const xpTotal = estado.xp + xp;
  const alvo = Math.max(estado.stage, faseParaXp(xpTotal)) as Fase;
  const evolucoes: { de: Fase; para: Fase }[] = alvo > estado.stage ? [{ de: estado.stage, para: alvo }] : [];
  return { stats, xp: xpTotal, stage: alvo, evolucoes, horas, voltou: horas >= MECANICA.ausenciaLongaHoras };
}

// ---- humor ----
export const mediaDe = (s: Stats) => (s.energy + s.curiosity + s.affection) / 3;

export function humorDe(s: Stats, voltou = false): Humor {
  if (voltou) return "feliz";
  if (mediaDe(s) < MECANICA.limiarDormindo) return "dormindo";
  if (s.energy < MECANICA.limiarSonolento) return "sonolento";
  if (s.curiosity >= MECANICA.limiarCurioso && s.curiosity >= s.energy && s.curiosity >= s.affection) return "curioso";
  return "feliz";
}

/** Frase do dia: muda a cada dia e a cada humor, sempre a mesma pro mesmo dia. */
export function fraseDoDia(humor: Humor, userId: string, hoje: string): string {
  const lista = TEXTOS.frases[humor];
  let h = 0;
  for (const c of `${userId}${hoje}`) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return lista[h % lista.length];
}

// ---- marcos e acessórios ----
export function marcosAtingidos(resumo: Resumo): string[] {
  return ACESSORIOS.filter((a) => (resumo[a.marco.campo] ?? 0) >= a.marco.min).map((a) => a.slug);
}

export const acessorioDe = (slug: string) => ACESSORIOS.find((a) => a.slug === slug);
export const especieDe = (slug: string) => ESPECIES.find((e) => e.slug === slug);

/** Limpa o JSON de acessórios: só slot válido, acessório do slot certo e liberado. */
export function equipadosValidos(raw: unknown, liberados: readonly string[]): Partial<Record<Slot, string>> {
  const out: Partial<Record<Slot, string>> = {};
  if (!raw || typeof raw !== "object") return out;
  for (const [slot, slug] of Object.entries(raw as Record<string, unknown>)) {
    const a = typeof slug === "string" ? acessorioDe(slug) : undefined;
    if (a && a.slot === slot && liberados.includes(a.slug)) out[a.slot] = a.slug;
  }
  return out;
}

// ---- entradas do cliente (zod). strictObject: campo extra, como "energy", é recusado. ----
const slugOk = z.string().regex(/^[a-z0-9-]{1,40}$/);
export const nomeSchema = z
  .string()
  .transform((s) => s.trim().replace(/\s+/g, " "))
  .pipe(z.string().min(MECANICA.nomeMin).max(MECANICA.nomeMax).regex(/^[\p{L}\p{N} ._-]+$/u));

export const entradas = {
  ovo: z.strictObject({ especie: slugOk }),
  equipar: z.strictObject({ slot: z.enum(["cabeca", "corpo"]), slug: slugOk.nullable() }),
  renomear: z.strictObject({ nome: nomeSchema }),
  leitura: z.strictObject({ slug: slugOk }),
};
