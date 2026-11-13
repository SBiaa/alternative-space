import { describe, expect, it } from "vitest";
import { FICHA_VAZIA, calcular, normalizarFicha, type Ficha } from "./pathfinder";
import { JOGO_VAZIO, normalizarJogo } from "./pathfinder-condicoes";
import { descansar, emJogo } from "./pathfinder-jogo";

const ana: Ficha = {
  ...FICHA_VAZIA,
  nome: "Brunhilda",
  ancestralidade: "anao",
  heranca: "anao-rocha",
  antecedente: "acolito",
  classe: "clerigo",
  chave: "sab",
  boostsAncestral: ["for"],
  boostAntecedente: "sab",
  boostAntecedenteLivre: "con",
  boostsLivres: ["for", "con", "sab", "int"],
  armas: [{ id: "maca", potencia: 0, golpe: 0 }],
};
const com = (j: Partial<Ficha["jogo"]>): Ficha => ({ ...ana, jogo: { ...JOGO_VAZIO, ...j } });

describe("pathfinder 2e em jogo", () => {
  it("começa com PV cheio e os mesmos números da ficha", () => {
    const base = calcular(ana);
    const e = emJogo(ana);
    expect(e.pv).toBe(base.pv);
    expect(e.pvMax).toBe(base.pv);
    expect(e.ca).toBe(base.ca);
  });

  it("penalidades de estado não somam: vale a maior", () => {
    const base = calcular(ana);
    const e = emJogo(com({ condicoes: { amedrontado: 2, desajeitado: 1 } }));
    expect(e.ca).toBe(base.ca - 2);
    expect(e.vontade).toBe(base.vontade - 2);
    expect(emJogo(com({ condicoes: { desajeitado: 3, amedrontado: 1 } })).reflexos).toBe(base.reflexos - 3);
    expect(emJogo(com({ condicoes: { enfraquecido: 2 } })).ataques[0].bonus).toBe(base.ataques[0].bonus - 2);
    expect(emJogo(com({ condicoes: { enfraquecido: 2 } })).vontade).toBe(base.vontade);
  });

  it("aplica cansado, desprevenido e drenado", () => {
    const base = calcular(ana);
    const e = emJogo(com({ condicoes: { cansado: 1, desprevenido: 1, drenado: 1 } }));
    expect(e.ca).toBe(base.ca - 3);
    expect(e.fortitude).toBe(base.fortitude - 1);
    expect(e.pvMax).toBe(base.pv - 1);
    expect(emJogo(com({ condicoes: { condenado: 1 } })).morreEm).toBe(3);
  });

  it("descanso recupera PV, espaços e foco e alivia condições", () => {
    const d = descansar({ ...JOGO_VAZIO, pvAtual: 3, focoGasto: 1, espacosGastos: ["r1-1"], condicoes: { cansado: 1, drenado: 2, amedrontado: 1 } });
    expect(d.pvAtual).toBeNull();
    expect(d.focoGasto).toBe(0);
    expect(d.espacosGastos).toEqual([]);
    expect(d.condicoes).toEqual({ drenado: 1, amedrontado: 1 });
    expect(descansar({ ...JOGO_VAZIO, condicoes: { drenado: 1 } }).condicoes).toEqual({});
  });

  it("limpa estado de jogo inválido e carrega save antigo", () => {
    expect(normalizarJogo({ pvAtual: -5, heroi: 9, espacosGastos: ["r1-1", "lixo"], condicoes: { amedrontado: 2, voando: 1, cansado: 0 } })).toEqual({
      pvAtual: 0,
      pvTemp: 0,
      heroi: 3,
      focoGasto: 0,
      espacosGastos: ["r1-1"],
      condicoes: { amedrontado: 2 },
    });
    const velho = normalizarFicha({ nome: "X" })!;
    expect(velho.jogo).toEqual(JOGO_VAZIO);
    expect(velho.idiomasExtras).toEqual([]);
  });
});
