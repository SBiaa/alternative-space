import personagem from "../../content/quizzes/personagem-alternativo.json";
import akuma from "../../content/quizzes/akuma-no-mi.json";

export type QuizResult = {
  name: string;
  tagline: string;
  text: string;
  traits: string[];
  color: string;
  label?: string; // aparece ao lado de "Seu resultado"
};

export type QuizData = {
  intro: { eyebrow: string; title: string; text: string };
  resultPrefix: string; // "Eu sou" + nome do resultado, usado no título e no compartilhamento
  note?: string; // aviso pequeno no rodapé do quiz
  results: Record<string, QuizResult>;
  questions: { q: string; options: { text: string; result: string }[] }[];
};

// Para adicionar um quiz: crie o JSON em content/quizzes e registre aqui. A ordem é a da página /quiz.
export const quizzes: Record<string, QuizData> = {
  "akuma-no-mi": akuma,
  "personagem-alternativo": personagem,
};

export const quizSlugs = Object.keys(quizzes);

export const getQuiz = (slug: string): QuizData | undefined => quizzes[slug];

// Classes por cor do resultado (fundo do cartão e cor da etiqueta).
export const resultTheme: Record<string, { card: string; label: string }> = {
  azul: { card: "bg-azul text-creme", label: "text-laranja-claro" },
  noite: { card: "bg-noite text-creme", label: "text-laranja-claro" },
  laranja: { card: "bg-laranja text-noite", label: "text-noite" },
  estrela: { card: "bg-estrela text-creme", label: "text-creme-escuro" },
  creme: { card: "bg-creme-claro text-noite", label: "text-azul" },
};

// Conta os votos por resultado. Empate: vence quem chegou por último ao placar mais alto.
export function scoreAnswers(answers: string[]): string {
  const count = new Map<string, number>();
  let best = answers[answers.length - 1];
  for (const a of answers) {
    const n = (count.get(a) ?? 0) + 1;
    count.set(a, n);
    if (n >= (count.get(best) ?? 0)) best = a;
  }
  return best;
}
