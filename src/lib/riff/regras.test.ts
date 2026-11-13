import { describe, expect, it } from "vitest";
import { RIFF } from "./config";
import { ativarEnergia, avancar, criarEstado, resultado, tocar } from "./motor";
import {
  calcularOffset,
  diferencaParaBatida,
  estrelas,
  julgar,
  maxPossivel,
  maxTeorico,
  multiplicador,
  normalizarMapa,
  precisao,
  quantizar,
  tempoDaMusica,
  validarPartida,
} from "./regras";

describe("janela de acerto", () => {
  it("Perfeito até 50ms, Boa até 100ms, nos dois lados", () => {
    expect(julgar(0)).toBe("perfeito");
    expect(julgar(50)).toBe("perfeito");
    expect(julgar(-50)).toBe("perfeito");
    expect(julgar(51)).toBe("boa");
    expect(julgar(-100)).toBe("boa");
    expect(julgar(101)).toBeNull();
    expect(julgar(-150)).toBeNull();
  });

  it("usa as janelas passadas", () => {
    expect(julgar(30, { perfeito: 20, boa: 40 })).toBe("boa");
  });
});

describe("multiplicador de combo", () => {
  it("x1 até 9, x2 de 10 a 19, x3 de 20 a 29, x4 a partir de 30", () => {
    expect([0, 1, 9].map(multiplicador)).toEqual([1, 1, 1]);
    expect([10, 19].map(multiplicador)).toEqual([2, 2]);
    expect([20, 29].map(multiplicador)).toEqual([3, 3]);
    expect([30, 500].map(multiplicador)).toEqual([4, 4]);
  });

  it("errar ou apertar sem nota zera o combo", () => {
    const e = criarEstado([
      { t: 1000, lane: 0 },
      { t: 2000, lane: 1 },
      { t: 3000, lane: 2 },
    ]);
    tocar(e, 0, 1000);
    expect(e.combo).toBe(1);
    expect(tocar(e, 3, 1500).tipo).toBe("vazio");
    expect(e.combo).toBe(0);
    tocar(e, 1, 2010);
    expect(e.combo).toBe(1);
    avancar(e, 3200); // a nota de 3000 passou
    expect(e.combo).toBe(0);
    expect(resultado(e)).toMatchObject({ perfect: 2, good: 0, miss: 1, maxCombo: 1, score: 200 });
  });

  it("a energia dobra os pontos por 8s", () => {
    const notas = Array.from({ length: 25 }, (_, i) => ({ t: 1000 + i * 500, lane: i % 4 }));
    const e = criarEstado(notas);
    for (let i = 0; i < 20; i++) tocar(e, notas[i].lane, notas[i].t);
    expect(e.energia).toBe(1);
    const t = notas[20].t;
    expect(ativarEnergia(e, t - 10)).toBe(true);
    const ev = tocar(e, notas[20].lane, t);
    expect(ev).toMatchObject({ tipo: "acerto", pontos: 100 * 3 * 2 });
    expect(ativarEnergia(e, t)).toBe(false);
    avancar(e, t - 10 + RIFF.energia.duracaoMs);
    expect(e.energiaAte).toBeNull();
  });
});

describe("offset de calibração", () => {
  it("tempo da música desconta o início e o offset", () => {
    expect(tempoDaMusica(12.5, 10, 0)).toBe(2500);
    expect(tempoDaMusica(12.5, 10, 40)).toBe(2460);
    expect(tempoDaMusica(12.5, 10, -20)).toBe(2520);
  });

  it("um toque atrasado vira Perfeito depois do offset", () => {
    const notas = [{ t: 1000, lane: 0 }];
    const semOffset = criarEstado(notas);
    expect(tocar(semOffset, 0, tempoDaMusica(11.08, 10, 0))).toMatchObject({ julgamento: "boa" });
    const comOffset = criarEstado(notas);
    expect(tocar(comOffset, 0, tempoDaMusica(11.08, 10, 70))).toMatchObject({ julgamento: "perfeito" });
  });

  it("calcula o offset pela média sem os toques fora da curva", () => {
    expect(calcularOffset([30, 32, 28, 31, 29, 30, 400])).toBe(30);
    expect(calcularOffset([10, 20])).toBeNull();
    expect(calcularOffset(Array(8).fill(900))).toBe(RIFF.offsetLimiteMs);
  });

  it("acha a batida mais próxima", () => {
    expect(diferencaParaBatida(1030, [500, 1000, 1500])).toBe(30);
    expect(diferencaParaBatida(1480, [500, 1000, 1500])).toBe(-20);
  });
});

describe("pontuação máxima", () => {
  it("teto com tudo Perfeito e energia ligada", () => {
    // 9 x 100 x1 + 1 x 100 x2, tudo x2 da energia
    expect(maxTeorico(10)).toBe((900 + 200) * 2);
    expect(maxPossivel(0, 0)).toBe(0);
  });

  const ok = { score: 1000, accuracy: precisao(10, 0, 0), maxCombo: 10, perfect: 10, good: 0, miss: 0 };

  it("aceita partida possível", () => {
    expect(validarPartida(ok, 10)).toBeNull();
    expect(validarPartida({ ...ok, score: maxTeorico(10) }, 10)).toBeNull();
  });

  it("recusa pontuação acima do máximo do mapa", () => {
    expect(validarPartida({ ...ok, score: maxTeorico(10) + 50 }, 10)).toMatch(/máximo/);
    const goods = { score: maxPossivel(10, 0), accuracy: precisao(0, 10, 0), maxCombo: 10, perfect: 0, good: 10, miss: 0 };
    expect(validarPartida(goods, 10)).toMatch(/máximo/);
  });

  it("recusa contagens que não batem", () => {
    expect(validarPartida({ ...ok, perfect: 11 }, 10)).toMatch(/contagem/);
    expect(validarPartida({ ...ok, maxCombo: 11 }, 10)).toMatch(/combo/);
    expect(validarPartida({ ...ok, accuracy: 50 }, 10)).toMatch(/precisão/);
    expect(validarPartida({ ...ok, score: 1025 }, 10)).toMatch(/impossível/);
    expect(validarPartida({ ...ok, score: -50 }, 10)).toMatch(/inválidos/);
  });

  it("uma partida simulada sempre passa na validação", () => {
    const notas = Array.from({ length: 60 }, (_, i) => ({ t: 1000 + i * 250, lane: i % 4 }));
    const e = criarEstado(notas);
    notas.forEach((n, i) => {
      if (i === 15) ativarEnergia(e, n.t);
      if (i % 7 !== 3) tocar(e, n.lane, n.t + (i % 3 === 0 ? 70 : 10));
    });
    avancar(e, 99999);
    expect(validarPartida(resultado(e), notas.length)).toBeNull();
  });
});

describe("estrelas, grade e mapa", () => {
  it("estrelas pela precisão", () => {
    expect([100, 95, 90, 75, 55, 10].map(estrelas)).toEqual([5, 5, 4, 3, 2, 1]);
  });

  it("quantiza na grade do BPM", () => {
    expect(quantizar(260, 120, 4)).toBe(250);
    expect(quantizar(1190, 120, 2)).toBe(1250);
  });

  it("normaliza o mapa e recusa nota inválida", () => {
    expect(normalizarMapa([{ t: 500, lane: 1 }, { t: 100, lane: 0 }, { t: 100, lane: 0 }], 1000)).toEqual([
      { t: 100, lane: 0 },
      { t: 500, lane: 1 },
    ]);
    expect(normalizarMapa([{ t: 100, lane: 4 }], 1000)).toBeNull();
    expect(normalizarMapa([{ t: 2000, lane: 0 }], 1000)).toBeNull();
  });
});
