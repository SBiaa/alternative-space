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
function jogarDia(e: Estado, opts: { aceitaTudo: boolean; descansa: boolean; voltaAs: number }): Estado {
  e = reduzir(e, { tipo: "sair" });
  let guarda = 0;
  while (e.fase !== "resumoDia" && guarda++ < 5000) {
    let a: Acao = { tipo: "tick", minutos: 1 };
    if (e.fase === "evento" && e.evento) {
      const ev = CORRE.eventos.lista.find((x) => x.id === e.evento!.id)!;
      a = { tipo: "escolher", opcao: ev.opcoes[0].id };
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
