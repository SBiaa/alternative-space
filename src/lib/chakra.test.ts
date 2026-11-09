import { describe, expect, it } from "vitest";
import { BONUS_VIDA, FASES, VIDAS, apertar, cancelar, julgar, novoEstado, soltar, step, zona, type Estado } from "./chakra";

function seq(seed = 1) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
}

// Segura até a carga chegar no centro da faixa e solta.
function acertar(e: Estado) {
  apertar(e);
  for (let i = 0; i < 2000 && e.status === "carregando"; i++) {
    if (e.carga >= zona(e).centro) soltar(e);
    else step(e, 1 / 240);
  }
}

function esperarResultado(e: Estado, rand = seq()) {
  for (let i = 0; i < 200 && e.status === "resultado"; i++) step(e, 1 / 30, rand);
}

describe("julgar", () => {
  it("dá perfeito no meio, bom na borda e erro fora", () => {
    expect(julgar(0.6, 0.6, 0.2)).toBe("perfeito");
    expect(julgar(0.68, 0.6, 0.2)).toBe("bom");
    expect(julgar(0.45, 0.6, 0.2)).toBe("pouco");
    expect(julgar(0.75, 0.6, 0.2)).toBe("demais");
    expect(julgar(1, 0.95, 0.2)).toBe("demais");
  });
});

describe("faixa", () => {
  it("fica sempre dentro da barra, em todas as fases", () => {
    const rand = seq(7);
    for (let f = 0; f < FASES.length; f++) {
      for (let k = 0; k < 50; k++) {
        const e = novoEstado(rand);
        e.fase = f;
        e.zonaBase = 0;
        // sorteia de novo pela fase certa passando por uma troca de passo
        e.status = "resultado";
        e.espera = 0;
        step(e, 0.01, rand);
        for (let t = 0; t < 10; t += 0.1) {
          e.t = t;
          const z = zona(e);
          expect(z.centro - z.largura / 2).toBeGreaterThan(0.3);
          expect(z.centro + z.largura / 2).toBeLessThan(1);
        }
      }
    }
  });
});

describe("partida", () => {
  it("segurar demais estoura sozinho e tira uma vida", () => {
    const e = novoEstado(seq());
    apertar(e); // sai do cartão da fase
    apertar(e); // começa a carregar
    for (let i = 0; i < 1000 && e.status === "carregando"; i++) step(e, 1 / 60);
    expect(e.ultima?.nota).toBe("demais");
    expect(e.vidas).toBe(VIDAS - 1);
  });

  it("perder todas as vidas acaba o jogo", () => {
    const e = novoEstado(seq());
    apertar(e);
    for (let v = 0; v < VIDAS; v++) {
      apertar(e);
      soltar(e); // carga 0: pouco chakra
      esperarResultado(e);
    }
    expect(e.status).toBe("fim");
  });

  it("acertando tudo passa pelas três fases e ganha bônus das vidas", () => {
    const rand = seq(3);
    const e = novoEstado(rand);
    let antesDoBonus = 0;
    for (let f = 0; f < FASES.length; f++) {
      expect(e.status).toBe("intro");
      expect(e.fase).toBe(f);
      apertar(e);
      for (let p = 0; p < FASES[f].passos; p++) {
        acertar(e);
        expect(["perfeito", "bom"]).toContain(e.ultima?.nota);
        antesDoBonus = e.pontos;
        esperarResultado(e, rand);
      }
    }
    expect(e.status).toBe("vitoria");
    expect(e.pontos).toBe(antesDoBonus + VIDAS * BONUS_VIDA);
  });

  it("cancelar descarta a carga sem gastar vida", () => {
    const e = novoEstado(seq());
    apertar(e);
    apertar(e);
    step(e, 0.5);
    cancelar(e);
    expect(e.status).toBe("pronto");
    expect(e.carga).toBe(0);
    expect(e.vidas).toBe(VIDAS);
  });
});
