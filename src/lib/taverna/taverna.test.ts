import { describe, expect, it } from "vitest";
import { atributos, layoutValido } from "./atributos";
import { TAVERNA } from "./config";
import { CATALOGO_PADRAO as CAT, criarCtx } from "./contexto";
import { comprarMelhoria, contratar, fecharNoite, melhorarFuncionario, saldoBate, tetoDaNoite, validarCompra } from "./economia";
import { agir, criarNoite, gruposNaPorta, passo, proximaAcao, resumoDaNoite, type Cliente, type Ctx, type FaseGrupo, type Grupo, type NoiteEstado } from "./motor";
import { escolherSave, migrar } from "./save";
import { novaTaverna } from "./economia";
import type { Papel, Progresso } from "./tipos";

const base = (extra: Partial<Progresso> = {}): Progresso => ({ ...novaTaverna("semente-de-teste"), ...extra });
const comEquipe = (p: Progresso, ...papeis: Papel[]): Progresso => ({ ...p, equipe: papeis.map((papel) => ({ papel, nivel: 1, contratadaNoite: 0 })) });

const cliente = (id: number, arq: string, pedido = "cerveja", pacMax = 40): Cliente => ({ id, arq, pedido, pac: pacMax, pacMax, saiu: null, sat: 0 });
const grupo = (id: number, fase: FaseGrupo, clientes: Cliente[], mesaId: string | null = null): Grupo => ({ id, chegaEm: 0, clientes, fase, mesaId, prontoEm: 0, retirado: false, comendoAte: 0, cobrarDesde: 0 });

/** Noite vazia com os grupos que o teste quer (sem chegadas sorteadas). */
function cena(ctx: Ctx, grupos: Grupo[]): NoiteEstado {
  const e = criarNoite(ctx);
  e.grupos = grupos;
  for (const g of grupos) {
    const m = e.mesas.find((x) => x.id === g.mesaId);
    if (m && g.fase !== "fim") m.grupoId = g.id;
  }
  return e;
}
const ctxDe = (p: Progresso) => criarCtx(p, CAT);
const pac = (e: NoiteEstado, gid: number, cid: number) => e.grupos.find((g) => g.id === gid)!.clientes.find((c) => c.id === cid)!.pac;

describe("queda de paciência", () => {
  it("cai mais devagar com cadeira melhor", () => {
    const queda = (nivelCadeira: number) => {
      const p = base({ melhorias: { ...base().melhorias, cadeiras: nivelCadeira } });
      const ctx = ctxDe(p);
      const e = passo(cena(ctx, [grupo(1, "sentado", [cliente(1, "guerreiro")], "m1")]), ctx, 10);
      return 40 - pac(e, 1, 1);
    };
    expect(queda(1)).toBeCloseTo(10, 1);
    expect(queda(3)).toBeLessThan(queda(2));
    expect(queda(2)).toBeLessThan(queda(1));
  });

  it("cai mais devagar com um bardo cliente no salão, e o bardo não ganha o próprio bônus", () => {
    const ctx = ctxDe(base());
    const sem = passo(cena(ctx, [grupo(1, "sentado", [cliente(1, "guerreiro")], "m1")]), ctx, 10);
    const com = passo(cena(ctx, [grupo(1, "sentado", [cliente(1, "guerreiro")], "m1"), grupo(2, "sentado", [cliente(2, "bardo")], "m2")]), ctx, 10);
    expect(40 - pac(com, 1, 1)).toBeCloseTo((40 - pac(sem, 1, 1)) * TAVERNA.paciencia.bardoClienteMult, 1);
    expect(40 - pac(com, 2, 2)).toBeCloseTo(10, 1);
  });

  it("noite tranquila e bardo da casa também seguram a paciência", () => {
    const perda = (p: Progresso) => {
      const ctx = ctxDe(p);
      return 40 - pac(passo(cena(ctx, [grupo(1, "sentado", [cliente(1, "guerreiro")], "m1")]), ctx, 10), 1, 1);
    };
    const normal = perda(base());
    expect(perda(base({ tranquila: true }))).toBeCloseTo(normal * TAVERNA.paciencia.tranquilaMult, 1);
    expect(perda(comEquipe(base(), "bardo"))).toBeCloseTo(normal * TAVERNA.paciencia.bardoCasaMult[0], 1);
  });

  it("paciência zerada: vai embora sem pagar e a reputação cai", () => {
    const ctx = ctxDe(base());
    const e = passo(cena(ctx, [grupo(1, "sentado", [cliente(1, "guerreiro", "cerveja", 5)], "m1")]), ctx, 6);
    expect(e.foram).toBe(1);
    expect(e.servidos).toBe(0);
    expect(e.repDelta).toBeLessThan(0);
    expect(e.mesas[0].suja).toBe(true);
  });

  it("bárbaro quebra a cadeira, a não ser que haja segurança", () => {
    const quebra = (p: Progresso) => {
      const ctx = ctxDe(p);
      return passo(cena(ctx, [grupo(1, "sentado", [cliente(1, "barbaro", "cerveja", 3)], "m1")]), ctx, 8).reparos;
    };
    expect(quebra(base())).toBe(TAVERNA.custoReparoCadeira);
    expect(quebra(comEquipe(base({ nivel: 3 }), "seguranca"))).toBe(0);
  });
});

describe("satisfação, gorjeta e combo", () => {
  const cobra = (p: Progresso, clientes: Cliente[], combo = 0) => {
    const ctx = ctxDe(p);
    const g = grupo(1, "cobrar", clientes, "m2");
    const e = cena(ctx, [g]);
    e.combo = combo;
    const r = agir(e, ctx, { tipo: "cobrar", mesaId: "m2" });
    expect(r.erro).toBeNull();
    return r.estado;
  };

  it("cobra o valor do pedido vezes o quanto o arquétipo gasta, e conta venda e satisfação", () => {
    const e = cobra(base(), [cliente(1, "guerreiro")]);
    expect(e.servidos).toBe(1);
    expect(e.vendas.cerveja).toBe(1);
    expect(e.ganhos).toBe(Math.round(8 * 1.2));
    expect(e.porArq.guerreiro.n).toBe(1);
  });

  it("atendimento rápido satisfaz mais e rende mais gorjeta que o demorado", () => {
    const rapido = cobra(base(), [cliente(1, "guerreiro")]);
    const lento = cobra(base(), [{ ...cliente(1, "guerreiro"), pac: 4 }]);
    expect(rapido.porArq.guerreiro.soma).toBeGreaterThan(lento.porArq.guerreiro.soma);
    expect(rapido.gorjetas).toBeGreaterThanOrEqual(lento.gorjetas);
  });

  it("receita e cadeira melhores aumentam a satisfação", () => {
    const melhor = base({ melhorias: { ...base().melhorias, cerveja: 3, cadeiras: 3, lareira: 3 } });
    expect(cobra(melhor, [cliente(1, "guerreiro")]).porArq.guerreiro.soma).toBeGreaterThan(cobra(base(), [cliente(1, "guerreiro")]).porArq.guerreiro.soma);
  });

  it("o combo multiplica a gorjeta", () => {
    const sem = cobra(base(), [cliente(1, "mago", "cerveja")], 0);
    const com = cobra(base(), [cliente(1, "mago", "cerveja")], 6);
    expect(com.gorjetas).toBeGreaterThan(sem.gorjetas);
  });

  it("servir o mesmo pedido pra vários da mesa soma combo; grupos seguidos também; uma fuga zera", () => {
    const ctx = ctxDe(base());
    const g1 = grupo(1, "pediu", [cliente(1, "guerreiro", "cerveja"), cliente(2, "guerreiro", "cerveja")], "m2");
    g1.retirado = true;
    let r = agir(cena(ctx, [g1]), ctx, { tipo: "servir", mesaId: "m2" });
    expect(r.estado.combo).toBe(TAVERNA.combo.porPedidoIgual);

    const a = grupo(1, "pediu", [cliente(1, "guerreiro", "cerveja")], "m1");
    const b = grupo(2, "pediu", [cliente(2, "guerreiro", "ensopado")], "m2");
    a.retirado = b.retirado = true;
    const e = cena(ctx, [a, b]);
    r = agir(e, ctx, { tipo: "servir", mesaId: "m1" });
    expect(r.estado.combo).toBe(0);
    const depois = { ...r.estado, jogadorOcupadoAte: 0 };
    r = agir(depois, ctx, { tipo: "servir", mesaId: "m2" });
    expect(r.estado.combo).toBe(TAVERNA.combo.porGrupoSeguido);

    const fugiu = passo(cena(ctx, [grupo(1, "sentado", [cliente(1, "guerreiro", "cerveja", 2)], "m1")]), ctx, 3);
    expect(fugiu.combo).toBe(0);
  });

  it("mago quer mesa longe de bardo e bárbaro", () => {
    const ctx = ctxDe(base());
    const perto = cena(ctx, [grupo(1, "cobrar", [cliente(1, "mago", "cerveja")], "m1"), grupo(2, "sentado", [cliente(2, "barbaro")], "m2")]);
    const longe = cena(ctx, [grupo(1, "cobrar", [cliente(1, "mago", "cerveja")], "m1")]);
    const a = agir(perto, ctx, { tipo: "cobrar", mesaId: "m1" }).estado;
    const b = agir(longe, ctx, { tipo: "cobrar", mesaId: "m1" }).estado;
    expect(b.porArq.mago.soma).toBeGreaterThan(a.porArq.mago.soma);
  });
});

describe("funcionários", () => {
  it("atendente acomoda e anota sozinho", () => {
    const ctx = ctxDe(comEquipe(base(), "atendente"));
    let e = cena(ctx, [grupo(1, "fila", [cliente(1, "guerreiro")])]);
    e = passo(e, ctx, 1);
    expect(e.grupos[0].fase).toBe("sentado");
    e = passo(e, ctx, 3);
    expect(e.grupos[0].fase).toBe("pediu");
  });

  it("sem atendente, nada acontece sozinho", () => {
    const ctx = ctxDe(base());
    const e = passo(cena(ctx, [grupo(1, "fila", [cliente(1, "guerreiro")])]), ctx, 3);
    expect(e.grupos[0].fase).toBe("fila");
  });

  it("garçom busca e serve o pedido pronto", () => {
    const ctx = ctxDe(comEquipe(base({ nivel: 2 }), "garcom"));
    const e = passo(cena(ctx, [grupo(1, "pediu", [cliente(1, "guerreiro")], "m1")]), ctx, 4);
    expect(e.grupos[0].fase).toBe("comendo");
  });

  it("ajudante limpa a mesa", () => {
    const ctx = ctxDe(comEquipe(base(), "ajudante"));
    const e = cena(ctx, []);
    e.mesas[0].suja = true;
    expect(passo(e, ctx, 3).mesas[0].suja).toBe(false);
  });

  it("cozinheiro prepara os pratos mais rápido", () => {
    const prontoEm = (p: Progresso) => {
      const ctx = ctxDe(p);
      const r = agir(cena(ctx, [grupo(1, "sentado", [cliente(1, "guerreiro", "ensopado")], "m1")]), ctx, { tipo: "anotar", mesaId: "m1" });
      return r.estado.grupos[0].prontoEm;
    };
    expect(prontoEm(comEquipe(base({ nivel: 2 }), "cozinheiro"))).toBeLessThan(prontoEm(base()));
  });

  it("segurança impede o ladino de sair sem pagar", () => {
    const foge = (p: Progresso) => {
      const ctx = ctxDe(p);
      const e = cena(ctx, [{ ...grupo(1, "cobrar", [cliente(1, "ladino")], "m1"), cobrarDesde: 0 }]);
      return passo(e, ctx, TAVERNA.noite.ladinoToleranciaSeg + 2).foram;
    };
    expect(foge(base())).toBe(1);
    expect(foge(comEquipe(base({ nivel: 3 }), "seguranca"))).toBe(0);
  });

  it("bardo da casa e seguranca não são agentes de tarefas, só passivos", () => {
    const e = criarNoite(ctxDe(comEquipe(base({ nivel: 3 }), "bardo", "seguranca", "atendente")));
    expect(e.agentes.map((a) => a.papel)).toEqual(["atendente"]);
  });
});

describe("compra de melhorias", () => {
  it("não compra sem ouro", () => {
    expect(validarCompra(base({ ouro: 10 }), CAT, "hidromel")).toEqual({ ok: false, erro: "saldo" });
  });
  it("não passa do nível máximo", () => {
    const p = base({ ouro: 9999, melhorias: { ...base().melhorias, cerveja: 3 } });
    expect(validarCompra(p, CAT, "cerveja")).toEqual({ ok: false, erro: "nivelMax" });
  });
  it("respeita o nível mínimo da taverna", () => {
    expect(validarCompra(base({ ouro: 9999 }), CAT, "mesa-redonda")).toEqual({ ok: false, erro: "nivelTaverna" });
    expect(validarCompra(base({ ouro: 9999, nivel: 3 }), CAT, "mesa-redonda").ok).toBe(true);
  });
  it("debita o preço do servidor, sobe o nível e põe a mesa nova no salão", () => {
    const r = comprarMelhoria(base({ ouro: 500 }), CAT, "mesa-2");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.prog.ouro).toBe(500 - 60);
    expect(r.prog.melhorias["mesa-2"]).toBe(2);
    expect(r.prog.layout.filter((m) => m.tipo === "mesa-2")).toHaveLength(2);
    expect(layoutValido(r.prog.layout, r.prog, CAT)).toBe(true);
  });
  it("não aceita uma disposição com mais mesas do que as compradas", () => {
    const p = base();
    expect(layoutValido([...p.layout, { id: "m9", tipo: "mesa-4", x: 3, y: 2 }], p, CAT)).toBe(false);
  });
  it("contratação e melhoria de funcionário respeitam saldo, nível e vagas", () => {
    expect(contratar(base({ ouro: 5 }), "atendente")).toEqual({ ok: false, erro: "saldo" });
    expect(contratar(base({ ouro: 999 }), "seguranca")).toEqual({ ok: false, erro: "nivelTaverna" });
    const c = contratar(base({ ouro: 999 }), "atendente");
    expect(c.ok && c.prog.ouro).toBe(909);
    if (!c.ok) return;
    expect(contratar(c.prog, "ajudante")).toEqual({ ok: false, erro: "semVaga" });
    expect(contratar(c.prog, "atendente")).toEqual({ ok: false, erro: "jaContratado" });
    const m = melhorarFuncionario(c.prog, "atendente");
    expect(m.ok && m.prog.equipe[0].nivel).toBe(2);
    expect(atributos(c.prog, CAT).equipe.atendente?.velocidade).toBe(1);
  });
});

describe("fechamento da noite e da semana", () => {
  const resumo = (p: Progresso, extra: Partial<ReturnType<typeof resumoDaNoite>> = {}) => ({
    noite: p.noite + 1, servidos: 10, foram: 1, vendas: { cerveja: 6, ensopado: 4 }, ganhos: 110, gorjetas: 12, reparos: 0, repDelta: 0.2,
    porArquetipo: { guerreiro: { n: 6, sat: 0.7 }, bardo: { n: 4, sat: 0.8 } }, tranquila: false, ...extra,
  });

  it("desconta ingredientes e salários e o saldo bate", () => {
    const p = comEquipe(base({ ouro: 100 }), "atendente");
    const r = fecharNoite(p, CAT, resumo(p));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.registro.gastos).toEqual({ ingredientes: 6 * 3 + 4 * 5, salarios: 14, reparos: 0 });
    expect(r.registro.saldo).toBe(110 + 12 - (38 + 14));
    expect(saldoBate(r.registro)).toBe(true);
    expect(r.prog.ouro).toBe(100 + r.registro.saldo);
    expect(r.prog.noite).toBe(1);
    expect(r.registro.melhorArquetipo).toBe("bardo");
    expect(r.prog.reputacao).toBeCloseTo(2.2, 2);
  });

  it("a noite só avança pra frente, de uma em uma", () => {
    const p = base();
    expect(fecharNoite(p, CAT, resumo(p, { noite: 5 })).ok).toBe(false);
    expect(fecharNoite(p, CAT, resumo(p, { noite: 0 })).ok).toBe(false);
  });

  it("recusa resumo que não fecha: vendas diferentes dos servidos, ganho impossível ou gorjeta exagerada", () => {
    const p = base();
    expect(fecharNoite(p, CAT, resumo(p, { servidos: 11 })).ok).toBe(false);
    expect(fecharNoite(p, CAT, resumo(p, { ganhos: 5000 })).ok).toBe(false);
    expect(fecharNoite(p, CAT, resumo(p, { gorjetas: 500 })).ok).toBe(false);
    expect(fecharNoite(p, CAT, resumo(p, { vendas: { vinho: 10 } })).ok).toBe(false);
  });

  it("o ouro da noite não passa do teto do salão e da duração da noite", () => {
    const p = base();
    const teto = tetoDaNoite(p, CAT);
    expect(teto.clientes).toBe(Math.floor((6 * (TAVERNA.noite.duracaoSeg + TAVERNA.noite.gracaFechamentoSeg)) / TAVERNA.noite.tempoMinPorClienteSeg));
    const n = teto.clientes + 1;
    const r = fecharNoite(p, CAT, resumo(p, { servidos: n, vendas: { cerveja: n }, ganhos: n * 8, gorjetas: 0, porArquetipo: { guerreiro: { n, sat: 0.5 } } }));
    expect(r.ok).toBe(false);
    const maisMesas = base({ melhorias: { ...base().melhorias, "mesa-2": 4 } });
    expect(tetoDaNoite({ ...maisMesas, layout: [...maisMesas.layout, { id: "m3", tipo: "mesa-2", x: 0, y: 1 }, { id: "m4", tipo: "mesa-2", x: 1, y: 1 }, { id: "m5", tipo: "mesa-2", x: 2, y: 1 }] }, CAT).clientes).toBeGreaterThan(teto.clientes);
  });

  it("cobra a taxa da guilda na sétima noite", () => {
    const p = base({ noite: 6, ouro: 400 });
    const r = fecharNoite(p, CAT, resumo(p));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.semana).toEqual({ semana: 1, taxa: 70, paga: true, saldoFim: r.prog.ouro });
    expect(r.prog.ouro).toBe(400 + r.registro.saldo - 70);
  });

  it("sem ouro pra taxa: zera o caixa e perde reputação", () => {
    const p = base({ noite: 6, ouro: 0 });
    const r = fecharNoite(p, CAT, resumo(p, { ganhos: 60, gorjetas: 0, vendas: { cerveja: 10 }, servidos: 10, porArquetipo: { guerreiro: { n: 10, sat: 0.5 } } }));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.semana?.paga).toBe(false);
    expect(r.prog.ouro).toBe(0);
    expect(r.prog.reputacao).toBeLessThan(p.reputacao + 0.2);
  });

  it("sobe de nível por reputação e noites abertas, nunca desce", () => {
    const p = base({ noite: 3, reputacao: 2.6 });
    const r = fecharNoite(p, CAT, resumo(p, { repDelta: 0 }));
    expect(r.ok && r.prog.nivel).toBe(2);
    const q = base({ nivel: 3, noite: 20, reputacao: 1 });
    const s = fecharNoite(q, CAT, resumo(q, { repDelta: 0 }));
    expect(s.ok && s.prog.nivel).toBe(3);
  });
});

describe("chegada de clientes", () => {
  it("mesma seed e mesma noite dão sempre os mesmos grupos", () => {
    const a = criarNoite(ctxDe(base()));
    const b = criarNoite(ctxDe(base()));
    expect(a.grupos).toEqual(b.grupos);
    expect(a.grupos.length).toBeGreaterThan(0);
  });
  it("outra seed, outra noite ou outra reputação mudam a chegada", () => {
    const a = criarNoite(ctxDe(base()));
    expect(criarNoite(ctxDe(base({ seed: "outra" }))).grupos).not.toEqual(a.grupos);
    expect(criarNoite(ctxDe(base({ noite: 1 }))).grupos).not.toEqual(a.grupos);
  });
  it("só chegam arquétipos liberados pela reputação e pelo nível, em grupos de 1 a 4", () => {
    const e = criarNoite(ctxDe(base()));
    const arqs = new Set(e.grupos.flatMap((g) => g.clientes.map((c) => c.arq)));
    for (const a of arqs) expect(["guerreiro", "barbaro", "bardo"]).toContain(a);
    for (const g of e.grupos) expect(g.clientes.length).toBeGreaterThanOrEqual(1);
    const rica = criarNoite(ctxDe(base({ nivel: 5, reputacao: 5 })));
    expect(new Set(rica.grupos.flatMap((g) => g.clientes.map((c) => c.arq))).size).toBeGreaterThan(arqs.size);
  });
  it("jogando do começo ao fim, o resumo da noite é aceito pelo servidor", () => {
    let p = base();
    for (let n = 0; n < 3; n++) {
      const ctx = ctxDe(p);
      let e = criarNoite(ctx);
      let guarda = 0;
      while (!e.fim && guarda++ < 5000) {
        const porta = gruposNaPorta(e)[0];
        if (porta) {
          const mesa = ctx.attr.mesas.find((m) => m.lugares >= porta.clientes.filter((c) => !c.saiu).length && e.mesas.find((x) => x.id === m.id && !x.suja && x.grupoId === null));
          if (mesa) e = agir(e, ctx, { tipo: "acomodar", grupoId: porta.id, mesaId: mesa.id }).estado;
        }
        for (const m of e.mesas) {
          const a = proximaAcao(e, m.id);
          if (a) e = agir(e, ctx, { tipo: a.tipo, mesaId: m.id }).estado;
        }
        e = passo(e, ctx, 0.5);
      }
      expect(e.fim).toBe(true);
      const r = fecharNoite(p, CAT, resumoDaNoite(e, ctx));
      expect(r.ok).toBe(true);
      if (!r.ok) return;
      expect(r.registro.servidos).toBeGreaterThan(0);
      expect(saldoBate(r.registro)).toBe(true);
      p = r.prog;
    }
    expect(p.noite).toBe(3);
  });
});

describe("save", () => {
  it("migra um save válido e recusa lixo", () => {
    const p = base({ noite: 3 });
    expect(migrar(JSON.parse(JSON.stringify(p)))?.noite).toBe(3);
    expect(migrar({ v: 1, ouro: -3 })).toBeNull();
    expect(migrar(null)).toBeNull();
    expect(migrar("x")).toBeNull();
  });
  it("migra o save do aparelho pra conta: o mais avançado vence", () => {
    const local = base({ noite: 5 });
    const remoto = base({ noite: 2 });
    expect(escolherSave(local, remoto)).toEqual({ save: local, origem: "local" });
    expect(escolherSave(base({ noite: 1 }), remoto).origem).toBe("remoto");
    expect(escolherSave(local, null).origem).toBe("local");
    expect(escolherSave(null, remoto).origem).toBe("remoto");
    expect(escolherSave(null, null).origem).toBe("nenhum");
  });
});
