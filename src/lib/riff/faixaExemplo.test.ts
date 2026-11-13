import { describe, expect, it } from "vitest";
import { DIFICULDADES } from "./config";
import { duracaoExemplo, mapaExemplo } from "./faixaExemplo";
import { normalizarMapa } from "./regras";

describe("faixa de exemplo", () => {
  it("dura entre 30 e 45 segundos", () => {
    expect(duracaoExemplo).toBeGreaterThanOrEqual(30000);
    expect(duracaoExemplo).toBeLessThanOrEqual(45000);
  });

  it("tem 3 mapas válidos, cada um mais cheio que o anterior", () => {
    const totais = DIFICULDADES.map((d) => {
      const m = mapaExemplo(d);
      expect(normalizarMapa(m, duracaoExemplo)).toEqual(m);
      return m.length;
    });
    expect(totais[0]).toBeLessThan(totais[1]);
    expect(totais[1]).toBeLessThan(totais[2]);
  });
});
