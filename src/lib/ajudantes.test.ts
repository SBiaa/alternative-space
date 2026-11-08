import { describe, expect, it } from "vitest";
import {
  H,
  IDS,
  MARGEM,
  W,
  acalmar,
  apertar,
  capacidade,
  carregar,
  comprar,
  custo,
  desistir,
  ehAbsurdo,
  emPane,
  formatar,
  novoEstado,
  paciencia,
  paraSalvar,
  porAperto,
  recompensaDo,
  step,
  trabalhoDo,
  type Estado,
} from "./ajudantes";

// Rand previsível pra o mundo ser sempre igual nos testes.
function seq(seed = 1) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
}

function rodar(e: Estado, segundos: number, r = seq(9)) {
  for (let t = 0; t < segundos; t += 1 / 30) step(e, 1 / 30, r);
}

describe("caixa", () => {
  it("cada aperto cria ajudantes até lotar a fábrica", () => {
    const e = novoEstado(seq());
    apertar(e, seq());
    expect(e.ajudantes).toHaveLength(porAperto(e.melhorias));
    for (let i = 0; i < 50; i++) apertar(e, seq(i + 2));
    expect(e.ajudantes).toHaveLength(capacidade(e.melhorias));
  });

  it("fábrica lotada: o aperto vira trabalho direto no pedido", () => {
    const e = novoEstado(seq());
    e.pedido.trabalho = 1e9;
    for (let i = 0; i < capacidade(e.melhorias); i++) apertar(e, seq());
    const antes = e.pedido.feito;
    apertar(e, seq());
    expect(e.pedido.feito).toBeGreaterThan(antes);
  });
});

describe("pedido", () => {
  it("ajudantes cumprem o pedido, ganham favores e somem", () => {
    const e = novoEstado(seq());
    for (let i = 0; i < 6; i++) apertar(e, seq(i + 1));
    const rec = e.pedido.recompensa;
    rodar(e, 5);
    expect(e.cumpridos).toBe(1);
    expect(e.favores).toBe(rec);
    expect(e.ajudantes).toHaveLength(0);
    expect(e.pedido.n).toBe(1);
    expect(e.eventos.some((ev) => ev.tipo === "cumprido")).toBe(true);
  });

  it("pedidos ficam mais difíceis e pagam mais", () => {
    expect(trabalhoDo(10)).toBeGreaterThan(trabalhoDo(0));
    expect(recompensaDo(10, novoEstado().melhorias)).toBeGreaterThan(recompensaDo(0, novoEstado().melhorias));
  });

  it("desistir limpa a fábrica e mantém o tamanho do pedido", () => {
    const e = novoEstado(seq());
    e.pedido.trabalho = 1e9;
    apertar(e, seq());
    const { n, texto } = e.pedido;
    desistir(e, seq());
    expect(e.ajudantes).toHaveLength(0);
    expect(e.pedido.n).toBe(n);
    expect(e.pedido.texto).not.toBe(texto);
  });

  it("a cada 5 vem um absurdo: mais trabalho, mais favores, e desistir pula ele", () => {
    const e = novoEstado(seq());
    expect(ehAbsurdo(4)).toBe(true);
    expect(trabalhoDo(4)).toBeGreaterThan(trabalhoDo(5));
    expect(recompensaDo(4, e.melhorias)).toBeGreaterThan(recompensaDo(5, e.melhorias));
    e.cumpridos = 4;
    const c = carregar(paraSalvar(e), seq());
    expect(c.pedido.absurdo).toBe(true);
    desistir(c, seq());
    expect(c.pedido.n).toBe(5);
    expect(c.pedido.absurdo).toBe(false);
  });
});

describe("pane", () => {
  it("ajudante entra em pane depois da paciência e para de trabalhar", () => {
    const e = novoEstado(seq());
    e.pedido.trabalho = 1e9;
    apertar(e, seq());
    rodar(e, paciencia(e.melhorias) - 1);
    expect(emPane(e)).toBe(0);
    rodar(e, 2);
    expect(emPane(e)).toBe(1);
    const feito = e.pedido.feito;
    e.melhorias.dedo = 0;
    // Só ele na fábrica e em pane: o pedido não anda (a não ser que ele aperte a caixa).
    const calmos = () => e.ajudantes.filter((a) => !a.pane).length;
    rodar(e, 0.5);
    if (calmos() === 0) expect(e.pedido.feito).toBe(feito);
  });

  it("clicar no ajudante em pane faz ele sumir; no calmo, nada", () => {
    const e = novoEstado(seq());
    apertar(e, seq());
    const a = e.ajudantes[0];
    expect(acalmar(e, a.x, a.y - 12)).toBe(false);
    a.pane = true;
    expect(acalmar(e, a.x, a.y - 12)).toBe(true);
    expect(e.ajudantes).toHaveLength(0);
  });

  it("caos nunca deixa favores negativos nem tira ajudante da tela", () => {
    const e = novoEstado(seq());
    e.favores = 37;
    e.pedido.trabalho = 1e9;
    e.melhorias.galpao = 5;
    e.melhorias.dedo = 3;
    const r = seq(4);
    let ok = true;
    for (let i = 0; i < 30 * 60; i++) {
      step(e, 1 / 30, r);
      e.eventos = [];
      if (e.favores < 0) ok = false;
      for (const a of e.ajudantes) if (a.x < MARGEM || a.x > W - MARGEM || a.y > H - MARGEM) ok = false;
    }
    expect(ok).toBe(true);
    expect(emPane(e)).toBeGreaterThan(0);
    expect(e.bloqueados.length).toBeLessThanOrEqual(3);
  });
});

describe("loja", () => {
  it("compra desconta favores e o preço sobe", () => {
    const e = novoEstado(seq());
    e.favores = 100;
    expect(comprar(e, "caixa")).toBe("comprou");
    expect(e.favores).toBe(100 - custo("caixa", 0));
    expect(e.melhorias.caixa).toBe(1);
    expect(custo("caixa", 1)).toBeGreaterThan(custo("caixa", 0));
    e.favores = 0;
    expect(comprar(e, "caixa")).toBe("sem-favores");
  });

  it("botão com ajudante sentado: o clique só espanta ele", () => {
    const e = novoEstado(seq());
    e.favores = 1000;
    e.bloqueados = ["dedo"];
    expect(comprar(e, "dedo")).toBe("espantou");
    expect(e.melhorias.dedo).toBe(0);
    expect(comprar(e, "dedo")).toBe("comprou");
  });
});

describe("salvar", () => {
  it("salva e carrega o progresso", () => {
    const e = novoEstado(seq());
    e.favores = 42;
    e.cumpridos = 7;
    e.melhorias.galpao = 2;
    const de = carregar(JSON.parse(JSON.stringify(paraSalvar(e))), seq());
    expect(de.favores).toBe(42);
    expect(de.cumpridos).toBe(7);
    expect(de.melhorias.galpao).toBe(2);
    expect(de.pedido.n).toBe(7);
  });

  it("ignora lixo", () => {
    for (const lixo of [null, "oi", 3, { favores: -5, melhorias: { caixa: "x", dedo: NaN } }]) {
      const e = carregar(lixo, seq());
      expect(e.favores).toBe(0);
      for (const id of IDS) expect(e.melhorias[id]).toBe(0);
    }
  });
});

describe("equilíbrio", () => {
  it("um jogador razoável passa de 25 pedidos em 15 minutos", () => {
    // Robô: aperta 4x/s, acalma quem surta, compra a melhoria mais barata, desiste se travar.
    const e = novoEstado(seq());
    const r = seq(3);
    const dt = 1 / 20;
    let clique = 0;
    for (let t = 0; t < 15 * 60; t += dt) {
      clique += dt * 4;
      while (clique >= 1) {
        clique--;
        apertar(e, r);
      }
      for (const a of e.ajudantes.filter((x) => x.pane).slice(0, 1)) acalmar(e, a.x, a.y - 12);
      for (const id of [...e.bloqueados]) comprar(e, id);
      const barata = [...IDS].sort((a, b) => custo(a, e.melhorias[a]) - custo(b, e.melhorias[b]))[0];
      comprar(e, barata);
      if (e.pedido.tempo > 90) desistir(e, r);
      step(e, dt, r);
      e.eventos = [];
    }
    expect(e.cumpridos).toBeGreaterThanOrEqual(25);
  });
});

describe("texto", () => {
  it("formata números grandes", () => {
    expect(formatar(950)).toBe("950");
    expect(formatar(12_500)).toBe("12,5 mil");
    expect(formatar(3_000_000)).toBe("3 mi");
  });
});
