import { describe, expect, it, vi } from "vitest";
import { NINJAS, PERSONAGENS, cpu, entradaVazia, novaLuta, novaMente, passo, type Entrada, type Luta } from "./luta";
import { antesDoPasso, sonsDoQuadro } from "./lutaSom";
import type { Som } from "./som";

const tocados: Som[] = [];
vi.mock("./som", () => ({ tocar: (s: Som) => tocados.push(s) }));

const DT = 1 / 60;

function rodar(l: Luta, segundos: number, a: (i: number) => Partial<Entrada> = () => ({}), b: (i: number) => Partial<Entrada> = () => ({})) {
  for (let i = 0; i < segundos * 60; i++) {
    const antes = antesDoPasso(l);
    passo(l, DT, { ...entradaVazia(), ...a(i) }, { ...entradaVazia(), ...b(i) });
    sonsDoQuadro(l, antes);
    l.eventos.length = 0;
  }
}

function emLuta(a: string, b: string) {
  const l = novaLuta(a, b);
  rodar(l, 2);
  l.a.x = 430;
  l.b.x = 530;
  l.a.energia = 100;
  tocados.length = 0;
  return l;
}

describe("sons da luta", () => {
  it("toca o gongo quando a luta começa", () => {
    tocados.length = 0;
    rodar(novaLuta("naruto", "sasuke"), 2);
    expect(tocados).toEqual(["luta"]);
  });

  it("soco: vento do golpe e depois o acerto", () => {
    const l = emLuta("naruto", "sasuke");
    rodar(l, 0.5, (i) => ({ soco: i === 0 }));
    expect(tocados).toEqual(["golpe", "acerto"]);
  });

  it("defesa faz o som de bloqueio", () => {
    const l = emLuta("naruto", "sasuke");
    l.a.x = 470; // bem colado: segurar pra trás faz o Sasuke recuar um pouco
    rodar(l, 0.5, (i) => ({ soco: i === 0 }), () => ({ dir: true }));
    expect(tocados).toContain("bloqueio");
  });

  it("pulo", () => {
    const l = emLuta("naruto", "sasuke");
    rodar(l, 0.2, (i) => ({ cima: i === 0 }));
    expect(tocados).toEqual(["pulo"]);
  });

  it.each([
    ["naruto", "rasengan"],
    ["kakashi", "chidori"],
    ["sasuke", "fogo"],
    ["sakura", "tremor"],
    ["nami", "raio"],
    ["zoro", "corte"],
    ["sanji", "fogo"],
  ] as const)("especial do %s toca %s", (quem, som) => {
    const l = emLuta(quem, quem === "naruto" ? "sasuke" : "naruto");
    rodar(l, 1, (i) => ({ especial: i === 0 }));
    expect(tocados[0]).toBe("carga");
    expect(tocados).toContain(som);
  });

  it("shuriken do Kakashi", () => {
    const l = emLuta("kakashi", "naruto");
    rodar(l, 0.4, (i) => ({ chute: i === 0 }));
    expect(tocados).toContain("shuriken");
  });

  it("luta inteira CPU x CPU: todo projétil lançado faz som", () => {
    for (const elenco of [NINJAS, PERSONAGENS]) {
      const l = novaLuta(elenco[0].id, elenco[1].id);
      const ma = novaMente();
      const mb = novaMente();
      let projeteis = 0;
      tocados.length = 0;
      for (let i = 0; i < 60 * 240 && l.fase !== "fim"; i++) {
        const antes = antesDoPasso(l);
        const ja = new Set(l.projeteis);
        passo(l, DT, cpu(l, 0, ma, "dificil", Math.random, DT), cpu(l, 1, mb, "dificil", Math.random, DT));
        projeteis += l.projeteis.filter((p) => !ja.has(p)).length;
        sonsDoQuadro(l, antes);
        l.eventos.length = 0;
      }
      const sonsProjetil = tocados.filter((s) => ["fogo", "shuriken", "tremor", "corte", "raio"].includes(s)).length;
      expect(sonsProjetil).toBeGreaterThanOrEqual(projeteis);
      expect(tocados.filter((s) => s === "luta").length).toBeGreaterThanOrEqual(2);
    }
  }, 30_000);
});
