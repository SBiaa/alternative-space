import { describe, expect, it } from "vitest";
import { H, PLAYER_X, PX_POR_METRO, W, colide, metros, nivelDe, novoEstado, paredes, rank, regras, step, vao } from "./picles";

// Rand previsível pra o mundo ser sempre igual nos testes.
function seq(seed = 1) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
}

describe("túnel", () => {
  it("nunca deixa as paredes saírem da tela", () => {
    const e = novoEstado(seq());
    for (let x = 0; x < 200_000; x += 37) {
      const { teto, chao } = paredes(e.tunel, x);
      expect(teto).toBeGreaterThanOrEqual(21);
      expect(chao).toBeLessThanOrEqual(H - 21);
    }
  });

  it("aperta com a distância, até um mínimo", () => {
    expect(vao(0)).toBeGreaterThan(vao(20_000));
    expect(vao(1_000_000)).toBe(240);
  });
});

describe("física", () => {
  it("cai solto e sobe segurando", () => {
    const solto = novoEstado(seq());
    step(solto, 0.1, false, seq());
    expect(solto.y).toBeGreaterThan(H / 2);

    const segura = novoEstado(seq());
    step(segura, 0.1, true, seq());
    expect(segura.y).toBeLessThan(H / 2);
  });

  it("morre ao bater no teto", () => {
    const e = novoEstado(seq());
    let n = 0;
    while (!e.morto && n++ < 500) step(e, 1 / 60, true, seq());
    expect(e.morto).toBe(true);
    expect(e.causa).toBe("parede");
  });

  it("bate em cano e em rato", () => {
    const e = novoEstado(seq());
    e.obstaculos = [{ tipo: "cano", x: PLAYER_X - 10, y: e.y - 5, w: 40, h: 10 }];
    expect(colide(e)).toBe("cano");
    e.obstaculos = [{ tipo: "rato", x: PLAYER_X + 20, y0: e.y, y: e.y, fase: 0, vx: 100 }];
    expect(colide(e)).toBe("rato");
  });

  it("gera obstáculos à frente e descarta os que ficaram pra trás", () => {
    const e = novoEstado(seq());
    const r = seq(7);
    for (let i = 0; i < 300; i++) {
      // Segura no meio do vão pra testar só a geração.
      const { teto, chao } = paredes(e.tunel, e.dist + PLAYER_X);
      e.y = (teto + chao) / 2;
      e.vy = 0;
      e.obstaculos = e.obstaculos.filter((o) => Math.abs(o.x - e.dist - PLAYER_X) > 80);
      step(e, 1 / 60, false, r);
      e.morto = false;
    }
    expect(e.obstaculos.length).toBeGreaterThan(0);
    for (const o of e.obstaculos) expect(o.x - e.dist).toBeGreaterThan(-130);
    expect(e.proximo).toBeGreaterThan(e.dist + W);
  });
});

describe("justiça", () => {
  it("todo cano deixa pelo menos 90px livres pra passar", () => {
    let menor = Infinity;
    for (let run = 0; run < 8; run++) {
      const e = novoEstado(seq(run + 3));
      const r = seq(run + 50);
      e.dist = run * 5000; // começa em níveis diferentes de aperto
      e.proximo = e.dist + 900;
      for (let i = 0; i < 1500; i++) {
        const { teto, chao } = paredes(e.tunel, e.dist + PLAYER_X);
        e.y = (teto + chao) / 2;
        e.vy = 0;
        e.morto = false;
        e.obstaculos = e.obstaculos.filter((o) => o.x - e.dist > 260);
        step(e, 1 / 60, false, r);
        for (const o of e.obstaculos) {
          if (o.tipo !== "cano") continue;
          for (let x = o.x; x <= o.x + o.w; x += 4) {
            const p = paredes(e.tunel, x);
            const cima = o.y - p.teto;
            const baixo = p.chao - (o.y + o.h);
            menor = Math.min(menor, o.y <= 0 ? baixo : o.y + o.h >= H ? cima : Math.max(cima, baixo));
          }
        }
      }
    }
    expect(menor).toBeGreaterThanOrEqual(90);
  });
});

describe("níveis", () => {
  it("sobe a cada 100 m e para no 10", () => {
    expect(nivelDe(0)).toBe(1);
    expect(nivelDe(99 * PX_POR_METRO)).toBe(1);
    expect(nivelDe(100 * PX_POR_METRO)).toBe(2);
    expect(nivelDe(5000 * PX_POR_METRO)).toBe(10);
  });

  it("nível 1 é o mais fácil: mais lento, sem rato, obstáculos mais espaçados", () => {
    const um = regras(1);
    const dez = regras(10);
    expect(um.chanceRato).toBe(0);
    expect(um.vel).toBeLessThan(dez.vel);
    expect(um.espaco).toBeGreaterThan(dez.espaco);
  });

  it("marca a subida de nível e dá um respiro sem obstáculo", () => {
    const e = novoEstado(seq());
    e.dist = 100 * PX_POR_METRO - 1;
    e.proximo = 0;
    const { teto, chao } = paredes(e.tunel, e.dist + PLAYER_X);
    e.y = (teto + chao) / 2;
    step(e, 1 / 60, false, seq());
    expect(e.nivel).toBe(2);
    expect(e.nivelEm).toBe(e.tempo);
    expect(e.proximo).toBeGreaterThanOrEqual(e.dist + W + 300);
  });
});

describe("placar", () => {
  it("converte distância em metros e dá título", () => {
    expect(metros(400)).toBe(10);
    expect(rank(0).titulo).toBe("Picles de conserva");
    expect(rank(9999).titulo).toBe("Picles Rick, o próprio");
  });
});
