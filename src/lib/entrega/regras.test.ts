import { describe, expect, it } from "vitest";
import { ENTREGA } from "./config";
import {
  aderenciaEfetiva,
  aplicarImplantes,
  creditosDaEntrega,
  danoDaBatida,
  gorjeta,
  intensidadeChuva,
  multiplicadorSequencia,
  resumir,
  statusDoPrazo,
  tetoDoTurno,
  validarCompra,
  validarEquipar,
  validarTurno,
  type PedidoFeito,
} from "./regras";

const base = aplicarImplantes([]);
const ok = (n: number, estado = 100): PedidoFeito[] => Array.from({ length: n }, () => ({ base: 20, fragil: false, status: "no_prazo", estado }));

describe("gorjeta", () => {
  it("no prazo paga cheia, atrasado metade, cancelado nada", () => {
    expect(gorjeta(20, "no_prazo", 100)).toBe(20);
    expect(gorjeta(20, "atrasado", 100)).toBe(10);
    expect(gorjeta(20, "cancelado", 100)).toBe(0);
  });
  it("multiplica pelo estado do pacote", () => {
    expect(gorjeta(20, "no_prazo", 50)).toBe(10);
    expect(gorjeta(20, "atrasado", 50)).toBe(5);
    expect(gorjeta(20, "no_prazo", 0)).toBe(0);
  });
  it("créditos aplicam o multiplicador da sequência", () => {
    expect(creditosDaEntrega(20, 1)).toBe(20);
    expect(creditosDaEntrega(20, 3)).toBe(30);
    expect(creditosDaEntrega(20, 6)).toBe(40);
  });
  it("prazo × estado × sequência juntos", () => {
    expect(creditosDaEntrega(gorjeta(20, "no_prazo", 50), 6)).toBe(20);
  });
  it("status pelo tempo decorrido", () => {
    expect(statusDoPrazo(30, 30)).toBe("no_prazo");
    expect(statusDoPrazo(31, 30)).toBe("atrasado");
    expect(statusDoPrazo(30 * ENTREGA.pedido.fatorCancelado + 1, 30)).toBe("cancelado");
  });
});

describe("multiplicador de sequência", () => {
  it("x1, x1.5, x2 conforme a config", () => {
    expect(multiplicadorSequencia(0)).toBe(1);
    expect(multiplicadorSequencia(2)).toBe(1);
    expect(multiplicadorSequencia(3)).toBe(1.5);
    expect(multiplicadorSequencia(5)).toBe(1.5);
    expect(multiplicadorSequencia(6)).toBe(2);
    expect(multiplicadorSequencia(40)).toBe(2);
  });
  it("atraso e cancelamento zeram a sequência", () => {
    const r = resumir({
      duracaoMs: ENTREGA.turnoMs,
      relaxado: false,
      pedidos: [...ok(3), { base: 20, fragil: false, status: "atrasado", estado: 100 }, ...ok(2), { base: 20, fragil: false, status: "cancelado", estado: 100 }, ...ok(1)],
    });
    expect(r.bestStreak).toBe(3);
    expect(r).toMatchObject({ deliveries: 7, onTime: 6, late: 1, cancelled: 1 });
    // 20+20+30 | 10 | 20+20 | - | 20
    expect(r.creditsEarned).toBe(140);
    expect(r.tipsTotal).toBe(130);
  });
});

describe("pacote", () => {
  it("frágil perde mais e o amortecedor reduz", () => {
    expect(danoDaBatida(true, 0)).toBe(danoDaBatida(false, 0) * ENTREGA.dano.fragil);
    expect(danoDaBatida(false, 0.5)).toBe(danoDaBatida(false, 0) / 2);
  });
});

describe("implantes", () => {
  const motor = { slug: "motor", level: 2, effects: [{ velMax: 0.1 }, { velMax: 0.2 }, { velMax: 0.3 }] };
  it("aplica o efeito do nível", () => {
    expect(aplicarImplantes([motor]).velMax).toBeCloseTo(ENTREGA.moto.velMax * 1.2);
  });
  it("só conta até o limite de equipados", () => {
    const quatro = Array.from({ length: 4 }, (_, i) => ({ ...motor, slug: `m${i}`, level: 1 }));
    expect(aplicarImplantes(quatro).velMax).toBeCloseTo(ENTREGA.moto.velMax * (1 + 0.1 * ENTREGA.equipadosMax));
  });
  it("chuva e poça tiram aderência", () => {
    expect(aderenciaEfetiva(10, 1, false)).toBeLessThan(10);
    expect(aderenciaEfetiva(10, 0, true)).toBeLessThan(aderenciaEfetiva(10, 1, false));
    expect(intensidadeChuva(0)).toBe(ENTREGA.chuva.curva[0][1]);
  });
});

describe("compra de implante", () => {
  const precos = [100, 250, 500];
  it("saldo insuficiente", () => {
    expect(validarCompra(0, 3, precos, 99)).toEqual({ ok: false, erro: "saldo" });
  });
  it("cobra o preço do próximo nível", () => {
    expect(validarCompra(1, 3, precos, 300)).toEqual({ ok: true, preco: 250, nivel: 2 });
  });
  it("nível máximo", () => {
    expect(validarCompra(3, 3, precos, 9999)).toEqual({ ok: false, erro: "nivelMax" });
    expect(validarCompra(1, 1, precos, 9999)).toEqual({ ok: false, erro: "nivelMax" });
  });
  it("limite de equipados", () => {
    expect(validarEquipar(true, false, ENTREGA.equipadosMax)).toBe("equipados");
    expect(validarEquipar(true, true, ENTREGA.equipadosMax)).toBeNull();
    expect(validarEquipar(false, false, 0)).toBe("naoTem");
    expect(validarEquipar(true, false, ENTREGA.equipadosMax - 1)).toBeNull();
  });
});

describe("teto do turno", () => {
  it("aceita um turno normal", () => {
    const r = validarTurno({ duracaoMs: ENTREGA.turnoMs, relaxado: false, pedidos: ok(8) }, base);
    expect(r.ok).toBe(true);
  });
  it("recusa mais entregas que o teto", () => {
    const { entregas } = tetoDoTurno(base);
    expect(validarTurno({ duracaoMs: ENTREGA.turnoMs, relaxado: false, pedidos: ok(entregas + 1) }, base)).toEqual({ ok: false, motivo: "teto" });
  });
  it("implantes de velocidade e nitro sobem o teto", () => {
    const rapido = aplicarImplantes([{ slug: "x", level: 1, effects: [{ velMax: 0.3, nitroCargas: 2 }] }]);
    expect(tetoDoTurno(rapido).entregas).toBeGreaterThan(tetoDoTurno(base).entregas);
  });
  it("duração tem que bater com a config", () => {
    expect(validarTurno({ duracaoMs: ENTREGA.turnoMs * 2, relaxado: false, pedidos: [] }, base)).toEqual({ ok: false, motivo: "duracao" });
  });
  it("recusa gorjeta base fora da faixa", () => {
    const p = [{ base: ENTREGA.pedido.gorjetaBase[1] + 1, fragil: false, status: "no_prazo", estado: 100 }];
    expect(validarTurno({ duracaoMs: ENTREGA.turnoMs, relaxado: false, pedidos: p }, base)).toEqual({ ok: false, motivo: "gorjeta" });
  });
});
