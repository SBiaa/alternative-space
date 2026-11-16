import { describe, expect, it } from "vitest";
import { ANCESTRALIDADES, CLASSES, FICHA_VAZIA, calcular, pendencias, type Ficha } from "./pathfinder";
import { COMBATE_CLASSE } from "./pathfinder-equip";
import { vagasMagia } from "./pathfinder-magia";
import { sugestoesTalento } from "./pathfinder-talentos";

const gata: Ficha = {
  ...FICHA_VAZIA,
  nome: "Mia",
  ancestralidade: "catfolk",
  heranca: "catfolk-garras",
  antecedente: "acolito",
  classe: "animista",
  chave: "sab",
  boostsAncestral: ["con"],
  boostAntecedente: "sab",
  boostAntecedenteLivre: "des",
  boostsLivres: ["sab", "con", "des", "int"],
};

describe("classes e ancestralidades extras", () => {
  it("toda classe tem dados de combate e toda ancestralidade tem heranças", () => {
    for (const c of CLASSES) expect(COMBATE_CLASSE[c.id], c.id).toBeDefined();
    for (const a of ANCESTRALIDADES) expect(a.herancas.length, a.id).toBeGreaterThanOrEqual(4);
    expect(new Set(CLASSES.map((c) => c.id)).size).toBe(CLASSES.length);
    expect(new Set(ANCESTRALIDADES.flatMap((a) => a.herancas.map((h) => h.id))).size).toBe(ANCESTRALIDADES.flatMap((a) => a.herancas).length);
  });

  it("monta uma catfolk animista", () => {
    const c = calcular(gata);
    expect(c.pv).toBe(8 + 8 + c.attr.con);
    expect(c.sentidos).toBe("Visão na penumbra");
    expect(c.magia?.tradicao).toBe("divina");
    expect(pendencias(gata)).not.toContain("Escolha a herança.");
    expect(sugestoesTalento("ancestralidade", 1, "catfolk", "animista")).toContain("Pés de Gato");
    expect(sugestoesTalento("classe", 1, "catfolk", "animista")).toContain("Canalizar Aparição");
  });

  it("usa os sentidos da herança quando ela muda", () => {
    expect(calcular({ ...gata, ancestralidade: "iruxi", heranca: "iruxi-caverna" }).sentidos).toBe("Visão no escuro");
  });

  it("conjurador limitado só tem os dois círculos mais altos", () => {
    const circulos = (nivel: number) => vagasMagia({ classe: "magus", nivel }).filter((v) => v.circulo > 0).map((v) => v.circulo);
    expect(circulos(1)).toEqual([1]);
    expect(circulos(2)).toEqual([1, 1]);
    expect(circulos(5)).toEqual([2, 2, 3]);
    expect(circulos(6)).toEqual([2, 2, 3, 3]);
  });
});
