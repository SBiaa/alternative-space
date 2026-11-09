import { describe, expect, it } from "vitest";
import { MAX_ERROS, PUZZLES, alternar, enviar, novoEstado, type Estado } from "./conexoes";

const marcar = (e: Estado, nomes: string[]) => nomes.reduce(alternar, e);

describe("conexoes", () => {
  it("cada puzzle tem 16 nomes únicos em 4 grupos de 4", () => {
    for (const p of PUZZLES) {
      const nomes = p.grupos.flatMap((g) => g.nomes);
      expect(p.grupos).toHaveLength(4);
      expect(new Set(nomes).size).toBe(16);
    }
  });

  it("acertar os quatro vence", () => {
    let e = novoEstado(0);
    for (const g of PUZZLES[0].grupos) e = enviar(marcar(e, g.nomes)).estado;
    expect(e.status).toBe("venceu");
    expect(e.restantes).toHaveLength(0);
  });

  it("avisa quando falta um e perde depois de 4 erros", () => {
    const [a, b] = PUZZLES[0].grupos;
    let e = novoEstado(0);
    const r = enviar(marcar(e, [...a.nomes.slice(0, 3), b.nomes[0]]));
    expect(r.resultado).toBe("quase");
    expect(enviar(r.estado).resultado).toBe("repetido");
    e = r.estado;
    for (let i = 1; i < MAX_ERROS; i++) {
      e = marcar({ ...e, selecao: [] }, [a.nomes[0], b.nomes[0], b.nomes[1], PUZZLES[0].grupos[2].nomes[i - 1]]);
      e = enviar(e).estado;
    }
    expect(e.status).toBe("perdeu");
    expect(e.achados).toHaveLength(4);
  });

  it("não seleciona mais de 4", () => {
    const e = marcar(novoEstado(0), PUZZLES[0].grupos[0].nomes.concat("Itachi"));
    expect(e.selecao).toHaveLength(4);
  });
});
