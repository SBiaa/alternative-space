import { describe, expect, it } from "vitest";
import { DILEMAS, dilemaValido, porcentagens, temOutrosVotos } from "@/lib/dilemas";

describe("porcentagens", () => {
  it("soma 100 mesmo com dízima", () => {
    expect(porcentagens([1, 1, 1])).toEqual([34, 33, 33]);
    expect(porcentagens([2, 1]).reduce((a, b) => a + b)).toBe(100);
  });
  it("sem votos dá zero", () => {
    expect(porcentagens([0, 0])).toEqual([0, 0]);
  });
});

describe("temOutrosVotos", () => {
  it("não mostra número quando o único voto é o seu", () => {
    expect(temOutrosVotos({ total: 1, contagem: [1, 0] }, true)).toBe(false);
    expect(temOutrosVotos({ total: 0, contagem: [0, 0] }, false)).toBe(false);
  });
  it("mostra quando tem voto de outra pessoa", () => {
    expect(temOutrosVotos({ total: 2, contagem: [1, 1] }, true)).toBe(true);
    expect(temOutrosVotos({ total: 1, contagem: [1, 0] }, false)).toBe(true);
  });
});

describe("dilemaValido", () => {
  it("aceita só dilema e opção que existem", () => {
    const d = DILEMAS[0];
    expect(dilemaValido(d.id, 0)).toBe(true);
    expect(dilemaValido(d.id, d.opcoes.length)).toBe(false);
    expect(dilemaValido(d.id, 1.5)).toBe(false);
    expect(dilemaValido("nada", 0)).toBe(false);
  });
  it("ids não se repetem", () => {
    expect(new Set(DILEMAS.map((d) => d.id)).size).toBe(DILEMAS.length);
  });
});
