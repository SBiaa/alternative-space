// Confere o conteúdo de content/: um erro de digitação num JSON quebra a página, então pegamos aqui.
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { categories } from "@/lib/blog-shared";
import { getPosts } from "@/lib/blog";
import { colecoes } from "@/lib/colecoes";
import { getResult, quizzes, resultTheme, staticResultIds, type QuizData } from "@/lib/quiz";

const colors = Object.keys(resultTheme);

function checkQuiz(quiz: QuizData) {
  if (quiz.kind === "party") {
    expect(quiz.slots.length).toBeGreaterThan(0);
    for (const s of quiz.slots) {
      expect(s.options.length, s.q).toBeGreaterThan(0);
      expect(s.options.length, `${s.role}: o código tem um dígito por slot`).toBeLessThanOrEqual(10);
      for (const o of s.options) expect(Object.keys(quiz.vibes), `${s.role} / ${o.name}`).toContain(o.vibe);
    }
    for (const [k, v] of Object.entries(quiz.vibes)) expect(colors, `vibe ${k}`).toContain(v.color);
    return;
  }

  if (quiz.kind === "conhecimento") {
    expect(quiz.questions.length).toBeGreaterThan(0);
    for (const q of quiz.questions) {
      expect(q.options.length, q.q).toBeGreaterThan(1);
      expect(q.answer, `${q.q}: resposta certa fora das opções`).toBeGreaterThanOrEqual(0);
      expect(q.answer, `${q.q}: resposta certa fora das opções`).toBeLessThan(q.options.length);
    }
    for (const id of staticResultIds(quiz)) {
      const r = getResult(quiz, id);
      expect(r, `${id} acertos não cai em nenhuma faixa`).toBeDefined();
      expect(colors).toContain(r!.color);
    }
    return;
  }

  expect(quiz.questions.length).toBeGreaterThan(0);
  const reached = new Set<string>();
  for (const q of quiz.questions) {
    expect(q.options.length, q.q).toBeGreaterThan(1);
    for (const o of q.options) {
      expect(Object.keys(quiz.results), `${q.q} / ${o.text}`).toContain(o.result);
      reached.add(o.result);
    }
  }
  for (const [k, r] of Object.entries(quiz.results)) {
    expect(reached, `resultado ${k} não aparece em nenhuma opção`).toContain(k);
    expect(colors, `resultado ${k}`).toContain(r.color);
  }
}

describe("quizzes", () => {
  it.each(Object.entries(quizzes))("%s está consistente", (_slug, quiz) => {
    expect(quiz.intro.title).toBeTruthy();
    expect(quiz.resultPrefix).toBeTruthy();
    checkQuiz(quiz);
  });
});

describe("coleções", () => {
  it.each(Object.entries(colecoes))("%s está consistente", (_slug, c) => {
    expect(colors).toContain(c.color);
    expect(c.preview).toBeGreaterThanOrEqual(0);
    expect(c.preview).toBeLessThanOrEqual(c.pieces.length);
    for (const p of c.pieces) if (p.image) expect(fs.existsSync(path.join("public", p.image)), p.image).toBe(true);
  });
});

describe("blog", () => {
  const posts = getPosts();

  it("tem posts com slug único, do mais novo pro mais antigo", () => {
    expect(posts.length).toBeGreaterThan(0);
    expect(new Set(posts.map((p) => p.slug)).size).toBe(posts.length);
    const dates = posts.map((p) => Date.parse(p.date));
    expect(dates).toEqual([...dates].sort((a, b) => b - a));
  });

  it.each(posts.map((p) => [p.slug, p] as const))("%s tem metadados válidos", (_s, p) => {
    expect(p.title).toBeTruthy();
    expect(categories).toContain(p.category);
    expect(Number.isNaN(Date.parse(p.date))).toBe(false);
    expect(fs.existsSync(path.join("public", p.cover)), p.cover).toBe(true);
  });
});
