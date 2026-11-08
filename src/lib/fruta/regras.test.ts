import { describe, expect, it } from "vitest";
import {
  AGUA_Y,
  BASE,
  FASE_TESTE,
  LISTA_PODERES,
  PODERES,
  QUICA_MINIMO,
  afundou,
  alcanceDoPulo,
  alturaDoPulo,
  estrelas,
  formataTempo,
  moedasDoPoder,
  quique,
  sortear,
  velocidadeX,
  ventoLigado,
  type Ret,
} from "./regras";

describe("movimento", () => {
  it("acelera até a velocidade máxima e não passa", () => {
    let vx = 0;
    for (let i = 0; i < 60; i++) vx = velocidadeX(vx, 1, true, 1 / 60, BASE);
    expect(vx).toBe(BASE.velocidade);
  });

  it("para rápido no chão ao soltar", () => {
    let vx = BASE.velocidade;
    for (let i = 0; i < 6; i++) vx = velocidadeX(vx, 0, true, 1 / 60, BASE);
    expect(vx).toBe(0);
  });

  it("vira mais rápido do que acelera do zero", () => {
    const virando = velocidadeX(BASE.velocidade, -1, true, 1 / 60, BASE);
    const doZero = velocidadeX(0, -1, true, 1 / 60, BASE);
    expect(BASE.velocidade - virando).toBeGreaterThan(-doZero);
  });

  it("a Borracha escorrega: demora bem mais pra parar", () => {
    const quadrosPraParar = (p = BASE) => {
      let vx = p.velocidade;
      let n = 0;
      while (vx > 0) {
        vx = velocidadeX(vx, 0, true, 1 / 60, p);
        n++;
      }
      return n;
    };
    expect(quadrosPraParar(PODERES.borracha)).toBeGreaterThan(quadrosPraParar() * 3);
  });
});

describe("poderes", () => {
  it("só a Borracha quica, e só em queda forte", () => {
    expect(quique(800, PODERES.borracha)).toBeGreaterThan(0);
    expect(quique(QUICA_MINIMO - 1, PODERES.borracha)).toBe(0);
    for (const p of LISTA_PODERES.filter((p) => p.id !== "borracha")) expect(quique(800, p)).toBe(0);
  });

  it("o Gigante pula mais baixo que todo mundo", () => {
    for (const p of LISTA_PODERES.filter((p) => p.id !== "gigante")) {
      expect(alturaDoPulo(PODERES.gigante)).toBeLessThan(alturaDoPulo(p));
    }
  });

  it("o vento pesa mais na Nanica que na Fumaça, e não mexe nos outros", () => {
    expect(PODERES.nanica.vento).toBeGreaterThan(PODERES.fumaca.vento);
    for (const id of ["borracha", "gigante", "soluco"] as const) expect(PODERES[id].vento).toBe(0);
  });

  it("o sorteio cobre todas as frutas e o Soluço é raro", () => {
    const contagem: Record<string, number> = {};
    const N = 10_000;
    for (let i = 0; i < N; i++) {
      const id = sortear(i / N).id;
      contagem[id] = (contagem[id] ?? 0) + 1;
    }
    for (const p of LISTA_PODERES) expect(contagem[p.id]).toBeGreaterThan(0);
    expect(contagem.soluco / N).toBeLessThan(0.1);
    expect(sortear(0.9999999).id).toBe("soluco");
  });

  it("vento sopra em rajadas", () => {
    const v = FASE_TESTE.ventos[0];
    expect(ventoLigado(v, 0)).toBe(true);
    expect(ventoLigado(v, v.ligado + 0.1)).toBe(false);
    expect(ventoLigado(v, v.ligado + v.desligado + 0.1)).toBe(true);
  });
});

describe("água", () => {
  it("afunda só quando os pés passam da superfície", () => {
    expect(afundou(AGUA_Y)).toBe(false);
    expect(afundou(AGUA_Y + 10)).toBe(true);
  });
});

describe("estrelas", () => {
  const fase = { tempoAlvo: 20 };
  it("1 por chegar", () => expect(estrelas({ tempo: 99, moedas: 0, totalMoedas: 5 }, fase)).toBe(1));
  it("+1 pelo tempo", () => expect(estrelas({ tempo: 19, moedas: 0, totalMoedas: 5 }, fase)).toBe(2));
  it("+1 por todas as moedas", () => expect(estrelas({ tempo: 19, moedas: 5, totalMoedas: 5 }, fase)).toBe(3));
});

it("formata tempo como m:ss.cc", () => {
  expect(formataTempo(7.5)).toBe("0:07.50");
  expect(formataTempo(83.456)).toBe("1:23.46");
});

describe("fase de teste", () => {
  const f = FASE_TESTE;
  const ilhas = f.solidos.filter((s) => s.h >= 30);

  // Rota padrão: tudo que fica embaixo (y >= 300), inclusive pedra e grade, que os outros pulam por cima.
  const rota: Ret[] = [...f.solidos, ...f.frageis, ...f.quebraveis, ...f.grades]
    .filter((s) => s.y >= 300)
    .sort((a, b) => a.x - b.x);

  for (const p of LISTA_PODERES) {
    it(`${p.nome} alcança todos os vãos e degraus da rota padrão`, () => {
      const alcance = (alcanceDoPulo(p) + p.largura) * 0.8;
      const altura = alturaDoPulo(p) - 8;
      let antes = rota[0];
      for (const r of rota.slice(1)) {
        const fim = antes.x + antes.w;
        const subida = antes.y - r.y;
        expect(subida, `degrau até x=${r.x}`).toBeLessThan(altura);
        if (r.x >= fim) {
          expect(r.x - fim, `vão até x=${r.x}`).toBeLessThan(alcance);
          antes = r;
        } else if (r.x + r.w > fim) {
          antes = r;
        }
      }
    });
  }

  it("só a Nanica cabe embaixo da pedra", () => {
    const pedra = f.solidos.find((s) => s.h >= 30 && s.y + s.h < AGUA_Y)!;
    const chao = ilhas.find((s) => pedra.x >= s.x && pedra.x < s.x + s.w && s.y > pedra.y)!;
    const vao = chao.y - (pedra.y + pedra.h);
    for (const p of LISTA_PODERES) expect(p.altura < vao, p.nome).toBe(p.id === "nanica");
  });

  it("o Gigante passa embaixo do degrau fino", () => {
    const degrau = f.solidos.find((s) => s.h < 30 && s.x === 2480)!;
    expect(420 - (degrau.y + degrau.h)).toBeGreaterThan(PODERES.gigante.altura);
  });

  it("os ganchos ficam ao alcance um do outro e da ilha de onde se sai", () => {
    const g = f.ganchos;
    expect(Math.hypot(g[0].x - 1480, g[0].y - 400)).toBeLessThan(PODERES.borracha.gancho);
    for (let i = 1; i < g.length; i++) {
      expect(Math.hypot(g[i].x - g[i - 1].x, g[i].y - g[i - 1].y)).toBeLessThan(PODERES.borracha.gancho);
    }
  });

  it("cada fruta tem um atalho só dela, menos o Soluço", () => {
    const base = moedasDoPoder(f, "soluco").length;
    for (const id of ["borracha", "gigante", "fumaca", "nanica"] as const) {
      expect(moedasDoPoder(f, id).length, id).toBeGreaterThan(base);
    }
  });

  it("começa e termina em terra firme, acima da água", () => {
    const sobre = (x: number) => ilhas.some((s) => x >= s.x && x <= s.x + s.w && s.y < AGUA_Y);
    expect(sobre(f.inicio.x)).toBe(true);
    expect(sobre(f.bau.x)).toBe(true);
  });

  it("todas as moedas ficam fora da água e dentro da fase", () => {
    for (const m of f.moedas) {
      expect(m.y).toBeLessThan(AGUA_Y - 20);
      expect(m.x).toBeGreaterThan(0);
      expect(m.x).toBeLessThan(f.largura);
    }
  });
});
