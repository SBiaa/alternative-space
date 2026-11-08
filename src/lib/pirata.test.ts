import { describe, expect, it } from "vitest";
import { CATEGORIAS, PADRAO, codigoPirata, lerPirata, nomePirata, pirataValido, recompensa, sortearPirata } from "./pirata";

describe("código do pirata", () => {
  it("vai e volta sem perder peça", () => {
    const p = { pele: 4, chapeu: 5, barba: 4, cicatriz: 1, roupa: 3, arma: 3, bicho: 4 };
    expect(codigoPirata(p)).toBe("pirata:4-5-4-1-3-3-4");
    expect(lerPirata(codigoPirata(p))).toEqual(p);
  });

  it("recusa código torto", () => {
    for (const v of [null, 42, "", "/quiz/x/y.webp", "pirata:", "pirata:1-1-1", "pirata:1-1-1-1-1-1-1-1", "pirata:1-1-1-1-1-1-99", "pirata:a-1-1-1-1-1-1", "pirata:1-1-1-1--1-1"]) {
      expect(pirataValido(v)).toBe(false);
    }
  });

  it("aceita a última opção de cada categoria e recusa a seguinte", () => {
    const ultimo = CATEGORIAS.map((c) => c.opcoes.length - 1).join("-");
    expect(pirataValido(`pirata:${ultimo}`)).toBe(true);
    const fora = CATEGORIAS.map((c, i) => (i === 0 ? c.opcoes.length : 0)).join("-");
    expect(pirataValido(`pirata:${fora}`)).toBe(false);
  });

  it("sorteio sempre dá pirata válido", () => {
    expect(pirataValido(codigoPirata(sortearPirata(() => 0.9999)))).toBe(true);
    expect(sortearPirata(() => 0)).toEqual({ pele: 0, chapeu: 0, barba: 0, cicatriz: 0, roupa: 0, arma: 0, bicho: 0 });
  });
});

describe("cartaz", () => {
  it("monta o nome pelas peças", () => {
    expect(nomePirata(PADRAO)).toBe("Imediato Caolho do Papagaio");
    expect(nomePirata({ ...PADRAO, chapeu: 2, cicatriz: 0, arma: 3, bicho: 0 })).toBe("Capitão Mão-de-Gancho");
    expect(nomePirata({ ...PADRAO, chapeu: 0, cicatriz: 0, arma: 0, barba: 4, bicho: 4 })).toBe("Corsário Barba-Ruiva dos Oito Braços");
  });

  it("recompensa é sempre a mesma pro mesmo pirata e rei vale mais", () => {
    expect(recompensa(PADRAO)).toBe(recompensa({ ...PADRAO }));
    expect(recompensa({ ...PADRAO, chapeu: 5 })).toBeGreaterThan(50000);
  });
});
