import personagem from "../../content/quizzes/personagem-alternativo.json";
import akuma from "../../content/quizzes/akuma-no-mi.json";
import tripulacao from "../../content/quizzes/tripulacao.json";
import eraInternet from "../../content/quizzes/era-da-internet.json";
import faRaiz from "../../content/quizzes/fa-raiz-one-piece.json";
import partyRpg from "../../content/quizzes/party-rpg.json";

export type QuizResult = {
  name: string;
  tagline: string;
  text: string;
  traits: string[];
  color: string;
  label?: string; // aparece ao lado de "Seu resultado"
};

export type PartyMember = { role: string; name: string; text: string };
export type ResolvedResult = QuizResult & { members?: PartyMember[] };

type Base = {
  intro: { eyebrow: string; title: string; text: string };
  resultPrefix: string; // "Eu sou" + nome do resultado, usado no título e no compartilhamento
  note?: string; // aviso pequeno no rodapé do quiz
};

// Cada resposta soma um ponto pra um resultado; vence o mais votado.
export type PersonalityQuiz = Base & {
  kind?: "personalidade";
  results: Record<string, QuizResult>;
  questions: { q: string; options: { text: string; result: string }[] }[];
};

// Perguntas com resposta certa. O resultado é a pontuação ("7" = 7 acertos); a faixa define o texto.
export type KnowledgeQuiz = Base & {
  kind: "conhecimento";
  questions: { q: string; options: string[]; answer: number; fact?: string }[];
  bands: { min: number; name: string; text: string; color: string; label?: string }[];
};

// Cada pergunta escolhe um integrante. O resultado é o código das escolhas ("02131");
// o nome da party vem da "vibe" que mais aparece entre os escolhidos.
export type PartyQuiz = Base & {
  kind: "party";
  slots: { role: string; q: string; options: { name: string; text: string; vibe: string }[] }[];
  vibes: Record<string, Omit<QuizResult, "traits">>;
};

export type QuizData = PersonalityQuiz | KnowledgeQuiz | PartyQuiz;

// Para adicionar um quiz: crie o JSON em content/quizzes e registre aqui. A ordem é a da página /quiz.
export const quizzes: Record<string, QuizData> = {
  "era-da-internet": eraInternet,
  "fa-raiz-one-piece": faRaiz as KnowledgeQuiz,
  "party-rpg": partyRpg as PartyQuiz,
  tripulacao,
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

// Conta os votos. Empate: vence quem chegou por último ao placar mais alto.
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

function partyResult(quiz: PartyQuiz, code: string): ResolvedResult | undefined {
  if (!/^\d+$/.test(code) || code.length !== quiz.slots.length) return undefined;
  const picks = [...code].map((c, i) => quiz.slots[i].options[Number(c)]);
  if (picks.some((p) => !p)) return undefined;
  const vibe = quiz.vibes[scoreAnswers(picks.map((p) => p.vibe))];
  if (!vibe) return undefined;
  return { ...vibe, traits: [], members: picks.map((p, i) => ({ role: quiz.slots[i].role, name: p.name, text: p.text })) };
}

function knowledgeResult(quiz: KnowledgeQuiz, id: string): ResolvedResult | undefined {
  const total = quiz.questions.length;
  const hits = /^\d+$/.test(id) ? Number(id) : NaN;
  if (!(hits >= 0 && hits <= total)) return undefined;
  const band = [...quiz.bands].sort((a, b) => b.min - a.min).find((b) => hits >= b.min);
  if (!band) return undefined;
  return { name: `${hits}/${total}`, tagline: band.name, text: band.text, color: band.color, label: band.label, traits: [] };
}

// Resultado de um quiz a partir do id que vai na URL (/quiz/[quiz]/[resultado]).
export function getResult(quiz: QuizData, id: string): ResolvedResult | undefined {
  if (quiz.kind === "party") return partyResult(quiz, id);
  if (quiz.kind === "conhecimento") return knowledgeResult(quiz, id);
  return Object.hasOwn(quiz.results, id) ? quiz.results[id] : undefined;
}

// Ids pré-gerados no build. A party tem combinações demais e é gerada na hora.
export function staticResultIds(quiz: QuizData): string[] {
  if (quiz.kind === "party") return [];
  if (quiz.kind === "conhecimento") return quiz.questions.map((_, i) => String(i)).concat(String(quiz.questions.length));
  return Object.keys(quiz.results);
}

// Lista "os outros resultados" (só faz sentido no quiz de personalidade).
export function otherResults(quiz: QuizData, id: string): [string, QuizResult][] {
  if (quiz.kind === "party" || quiz.kind === "conhecimento") return [];
  return Object.entries(quiz.results).filter(([k]) => k !== id);
}
