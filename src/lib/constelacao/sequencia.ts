import { somarDias } from "./dia";

export type Sequencia = { current: number; best: number; lastDate: string | null };
export type DiaJogado = { dia: string; solved: boolean };

export const SEM_SEQUENCIA: Sequencia = { current: 0, best: 0, lastDate: null };

/**
 * Sequência a partir das partidas terminadas. Acertar em dias seguidos soma; errar ou pular um dia
 * zera a atual; o recorde nunca diminui. Dia repetido conta uma vez só (vale o primeiro).
 */
export function calcularSequencia(partidas: DiaJogado[]): Sequencia {
  const porDia = new Map<string, boolean>();
  for (const p of [...partidas].sort((a, b) => a.dia.localeCompare(b.dia))) {
    if (!porDia.has(p.dia)) porDia.set(p.dia, p.solved);
  }
  let current = 0;
  let best = 0;
  let lastDate: string | null = null;
  for (const [dia, solved] of porDia) {
    if (!solved) current = 0;
    else current = lastDate && somarDias(lastDate, 1) === dia && current > 0 ? current + 1 : 1;
    if (current > best) best = current;
    lastDate = dia;
  }
  return { current, best, lastDate };
}

/** Sequência a mostrar hoje: se o último dia jogado ficou pra trás de ontem, a atual já quebrou. */
export function sequenciaVigente(s: Sequencia, hoje: string): Sequencia {
  if (!s.lastDate) return s;
  const vivo = s.lastDate === hoje || s.lastDate === somarDias(hoje, -1);
  return vivo ? s : { ...s, current: 0 };
}
