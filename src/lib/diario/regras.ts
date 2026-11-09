import { ANO, mesDaData, noDiario, somaDias } from "./calendario";

export const STATUS = ["open", "done", "moved", "dropped", "urgent"] as const;
export type Status = (typeof STATUS)[number];
export const statusValido = (s: unknown): s is Status => STATUS.includes(s as Status);

export const XP_MAX = 10;
export const MAX_HABITOS = 12;
export const MAX_TEXTO = 200;

export const TIPOS_ITEM = ["serie", "anime", "jogo", "livro"] as const;
export type TipoItem = (typeof TIPOS_ITEM)[number];
export const STATUS_ITEM = ["quero", "fazendo", "terminei"] as const;
export type StatusItem = (typeof STATUS_ITEM)[number];

export type AlvoQuest = { scope: "day"; date: string } | { scope: "month"; year: number; month: number };

/** Quanto o XP do mês muda quando a quest troca de status: +1 ao concluir, −1 ao desfazer. */
export const deltaXP = (antes: Status, depois: Status) => (depois === "done" ? 1 : 0) - (antes === "done" ? 1 : 0);

export const aplicaXP = (pontos: number, delta: number) => Math.max(0, Math.min(XP_MAX, pontos + delta));

/** Mês cujo XP a quest alimenta. */
export function mesDoXP(alvo: AlvoQuest) {
  return alvo.scope === "month" ? { year: alvo.year, month: alvo.month } : { year: ANO, month: mesDaData(alvo.date)! };
}

/** Para onde vai a cópia de uma quest marcada como "passou pra frente". null = não há para onde (fim do diário). */
export function destinoMovida(alvo: AlvoQuest): AlvoQuest | null {
  if (alvo.scope === "day") {
    const date = somaDias(alvo.date, 7);
    return noDiario(date) ? { scope: "day", date } : null;
  }
  return alvo.month < 12 ? { scope: "month", year: alvo.year, month: alvo.month + 1 } : null;
}

/** Limpa o texto de uma quest/item; null se ficar vazio ou passar do limite. */
export function textoValido(v: unknown, max = MAX_TEXTO) {
  const t = String(v ?? "").replace(/\s+/g, " ").trim();
  return t && t.length <= max ? t : null;
}

export const COR_HEX = /^#[0-9a-f]{6}$/i;
