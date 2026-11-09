import { describe, expect, it } from "vitest";
import { DURACAO, adicionar, confere, novoEstado, servir, step, type Estado } from "./ramen";

function seq(seed = 1) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
}

function rodar(e: Estado, seg: number) {
  for (let i = 0; i < seg * 60; i++) step(e, 1 / 60);
}

function montarPedido(e: Estado, assento: number) {
  const p = e.assentos[assento]!.pedido;
  adicionar(e, p.caldo);
  for (const x of p.extras) adicionar(e, x);
}

function primeiroOcupado(e: Estado) {
  return e.assentos.findIndex(Boolean);
}

describe("ramen do ichiraku", () => {
  it("chega cliente logo no começo", () => {
    const e = novoEstado(seq());
    rodar(e, 1);
    expect(primeiroOcupado(e)).toBeGreaterThanOrEqual(0);
  });

  it("ordem dos extras não importa", () => {
    expect(confere({ caldo: "shoyu", extras: ["ovo", "nori"] }, { caldo: "shoyu", extras: ["nori", "ovo"] })).toBe(true);
    expect(confere({ caldo: "misso", extras: ["ovo", "nori"] }, { caldo: "shoyu", extras: ["nori", "ovo"] })).toBe(false);
    expect(confere({ caldo: "shoyu", extras: ["ovo"] }, { caldo: "shoyu", extras: ["nori", "ovo"] })).toBe(false);
  });

  it("tocar num extra de novo tira ele da tigela", () => {
    const e = novoEstado(seq());
    adicionar(e, "ovo");
    adicionar(e, "ovo");
    expect(e.tigela.extras).toEqual([]);
  });

  it("acertar soma pontos e sobe o combo, que multiplica", () => {
    const e = novoEstado(seq(3));
    rodar(e, 1);
    let a = primeiroOcupado(e);
    montarPedido(e, a);
    const r1 = servir(e, a);
    expect(r1.resultado).toBe("certo");
    expect(e.combo).toBe(1);
    expect(e.assentos[a]).toBeNull();
    rodar(e, 6);
    a = primeiroOcupado(e);
    const extras = e.assentos[a]!.pedido.extras.length;
    montarPedido(e, a);
    const r2 = servir(e, a);
    expect(r2.ganho).toBeGreaterThan(60 + extras * 20);
    expect(e.combo).toBe(2);
  });

  it("errar zera o combo e joga a tigela fora", () => {
    const e = novoEstado(seq(5));
    rodar(e, 1);
    const a = primeiroOcupado(e);
    e.combo = 3;
    const errado = e.assentos[a]!.pedido.caldo === "misso" ? "shoyu" : "misso";
    adicionar(e, errado);
    expect(servir(e, a).resultado).toBe("errado");
    expect(e.combo).toBe(0);
    expect(e.tigela.caldo).toBeNull();
    expect(e.assentos[a]).not.toBeNull();
  });

  it("cliente sem paciência vai embora e quebra o combo", () => {
    const e = novoEstado(seq());
    rodar(e, 1);
    e.combo = 2;
    rodar(e, 25);
    expect(e.perdidos).toBeGreaterThan(0);
    expect(e.combo).toBe(0);
  });

  it("o turno acaba quando o tempo zera", () => {
    const e = novoEstado(seq());
    rodar(e, DURACAO + 1);
    expect(e.status).toBe("fim");
  });
});
