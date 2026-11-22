import { FUSO } from "./config";

// O dia do jogo é o dia em Brasília. Sempre calculado no servidor, nunca pela data do aparelho.

const formato = new Intl.DateTimeFormat("en-CA", { timeZone: FUSO, year: "numeric", month: "2-digit", day: "2-digit" });

export const DIA_RE = /^\d{4}-\d{2}-\d{2}$/;

/** "AAAA-MM-DD" do momento dado, no fuso de Brasília. */
export const diaDe = (d: Date): string => formato.format(d);

export function diaValido(dia: unknown): dia is string {
  if (typeof dia !== "string" || !DIA_RE.test(dia)) return false;
  const [y, m, d] = dia.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d));
  return t.getUTCFullYear() === y && t.getUTCMonth() === m - 1 && t.getUTCDate() === d;
}

export function somarDias(dia: string, n: number): string {
  const [y, m, d] = dia.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

/** Milissegundos até a próxima meia-noite de Brasília (acha a virada por bisseção, sem supor horário de verão). */
export function msAteVirar(agora: Date): number {
  const hoje = diaDe(agora);
  let lo = agora.getTime();
  let hi = lo + 36 * 3_600_000;
  while (hi - lo > 1) {
    const meio = Math.floor((lo + hi) / 2);
    if (diaDe(new Date(meio)) === hoje) lo = meio;
    else hi = meio;
  }
  return hi - agora.getTime();
}

export function formatarContagem(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000));
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(Math.floor(s / 3600))}:${p(Math.floor((s % 3600) / 60))}:${p(s % 60)}`;
}

/** "AAAA-MM-DD" -> "DD/MM/AAAA". */
export const dataBR = (dia: string) => dia.split("-").reverse().join("/");
