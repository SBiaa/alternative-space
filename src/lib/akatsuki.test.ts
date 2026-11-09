import { describe, expect, it } from "vitest";
import { H, NINJA_X, VIDAS, apertar, novoEstado, pontos, soltar, step } from "./akatsuki";

function seq(seed = 1) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
}

function rodar(e: ReturnType<typeof novoEstado>, seg: number) {
  for (let i = 0; i < seg * 60; i++) step(e, 1 / 60);
}

describe("fuga da akatsuki", () => {
  it("só começa a correr no primeiro toque", () => {
    const e = novoEstado(seq());
    rodar(e, 1);
    expect(e.distancia).toBe(0);
    apertar(e);
    soltar(e);
    rodar(e, 0.5);
    expect(e.distancia).toBeGreaterThan(0);
  });

  it("pulo duplo funciona uma vez só no ar", () => {
    const e = novoEstado(seq());
    apertar(e);
    rodar(e, 0.1);
    expect(e.noChao).toBe(false);
    apertar(e);
    expect(e.pulosNoAr).toBe(0);
    const vy = e.vy;
    apertar(e);
    expect(e.vy).toBe(vy);
  });

  it("soltar cedo deixa o pulo mais baixo", () => {
    const alto = novoEstado(seq());
    const baixo = novoEstado(seq());
    apertar(alto);
    apertar(baixo);
    soltar(baixo);
    let minAlto = H, minBaixo = H;
    for (let i = 0; i < 40; i++) {
      step(alto, 1 / 60);
      step(baixo, 1 / 60);
      minAlto = Math.min(minAlto, alto.y);
      minBaixo = Math.min(minBaixo, baixo.y);
    }
    expect(minAlto).toBeLessThan(minBaixo - 40);
  });

  it("cair no vão acaba o jogo", () => {
    const e = novoEstado(seq());
    apertar(e);
    soltar(e);
    e.telhados = [{ x: 3000, w: 100, y: 330 }];
    e.shurikens = [];
    rodar(e, 3);
    expect(e.status).toBe("fim");
  });

  it("shuriken tira vida e dá invulnerabilidade", () => {
    const e = novoEstado(seq());
    apertar(e);
    soltar(e);
    rodar(e, 1);
    e.proximaShuriken = 99;
    e.shurikens = [{ x: NINJA_X + 14, y: e.y - 22, vx: 0, giro: 0 }, { x: NINJA_X + 14, y: e.y - 22, vx: 0, giro: 0 }];
    step(e, 1 / 60);
    expect(e.vidas).toBe(VIDAS - 1);
  });

  it("pergaminho soma pontos", () => {
    const e = novoEstado(seq());
    apertar(e);
    soltar(e);
    rodar(e, 1);
    const antes = pontos(e);
    e.itens = [{ x: NINJA_X + 10, y: e.y - 20, pego: false }];
    step(e, 1 / 60);
    expect(e.pergaminhos).toBe(1);
    expect(pontos(e)).toBeGreaterThanOrEqual(antes + 50);
  });

  it("vãos gerados sempre cabem num pulo duplo", () => {
    const f = novoEstado(seq(3));
    f.vel = 620;
    f.telhados = [{ x: 0, w: 300, y: 330 }];
    f.status = "correndo";
    step(f, 0);
    for (let i = 1; i < f.telhados.length; i++) {
      const vao = f.telhados[i].x - (f.telhados[i - 1].x + f.telhados[i - 1].w);
      expect(vao).toBeLessThanOrEqual(230);
    }
  });
});
