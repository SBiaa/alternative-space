import { describe, expect, it } from "vitest";
import { CHAO, MARGEM, NINJAS, PERSONAGENS, VITORIAS, W, cpu, entradaVazia, novaLuta, novaMente, passo, vencedorDaLuta, type Entrada, type Luta } from "./luta";

const DT = 1 / 60;

function seq(seed = 1) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
}

function rodar(l: Luta, segundos: number, a: (t: number) => Partial<Entrada> = () => ({}), b: (t: number) => Partial<Entrada> = () => ({})) {
  for (let i = 0; i < segundos * 60; i++) passo(l, DT, { ...entradaVazia(), ...a(i) }, { ...entradaVazia(), ...b(i) });
}

function emLuta(idA = "luffy", idB = "zoro") {
  const l = novaLuta(idA, idB);
  rodar(l, 2); // passa a introdução
  expect(l.fase).toBe("luta");
  return l;
}

// Cola os dois um do lado do outro.
function colar(l: Luta) {
  l.a.x = W / 2 - 50;
  l.b.x = W / 2 + 50;
}

describe("luta", () => {
  it("ninguém se mexe durante a introdução", () => {
    const l = novaLuta("luffy", "zoro");
    const x = l.a.x;
    rodar(l, 1, () => ({ dir: true }));
    expect(l.a.x).toBe(x);
  });

  it("soco que acerta tira vida", () => {
    const l = emLuta();
    colar(l);
    rodar(l, 0.6, (i) => ({ soco: i === 0 }));
    expect(l.b.vida).toBe(l.b.p.vida - l.a.p.golpes.soco.dano);
  });

  it("defesa segurando pra trás quase anula o dano", () => {
    const l = emLuta();
    colar(l);
    rodar(l, 0.6, (i) => ({ soco: i === 0 }), () => ({ dir: true }));
    const perdeu = l.b.p.vida - l.b.vida;
    expect(perdeu).toBeGreaterThan(0);
    expect(perdeu).toBeLessThan(l.a.p.golpes.soco.dano / 4);
  });

  it("especial só sai com energia e gasta energia", () => {
    const l = emLuta();
    colar(l);
    l.a.energia = 0;
    rodar(l, 0.1, (i) => ({ especial: i === 0 }));
    expect(l.a.estado).toBe("livre");
    l.a.energia = 100;
    rodar(l, 0.05, (i) => ({ especial: i === 0 }));
    expect(l.a.estado).toBe("golpe");
    expect(l.a.energia).toBeLessThan(100);
  });

  it("corte voador do Zoro atravessa a tela e acerta", () => {
    const l = emLuta("zoro", "nami");
    l.a.energia = 100;
    rodar(l, 1.5, (i) => ({ especial: i === 0 }));
    expect(l.b.vida).toBeLessThan(l.b.p.vida);
  });

  it("KO dá a vitória do round e a luta acaba em 2 rounds", () => {
    const l = emLuta();
    l.b.vida = 1;
    colar(l);
    rodar(l, 0.6, (i) => ({ soco: i === 0 }));
    expect(l.fase).toBe("ko");
    expect(l.a.vitorias).toBe(1);
    rodar(l, 3.5);
    expect(l.round).toBe(2);
    expect(l.b.vida).toBe(l.b.p.vida);
    rodar(l, 2);
    l.b.vida = 1;
    colar(l);
    rodar(l, 0.6, (i) => ({ soco: i === 0 }));
    rodar(l, 3.5);
    expect(l.fase).toBe("fim");
    expect(vencedorDaLuta(l)).toBe(0);
    expect(l.a.vitorias).toBe(VITORIAS);
  });

  it("tempo esgotado: ganha quem tem mais vida", () => {
    const l = emLuta();
    l.a.vida = 500;
    l.relogio = 0.01;
    rodar(l, 0.1);
    expect(l.tempoEsgotado).toBe(true);
    expect(l.resultado).toBe(1);
  });

  it("CPU contra CPU nunca trava nem sai da arena", () => {
    for (const a of PERSONAGENS)
      for (const b of PERSONAGENS) {
        const l = novaLuta(a.id, b.id);
        const ma = novaMente();
        const mb = novaMente();
        const r = seq(a.id.length * 7 + b.id.length);
        for (let i = 0; i < 60 * 240 && l.fase !== "fim"; i++) {
          passo(l, DT, cpu(l, 0, ma, "dificil", r, DT), cpu(l, 1, mb, "normal", r, DT));
          for (const f of [l.a, l.b]) {
            expect(f.x).toBeGreaterThanOrEqual(MARGEM);
            expect(f.x).toBeLessThanOrEqual(W - MARGEM);
            expect(f.y).toBeLessThanOrEqual(CHAO);
            expect(Number.isFinite(f.vida)).toBe(true);
          }
        }
        expect(l.fase).toBe("fim");
      }
  }, 30_000); // 16 lutas inteiras: demora em máquina carregada
});

describe("duelo ninja", () => {
  it("shuriken do Kakashi tira vida mas não derruba", () => {
    const l = emLuta("kakashi", "naruto");
    rodar(l, 1, (i) => ({ chute: i === 0 }));
    expect(l.b.vida).toBeLessThan(l.b.p.vida);
    expect(l.b.estado).not.toBe("caido");
  });

  it("bola de fogo do Sasuke atravessa a tela e derruba", () => {
    const l = emLuta("sasuke", "sakura");
    l.a.energia = 100;
    rodar(l, 0.5, (i) => ({ especial: i === 0 })); // 0,4 s de selos antes do fogo sair
    expect(l.projeteis.some((p) => p.tipo === "fogo")).toBe(true);
    rodar(l, 1);
    expect(l.b.vida).toBeLessThan(l.b.p.vida);
  });

  it("soco no chão da Sakura não pega quem está pulando", () => {
    const l = emLuta("sakura", "kakashi");
    colar(l);
    l.a.energia = 100;
    // O Kakashi pula na hora em que o chão racha.
    rodar(l, 0.8, (i) => ({ especial: i === 0 }), (i) => ({ cima: i === 14 }));
    expect(l.b.vida).toBe(l.b.p.vida);
  });

  it("shuriken e bola de fogo se anulam no meio do caminho", () => {
    const l = emLuta("sasuke", "kakashi");
    l.a.energia = 100;
    rodar(l, 1.2, (i) => ({ especial: i === 0 }), (i) => ({ chute: i === 18 }));
    expect(l.a.vida).toBe(l.a.p.vida);
    expect(l.b.vida).toBe(l.b.p.vida);
  });

  it("CPU contra CPU com ninjas termina a luta", () => {
    for (const a of NINJAS)
      for (const b of NINJAS) {
        const l = novaLuta(a.id, b.id);
        const ma = novaMente();
        const mb = novaMente();
        const r = seq(a.id.length * 5 + b.id.length);
        for (let i = 0; i < 60 * 240 && l.fase !== "fim"; i++) {
          passo(l, DT, cpu(l, 0, ma, "dificil", r, DT), cpu(l, 1, mb, "normal", r, DT));
          for (const f of [l.a, l.b]) {
            expect(f.x).toBeGreaterThanOrEqual(MARGEM);
            expect(f.x).toBeLessThanOrEqual(W - MARGEM);
          }
        }
        expect(l.fase).toBe("fim");
      }
  }, 30_000);
});
