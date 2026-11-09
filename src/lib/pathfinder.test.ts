import { describe, expect, it } from "vitest";
import { FICHA_VAZIA, ajustar, atributos, calcular, lerFicha, normalizarFicha, pendencias, periciasParaEscolher, resumoFicha, type Ficha } from "./pathfinder";

// Anã clériga acólita: exemplo bem comum de mesa.
const ana: Ficha = {
  nome: "Brunhilda",
  ancestralidade: "anao",
  antecedente: "acolito",
  classe: "clerigo",
  chave: "sab",
  boostsAncestral: ["for"],
  boostAntecedente: "sab",
  boostAntecedenteLivre: "con",
  boostsLivres: ["for", "con", "sab", "int"],
  pericias: ["medicina", "diplomacia", "natureza"],
};

describe("pathfinder 2e", () => {
  it("soma boosts e falha", () => {
    expect(atributos(ana)).toEqual({ for: 2, des: 0, con: 3, int: 1, sab: 4, car: -1 });
  });

  it("calcula PV, CA, salvamentos e perícias no nível 1", () => {
    const c = calcular(ana);
    expect(c.pv).toBe(10 + 8 + 3);
    expect(c.ca).toBe(13);
    expect(c.vontade).toBe(4 + 1 + 4);
    expect(c.fortitude).toBe(2 + 1 + 3);
    expect(c.percepcao).toBe(2 + 1 + 4);
    expect(c.cdClasse).toBe(10 + 3 + 4);
    const religiao = c.pericias.find((p) => p.id === "religiao")!;
    expect(religiao).toMatchObject({ prof: "treinado", bonus: 7 });
    expect(c.pericias.find((p) => p.id === "acrobatismo")).toMatchObject({ prof: "destreinado", bonus: 0 });
  });

  it("perícias a escolher = classe + Inteligência", () => {
    expect(periciasParaEscolher(ana)).toBe(3);
    expect(pendencias(ana)).toEqual([]);
  });

  it("aponta o que falta", () => {
    const p = pendencias(FICHA_VAZIA);
    expect(p[0]).toMatch(/nome/);
    expect(p.length).toBeGreaterThan(3);
    expect(pendencias({ ...ana, boostsLivres: ["for", "for", "con", "sab"] }).join()).toMatch(/boosts livres/);
  });

  it("ajustar limpa escolhas que deixaram de valer", () => {
    const f = ajustar({ ...ana, classe: "ladino" });
    expect(f.chave).toBe("des");
    expect(f.pericias).toEqual(["medicina", "diplomacia", "natureza"]);
    const g = ajustar({ ...ana, ancestralidade: "elfo", antecedente: "guarda" });
    expect(g.boostAntecedente).toBe("");
    expect(g.boostsAncestral).toEqual(["for"]);
  });

  it("lê ficha guardada e ignora lixo", () => {
    expect(lerFicha(JSON.stringify(ana))).toEqual(ana);
    expect(lerFicha("{quebrado")).toBeNull();
    expect(lerFicha(JSON.stringify({ classe: "nada", pericias: ["xyz"] }))).toEqual(FICHA_VAZIA);
  });

  it("normaliza o que vem do banco e resume em uma linha", () => {
    expect(normalizarFicha(ana)).toEqual(ana);
    expect(normalizarFicha(null)).toBeNull();
    expect(normalizarFicha({ nome: 42, classe: ["mago"] })).toEqual(FICHA_VAZIA);
    expect(resumoFicha(ana)).toBe("Anão · Clérigo");
    expect(resumoFicha(FICHA_VAZIA)).toBe("");
  });
});
