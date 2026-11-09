import { describe, expect, it } from "vitest";
import { aplicar, emXeque, lanceCpu, lancesLegais, novoEstado, type Estado } from "./shogi";

describe("mini shogi", () => {
  it("começa com 14 lances legais pro jogador", () => {
    expect(lancesLegais(novoEstado()).length).toBe(14);
  });

  it("captura vai pra mão e pode ser largada", () => {
    const e = novoEstado();
    e.tab[2 * 5 + 0] = { lado: 1, tipo: "P", prom: false };
    const cap = lancesLegais(e).find((l) => "de" in l && l.de === 15 && l.para === 10)!;
    const prox = aplicar(e, cap);
    expect(prox.maos[0].P).toBe(1);
  });

  it("não deixa o próprio rei em xeque", () => {
    const e = novoEstado();
    const todos = lancesLegais(e).map((l) => aplicar(e, l));
    expect(todos.every((p: Estado) => !emXeque(p, 0))).toBe(true);
  });

  it("CPU sempre devolve um lance legal", () => {
    let e = novoEstado();
    for (let i = 0; i < 10 && lancesLegais(e).length; i++) {
      const l = lanceCpu(e, "genin")!;
      expect(lancesLegais(e)).toContainEqual(l);
      e = aplicar(e, l);
    }
  });
});
