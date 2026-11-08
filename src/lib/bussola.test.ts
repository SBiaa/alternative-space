import { describe, expect, it } from "vitest";
import {
  AVISO_BUSSOLA,
  H,
  NAVIO_R,
  PX_POR_MILHA,
  VIDAS,
  W,
  avisandoGiro,
  girar,
  milhas,
  nivelDe,
  novoEstado,
  pontos,
  rank,
  regras,
  step,
  type Estado,
} from "./bussola";

// Rand previsível pra o mundo ser sempre igual nos testes.
function seq(seed = 1) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
}

const parado = { x: 0, y: 0 };

// Mar vazio: tira tudo que foi gerado e empurra a geração pra longe.
function limpo(e: Estado): Estado {
  e.coisas = [];
  e.proximo = 1e9;
  e.reiTimer = 1e9;
  e.bussola.trocaEm = 1e9;
  return e;
}

describe("girar", () => {
  it("rot 0 não mexe, rot 2 inverte", () => {
    expect(girar(1, 0, 0)).toEqual([1, 0]);
    expect(girar(1, 0, 2)).toEqual([-1, 0]);
    expect(girar(0, -1, 2)).toEqual([0, 1]);
  });

  it("quarto de volta: direita vira baixo, cima vira direita", () => {
    expect(girar(1, 0, 1)).toEqual([0, 1]);
    expect(girar(0, -1, 1)).toEqual([1, 0]);
    expect(girar(1, 0, 3)).toEqual([0, -1]);
  });
});

describe("bússola", () => {
  it("avisa antes de girar e depois troca a rotação", () => {
    const rand = seq();
    const e = novoEstado(rand);
    e.reiTimer = 1e9;
    const alvo = e.bussola.proxima;
    const quando = e.bussola.trocaEm;
    expect(alvo).not.toBe(0);

    while (e.tempo < quando - AVISO_BUSSOLA - 0.1) step(e, 1 / 60, parado, rand);
    expect(avisandoGiro(e)).toBe(false);
    while (e.tempo < quando - 0.1) step(e, 1 / 60, parado, rand);
    expect(avisandoGiro(e)).toBe(true);
    expect(e.bussola.rot).toBe(0);
    while (e.tempo < quando + 0.05) step(e, 1 / 60, parado, rand);
    expect(e.bussola.rot).toBe(alvo);
    expect(avisandoGiro(e)).toBe(false);
  });

  it("nos primeiros níveis só inverte", () => {
    expect(regras(1).rotacoes).toEqual([0, 2]);
    expect(regras(5).rotacoes).toEqual([0, 1, 2, 3]);
  });

  it("com a bússola invertida, apertar → leva pra esquerda", () => {
    const e = limpo(novoEstado(seq()));
    e.bussola.rot = 2;
    const x0 = e.x;
    for (let i = 0; i < 30; i++) step(e, 1 / 60, { x: 1, y: 0 }, seq());
    expect(e.x).toBeLessThan(x0);
  });
});

describe("navio", () => {
  it("anda na direção apertada e não sai da tela", () => {
    const e = limpo(novoEstado(seq()));
    for (let i = 0; i < 300; i++) step(e, 1 / 60, { x: 0, y: 1 }, seq());
    expect(e.y).toBeLessThanOrEqual(H - NAVIO_R);
    expect(e.y).toBeGreaterThan(H - 40);
  });

  it("redemoinho puxa pro centro", () => {
    const e = limpo(novoEstado(seq()));
    e.coisas.push({ tipo: "redemoinho", x: e.dist + e.x, y: e.y + 100, r: 60 });
    const y0 = e.y;
    for (let i = 0; i < 10; i++) step(e, 1 / 60, parado, seq());
    expect(e.y).toBeGreaterThan(y0);
  });

  it("dá pra escapar do redemoinho remando", () => {
    const e = limpo(novoEstado(seq()));
    e.vel = 0;
    e.coisas.push({ tipo: "redemoinho", x: e.dist + e.x, y: e.y + 40, r: 60 });
    const y0 = e.y;
    for (let i = 0; i < 30; i++) step(e, 1 / 60, { x: 0, y: -1 }, seq());
    expect(e.y).toBeLessThan(y0);
  });
});

describe("dano", () => {
  it("miolo do redemoinho tira uma vida e dá invulnerabilidade", () => {
    const e = limpo(novoEstado(seq()));
    e.coisas.push({ tipo: "redemoinho", x: e.dist + e.x, y: e.y, r: 60 });
    step(e, 1 / 60, parado, seq());
    expect(e.vidas).toBe(VIDAS - 1);
    expect(e.invulneravel).toBeGreaterThan(0);
    step(e, 1 / 60, parado, seq());
    expect(e.vidas).toBe(VIDAS - 1);
  });

  it("perde a última vida e morre", () => {
    const e = limpo(novoEstado(seq()));
    e.vidas = 1;
    e.coisas.push({ tipo: "redemoinho", x: e.dist + e.x, y: e.y, r: 60 });
    step(e, 1 / 60, parado, seq());
    expect(e.morto).toBe(true);
    expect(e.causa).toBe("redemoinho");
  });

  it("rei do mar acerta quem fica na linha e poupa quem sai", () => {
    const fica = limpo(novoEstado(seq()));
    fica.reis.push({ y: fica.y, aviso: 0.2, cabeca: W + 80 });
    for (let i = 0; i < 90; i++) step(fica, 1 / 60, parado, seq());
    expect(fica.vidas).toBe(VIDAS - 1);

    const foge = limpo(novoEstado(seq()));
    foge.reis.push({ y: foge.y, aviso: 1.3, cabeca: W + 80 });
    for (let i = 0; i < 150; i++) step(foge, 1 / 60, { x: 0, y: 1 }, seq());
    expect(foge.vidas).toBe(VIDAS);
  });

  it("raio só machuca no estalo e se estiver perto", () => {
    const e = limpo(novoEstado(seq()));
    e.raios.push({ x: e.dist + e.x, y: e.y, t: 0.05, aceso: 0.3 });
    e.raios.push({ x: e.dist + e.x, y: e.y + 200, t: 0.05, aceso: 0.3 });
    step(e, 0.03, parado, seq());
    expect(e.vidas).toBe(VIDAS);
    step(e, 0.03, parado, seq());
    expect(e.vidas).toBe(VIDAS - 1);
  });
});

describe("coleta e progresso", () => {
  it("pega moeda e reparo", () => {
    const e = limpo(novoEstado(seq()));
    e.vidas = 1;
    e.coisas.push({ tipo: "moeda", x: e.dist + e.x, y: e.y }, { tipo: "reparo", x: e.dist + e.x + 5, y: e.y });
    step(e, 1 / 60, parado, seq());
    expect(e.moedas).toBe(1);
    expect(e.vidas).toBe(2);
    expect(pontos(e)).toBe(milhas(e.dist) + 10);
  });

  it("sobe de nível pela distância", () => {
    expect(nivelDe(0)).toBe(1);
    expect(nivelDe(150 * PX_POR_MILHA)).toBe(2);
    expect(nivelDe(1e9)).toBe(8);
  });

  it("gera redemoinhos sempre dentro da tela", () => {
    const rand = seq(7);
    const e = novoEstado(rand);
    e.vidas = 1e9;
    for (let i = 0; i < 60 * 120; i++) {
      step(e, 1 / 60, { x: Math.sin(i / 50), y: Math.cos(i / 70) }, rand);
      for (const c of e.coisas) {
        if (c.tipo === "redemoinho") {
          expect(c.y - c.r).toBeGreaterThanOrEqual(0);
          expect(c.y + c.r).toBeLessThanOrEqual(H);
        }
      }
    }
    expect(e.nivel).toBeGreaterThan(2);
  });

  it("rank cresce com os pontos", () => {
    expect(rank(0).titulo).not.toBe(rank(2000).titulo);
  });
});
