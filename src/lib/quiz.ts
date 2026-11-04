import data from "../../content/quiz.json";

export const quiz = data;
export type ResultId = keyof typeof data.results;
export type QuizResult = (typeof data.results)[ResultId];

export const resultIds = Object.keys(data.results) as ResultId[];

export const isResultId = (v: string): v is ResultId => v in data.results;

// Classes por cor do resultado (fundo do cartão, cor do texto, cor da etiqueta).
export const resultTheme: Record<string, { card: string; label: string }> = {
  azul: { card: "bg-azul text-creme", label: "text-laranja-claro" },
  noite: { card: "bg-noite text-creme", label: "text-laranja-claro" },
  laranja: { card: "bg-laranja text-noite", label: "text-noite" },
  estrela: { card: "bg-estrela text-creme", label: "text-creme-escuro" },
};

// Conta os votos por resultado. Empate: vence quem chegou por último ao placar mais alto.
export function scoreAnswers(answers: string[]): ResultId {
  const count = new Map<string, number>();
  let best = answers[answers.length - 1];
  for (const a of answers) {
    const n = (count.get(a) ?? 0) + 1;
    count.set(a, n);
    if (n >= (count.get(best) ?? 0)) best = a;
  }
  return isResultId(best) ? best : resultIds[0];
}
