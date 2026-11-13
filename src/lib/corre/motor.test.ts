import { describe, expect, it } from "vitest";
import { CORRE, totalContas } from "./config";
import {
  aceitar,
  conferirDia,
  criarEstado,
  desgastar,
  fatorCansaco,
  fatorMoto,
  fatorOfertas,
  fecharSemana,
  reduzir,
  recusar,
  tempoViagem,
  type Acao,
  type Estado,
} from "./motor";
import { candidatas, gerarColeta, gerarEntrega } from "./minigames";
import { mulberry32 } from "./rng";
import { escolherSave, migrar, problemaAoGravar } from "./save";

const nova = { pneu: 100, freio: 100, oleo: 100 };

describe("tempo de viagem", () => {
  it("cresce com distância, trânsito, chuva, moto e cansaço", () => {
    const base = tempoViagem(5, 15, false, nova, 0);
    expect(base).toBeCloseTo((5 / CORRE.viagem.velocidadeKmH) * 60);
    expect(tempoViagem(10, 15, false, nova, 0)).toBeCloseTo(base * 2);
    expect(tempoViagem(5, 18, false, nova, 0)).toBeGreaterThan(base); // pico
    expect(tempoViagem(5, 15, true, nova, 0)).toBeCloseTo(base * CORRE.viagem.fatorChuva);
    expect(tempoViagem(5, 15, false, { pneu: 10, freio: 100, oleo: 100 }, 0)).toBeGreaterThan(base);
    expect(tempoViagem(5, 15, false, nova, 95)).toBeGreaterThan(base);
  });

  it("moto boa e cansaço baixo não atrasam", () => {
    expect(fatorMoto({ pneu: 60, freio: 50, oleo: 41 })).toBe(1);
    expect(fatorCansaco(CORRE.viagem.cansacoLimite)).toBe(1);
    expect(fatorMoto({ pneu: 0, freio: 100, oleo: 100 })).toBeCloseTo(1 + CORRE.viagem.motoPenalidadeMax);
  });
});

describe("desgaste da moto", () => {
  it("gasta por km e nunca fica negativo", () => {
    const m = desgastar(nova, 10);
    expect(m.pneu).toBeCloseTo(100 - CORRE.moto.desgastePorKm.pneu * 10);
    expect(m.freio).toBeLessThan(100);
    expect(desgastar({ pneu: 1, freio: 1, oleo: 1 }, 500)).toEqual({ pneu: 0, freio: 0, oleo: 0 });
  });
});

describe("efeito do cansaço", () => {
  it("piora em curva: cansaço muito alto custa mais que o dobro do moderado", () => {
    const p75 = fatorCansaco(75) - 1;
    const p95 = fatorCansaco(95) - 1;
    expect(p75).toBeGreaterThan(0);
    expect(p95).toBeGreaterThan(p75 * 2);
  });
});

describe("taxa de aceitação", () => {
  it("aceitar sobe, recusar desce, expirar desce mais", () => {
    expect(aceitar(50)).toBeGreaterThan(50);
    expect(aceitar(100)).toBe(100);
    expect(recusar(50)).toBe(50 - CORRE.aceitacao.perdaRecusar);
    expect(recusar(50, true)).toBeLessThan(recusar(50));
    expect(recusar(1)).toBe(0);
  });
  it("menos aceitação = menos ofertas, mas nunca zero", () => {
    expect(fatorOfertas(100)).toBe(1);
    expect(fatorOfertas(0)).toBe(CORRE.aceitacao.minimoFator);
    expect(fatorOfertas(40)).toBeLessThan(fatorOfertas(80));
  });
});

// Joga um dia com uma estratégia simples. "descansa" para quando o cansaço passa de 50.
function jogarDia(e: Estado, opts: { aceitaTudo: boolean; descansa: boolean; voltaAs: number; minigame?: "pular" | "acertar" }): Estado {
  e = reduzir(e, { tipo: "sair" });
  let guarda = 0;
  while (e.fase !== "resumoDia" && guarda++ < 5000) {
    let a: Acao = { tipo: "tick", minutos: 1 };
    if (e.fase === "evento" && e.evento) {
      const ev = CORRE.eventos.lista.find((x) => x.id === e.evento!.id)!;
      a = { tipo: "escolher", opcao: ev.opcoes[0].id };
    } else if (e.fase === "minigame" && e.minigame) {
      a = { tipo: "minigame", resposta: opts.minigame === "pular" ? "pular" : e.minigame.tipo === "coleta" ? e.minigame.erro : e.minigame.correta };
    } else if (e.fase === "rodando") {
      if (e.minuto >= opts.voltaAs) a = { tipo: "voltarPraCasa" };
      else if (e.combustivel < 25) a = { tipo: "irPara", lugar: "posto-avenida" };
      else if (opts.descansa && e.cansaco > 50) a = { tipo: "irPara", lugar: "praca-paineiras" };
      else if (opts.descansa && Math.min(e.moto.pneu, e.moto.freio, e.moto.oleo) < 45 && e.dinheiro > 30000) a = { tipo: "irPara", lugar: "oficina-tonho" };
      else if (e.oferta) a = opts.aceitaTudo || e.oferta.valor >= 900 ? { tipo: "aceitar" } : { tipo: "recusar" };
    }
    e = reduzir(e, a);
  }
  return e;
}

describe("reprodutibilidade", () => {
  it("mesma seed e mesmas ações dão o mesmo dia", () => {
    const a = jogarDia(criarEstado("seed-x"), { aceitaTudo: true, descansa: true, voltaAs: 19 * 60 });
    const b = jogarDia(criarEstado("seed-x"), { aceitaTudo: true, descansa: true, voltaAs: 19 * 60 });
    expect(a).toEqual(b);
    const c = jogarDia(criarEstado("outra-seed"), { aceitaTudo: true, descansa: true, voltaAs: 19 * 60 });
    expect(c.resumoDia).not.toEqual(a.resumoDia);
  });
});

describe("fechamento do dia", () => {
  it("o saldo do resumo bate com ganhos − gastos e com o dinheiro", () => {
    let e = criarEstado("dia-1");
    e = reduzir(e, { tipo: "guardar", valor: 5000 });
    e = jogarDia(e, { aceitaTudo: true, descansa: true, voltaAs: 20 * 60 });
    expect(e.fase).toBe("resumoDia");
    expect(e.resumoDia!.entregas).toBeGreaterThan(0);
    expect(conferirDia(e)).toBe(true);
    expect(problemaAoGravar(e, 1)).toBeNull();
  });

  it("cansaço no limite encerra o dia sozinho", () => {
    let e = reduzir(criarEstado("limite"), { tipo: "sair" });
    e = { ...e, cansaco: CORRE.cansaco.limite - 0.01, oferta: null };
    e = reduzir(e, { tipo: "tick", minutos: 30 });
    expect(e.fase).toBe("resumoDia");
    expect(e.resumoDia!.motivo).toBe("cansaco");
  });

  it("trabalhar até o limite rende menos que descansar e cuidar da moto", () => {
    const semana = (descansa: boolean, voltaAs: number) => {
      let e = criarEstado("balanco");
      let liquido = 0;
      for (let d = 0; d < 6; d++) {
        e = jogarDia(e, { aceitaTudo: true, descansa, voltaAs });
        liquido += e.resumoDia!.saldo;
        e = reduzir(e, { tipo: "continuar" });
      }
      return { liquido, e };
    };
    const cuidando = semana(true, 20 * 60);
    const forcando = semana(false, 24 * 60);
    // Quem cuida termina a semana com mais dinheiro somado ao valor da moto em bom estado.
    const valorMoto = (e: Estado) => (e.moto.pneu + e.moto.freio + e.moto.oleo) * CORRE.servicos.oficina.precoPorPorcento;
    expect(cuidando.liquido + valorMoto(cuidando.e)).toBeGreaterThan(forcando.liquido + valorMoto(forcando.e));
  });
});

describe("fechamento da semana", () => {
  it("paga as contas quando dá, e guarda a dívida quando não dá", () => {
    const e = criarEstado("semana");
    const rico = { ...e, dinheiro: totalContas() + 5000, semanaAtual: { guardado: CORRE.objetivo.metaSemanal }, objetivo: { id: "x", guardado: 30000 } };
    const r = fecharSemana(rico);
    expect(r.contasPagas).toBe(true);
    expect(rico.dinheiro).toBe(5000);
    expect(r.metaCumprida).toBe(true);
    expect(r.progressoObjetivo).toBeCloseTo((30000 / CORRE.objetivo.valor) * 100);

    const pobre = { ...e, dinheiro: 10000 };
    const r2 = fecharSemana(pobre);
    expect(r2.contasPagas).toBe(false);
    expect(pobre.dinheiro).toBe(0);
    expect(r2.divida).toBe(totalContas() - 10000);
    // Semana seguinte cobra a dívida com juros.
    const r3 = fecharSemana({ ...pobre, dinheiro: 10_000_000 });
    expect(r3.totalCobrado).toBe(totalContas() + Math.round(r2.divida * (1 + CORRE.jurosDivida)));
  });

  it("o dia 6 leva à folga e ao resumo da semana; depois vem a semana 2", () => {
    let e = criarEstado("ciclo");
    for (let d = 0; d < 6; d++) {
      e = reduzir(e, { tipo: "voltarPraCasa" }); // fica em casa
      expect(e.fase).toBe("resumoDia");
      e = reduzir(e, { tipo: "continuar" });
    }
    expect(e.fase).toBe("resumoSemana");
    expect(e.dia).toBe(7);
    expect(e.resumoSemana!.semana).toBe(1);
    e = reduzir(e, { tipo: "continuar" });
    expect(e.dia).toBe(8);
    expect(e.semana).toBe(2);
    expect(e.fase).toBe("casa");
  });
});

describe("save", () => {
  it("valida e migra o estado atual", () => {
    const e = criarEstado("save");
    expect(migrar(JSON.parse(JSON.stringify(e)))).toEqual(e);
    expect(migrar({ ...e, versao: 0 })).toBeNull(); // sem migração pra versão 0
    expect(migrar({ ...e, dinheiro: "muito" })).toBeNull();
  });

  it("o dia só anda pra frente", () => {
    const e = { ...criarEstado("x"), dia: 3, semana: 1 };
    expect(problemaAoGravar(e, 4)).not.toBeNull();
    expect(problemaAoGravar(e, 3)).toBeNull();
  });

  it("migração do save local pra conta: o mais avançado vence", () => {
    const local = { ...criarEstado("l"), dia: 5 };
    const remoto = { ...criarEstado("r"), dia: 3 };
    expect(escolherSave(local, remoto).origem).toBe("local");
    expect(escolherSave({ ...local, dia: 2 }, remoto).origem).toBe("remoto");
    expect(escolherSave(local, null).origem).toBe("local");
    expect(escolherSave(null, null).origem).toBe("nenhum");
  });
});

describe("minigames", () => {
  // Põe o motoboy numa viagem de entrega já no ponto desejado.
  const emViagem = (seed: string) => {
    let e = reduzir(criarEstado(seed), { tipo: "sair" });
    e = { ...e, combustivel: 100, oferta: { id: "o", restaurante: "cantina-zita", destino: "bela-cruz", km: 4, valor: 1000, bonusChuva: 0, bonusPico: 0, prazo: 60, expira: e.minuto + 30, premium: false } };
    return reduzir(e, { tipo: "aceitar" });
  };
  const ate = (e: Estado, fase: Estado["fase"]) => {
    for (let i = 0; i < 400 && e.fase !== fase; i++) {
      if (e.fase === "evento") e = reduzir(e, { tipo: "escolher", opcao: CORRE.eventos.lista.find((x) => x.id === e.evento!.id)!.opcoes[0].id });
      else e = reduzir(e, { tipo: "tick", minutos: 1 });
    }
    return e;
  };

  it("a coleta abre sozinha no restaurante e a entrega ao chegar", () => {
    let e = ate(emViagem("mg-1"), "minigame");
    expect(e.minigame?.tipo).toBe("coleta");
    e = reduzir(e, { tipo: "minigame", resposta: "pular" });
    expect(e.fase).toBe("viagem");
    e = ate(e, "minigame");
    expect(e.minigame?.tipo).toBe("entrega");
  });

  it("pular não muda nada: mesmo ganho e mesma duração de um jogo sem minigame", () => {
    let e = ate(emViagem("mg-2"), "minigame");
    const dur = e.viagem!.duracao;
    e = reduzir(e, { tipo: "minigame", resposta: "pular" });
    expect(e.viagem!.duracao).toBe(dur);
    expect(e.viagem!.incompleto).toBeUndefined();
    expect(e.viagem!.gorjetaExtra).toBeUndefined();
  });

  it("coleta: acertar encurta e dá gorjeta; errar custa minutos e, se tinha item errado, o pedido sai incompleto", () => {
    const base = ate(emViagem("mg-3"), "minigame");
    const m = base.minigame!;
    if (m.tipo !== "coleta") throw new Error("esperava coleta");
    const dur = base.viagem!.duracao;
    const certo = reduzir(base, { tipo: "minigame", resposta: m.erro });
    expect(certo.viagem!.duracao).toBe(dur + CORRE.minigames.coleta.efeitos.perfeito.minutos);
    expect(certo.viagem!.gorjetaExtra).toBe(CORRE.minigames.coleta.efeitos.perfeito.gorjeta);
    const errado = reduzir(base, { tipo: "minigame", resposta: m.erro === -1 ? 0 : -1 });
    expect(errado.viagem!.duracao).toBe(dur + CORRE.minigames.coleta.efeitos.erro.minutos);
    expect(errado.viagem!.incompleto).toBe(m.erro >= 0 ? true : undefined);
  });

  it("entrega: duas tentativas; a segunda certa vale 'ok', duas erradas custam tempo", () => {
    const coleta = ate(emViagem("mg-4"), "minigame");
    const base = ate(reduzir(coleta, { tipo: "minigame", resposta: "pular" }), "minigame");
    const m = base.minigame!;
    if (m.tipo !== "entrega") throw new Error("esperava entrega");
    const errada = m.portas.map((_, i) => i).filter((i) => i !== m.correta);
    const primeira = reduzir(base, { tipo: "minigame", resposta: errada[0] });
    expect(primeira.fase).toBe("minigame"); // segunda chance
    expect(reduzir(primeira, { tipo: "minigame", resposta: errada[0] }).fase).toBe("minigame"); // repetir a mesma não conta
    const dupla = reduzir(primeira, { tipo: "minigame", resposta: errada[1] });
    expect(dupla.fase).not.toBe("minigame");
    expect(dupla.minuto).toBeGreaterThanOrEqual(base.minuto + CORRE.minigames.entrega.efeitos.erro.minutos);
    const certaDepois = reduzir(primeira, { tipo: "minigame", resposta: m.correta });
    expect(certaDepois.fase).not.toBe("minigame");
    const direta = reduzir(base, { tipo: "minigame", resposta: m.correta });
    expect(direta.fase).not.toBe("minigame");
  });

  it("respostas fora do puzzle são ignoradas", () => {
    const base = ate(emViagem("mg-5"), "minigame");
    expect(reduzir(base, { tipo: "minigame", resposta: 99 })).toEqual(base);
    expect(reduzir(base, { tipo: "minigame", resposta: -5 })).toEqual(base);
  });

  it("jogar bem rende mais que pular, e o puzzle é reproduzível pela seed", () => {
    const dia = (mg: "pular" | "acertar") => jogarDia(criarEstado("mg-6"), { aceitaTudo: true, descansa: true, voltaAs: 20 * 60, minigame: mg });
    const a = dia("acertar");
    const p = dia("pular");
    expect(a.resumoDia!.ganhos).toBeGreaterThanOrEqual(p.resumoDia!.ganhos);
    expect(conferirDia(a)).toBe(true);
    expect(dia("acertar")).toEqual(a);
  });

  it("os geradores sempre dão uma única porta certa e crescem com o cansaço", () => {
    for (let i = 0; i < 200; i++) {
      const r = mulberry32(i);
      const p = gerarEntrega(r, i % 2 ? 90 : 10);
      expect(candidatas(p)).toEqual([p.correta]);
      expect(p.portas.length).toBe(CORRE.minigames.entrega.portas[i % 2]);
      const c = gerarColeta(r, i % 2 ? 90 : 10);
      expect(c.nota.length).toBe(CORRE.minigames.coleta.quantidade[i % 2]);
      if (c.erro >= 0) expect(c.sacola[c.erro]).not.toBe(c.nota[c.erro]);
      else expect(c.sacola).toEqual(c.nota);
    }
  });

  it("migra um save v1 (sem minigame) pra v2", () => {
    const { minigame, ...resto } = criarEstado("v1") as Estado & { minigame?: unknown };
    void minigame;
    const antigo = { ...resto, versao: 1 };
    const novo = migrar(JSON.parse(JSON.stringify(antigo)));
    expect(novo?.versao).toBe(CORRE.versaoSave);
    expect(novo?.minigame).toBeNull();
  });
});
