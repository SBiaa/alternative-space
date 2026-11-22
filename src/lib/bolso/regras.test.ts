import { describe, expect, it } from "vitest";
import { REGRAS } from "./config";
import { dado } from "./rng";
import { atributosValidos, faixaDe, resolverTeste, rolarDados } from "./regras";

const SEED = "semente-de-teste";

describe("teste de atributo: 2d6 + atributo contra a dificuldade", () => {
  const soma = rolarDados(SEED, 1).reduce((a, b) => a + b, 0);
  const entrada = { atributo: "mente" as const, valorAtributo: 2, talento: false, dificuldade: 0 };
  const total = soma + 2;

  it("sucesso quando o total alcança a dificuldade", () => {
    const r = resolverTeste(SEED, 1, { ...entrada, dificuldade: total });
    expect(r.total).toBe(total);
    expect(r.faixa).toBe("sucesso");
    expect(resolverTeste(SEED, 1, { ...entrada, dificuldade: total - 1 }).faixa).toBe("sucesso");
  });

  it("sucesso com custo até 2 pontos abaixo", () => {
    expect(resolverTeste(SEED, 1, { ...entrada, dificuldade: total + 1 }).faixa).toBe("custo");
    expect(resolverTeste(SEED, 1, { ...entrada, dificuldade: total + REGRAS.margemCusto }).faixa).toBe("custo");
  });

  it("falha que avança a história mais abaixo que isso", () => {
    expect(resolverTeste(SEED, 1, { ...entrada, dificuldade: total + REGRAS.margemCusto + 1 }).faixa).toBe("falha");
  });

  it("as três faixas saem da mesma função, sem lacuna entre elas", () => {
    for (let t = 0; t < 30; t++) {
      expect(["sucesso", "custo", "falha"]).toContain(faixaDe(t, 12));
    }
    expect(faixaDe(12, 12)).toBe("sucesso");
    expect(faixaDe(11, 12)).toBe("custo");
    expect(faixaDe(10, 12)).toBe("custo");
    expect(faixaDe(9, 12)).toBe("falha");
  });

  it("explica a conta em texto", () => {
    const r = resolverTeste(SEED, 1, { ...entrada, dificuldade: total });
    expect(r.texto).toBe(`2d6 = ${soma} (${r.dados.join(" + ")}), + Mente 2 = ${total}, contra ${total}: sucesso`);
  });
});

describe("talento", () => {
  it("soma +1 e aparece na conta", () => {
    const sem = resolverTeste(SEED, 3, { atributo: "corpo", valorAtributo: 2, talento: false, dificuldade: 9 });
    const com = resolverTeste(SEED, 3, { atributo: "corpo", valorAtributo: 2, talento: true, talentoNome: "Corredor", dificuldade: 9 });
    expect(com.dados).toEqual(sem.dados);
    expect(com.total).toBe(sem.total + REGRAS.bonusTalento);
    expect(com.texto).toContain("+ talento Corredor 1");
    expect(sem.texto).not.toContain("talento");
  });

  it("pode mudar a faixa: um ponto a mais vira sucesso", () => {
    const base = resolverTeste(SEED, 3, { atributo: "corpo", valorAtributo: 2, talento: false, dificuldade: 0 }).total;
    const dif = base + 1;
    expect(resolverTeste(SEED, 3, { atributo: "corpo", valorAtributo: 2, talento: false, dificuldade: dif }).faixa).toBe("custo");
    expect(resolverTeste(SEED, 3, { atributo: "corpo", valorAtributo: 2, talento: true, dificuldade: dif }).faixa).toBe("sucesso");
  });
});

describe("rolagens com semente", () => {
  it("mesma seed e mesmo número de rolagem dão o mesmo resultado", () => {
    const a = Array.from({ length: 20 }, (_, n) => resolverTeste(SEED, n + 1, { atributo: "labia", valorAtributo: 3, talento: false, dificuldade: 8 }));
    const b = Array.from({ length: 20 }, (_, n) => resolverTeste(SEED, n + 1, { atributo: "labia", valorAtributo: 3, talento: false, dificuldade: 8 }));
    expect(a).toEqual(b);
  });

  it("seed ou número diferentes dão sequências diferentes", () => {
    const seq = (seed: string) => Array.from({ length: 30 }, (_, n) => rolarDados(seed, n + 1).join(","));
    expect(seq("a1b2c3")).not.toEqual(seq("z9y8x7"));
    expect(new Set(seq(SEED)).size).toBeGreaterThan(5);
  });

  it("todo dado fica entre 1 e 6 e a distribuição passa por todas as faces", () => {
    const vistos = new Set<number>();
    for (let n = 1; n <= 300; n++) {
      const d = dado(SEED, n, 0, REGRAS.faces);
      expect(d).toBeGreaterThanOrEqual(1);
      expect(d).toBeLessThanOrEqual(REGRAS.faces);
      vistos.add(d);
    }
    expect(vistos.size).toBe(REGRAS.faces);
  });
});

describe("atributos da personagem", () => {
  it("aceita 1 a 4 somando o orçamento", () => {
    expect(atributosValidos({ corpo: 2, mente: 3, labia: 2 })).toBe(true);
    expect(atributosValidos({ corpo: 4, mente: 2, labia: 1 })).toBe(true);
  });
  it("recusa fora da faixa, fora do orçamento e fracionado", () => {
    expect(atributosValidos({ corpo: 5, mente: 1, labia: 1 })).toBe(false);
    expect(atributosValidos({ corpo: 0, mente: 4, labia: 3 })).toBe(false);
    expect(atributosValidos({ corpo: 2, mente: 2, labia: 2 })).toBe(false);
    expect(atributosValidos({ corpo: 2.5, mente: 2.5, labia: 2 })).toBe(false);
  });
});
