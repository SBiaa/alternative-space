export const TIPOS_FEEDBACK = {
  avaliacao: "Avaliar",
  sugestao: "Sugestão",
  bug: "Bug",
  ideia: "Ideia",
} as const;

export type TipoFeedback = keyof typeof TIPOS_FEEDBACK;

export const tipoValido = (v: unknown): v is TipoFeedback => typeof v === "string" && v in TIPOS_FEEDBACK;

export const notaValida = (v: unknown): number | null => {
  const n = Number(v);
  return Number.isInteger(n) && n >= 1 && n <= 5 ? n : null;
};
