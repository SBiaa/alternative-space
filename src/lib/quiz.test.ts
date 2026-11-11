import { describe, expect, it } from "vitest";
import {
  getResult,
  otherResults,
  parseMix,
  percentages,
  tally,
  topResults,
  scoreAnswers,
  staticResultIds,
  type KnowledgeQuiz,
  type PartyQuiz,
  type PersonalityQuiz,
} from "./quiz";

const base = { intro: { eyebrow: "", title: "", text: "" }, resultPrefix: "Eu sou" };
const res = (name: string) => ({ name, tagline: "", text: "", traits: [], color: "azul" });

const personality: PersonalityQuiz = {
  ...base,
  results: { a: res("A"), b: res("B"), c: res("C") },
  questions: [{ q: "?", options: [{ text: "1", result: "a" }, { text: "2", result: "b" }] }],
};

const knowledge: KnowledgeQuiz = {
  ...base,
  kind: "conhecimento",
  questions: [0, 1, 2, 3].map(() => ({ q: "?", options: ["x", "y"], answer: 0 })),
  bands: [
    { min: 0, name: "Grumete", text: "", color: "creme" },
    { min: 2, name: "Pirata", text: "", color: "azul" },
    { min: 4, name: "Rei", text: "", color: "laranja" },
  ],
};

const party: PartyQuiz = {
  ...base,
  kind: "party",
  slots: [
    { role: "Tanque", q: "?", options: [{ name: "Ana", text: "", vibe: "caos" }, { name: "Bia", text: "", vibe: "calma" }] },
    { role: "Mago", q: "?", options: [{ name: "Caio", text: "", vibe: "caos" }, { name: "Duda", text: "", vibe: "calma" }] },
    { role: "Bardo", q: "?", options: [{ name: "Edu", text: "", vibe: "calma" }] },
  ],
  vibes: {
    caos: { name: "Party do Caos", tagline: "", text: "", color: "laranja" },
    calma: { name: "Party Zen", tagline: "", text: "", color: "azul" },
  },
};

describe("scoreAnswers", () => {
  it("vence o mais votado", () => {
    expect(scoreAnswers(["a", "b", "a", "c"])).toBe("a");
  });

  it("no empate, vence quem chegou por último ao placar mais alto", () => {
    expect(scoreAnswers(["a", "b"])).toBe("b");
    expect(scoreAnswers(["a", "b", "b", "a"])).toBe("a");
  });

  it("funciona com uma resposta só", () => {
    expect(scoreAnswers(["c"])).toBe("c");
  });
});

describe("getResult: personalidade", () => {
  it("devolve o resultado pelo id", () => {
    expect(getResult(personality, "b")?.name).toBe("B");
  });

  it("não aceita id inexistente nem propriedades herdadas", () => {
    expect(getResult(personality, "z")).toBeUndefined();
    expect(getResult(personality, "toString")).toBeUndefined();
    expect(getResult(personality, "__proto__")).toBeUndefined();
  });
});

describe("getResult: conhecimento", () => {
  it.each([
    ["0", "Grumete"],
    ["1", "Grumete"],
    ["2", "Pirata"],
    ["3", "Pirata"],
    ["4", "Rei"],
  ])("%s acertos cai na faixa %s", (id, band) => {
    const r = getResult(knowledge, id);
    expect(r?.tagline).toBe(band);
    expect(r?.name).toBe(`${id}/4`);
  });

  it.each(["5", "-1", "1.5", "abc", ""])("recusa %j", (id) => {
    expect(getResult(knowledge, id)).toBeUndefined();
  });
});

describe("getResult: party", () => {
  it("monta a party a partir do código", () => {
    const r = getResult(party, "000");
    expect(r?.name).toBe("Party do Caos");
    expect(r?.members).toEqual([
      { role: "Tanque", name: "Ana", text: "" },
      { role: "Mago", name: "Caio", text: "" },
      { role: "Bardo", name: "Edu", text: "" },
    ]);
  });

  it("a vibe da maioria vence", () => {
    expect(getResult(party, "110")?.name).toBe("Party Zen");
  });

  it.each(["00", "0000", "002", "0a0", ""])("recusa código inválido %j", (id) => {
    expect(getResult(party, id)).toBeUndefined();
  });
});

describe("staticResultIds", () => {
  it("personalidade: um id por resultado", () => {
    expect(staticResultIds(personality)).toEqual(["a", "b", "c"]);
  });

  it("conhecimento: de 0 até o total de perguntas", () => {
    expect(staticResultIds(knowledge)).toEqual(["0", "1", "2", "3", "4"]);
  });

  it("party: nenhum (gerado na hora)", () => {
    expect(staticResultIds(party)).toEqual([]);
  });
});

describe("otherResults", () => {
  it("lista os outros resultados, sem o atual", () => {
    expect(otherResults(personality, "a").map(([k]) => k)).toEqual(["b", "c"]);
  });

  it("vazio para quizzes que não são de personalidade", () => {
    expect(otherResults(knowledge, "2")).toEqual([]);
    expect(otherResults(party, "000")).toEqual([]);
  });
});

describe("mistura", () => {
  const mixQuiz: PersonalityQuiz = { ...personality, mix: true, questions: [0, 1, 2, 3].map(() => personality.questions[0]) };

  it("conta pontos e acha empates", () => {
    const s = tally(mixQuiz, ["a", "b", "a", "b"]);
    expect(s).toEqual([2, 2, 0]);
    expect(topResults(mixQuiz, s)).toEqual(["a", "b"]);
  });

  it("valida a mistura da URL", () => {
    expect(parseMix(mixQuiz, "a", "3.1.0")).toEqual([3, 1, 0]);
    expect(parseMix(mixQuiz, "b", "3.1.0")).toBeNull();
    expect(parseMix(mixQuiz, "a", "3.0.0")).toBeNull();
    expect(parseMix(personality, "a", "1.0.0")).toBeNull();
  });

  it("porcentagens somam 100", () => {
    expect(percentages([1, 1, 1])).toEqual([34, 33, 33]);
    expect(percentages([6, 3, 2, 1])).toEqual([50, 25, 17, 8]);
  });
});
