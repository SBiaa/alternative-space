// Textos da interface do Mar Sem Fim: todos em content/mar-sem-fim/textos.json, nada fixo nos componentes.
import textos from "../../../content/mar-sem-fim/textos.json";

export const T = textos;
export type CodigoErro = keyof typeof textos.erros;

/** Texto de erro pelo código (cai no genérico se o código não tiver texto). */
export const textoDoErro = (codigo: string): string => (textos.erros as Record<string, string>)[codigo] ?? textos.erros.generico;

/** Preenche {chaves} de um texto de config. */
export const preencher = (modelo: string, valores: Record<string, string | number>) => modelo.replace(/\{(\w+)\}/g, (_, k) => String(valores[k] ?? ""));

const numero = new Intl.NumberFormat("pt-BR");
export const formatarNumero = (n: number) => numero.format(n);

/** "1 h 05 min", "12 min", "45 s". */
export function formatarDuracao(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h} h ${String(m).padStart(2, "0")} min`;
  if (m > 0) return `${m} min ${String(s % 60).padStart(2, "0")} s`;
  return `${s} s`;
}

/** Contagem regressiva em Space Mono: 01:23:45. */
export function formatarRelogio(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(h)}:${p(m)}:${p(s % 60)}`;
}
