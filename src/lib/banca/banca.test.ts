import { describe, expect, it } from "vitest";
import { ARQUETIPOS, BANCA, EVENTO, EVENTOS, PRODUTOS } from "./config";
import { calendario, comprarMelhoria, custoDeProducao, definirLayout, diasLivres, fecharEvento, novaBanca, produzir, tetoDeItens } from "./economia";
import { atributos, layoutValido, ordemDeVisao, visibilidade } from "./mesa";
import {
  alternarPlaca, atender, criarEvento, darTroco, decidirDesconto, notaEntregue, passo, repor, resumoDoEvento, trocoCorreto, trocoSugerido,
} from "./motor";
import { escolherSave, migrar, saveCoerente } from "./save";
import type { ArqSlug, EventoEstado, ItemKey, Progresso, Visitante } from "./tipos";

const feira = "feira-do-bairro";

/** Banca com estoque dado e o layout que o teste quer (itens na ordem das células). */
function banca(itens: Record<ItemKey, number>, celulas: (ItemKey | null)[], extra: Partial<Progresso> = {}): Progresso {
  const base = novaBanca("seed-teste");
  const p: Progresso = { ...base, ...extra, estoque: { itens, diasUsados: 0, gastoMaterial: 0 } };
  const n = atributos(p.melhorias);
  const cheias = Array.from({ length: n.colunas * n.linhas + n.expositor }, (_, i) => celulas[i] ?? null);
  return { ...p, layout: { celulas: cheias, precos: {} } };
}

const A: ItemKey = "adesivo:gato-astronauta";
const B: ItemKey = "adesivo:dragao-de-cafe";
const C: ItemKey = "adesivo:planeta-laranja";
const PR: ItemKey = "print:gato-astronauta";
const PR2: ItemKey = "print:dragao-de-cafe";
const PR3: ItemKey = "print:planeta-laranja";

/** Joga o evento todo: atende, aceita desconto, dá o troco certo e repõe. */
function jogar(inicial: EventoEstado, desconto: "aceitar" | "recusar" | "contraproposta" = "aceitar"): EventoEstado {
  let e = inicial;
  let guarda = 0;
  while (!e.fim && guarda++ < 20_000) {
    e = passo(e);
    e.celulas.forEach((c, i) => {
      if (c.item && c.un === 0) e = repor(e, i);
    });
    if (e.atendendo === null) e = atender(e);
    const v = e.visitantes.find((x) => x.id === e.atendendo);
    if (v?.fase === "desconto") e = decidirDesconto(e, desconto);
    if (v?.fase === "troco") e = darTroco(e, trocoSugerido(v.troco));
  }
  return e;
}

/** Evento com um visitante só, de um arquétipo, que chega no segundo 1. */
function comUm(p: Progresso, arq: ArqSlug, extra: Partial<Visitante> = {}): EventoEstado {
  const e = criarEvento(p, feira)!;
  const arqui = ARQUETIPOS.find((a) => a.slug === arq)!;
  const pac = arqui.paciencia * (p.tranquilo ? EVENTO.tranquiloPaciencia : 1);
  const v: Visitante = {
    id: 0, arq, chegaEm: 1, fase: "andando", olharAte: 0, pac, pacMax: pac, pedido: [], troca: false,
    pedeDesconto: arqui.especial === "desconto" ? arqui.desconto : 0, descontoAplicado: 0, cartao: false, total: 0, entregou: 0, troco: 0, saiu: null, ...extra,
  };
  return { ...e, visitantes: [v] };
}

const ate = (e: EventoEstado, cond: (e: EventoEstado) => boolean, max = 4000) => {
  let x = e;
  for (let i = 0; i < max && !cond(x) && !x.fim; i++) x = passo(x);
  return x;
};

/** Roda o mesmo cenário com várias seeds. */
const variasSeeds = <T,>(n: number, f: (seed: string) => T) => Array.from({ length: n }, (_, i) => f(`seed-${i}`));

describe("produção com prazo e orçamento", () => {
  it("produz um lote: gasta dias e material e soma o estoque", () => {
    const p = novaBanca("s");
    const r = produzir(p, "adesivo", "gato-astronauta", 1);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const c = custoDeProducao("adesivo", 1);
    expect(r.prog.dinheiro).toBe(p.dinheiro - c.material);
    expect(r.prog.estoque.diasUsados).toBe(c.dias);
    expect(r.prog.estoque.itens[A]).toBe(c.unidades);
    expect(r.prog.estoque.gastoMaterial).toBe(c.material);
    expect(diasLivres(r.prog)).toBe(BANCA.diasAtelieBase - c.dias);
  });

  it("recusa quando os dias da semana acabam", () => {
    let p = novaBanca("s");
    p = { ...p, dinheiro: 100_000 };
    // print leva 2 dias por lote: 2 lotes = 4 dias; mais 1 lote estoura os 5 dias
    const r1 = produzir(p, "print", "gato-astronauta", 2);
    expect(r1.ok).toBe(true);
    if (!r1.ok) return;
    const r2 = produzir(r1.prog, "print", "gato-astronauta", 1);
    expect(r2).toEqual({ ok: false, erro: "dias" });
  });

  it("recusa quando o orçamento não cobre o material", () => {
    const p = { ...novaBanca("s"), dinheiro: 5 };
    expect(produzir(p, "print", "gato-astronauta", 1)).toEqual({ ok: false, erro: "saldo" });
  });

  it("recusa produto, tema e lotes inválidos", () => {
    const p = novaBanca("s");
    expect(produzir(p, "pelucia", "gato-astronauta", 1)).toEqual({ ok: false, erro: "produto" });
    expect(produzir(p, "adesivo", "franquia", 1)).toEqual({ ok: false, erro: "tema" });
    expect(produzir(p, "adesivo", "gato-astronauta", 0)).toEqual({ ok: false, erro: "lotes" });
    expect(produzir(p, "adesivo", "gato-astronauta", 1.5)).toEqual({ ok: false, erro: "lotes" });
    expect(produzir(p, "adesivo", "gato-astronauta", 999)).toEqual({ ok: false, erro: "lotes" });
  });

  it("o ajudante dá mais dias de ateliê", () => {
    const p = { ...novaBanca("s"), dinheiro: 5000, reputacao: 3 };
    const r = comprarMelhoria(p, "ajudante");
    expect(r.ok).toBe(true);
    if (r.ok) expect(diasLivres(r.prog)).toBe(BANCA.diasAtelieBase + 1);
  });
});

describe("melhorias e layout", () => {
  it("compra só com saldo e reputação, e para no nível máximo", () => {
    const p = novaBanca("s");
    expect(comprarMelhoria({ ...p, dinheiro: 1 }, "toalha")).toEqual({ ok: false, erro: "saldo" });
    expect(comprarMelhoria(p, "maquininha")).toEqual({ ok: false, erro: "saldo" });
    expect(comprarMelhoria({ ...p, dinheiro: 5000, reputacao: 0 }, "maquininha")).toEqual({ ok: false, erro: "reputacao" });
    expect(comprarMelhoria(p, "inexistente")).toEqual({ ok: false, erro: "melhoria" });
    let q: Progresso = { ...p, dinheiro: 5000, reputacao: 5 };
    for (let i = 0; i < 2; i++) {
      const r = comprarMelhoria(q, "toalha");
      expect(r.ok).toBe(true);
      if (r.ok) q = r.prog;
    }
    expect(comprarMelhoria(q, "toalha")).toEqual({ ok: false, erro: "nivelMax" });
  });

  it("mesa maior e expositor aumentam as células sem perder os itens", () => {
    let p = banca({ [A]: 5, [B]: 5 }, [A, null, null, B, null, null], { dinheiro: 5000, reputacao: 5 });
    const mesa = comprarMelhoria(p, "mesa-maior");
    expect(mesa.ok).toBe(true);
    if (!mesa.ok) return;
    p = mesa.prog;
    expect(p.layout.celulas).toHaveLength(8);
    expect(p.layout.celulas[0]).toBe(A); // frente, coluna 0
    expect(p.layout.celulas[4]).toBe(B); // fundo, coluna 0 (agora são 4 colunas)
    const exp = comprarMelhoria(p, "expositor");
    expect(exp.ok).toBe(true);
    if (exp.ok) expect(exp.prog.layout.celulas).toHaveLength(11);
  });

  it("valida o layout: itens que existem no estoque, sem repetir, preços na faixa", () => {
    const p = banca({ [A]: 5 }, [A]);
    expect(layoutValido(p.layout, p)).toBe(true);
    expect(definirLayout(p, { celulas: [A, A, null, null, null, null], precos: {} })).toEqual({ ok: false, erro: "layout" });
    expect(definirLayout(p, { celulas: [B, null, null, null, null, null], precos: {} })).toEqual({ ok: false, erro: "layout" });
    expect(definirLayout(p, { celulas: [A, null], precos: {} })).toEqual({ ok: false, erro: "layout" });
    expect(definirLayout(p, { celulas: [A, null, null, null, null, null], precos: { adesivo: 999 } })).toEqual({ ok: false, erro: "layout" });
    expect(definirLayout(p, { celulas: [A, null, null, null, null, null], precos: { adesivo: 7 } }).ok).toBe(true);
  });
});

describe("visibilidade por posição na mesa", () => {
  it("a frente vê mais que o fundo, e o expositor fica na altura do olho", () => {
    const a = atributos({ "mesa-maior": 2, expositor: 1 });
    expect(a.linhas).toBe(3);
    const frente = visibilidade(0, a);
    const meio = visibilidade(a.colunas, a);
    const fundo = visibilidade(a.colunas * 2, a);
    const expositor = visibilidade(a.colunas * a.linhas, a);
    expect(frente).toBeGreaterThan(meio);
    expect(meio).toBeGreaterThan(fundo);
    expect(expositor).toBeGreaterThan(meio);
    expect(frente).toBeCloseTo(1);
    expect(fundo).toBeCloseTo(0.5);
  });

  it("a toalha aumenta a visibilidade e a ordem de visão começa pela frente", () => {
    const sem = atributos({});
    const com = atributos({ toalha: 2 });
    expect(visibilidade(0, com)).toBeGreaterThan(visibilidade(0, sem));
    expect(ordemDeVisao(sem).slice(0, 3)).toEqual([0, 1, 2]);
    const comExpositor = atributos({ expositor: 1 });
    expect(ordemDeVisao(comExpositor)[3]).toBeGreaterThanOrEqual(0);
    expect(ordemDeVisao(comExpositor).indexOf(6)).toBeLessThan(ordemDeVisao(comExpositor).indexOf(3)); // expositor antes do fundo
  });

  it("o mesmo item vende mais na frente que no fundo", () => {
    const vendidos = (celulas: (ItemKey | null)[]) =>
      variasSeeds(12, (seed) => {
        const p = banca({ [A]: 12, [B]: 12 }, celulas, { seed });
        const e = jogar(criarEvento(p, feira)!);
        return e.vendas[A] ?? 0;
      }).reduce((s, n) => s + n, 0);
    // A na frente (índice 0) com B no fundo, e o contrário: visitantes com pouca atenção só olham a frente.
    const naFrente = vendidos([A, null, null, B, null, null]);
    const noFundo = vendidos([B, null, null, A, null, null]);
    expect(naFrente).toBeGreaterThan(noFundo);
  }, 60_000);
});

describe("comportamento de cada arquétipo", () => {
  const todos = [A, B, C];
  const mesa3 = [A, B, C, null, null, null];
  const prog = (seed: string, extra: Partial<Progresso> = {}) => banca({ [A]: 12, [B]: 12, [C]: 12 }, mesa3, { seed, ...extra });

  it("colecionador: com coleção na mesa leva vários temas do mesmo produto", () => {
    const pedidos = variasSeeds(30, (seed) => {
      const p = banca({ [PR]: 12, [PR2]: 12, [PR3]: 12 }, [PR, PR2, PR3], { seed });
      const e = ate(comUm(p, "colecionador"), (x) => x.visitantes[0].fase === "fila" || x.visitantes[0].fase === "fim");
      return e.visitantes[0];
    });
    const compraram = pedidos.filter((v) => v.fase === "fila");
    expect(compraram.length).toBeGreaterThan(15);
    for (const v of compraram) {
      expect(v.pedido.length).toBeGreaterThanOrEqual(3);
      expect(new Set(v.pedido.map((x) => x.item)).size).toBe(v.pedido.length);
    }
  });

  it("colecionador: sem coleção completa quase não compra", () => {
    const com = (celulas: (ItemKey | null)[]) =>
      variasSeeds(40, (seed) => {
        const p = banca({ [PR]: 12, [PR2]: 12, [PR3]: 12 }, celulas, { seed });
        return ate(comUm(p, "colecionador"), (x) => x.visitantes[0].fase === "fila" || x.visitantes[0].fase === "fim").visitantes[0].fase === "fila";
      }).filter(Boolean).length;
    expect(com([PR, null, null])).toBeLessThan(com([PR, PR2, PR3]));
  });

  it("só olhando: não vê o que está além da sua atenção", () => {
    // 6 células: a atenção dele é 2, então o item do fundo nunca é visto
    const saidas = variasSeeds(20, (seed) => {
      const p = banca({ [A]: 12 }, [null, null, null, A, null, null], { seed });
      return ate(comUm(p, "olhando"), (x) => x.visitantes[0].fase !== "andando" && x.visitantes[0].fase !== "olhando").visitantes[0];
    });
    expect(saidas.every((v) => v.fase === "fim" && v.saiu === "olhou")).toBe(true);
  });

  it("pechincheiro: pede desconto no balcão e aceitar baixa o total", () => {
    let achou = false;
    for (const seed of ["s1", "s2", "s3", "s4", "s5", "s6", "s7", "s8"]) {
      let e = ate(comUm(prog(seed), "desconto"), (x) => x.visitantes[0].fase === "fila" || x.visitantes[0].fase === "fim");
      if (e.visitantes[0].fase !== "fila") continue;
      e = atender(e);
      e = ate(e, (x) => x.visitantes[0].fase === "desconto");
      expect(e.visitantes[0].fase).toBe("desconto");
      const cheio = Math.round(e.visitantes[0].pedido.reduce((s, p) => s + p.qtd * e.precos[p.item.split(":")[0] as "adesivo"], 0));
      e = decidirDesconto(e, "aceitar");
      const v = e.visitantes[0];
      expect(v.descontoAplicado).toBe(0.25);
      if (v.fase === "troco") expect(v.entregou - v.troco).toBe(Math.round(cheio * 0.75));
      else expect(e.receita).toBe(Math.round(cheio * 0.75));
      achou = true;
      break;
    }
    expect(achou).toBe(true);
  });

  it("cosplayer com pressa: desiste da fila bem antes de uma família", () => {
    const quandoDesiste = (arq: ArqSlug) => {
      const tempos = variasSeeds(20, (seed) => {
        const p = prog(seed);
        let e = ate(comUm(p, arq), (x) => x.visitantes[0].fase === "fila" || x.visitantes[0].fase === "fim");
        if (e.visitantes[0].fase !== "fila") return null;
        const entrou = e.t;
        e = ate(e, (x) => x.visitantes[0].fase === "fim");
        return e.visitantes[0].saiu === "desistiu" ? e.t - entrou : null;
      }).filter((t): t is number => t !== null);
      return tempos.reduce((s, t) => s + t, 0) / Math.max(1, tempos.length);
    };
    expect(quandoDesiste("cosplayer")).toBeLessThan(quandoDesiste("familia"));
  });

  it("família com criança: compra adesivo em quantidade", () => {
    const qtds = variasSeeds(30, (seed) => {
      const e = ate(comUm(prog(seed), "familia"), (x) => x.visitantes[0].fase === "fila" || x.visitantes[0].fase === "fim");
      return e.visitantes[0].fase === "fila" ? e.visitantes[0].pedido.reduce((s, p) => s + p.qtd, 0) : 0;
    }).filter((n) => n > 0);
    expect(qtds.length).toBeGreaterThan(10);
    expect(qtds.every((n) => n >= 2)).toBe(true);
  });

  it("outro artista: troca uma peça, não paga e dá reputação", () => {
    let achou = false;
    for (let i = 0; i < 30 && !achou; i++) {
      let e = ate(comUm(banca({ [PR]: 12 }, [PR], { seed: `t${i}` }), "artista"), (x) => x.visitantes[0].fase === "fila" || x.visitantes[0].fase === "fim");
      if (e.visitantes[0].fase !== "fila") continue;
      e = atender(e);
      e = ate(e, (x) => x.visitantes[0].fase === "fim");
      expect(e.visitantes[0].saiu).toBe("trocou");
      expect(e.receita).toBe(0);
      expect(e.trocas[PR]).toBe(1);
      expect(e.repDelta).toBeGreaterThan(0);
      expect(e.celulas[0].un).toBe(11);
      achou = true;
    }
    expect(achou).toBe(true);
  });

  it("os seis arquétipos existem na config", () => {
    expect(todos).toHaveLength(3);
    expect(ARQUETIPOS.map((a) => a.slug).sort()).toEqual(["artista", "colecionador", "cosplayer", "desconto", "familia", "olhando"]);
  });
});

describe("desconto: aceitar, recusar ou contrapor", () => {
  const preparar = (seed: string) => {
    let e = ate(comUm(banca({ [A]: 12, [B]: 12, [C]: 12 }, [A, B, C], { seed }), "desconto"), (x) => x.visitantes[0].fase === "fila" || x.visitantes[0].fase === "fim");
    if (e.visitantes[0].fase !== "fila" || e.visitantes[0].pedeDesconto === 0) return null;
    e = atender(e);
    return ate(e, (x) => x.visitantes[0].fase === "desconto");
  };
  const casos = Array.from({ length: 40 }, (_, i) => preparar(`d${i}`)).filter((e): e is EventoEstado => e !== null);

  it("há casos de desconto pra testar", () => expect(casos.length).toBeGreaterThan(10));

  it("aceitar sempre fecha a venda com o desconto pedido", () => {
    for (const e0 of casos) {
      const e = decidirDesconto(e0, "aceitar");
      expect(e.visitantes[0].descontoAplicado).toBe(e.visitantes[0].pedeDesconto);
      expect(["troco", "fim"]).toContain(e.visitantes[0].fase);
      expect(e.visitantes[0].saiu === "recusou").toBe(false);
    }
  });

  it("contraproposta dá metade do desconto e às vezes o cliente vai embora", () => {
    const rs = casos.map((e0) => decidirDesconto(e0, "contraproposta").visitantes[0]);
    expect(rs.some((v) => v.descontoAplicado === v.pedeDesconto / 2 && v.saiu !== "recusou")).toBe(true);
    expect(rs.filter((v) => v.saiu === "recusou").length).toBeLessThan(rs.length);
  });

  it("recusar: quem fica paga o preço cheio; quem vai embora conta como desistência e mexe na reputação", () => {
    const rs = casos.map((e0) => decidirDesconto(e0, "recusar"));
    for (const e of rs) {
      const v = e.visitantes[0];
      if (v.saiu === "recusou") {
        expect(e.desistiram).toBe(1);
        expect(e.repDelta).toBeLessThan(0);
        expect(e.receita).toBe(0);
      } else expect(v.descontoAplicado).toBe(0);
    }
    expect(rs.some((e) => e.visitantes[0].saiu === "recusou")).toBe(true);
    expect(rs.some((e) => e.visitantes[0].saiu !== "recusou")).toBe(true);
  });

  it("aceitar rende menos por venda que recusar, mas vende mais", () => {
    const soma = (esc: "aceitar" | "recusar") => casos.reduce((s, e0) => {
      const e = ate(decidirDesconto(e0, esc), (x) => x.visitantes[0].fase === "troco" || x.visitantes[0].fase === "fim");
      const v = e.visitantes[0];
      return s + (v.fase === "troco" ? v.total : e.receita);
    }, 0);
    expect(soma("aceitar")).toBeLessThan(casos.length * 100);
    expect(soma("aceitar")).toBeGreaterThan(0);
  });
});

describe("troco", () => {
  it("o cliente entrega a nota que cobre o total", () => {
    expect(notaEntregue(7, 0.9)).toBe(10);
    expect(notaEntregue(7, 0)).toBe(20);
    expect(notaEntregue(10, 0.9)).toBe(10);
    expect(notaEntregue(100, 0.9)).toBe(100);
    expect(notaEntregue(130, 0.9)).toBe(200);
  });

  it("confere a soma e as denominações", () => {
    expect(trocoCorreto([5, 2, 1], 8)).toBe(true);
    expect(trocoCorreto([5, 2], 8)).toBe(false);
    expect(trocoCorreto([3, 5], 8)).toBe(false); // R$ 3 não existe
    expect(trocoSugerido(38)).toEqual([20, 10, 5, 2, 1]);
    expect(trocoCorreto(trocoSugerido(38), 38)).toBe(true);
  });

  const noTroco = (extra: Partial<Progresso> = {}) => {
    for (let i = 0; i < 40; i++) {
      let e = ate(comUm(banca({ [A]: 12, [B]: 12, [C]: 12 }, [A, B, C], { seed: `tr${i}`, ...extra }), "olhando"), (x) => x.visitantes[0].fase === "fila" || x.visitantes[0].fase === "fim");
      if (e.visitantes[0].fase !== "fila") continue;
      e = atender(e);
      e = ate(e, (x) => x.visitantes[0].fase === "troco" || x.visitantes[0].fase === "fim");
      if (e.visitantes[0].fase === "troco" || (extra.tranquilo && e.visitantes[0].fase === "fim")) return e;
    }
    return null;
  };

  it("troco errado conta erro, tira paciência e não fecha a venda; certo fecha", () => {
    const e0 = noTroco()!;
    expect(e0).not.toBeNull();
    const v0 = e0.visitantes[0];
    const errado = darTroco(e0, [1]);
    expect(errado.errosTroco).toBe(1);
    expect(errado.repDelta).toBeLessThan(0);
    expect(errado.visitantes[0].pac).toBeLessThan(v0.pac);
    expect(errado.visitantes[0].fase).toBe("troco");
    const certo = darTroco(errado, trocoSugerido(v0.troco));
    expect(certo.visitantes[0].saiu).toBe("comprou");
    expect(certo.receita).toBe(v0.total);
  });

  it("no evento tranquilo o troco é automático", () => {
    const e = noTroco({ tranquilo: true })!;
    expect(e).not.toBeNull();
    expect(e.visitantes[0].saiu).toBe("comprou");
    expect(e.errosTroco).toBe(0);
  });

  it("com maquininha quem paga no cartão não precisa de troco", () => {
    const p = banca({ [A]: 12, [B]: 12, [C]: 12 }, [A, B, C], { seed: "cartao" });
    const m = comprarMelhoria({ ...p, dinheiro: 5000 }, "maquininha");
    expect(m.ok).toBe(true);
    if (!m.ok) return;
    const jogada = variasSeeds(15, (seed) => jogar(criarEvento({ ...m.prog, seed }, feira)!));
    expect(jogada.some((e) => e.receitaCartao > 0)).toBe(true);
    expect(jogada.every((e) => e.receitaCartao <= e.receita)).toBe(true);
  });
});

describe("reposição e placa de esgotou", () => {
  const comPoucas = () => {
    const p = banca({ [A]: 30 }, [A]);
    return criarEvento(p, feira)!;
  };

  it("repor leva tempo e traz unidades da caixa", () => {
    let e = comPoucas();
    expect(e.celulas[0].un).toBe(BANCA.capacidadeCelula);
    expect(e.caixa[A]).toBe(30 - BANCA.capacidadeCelula);
    e = { ...e, celulas: e.celulas.map((c, i) => (i === 0 ? { ...c, un: 2 } : c)) };
    e = repor(e, 0);
    expect(e.celulas[0].repondoAte).toBeCloseTo(e.t + EVENTO.reporSeg);
    e = ate(e, (x) => x.celulas[0].repondoAte === null);
    expect(e.celulas[0].un).toBe(BANCA.capacidadeCelula);
    expect(e.caixa[A]).toBe(30 - BANCA.capacidadeCelula - (BANCA.capacidadeCelula - 2));
  });

  it("o ajudante repõe em metade do tempo", () => {
    const base = banca({ [A]: 30 }, [A], { dinheiro: 5000, reputacao: 5 });
    const m = comprarMelhoria(base, "ajudante");
    expect(m.ok).toBe(true);
    if (!m.ok) return;
    let e = criarEvento(m.prog, feira)!;
    e = { ...e, celulas: e.celulas.map((c, i) => (i === 0 ? { ...c, un: 0 } : c)) };
    e = repor(e, 0);
    expect(e.celulas[0].repondoAte).toBeCloseTo(e.t + EVENTO.reporSeg * 0.5);
  });

  it("não repõe sem estoque na caixa nem repete uma reposição em andamento", () => {
    let e = criarEvento(banca({ [A]: 5 }, [A]), feira)!;
    e = { ...e, celulas: e.celulas.map((c, i) => (i === 0 ? { ...c, un: 0 } : c)) };
    expect(repor(e, 0)).toBe(e); // caixa vazia
    const cheia = comPoucas();
    const a = repor({ ...cheia, celulas: cheia.celulas.map((c, i) => (i === 0 ? { ...c, un: 1 } : c)) }, 0);
    expect(repor(a, 0)).toBe(a);
  });

  it("sem placa, esgotado chateia o visitante; com placa, não", () => {
    const sem = (placa: boolean) =>
      variasSeeds(20, (seed) => {
        let e = criarEvento(banca({ [A]: 30 }, [A], { seed }), feira)!;
        e = { ...e, celulas: e.celulas.map((c, i) => (i === 0 ? { ...c, un: 0, placa } : c)), caixa: { ...e.caixa, [A]: 0 } };
        e = { ...e, visitantes: comUm(banca({ [A]: 30 }, [A], { seed }), "familia").visitantes };
        e = ate(e, (x) => x.visitantes[0].fase === "fim");
        return e.repDelta;
      }).reduce((s, n) => s + n, 0);
    expect(sem(false)).toBeLessThan(sem(true));
  });

  it("a placa alterna e some quando repõe", () => {
    let e = comPoucas();
    e = alternarPlaca(e, 0);
    expect(e.celulas[0].placa).toBe(true);
    e = { ...e, celulas: e.celulas.map((c, i) => (i === 0 ? { ...c, un: 0 } : c)) };
    e = repor(e, 0);
    e = ate(e, (x) => x.celulas[0].repondoAte === null);
    expect(e.celulas[0].placa).toBe(false);
  });
});

describe("reprodutibilidade com a mesma seed", () => {
  const rodar = (seed: string) => resumoDoEvento(jogar(criarEvento(banca({ [A]: 40, [B]: 40, [C]: 40 }, [A, B, C, PR], { seed }), feira)!));

  it("mesma seed, mesmo resumo", () => {
    expect(rodar("igual")).toEqual(rodar("igual"));
  });

  it("seeds diferentes dão públicos diferentes", () => {
    const resumos = ["a", "b", "c", "d"].map((s) => JSON.stringify(rodar(s)));
    expect(new Set(resumos).size).toBeGreaterThan(1);
  });

  it("a chegada dos visitantes só depende da seed e da semana", () => {
    const p = banca({ [A]: 40 }, [A], { seed: "x" });
    const a = criarEvento(p, feira)!;
    const b = criarEvento({ ...p, estoque: { ...p.estoque, itens: { [A]: 7 } } }, feira)!;
    expect(a.visitantes.map((v) => [v.arq, v.chegaEm])).toEqual(b.visitantes.map((v) => [v.arq, v.chegaEm]));
    const outraSemana = criarEvento({ ...p, semana: 2 }, feira)!;
    expect(outraSemana.visitantes.map((v) => v.chegaEm)).not.toEqual(a.visitantes.map((v) => v.chegaEm));
  });
});

describe("fechamento do evento e teto de vendas", () => {
  const preparada = (seed = "fecha") => banca({ [A]: 40, [B]: 40, [C]: 40 }, [A, B, C, PR], { seed, dinheiro: 500 });

  it("o resumo de um evento jogado de verdade passa na conferência do servidor e muda o save", () => {
    for (const seed of ["f1", "f2", "f3", "f4", "f5", "f6"]) {
      const p = preparada(seed);
      const e = jogar(criarEvento(p, feira)!);
      const resumo = resumoDoEvento(e);
      const r = fecharEvento(p, resumo);
      expect(r.ok).toBe(true);
      if (!r.ok) continue;
      const def = EVENTOS.find((x) => x.slug === feira)!;
      expect(r.prog.semana).toBe(p.semana + 1);
      expect(r.prog.estoque.diasUsados).toBe(0);
      expect(r.prog.dinheiro).toBe(p.dinheiro - def.taxaMesa + resumo.receita);
      expect(r.registro.lucro).toBe(resumo.receita - def.taxaMesa - p.estoque.gastoMaterial);
      const vendidos = Object.values(resumo.vendas).reduce((s, n) => s + n, 0) + Object.values(resumo.trocas).reduce((s, n) => s + n, 0);
      const sobrou = Object.values(r.prog.estoque.itens).reduce((s, n) => s + n, 0);
      expect(sobrou).toBe(120 - vendidos);
      expect(r.prog.reputacao).toBeGreaterThanOrEqual(0);
      expect(saveCoerente(r.prog)).toBe(true);
    }
  });

  const base = () => ({
    evento: feira, vendas: { [A]: 3 }, trocas: {}, receita: 18, receitaCartao: 0, visitantes: 20, desistiram: 2, repDelta: 0.1, procurado: {}, tranquilo: false,
  });

  it("recusa vendas acima do estoque levado", () => {
    const p = banca({ [A]: 5 }, [A], { dinheiro: 500 });
    expect(fecharEvento(p, { ...base(), vendas: { [A]: 6 }, receita: 36 })).toEqual({ ok: false, erro: "estoque" });
    expect(fecharEvento(p, { ...base(), vendas: { [B]: 1 }, receita: 6 })).toEqual({ ok: false, erro: "estoque" });
    // vendas e trocas somam contra o mesmo estoque
    expect(fecharEvento(p, { ...base(), vendas: { [A]: 4 }, trocas: { [A]: 2 }, receita: 24 })).toEqual({ ok: false, erro: "estoque" });
  });

  it("recusa vendas acima do teto do público e da duração", () => {
    const def = EVENTOS.find((e) => e.slug === feira)!;
    const teto = tetoDeItens(def);
    expect(teto).toBeGreaterThan(0);
    const p = banca({ [A]: 100_000 }, [A], { dinheiro: 500 });
    const r = fecharEvento(p, { ...base(), vendas: { [A]: teto + 1 }, receita: (teto + 1) * 6 });
    expect(r.ok).toBe(false);
    // o teto sobe com público e duração
    const eventos = EVENTOS.map(tetoDeItens);
    expect(eventos).toEqual([...eventos].sort((a, b) => a - b));
  });

  it("recusa mais visitantes que o público máximo e mais desistências que visitantes", () => {
    const p = preparada();
    expect(fecharEvento(p, { ...base(), visitantes: 9999 })).toEqual({ ok: false, erro: "teto" });
    expect(fecharEvento(p, { ...base(), visitantes: 5, desistiram: 6 })).toEqual({ ok: false, erro: "teto" });
  });

  it("recusa receita fora do que os preços permitem", () => {
    const p = preparada();
    expect(fecharEvento(p, { ...base(), receita: 5000 })).toEqual({ ok: false, erro: "invalido" });
    expect(fecharEvento(p, { ...base(), receita: 1 })).toEqual({ ok: false, erro: "invalido" });
  });

  it("recusa cartão sem maquininha, resumo malformado e evento travado por reputação ou taxa", () => {
    const p = preparada();
    expect(fecharEvento(p, { ...base(), receitaCartao: 6 })).toEqual({ ok: false, erro: "invalido" });
    expect(fecharEvento(p, { ...base(), vendas: { "lixo:lixo": 1 } })).toEqual({ ok: false, erro: "invalido" });
    expect(fecharEvento(p, { ...base(), vendas: { [A]: -1 } })).toEqual({ ok: false, erro: "invalido" });
    expect(fecharEvento(p, { ...base(), evento: "evento-real" })).toEqual({ ok: false, erro: "evento" });
    expect(fecharEvento(p, { ...base(), evento: "grande-pavilhao-orbita" })).toEqual({ ok: false, erro: "reputacao" });
    expect(fecharEvento({ ...p, dinheiro: 3 }, base())).toEqual({ ok: false, erro: "saldo" });
  });

  it("limita a variação de reputação por evento e cobra a taxa da maquininha", () => {
    const p = { ...preparada(), reputacao: 2, dinheiro: 5000 };
    const m = comprarMelhoria(p, "maquininha");
    expect(m.ok).toBe(true);
    if (!m.ok) return;
    const r = fecharEvento(m.prog, { ...base(), repDelta: 50, receitaCartao: 12 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.prog.reputacao).toBeCloseTo(2.8);
    expect(r.registro.custos.maquininha).toBe(Math.ceil(12 * EVENTO.cartaoTaxa));
    const perde = fecharEvento(m.prog, { ...base(), repDelta: -50 });
    if (perde.ok) expect(perde.prog.reputacao).toBeCloseTo(1.4);
  });

  it("registra o produto mais procurado e o fim do estoque tira o item da mesa", () => {
    const p = banca({ [A]: 3 }, [A], { dinheiro: 500 });
    const r = fecharEvento(p, { ...base(), vendas: { [A]: 3 }, procurado: { chaveiro: 4, botton: 2 } });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.registro.maisProcurado).toBe("chaveiro");
    expect(r.prog.estoque.itens[A]).toBeUndefined();
    expect(r.prog.layout.celulas[0]).toBeNull();
  });

  it("o calendário libera eventos maiores com a reputação", () => {
    const baixo = calendario({ ...novaBanca("s"), reputacao: 0.5 });
    const alto = calendario({ ...novaBanca("s"), reputacao: 3.5 });
    expect(baixo.map((o) => o.liberado)).toEqual([true, false, false]);
    expect(alto.map((o) => o.liberado)).toEqual([true, true, true]);
    expect(PRODUTOS).toHaveLength(4);
  });
});

describe("save: migração, integridade e local → conta", () => {
  const p = banca({ [A]: 5 }, [A], { dinheiro: 100 });

  it("aceita um save válido e recusa lixo ou versão do futuro", () => {
    expect(migrar(JSON.parse(JSON.stringify(p)))).toEqual(p);
    expect(migrar(null)).toBeNull();
    expect(migrar({ v: 1 })).toBeNull();
    expect(migrar({ ...p, v: 99 })).toBeNull();
    expect(migrar({ ...p, dinheiro: -5 })).toBeNull();
  });

  it("a checagem de coerência pega melhoria inventada, item inventado e dinheiro impossível", () => {
    expect(saveCoerente(p)).toBe(true);
    expect(saveCoerente({ ...p, melhorias: { fantasma: 1 } })).toBe(false);
    expect(saveCoerente({ ...p, melhorias: { toalha: 9 } })).toBe(false);
    expect(saveCoerente({ ...p, estoque: { ...p.estoque, itens: { "franquia:x": 3 } } })).toBe(false);
    expect(saveCoerente({ ...p, dinheiro: 9_000_000 })).toBe(false);
    expect(saveCoerente({ ...p, estoque: { ...p.estoque, diasUsados: 99 } })).toBe(false);
  });

  it("o save do aparelho vai pra conta quando está mais adiantado; empate fica com a conta", () => {
    const local = { ...p, semana: 4 };
    const remoto = { ...p, semana: 2 };
    expect(escolherSave(local, remoto)).toEqual({ save: local, origem: "local" });
    expect(escolherSave(remoto, local)).toEqual({ save: local, origem: "remoto" });
    expect(escolherSave(p, { ...p })).toMatchObject({ origem: "remoto" });
    expect(escolherSave(local, null)).toEqual({ save: local, origem: "local" });
    expect(escolherSave(null, null)).toEqual({ save: null, origem: "nenhum" });
  });

  it("o save passa pelo ciclo local → JSON → migrar → coerência sem mudar", () => {
    const jogado = jogar(criarEvento(banca({ [A]: 40, [B]: 40 }, [A, B], { seed: "migra", dinheiro: 500 }), feira)!);
    const r = fecharEvento(banca({ [A]: 40, [B]: 40 }, [A, B], { seed: "migra", dinheiro: 500 }), resumoDoEvento(jogado));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const volta = migrar(JSON.parse(JSON.stringify(r.prog)));
    expect(volta).toEqual(r.prog);
    expect(saveCoerente(volta!)).toBe(true);
  });
});
