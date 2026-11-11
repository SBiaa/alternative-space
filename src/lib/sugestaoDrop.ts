// Tipos de peça que dá pra sugerir pro próximo drop.
export const PECAS = {
  camiseta: "Camiseta",
  moletom: "Moletom",
  ecobag: "Ecobag",
  caneca: "Caneca",
  adesivo: "Adesivos",
  outro: "Outra coisa",
} as const;

export type Peca = keyof typeof PECAS;

export const pecaValida = (v: unknown): v is Peca => typeof v === "string" && v in PECAS;
