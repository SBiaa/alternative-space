import { describe, expect, it } from "vitest";
import { atributos, layoutValido } from "./atributos";
import { LAN } from "./config";
import { CATALOGO_PADRAO, criarCtx } from "./contexto";
import { recadosDaManha } from "./conversanet";
import { comprarMelhoria, contasDaSemana, contratar, fecharDia, novaLan, tetoDeHoras } from "./economia";
import {
  agir, barulhoEm, chanceProblema, consertosPara, criarDia, encerrar, gorjeta, melhorAlocacao, passo, resumoDoDia, satisfacao,
  sortearChegadas, type Ctx, type DiaEstado, type Grupo,
} from "./motor";
import { escolherSave, migrar, saveCoerente } from "./save";
import type { Progresso } from "./tipos";

const cat = CATALOGO_PADRAO;
const lan = (extra: Partial<Progresso> = {}): Progresso => ({ ...novaLan("seed-teste", cat), ...extra });

/** Lan com as melhorias dadas já compradas (de graça, pra teste). */
function comMelhorias(p: Progresso, slugs: Record<string, number>): Progresso {
  let q = { ...p, dinheiro: 1_000_000, nivel: 5 };
  for (const [slug, nivel] of Object.entries(slugs)) {
    while ((q.melhorias[slug] ?? 0) < nivel) {
      const r = comprarMelhoria(q, cat, slug);
      if (!r.ok) throw new Error(`${slug}: ${r.erro}`);
      q = r.prog;
    }
  }
  return { ...q, dinheiro: p.dinheiro, nivel: p.nivel };
}

/** Põe um grupo na fila agora, sem depender do sorteio. */
function grupoNaFila(e: DiaEstado, arq: string, n = 1, extra: Partial<Grupo> = {}): DiaEstado {
  const g: Grupo = {
    id: 999 + e.grupos.length, arq, n, chegaEm: e.t, fase: "fila", pac: 30, pacMax: 30, espera: 0, maquinas: [], pacoteMin: 0, pago: 0,
    usoSeg: 0, querSeg: 30, problemaSeg: 0, servicos: [], chamado: null, lancheEm: 0, pediuLanche: false, lanche: null, ajudado: false,
    adequada: 1, saiu: null, sat: 0, ...extra,
  };
  return { ...e, grupos: [...e.grupos.map((x) => ({ ...x, fase: "fim" as const })), g] };
}

/** Contexto sem chegadas e sem incidentes aleatórios (pra isolar uma regra). */
function ctxQuieto(p: Progresso): Ctx {
  const c = criarCtx(p, cat);
  return { ...c, energiaInstavel: false, attr: { ...c.attr, quedaNetMult: 0 }, tranquilo: false };
}
function semProblemas(c: Ctx): Ctx {
  return { ...c, attr: { ...c.attr, mouseOptico: true, virusMult: 0, quedaNetMult: 0 }, tranquilo: true };
}

describe("chegadas", () => {
  it("são reproduzíveis com a mesma seed e mudam com outra", () => {
    const p = lan();
    const a = sortearChegadas(criarCtx(p, cat));
    const b = sortearChegadas(criarCtx(p, cat));
    const c = sortearChegadas(criarCtx({ ...p, seed: "outra" }, cat));
    expect(a.length).toBeGreaterThan(0);
    expect(b).toEqual(a);
    expect(c).not.toEqual(a);
  });

  it("sábado traz mais gente e mais grupos da galera do tiro", () => {
    const p = lan({ reputacao: 3 });
    const sabado = sortearChegadas(criarCtx({ ...p, dia: 5 }, cat));
    const terca = sortearChegadas(criarCtx({ ...p, dia: 1 }, cat));
    expect(sabado.length).toBeGreaterThan(terca.length);
  });

  it("de manhã vem mais serviço que jogo", () => {
    let manha = 0;
    let jogo = 0;
    for (let d = 0; d < 20; d++) {
      for (const g of sortearChegadas(criarCtx(lan({ dia: d, reputacao: 3 }), cat))) {
        if (g.chegaEm < (4 * 60) / LAN.minutosPorSeg) {
          if (g.servicos.length) manha++;
          if (g.arq === "galera-tiro") jogo++;
        }
      }
    }
    expect(manha).toBeGreaterThan(jogo);
  });
});

describe("paciência", () => {
  const p = lan();
  it("cai na fila e o cliente vai embora quando zera, tirando reputação", () => {
    const ctx = ctxQuieto(p);
    let e = grupoNaFila(criarDia(ctx), "rei-mensageiro", 1, { pac: 5, pacMax: 5 });
    e = passo(e, ctx, 2);
    const g = e.grupos.at(-1)!;
    expect(g.pac).toBeLessThan(5);
    e = passo(e, ctx, 10);
    expect(e.grupos.at(-1)!.saiu).toBe("paciencia");
    expect(e.foram).toBe(1);
    expect(e.repDelta).toBeLessThan(0);
  });

  it("cai mais rápido com a máquina travada, e quem já pagou pede o dinheiro de volta", () => {
    const ctx = semProblemas(ctxQuieto(p));
    let e = grupoNaFila(criarDia(ctx), "rei-mensageiro", 1, { querSeg: 500, pac: 20, pacMax: 20 });
    const id = e.grupos.at(-1)!.id;
    e = agir(e, ctx, { tipo: "atender", grupo: id, maquinas: ["pc1"], pacote: "1h" }).estado;
    const pago = e.grupos.at(-1)!.pago;
    const ok = passo(e, ctx, 4).grupos.at(-1)!.pac;
    e.maquinas[0].problema = "travou";
    const travado = passo(e, ctx, 4).grupos.at(-1)!.pac;
    expect(ok).toBeGreaterThan(travado);
    const fim = passo(e, ctx, 30);
    expect(fim.grupos.at(-1)!.saiu).toBe("paciencia");
    expect(fim.reembolsos).toBe(pago);
  });

  it("cai quando a internet cai (e mais pra quem joga on-line)", () => {
    const ctx = semProblemas(ctxQuieto(comMelhorias(p, { internet: 2 })));
    let e = grupoNaFila(criarDia(ctx), "rei-mensageiro", 1, { querSeg: 500 });
    e = grupoNaFila({ ...e, grupos: e.grupos }, "jogador-mmo", 1, { querSeg: 500 });
    e.grupos.at(-2)!.fase = "fila";
    const [msg, mmo] = e.grupos.slice(-2);
    e = agir(e, ctx, { tipo: "atender", grupo: msg.id, maquinas: ["pc1"], pacote: "1h" }).estado;
    e.agentes[0].ocupadoAte = 0;
    e = agir(e, ctx, { tipo: "atender", grupo: mmo.id, maquinas: ["pc3"], pacote: "1h" }).estado;
    e.netAte = e.t + 100;
    const depois = passo(e, ctx, 3);
    const perdaMsg = 30 - depois.grupos.at(-2)!.pac;
    const perdaMmo = 30 - depois.grupos.at(-1)!.pac;
    expect(perdaMsg).toBeGreaterThan(0);
    expect(perdaMmo).toBeGreaterThan(perdaMsg);
  });

  it("o dia tranquilo faz a paciência cair mais devagar", () => {
    const normal = ctxQuieto(p);
    const tranquilo = { ...normal, tranquilo: true };
    const e = grupoNaFila(criarDia(normal), "rei-mensageiro");
    expect(passo(e, tranquilo, 4).grupos.at(-1)!.pac).toBeGreaterThan(passo(e, normal, 4).grupos.at(-1)!.pac);
  });
});

describe("problemas das máquinas", () => {
  const ctx = ctxQuieto(lan());
  const nova = { tipo: "media" as const, saude: 100, sujeira: 0 };
  it("máquina velha, suja e básica dá mais problema", () => {
    for (const t of ["travou", "virus", "erro"] as const) {
      expect(chanceProblema(ctx, { ...nova, saude: 20 }, t, false)).toBeGreaterThan(chanceProblema(ctx, nova, t, false));
      expect(chanceProblema(ctx, { ...nova, tipo: "basica" }, t, false)).toBeGreaterThan(chanceProblema(ctx, { ...nova, tipo: "gamer" }, t, false));
    }
    expect(chanceProblema(ctx, { ...nova, sujeira: 90 }, "mouse", false)).toBeGreaterThan(chanceProblema(ctx, nova, "mouse", false));
  });

  it("mouse óptico acaba com a sujeira da bolinha; antivírus e congelar seguram o fuçador", () => {
    const c2 = ctxQuieto(comMelhorias(lan(), { "mouse-optico": 1 }));
    expect(chanceProblema(c2, { ...nova, sujeira: 100 }, "mouse", false)).toBe(0);
    const fucador = chanceProblema(ctx, nova, "virus", true);
    expect(fucador).toBeGreaterThan(chanceProblema(ctx, nova, "virus", false));
    const comAntivirus = ctxQuieto(comMelhorias(lan(), { antivirus: 1 }));
    expect(chanceProblema(comAntivirus, nova, "virus", true)).toBeLessThan(fucador);
    const congelada = ctxQuieto(comMelhorias(lan(), { congelar: 1 }));
    expect(chanceProblema(congelada, nova, "virus", true)).toBe(chanceProblema(ctx, nova, "virus", false));
  });

  it("tela de erro que volta só sai formatando; vírus aceita antivírus ou formatar", () => {
    expect(consertosPara({ problema: "erro", erroRepete: false })).toContain("reiniciar");
    expect(consertosPara({ problema: "erro", erroRepete: true })).toEqual(["formatar"]);
    expect(consertosPara({ problema: "virus", erroRepete: false })).toEqual(["antivirus", "formatar"]);
    expect(consertosPara({ problema: "mouse", erroRepete: false })).toEqual(["limpar"]);
  });

  it("formatar deixa a máquina parada e conta no gasto de consertos", () => {
    let e = criarDia(ctx);
    e.maquinas[0].problema = "virus";
    e = agir(e, ctx, { tipo: "consertar", maquina: "pc1", como: "formatar" }).estado;
    expect(e.maquinas[0].problema).toBeNull();
    expect(e.maquinas[0].saude).toBe(100);
    expect(e.maquinas[0].paradaAte).toBeGreaterThan(e.t);
    expect(e.formatacoes).toBe(1);
  });
});

describe("barulho", () => {
  const base = comMelhorias(lan(), { "pc-basica": 6, espaco: 2, divisoria: 1 });
  function cenario(divisoria: number | null, alvoX: number) {
    const p = { ...base, layout: { pcs: base.layout.pcs.map((c, i) => ({ ...c, x: i % 5, y: 0 })), divisoria } };
    const ctx = ctxQuieto(p);
    const e = criarDia(ctx);
    e.grupos = [{ ...grupoNaFila(e, "galera-tiro").grupos.at(-1)!, fase: "usando", maquinas: ["pc1"] }];
    const alvo = e.maquinas.find((m) => m.x === alvoX)!;
    return barulhoEm(e, ctx, [alvo]);
  }
  it("cai com a distância e some além do raio", () => {
    expect(cenario(null, 1)).toBeGreaterThan(cenario(null, 2));
    expect(cenario(null, 4)).toBe(0);
  });
  it("a divisória bloqueia o barulho entre os setores", () => {
    expect(cenario(1, 1)).toBe(0);
    expect(cenario(3, 1)).toBeGreaterThan(0);
  });
  it("o monitor do salão diminui o barulho", () => {
    const p = { ...base, layout: { ...base.layout, divisoria: null }, equipe: [{ papel: "monitor" as const, nivel: 1, contratadoDia: 0 }] };
    const ctx = ctxQuieto(p);
    const e = criarDia(ctx);
    e.grupos = [{ ...grupoNaFila(e, "galera-tiro").grupos.at(-1)!, fase: "usando", maquinas: ["pc1"] }];
    expect(barulhoEm(e, ctx, [e.maquinas[1]])).toBeCloseTo(cenario(null, 1) * LAN.paciencia.monitorBarulhoMult[0]);
  });
});

describe("satisfação e gorjeta", () => {
  const ctx = ctxQuieto(lan());
  const g = { espera: 0, pacMax: 30, adequada: 1, problemaSeg: 0, usoSeg: 30, pediuLanche: false, lanche: null, pacoteMin: 60, querSeg: 17 };
  it("cai com espera, máquina ruim, problemas e lanche que não veio", () => {
    const boa = satisfacao(ctx, g);
    expect(satisfacao(ctx, { ...g, espera: 20 })).toBeLessThan(boa);
    expect(satisfacao(ctx, { ...g, adequada: 0.3 })).toBeLessThan(boa);
    expect(satisfacao(ctx, { ...g, problemaSeg: 10 })).toBeLessThan(boa);
    expect(satisfacao(ctx, { ...g, pediuLanche: true })).toBeLessThan(boa);
  });
  it("gorjeta só acima do mínimo e cresce com a satisfação", () => {
    expect(gorjeta(LAN.satisfacao.gorjetaMinSat - 0.01, 20, 0.3)).toBe(0);
    expect(gorjeta(1, 20, 0.3)).toBeGreaterThan(gorjeta(0.8, 20, 0.3));
  });
  it("cobrar paga o tempo extra e conta o cliente", () => {
    const c = semProblemas(ctx);
    let e = grupoNaFila(criarDia(c), "rei-mensageiro", 1, { querSeg: 30 });
    const id = e.grupos.at(-1)!.id;
    e = agir(e, c, { tipo: "atender", grupo: id, maquinas: ["pc1"], pacote: "30m" }).estado;
    const antes = e.ganhosTempo;
    e = passo(e, c, 31);
    expect(e.grupos.at(-1)!.fase).toBe("cobrar");
    e.agentes[0].ocupadoAte = 0;
    e = agir(e, c, { tipo: "cobrar", grupo: id }).estado;
    expect(e.ganhosTempo).toBeGreaterThan(antes);
    expect(e.servidos).toBe(1);
  });
});

describe("funcionários", () => {
  const base = lan();
  const com = (papel: "caixa" | "tecnico" | "monitor") => ({ ...base, nivel: 2, equipe: [{ papel, nivel: 1, contratadoDia: 0 }] });
  it("o caixa atende a fila sozinho", () => {
    const ctx = semProblemas(ctxQuieto(com("caixa")));
    const e = passo(grupoNaFila(criarDia(ctx), "rei-mensageiro"), ctx, 0.5);
    expect(e.grupos.at(-1)!.fase).toBe("usando");
  });
  it("o técnico conserta a máquina sozinho", () => {
    const ctx = ctxQuieto(com("tecnico"));
    const e = criarDia(ctx);
    e.maquinas[1].problema = "travou";
    expect(passo(e, ctx, 0.5).maquinas[1].problema).toBeNull();
  });
  it("o monitor ajuda o tio que não sabe usar", () => {
    const ctx = semProblemas(ctxQuieto(com("monitor")));
    let e = grupoNaFila(criarDia(ctx), "tio", 1, { querSeg: 200 });
    e = agir(e, ctx, { tipo: "atender", grupo: e.grupos.at(-1)!.id, maquinas: ["pc1"], pacote: "1h" }).estado;
    expect(e.grupos.at(-1)!.chamado).toBe("ajuda");
    e = passo(e, ctx, 0.5);
    expect(e.grupos.at(-1)!.chamado).toBeNull();
    expect(e.grupos.at(-1)!.ajudado).toBe(true);
  });
  it("o caixa escolhe máquinas vizinhas pra galera", () => {
    const p = comMelhorias(base, { "pc-basica": 5, espaco: 2 });
    const ctx = semProblemas(ctxQuieto(p));
    const e = grupoNaFila(criarDia(ctx), "galera-tiro", 3);
    const ids = melhorAlocacao(e, ctx, e.grupos.at(-1)!)!;
    const ms = ids.map((id) => e.maquinas.find((m) => m.id === id)!);
    expect(ids).toHaveLength(3);
    expect(Math.max(...ms.map((m) => m.y)) - Math.min(...ms.map((m) => m.y)) + Math.max(...ms.map((m) => m.x)) - Math.min(...ms.map((m) => m.x))).toBeLessThanOrEqual(2);
  });
});

describe("melhorias e equipe", () => {
  it("recusa sem saldo, no nível máximo e abaixo do nível da lan", () => {
    const p = lan({ dinheiro: 10 });
    expect(comprarMelhoria(p, cat, "nobreak")).toMatchObject({ ok: false, erro: "saldo" });
    expect(comprarMelhoria(lan({ dinheiro: 9999 }), cat, "mouse-optico").ok).toBe(true);
    const comMouse = comMelhorias(lan(), { "mouse-optico": 1 });
    expect(comprarMelhoria({ ...comMouse, dinheiro: 9999 }, cat, "mouse-optico")).toMatchObject({ ok: false, erro: "nivelMax" });
    expect(comprarMelhoria(lan({ dinheiro: 9999 }), cat, "pc-gamer")).toMatchObject({ ok: false, erro: "nivelLan" });
  });
  it("comprar máquina põe a máquina no salão; sem espaço, recusa", () => {
    const r = comprarMelhoria(lan({ dinheiro: 9999 }), cat, "pc-basica");
    expect(r.ok && r.prog.maquinas.length).toBe(4);
    expect(r.ok && layoutValido(r.prog.layout, r.prog, cat)).toBe(true);
    let p = lan({ dinheiro: 99999, nivel: 5 });
    let erro = "";
    for (let i = 0; i < 20 && !erro; i++) {
      const c = comprarMelhoria(p, cat, i % 2 ? "pc-media" : "pc-basica");
      if (c.ok) p = c.prog;
      else erro = c.erro;
    }
    expect(erro).toBe("semEspaco");
  });
  it("contratar respeita vaga e nível", () => {
    const p = lan({ dinheiro: 9999 });
    expect(contratar(p, "tecnico")).toMatchObject({ ok: false, erro: "nivelLan" });
    const c = contratar(p, "caixa");
    expect(c.ok).toBe(true);
    expect(c.ok && contratar(c.prog, "caixa")).toMatchObject({ ok: false, erro: "jaContratado" });
    expect(c.ok && contratar({ ...c.prog, nivel: 2 }, "monitor")).toMatchObject({ ok: false, erro: "semVaga" });
  });
});

describe("fechamento", () => {
  function jogarDia(p: Progresso) {
    const ctx = criarCtx(p, cat);
    return resumoDoDia(encerrar(criarDia(ctx), ctx), ctx);
  }
  it("desconta estoque, salários e consertos e o saldo bate", () => {
    const p = { ...lan({ dinheiro: 500 }), equipe: [{ papel: "caixa" as const, nivel: 1, contratadoDia: 0 }] };
    const r = jogarDia(p);
    const comLanche = { ...r, lanches: { refri: 2 }, ganhosLanches: 6, formatacoes: 1 };
    const f = fecharDia(p, cat, comLanche);
    expect(f.ok).toBe(true);
    if (!f.ok) return;
    expect(f.registro.gastos).toEqual({ estoque: 2, salarios: 10, consertos: LAN.custoFormatar });
    expect(f.registro.saldo).toBe(f.registro.ganhos - 2 - 10 - LAN.custoFormatar);
    expect(f.prog.dinheiro).toBe(500 + f.registro.saldo);
    expect(f.prog.estoque.refri).toBe(atributos(p, cat).lanches.refri!.capacidade);
  });
  it("recusa dia fora de ordem, lanche com preço errado e acima do estoque", () => {
    const p = lan();
    const r = jogarDia(p);
    expect(fecharDia(p, cat, { ...r, dia: 3 }).ok).toBe(false);
    expect(fecharDia(p, cat, { ...r, lanches: { refri: 1 }, ganhosLanches: 99 }).ok).toBe(false);
    expect(fecharDia(p, cat, { ...r, lanches: { refri: 999 }, ganhosLanches: 2997 }).ok).toBe(false);
  });
  it("recusa horas vendidas acima do teto (máquinas × horas abertas)", () => {
    const p = lan();
    const r = jogarDia(p);
    const teto = tetoDeHoras(p, cat);
    expect(fecharDia(p, cat, { ...r, minutosVendidos: Math.ceil(teto * 60) + 60 }).ok).toBe(false);
    expect(teto).toBeCloseTo(3 * (14 + 3));
  });
  it("cobra as contas no fim da semana; sem dinheiro, zera e perde reputação", () => {
    const p = lan({ dia: 6, dinheiro: 1000 });
    const r = jogarDia(p);
    const f = fecharDia(p, cat, r);
    expect(f.ok && f.semana?.paga).toBe(true);
    const contas = contasDaSemana(p, cat);
    if (f.ok) expect(f.semana!.contas).toEqual(contas);
    const pobre = lan({ dia: 6, dinheiro: 0 });
    const f2 = fecharDia(pobre, cat, { ...jogarDia(pobre), servidos: 0, porArquetipo: {}, novosFrequentes: {}, ganhosTempo: 0, minutosVendidos: 0, gorjetas: 0, reembolsos: 0, ganhosServicos: 0, servicos: {} });
    expect(f2.ok && f2.semana?.paga).toBe(false);
    expect(f2.ok && f2.prog.dinheiro).toBe(0);
  });
  it("a conta de luz sobe com ar-condicionado e corujão e cai com tela fina", () => {
    const p = lan();
    const base = contasDaSemana(p, cat).luz;
    expect(contasDaSemana(comMelhorias(p, { ventilacao: 2 }), cat).luz).toBeGreaterThan(base);
    expect(contasDaSemana(comMelhorias(p, { corujao: 1 }), cat).luz).toBeGreaterThan(base);
    expect(contasDaSemana(comMelhorias(p, { "monitor-fino": 1 }), cat).luz).toBeLessThan(base);
  });
});

describe("save", () => {
  it("migra, valida e escolhe o mais avançado ao levar o save local pra conta", () => {
    const local = lan({ dia: 5 });
    const remoto = lan({ dia: 2 });
    expect(migrar(JSON.parse(JSON.stringify(local)))).toEqual(local);
    expect(migrar({ ...local, dinheiro: -5 })).toBeNull();
    expect(migrar({ ...local, v: 99 })).toBeNull();
    expect(escolherSave(local, remoto)).toEqual({ save: local, origem: "local" });
    expect(escolherSave(remoto, local)).toEqual({ save: local, origem: "remoto" });
    expect(escolherSave(local, null).origem).toBe("local");
    expect(saveCoerente(local, cat)).toBe(true);
    expect(saveCoerente({ ...local, dinheiro: 10_000_000 }, cat)).toBe(false);
  });
});

describe("ConversaNet", () => {
  it("avisa do campeonato no sábado e das contas no dia delas", () => {
    expect(recadosDaManha(lan({ dia: 5 }), cat.arquetipos, false).some((r) => r.id === "camp")).toBe(true);
    expect(recadosDaManha(lan({ dia: 6 }), cat.arquetipos, false).some((r) => r.id === "contas")).toBe(true);
    expect(recadosDaManha(lan({ dia: 1 }), cat.arquetipos, false)).toEqual([]);
  });
});

describe("fechar mais cedo", () => {
  it("fecha na hora: quem não chegou não conta como irritado, quem está dentro sai pagando o que pagou", () => {
    const ctx = semProblemas(ctxQuieto(lan()));
    let e = grupoNaFila(criarDia(ctx), "rei-mensageiro", 1, { querSeg: 500 });
    e.grupos = [...criarDia(ctx).grupos, ...e.grupos.slice(-1)];
    e = agir(e, ctx, { tipo: "atender", grupo: e.grupos.at(-1)!.id, maquinas: ["pc1"], pacote: "1h" }).estado;
    const f = encerrar(e, ctx);
    expect(f.fim).toBe(true);
    expect(f.foram).toBe(0);
    expect(f.servidos).toBe(1);
    expect(f.reembolsos).toBe(0);
  });
});

describe("um dia inteiro", () => {
  it("roda com o caixa e o técnico sem quebrar e fecha válido", () => {
    let p = comMelhorias(lan({ dinheiro: 0, reputacao: 3, nivel: 3 }), { "pc-basica": 6, espaco: 3, internet: 2, impressora: 1 });
    p = { ...p, equipe: [{ papel: "caixa", nivel: 2, contratadoDia: 0 }, { papel: "tecnico", nivel: 1, contratadoDia: 0 }] };
    const ctx = criarCtx(p, cat);
    let e = criarDia(ctx);
    while (!e.fim) e = passo(e, ctx, 1);
    const r = resumoDoDia(e, ctx);
    expect(r.servidos).toBeGreaterThan(0);
    const f = fecharDia(p, cat, r);
    expect(f.ok).toBe(true);
  });
});
