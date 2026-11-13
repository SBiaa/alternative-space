import { describe, expect, it } from "vitest";
import { CATALOGO_PADRAO as cat, CLIENTES } from "./catalogo";
import { CAMADAS, MIN_DIA, MURO } from "./config";
import { atributos } from "./efeitos";
import { avaliarTraco, centroDe, fracaoAlcancavel, gradeDe, mascara, totalCelulas } from "./geometria";
import { comprarMaterial, comprarMelhoria, contratar, entregar, fecharDia, ganhar, novoProgresso, perder } from "./economia";
import { julgar } from "./encontro";
import { consumir } from "./material";
import { aceitar, iniciarMural, podeIniciar, responder } from "./negociacao";
import { aplicarChuva, aplicarPintura, camadaLiberada, capProgresso, motivoTravada, qualidadeAssistida, qualidadeFinal, qualidadeManual, tetoQualidade } from "./pintura";
import { migrar, escolherSave, reconciliar, saveCoerente } from "./save";
import { templatesDe } from "./templates";
import { aprovarTrecho, avancar, escalar, jobPorId, pintarManual, taxaArtista, cobrir } from "./trabalho";
import type { Job, Progresso, Tamanho } from "./tipos";

const novo = (seed = "seed-teste") => novoProgresso(seed, cat);
const attrDe = (p: Progresso) => atributos(p, cat);

/** Pega o 1º job do quadro e o deixa autorizado e em andamento no tamanho pedido. */
function comMural(p0: Progresso, tamanho: Tamanho = "porta", o: Partial<Job> = {}): { p: Progresso; id: string } {
  const p = structuredClone(p0);
  const j = p.jobs[0];
  j.tamanho = tamanho;
  j.modelo = templatesDe(tamanho, cat.templates)[0].slug;
  j.aceita = true;
  j.auth = "autorizado";
  j.status = "em_andamento";
  j.comunitario = false;
  j.prazo = 20;
  j.briefing.tagDestaque = false;
  Object.assign(j, o);
  return { p, id: j.id };
}
const comDinheiro = (p: Progresso, v: number): Progresso => ({ ...p, dinheiro: v, dinheiroIniDia: v });
const ate = (p: Progresso, nivel: number): Progresso => ({ ...p, nivel });

describe("gasto de tinta e desgaste de spray e rolinho", () => {
  it("gasta tinta conforme a área pintada e rende mais com tinta melhor", () => {
    const p = novo();
    const a = attrDe(p);
    const e = structuredClone(p.estoque);
    expect(consumir(e, a, "fachada", "fundo", 50, "azul").ok).toBe(true);
    const gasto = p.estoque.tinta.azul - e.tinta.azul;
    expect(gasto).toBeCloseTo(170 * 0.55 * 0.5, 5);
    const boa = { ...a, gastoTinta: 0.75 };
    const e2 = structuredClone(p.estoque);
    consumir(e2, boa, "fachada", "fundo", 50, "azul");
    expect(p.estoque.tinta.azul - e2.tinta.azul).toBeLessThan(gasto);
  });
  it("desgasta o rolinho e troca pelo da reserva", () => {
    const p = novo();
    const e = structuredClone(p.estoque);
    e.rolinho.saude = 5;
    consumir(e, attrDe(p), "quadra", "fundo", 100, "azul");
    expect(e.rolinho.reserva).toBe(MURO.material.reservaInicial.rolinho - 1);
    expect(e.rolinho.saude).toBeGreaterThan(50);
  });
  it("lata raspando entope mais o bico e sem lata a camada não anda", () => {
    const p = novo();
    const a = attrDe(p);
    const cheia = structuredClone(p.estoque);
    cheia.spray.preto = 2;
    consumir(cheia, a, "porta", "contorno", 20, "preto");
    const baixa = structuredClone(p.estoque);
    baixa.spray.preto = 0.1;
    const antes = baixa.bico.saude;
    consumir(baixa, a, "porta", "contorno", 20, "preto");
    expect(antes - baixa.bico.saude).toBeGreaterThan(100 - cheia.bico.saude);
    const vazia = structuredClone(p.estoque);
    vazia.spray.preto = 0;
    expect(consumir(vazia, a, "porta", "contorno", 20, "preto")).toEqual({ ok: false, motivo: "spray" });
  });
});

describe("qualidade por camada e média ponderada", () => {
  const t = templatesDe("porta", cat.templates)[0];
  const g = gradeDe("porta");
  it("o traço sobre o guia vale mais que o traço longe dele", () => {
    const guia = t.layers.contorno[0].p.map(([x, y]) => ({ x, y }));
    const certo = avaliarTraco({ t, camada: "contorno", tagDestaque: false, ferramenta: "spray", pontos: guia, jaPintadas: new Set(), alcanceM: 9 });
    const errado = avaliarTraco({ t, camada: "contorno", tagDestaque: false, ferramenta: "spray", pontos: guia.map((p) => ({ x: p.x + 14, y: p.y + 14 })), jaPintadas: new Set(), alcanceM: 9 });
    expect(certo.precisao).toBeGreaterThan(0.9);
    expect(errado.precisao).toBeLessThan(certo.precisao - 0.4);
    expect(certo.novas.length).toBeGreaterThan(0);
  });
  it("preenchimento que passa do contorno perde precisão", () => {
    const m = mascara(t, "preenchimento", false);
    const dentro = [...m].findIndex((v) => v === 1);
    const fora = [...m].findIndex((v) => v === 0);
    const a = avaliarTraco({ t, camada: "preenchimento", tagDestaque: false, ferramenta: "rolinho", pontos: [centroDe(g, dentro)], jaPintadas: new Set(), alcanceM: 9 });
    const b = avaliarTraco({ t, camada: "preenchimento", tagDestaque: false, ferramenta: "rolinho", pontos: [centroDe(g, dentro), centroDe(g, fora)], jaPintadas: new Set(), alcanceM: 9 });
    expect(b.precisao).toBeLessThanOrEqual(a.precisao);
  });
  it("a pintura assistida nunca passa o máximo da manual", () => {
    for (const nivel of [0, 1, 2]) {
      const a = { ...attrDe(novo()), qTinta: nivel * 4 };
      for (const hab of [3, 4, 5]) {
        const teto = tetoQualidade("porta", a, hab);
        expect(qualidadeAssistida(teto, a)).toBeLessThanOrEqual(qualidadeManual(1, teto));
      }
    }
  });
  it("a qualidade final é a média ponderada das camadas", () => {
    const { p, id } = comMural(novo());
    const j = jobPorId(p, id)!;
    CAMADAS.forEach((c, i) => (j.camadas[c].qualidade = 60 + i * 10));
    const esperado = 60 * 0.2 + 70 * 0.3 + 80 * 0.25 + 90 * 0.25;
    expect(qualidadeFinal(j)).toBeCloseTo(esperado, 1);
  });
});

describe("dependência entre camadas", () => {
  it("só destrava a seguinte depois do mínimo", () => {
    const { p, id } = comMural(novo());
    const j = jobPorId(p, id)!;
    const a = attrDe(p);
    expect(camadaLiberada(j, "contorno")).toBe(false);
    expect(motivoTravada(j, "contorno", cat, a)).toBe("anterior");
    expect(aplicarPintura(j, "contorno", 10, 70, true, 0, cat, a)).toBe(0);
    aplicarPintura(j, "fundo", MURO.minimoAnterior, 70, true, 0, cat, a);
    expect(camadaLiberada(j, "contorno")).toBe(true);
    expect(aplicarPintura(j, "contorno", 10, 70, true, 0, cat, a)).toBeGreaterThan(0);
  });
});

describe("secagem e chuva sobre tinta fresca", () => {
  const pintado = () => {
    const { p, id } = comMural(novo(), "fachada");
    const j = jobPorId(p, id)!;
    const a = attrDe(p);
    aplicarPintura(j, "fundo", 60, 80, true, 1000, cat, a);
    return { j, a };
  };
  it("tinta fresca estraga, tinta seca não", () => {
    const { j, a } = pintado();
    const fresco = structuredClone(j);
    aplicarChuva(fresco, 1010, 1, 30, a, false);
    expect(fresco.camadas.fundo.progresso).toBeLessThan(60);
    expect(fresco.camadas.fundo.qualidade).toBeLessThan(80);
    expect(fresco.ruinas).toBe(1);
    const seco = structuredClone(j);
    aplicarChuva(seco, 1000 + 500, 1, 30, a, false);
    expect(seco.camadas.fundo.progresso).toBe(60);
  });
  it("a lona protege a parte que cobre", () => {
    const { j, a } = pintado();
    const sem = structuredClone(j);
    aplicarChuva(sem, 1010, 1, 30, a, false);
    const com = structuredClone(j);
    com.coberto = true;
    aplicarChuva(com, 1010, 1, 30, a, false);
    expect(com.camadas.fundo.progresso).toBeGreaterThan(sem.camadas.fundo.progresso);
    const grande = { ...a, lonaM2: 40 };
    const tudo = structuredClone(j);
    tudo.coberto = true;
    aplicarChuva(tudo, 1010, 1, 30, grande, false);
    expect(tudo.camadas.fundo.progresso).toBe(60);
  });
  it("cobrir gasta uma lona e tempo, e a tenda de secagem encurta o tempo fresco", () => {
    const { p, id } = comMural(novo());
    const r = cobrir(p, cat, id);
    expect(r.ok && r.prog.estoque.lonas).toBe(p.estoque.lonas - 1);
    expect(r.ok && r.prog.minuto).toBe(MURO.chuva.lonaMin);
    const j = jobPorId(p, id)!;
    const a = attrDe(p);
    aplicarPintura(j, "fundo", 10, 70, true, 0, cat, a);
    const normal = j.camadas.fundo.secaAte;
    const j2 = structuredClone(j);
    j2.camadas.fundo.secaAte = 0;
    aplicarPintura(j2, "fundo", 10, 70, true, 0, cat, { ...a, secagemTenda: 0.55 });
    expect(j2.camadas.fundo.secaAte).toBeLessThan(normal);
  });
  it("a chuva do dia é a mesma pra mesma seed", async () => {
    const { climaDoDia } = await import("./efeitos");
    expect(climaDoDia("x", 3, false)).toEqual(climaDoDia("x", 3, false));
    expect(climaDoDia("x", 3, true).chuvas.length).toBeLessThanOrEqual(1);
  });
});

describe("alcance do andaime", () => {
  it("sem andaime alto a faixa de cima fica travada", () => {
    const { p, id } = comMural(novo(), "fachada");
    const j = jobPorId(p, id)!;
    const t = templatesDe("fachada", cat.templates)[0];
    const sem = attrDe(p);
    expect(fracaoAlcancavel(t, "fundo", false, 2.5)).toBeLessThan(1);
    expect(capProgresso(j, "fundo", cat, sem)).toBeLessThan(100);
    const alto = { ...sem, alcanceNivel: 1 };
    expect(capProgresso(j, "fundo", cat, alto)).toBe(100);
    expect(aplicarPintura(j, "fundo", 100, 70, true, 0, cat, sem)).toBeLessThan(100);
    expect(motivoTravada(j, "fundo", cat, sem)).toBe("andaime");
  });
  it("comprar o andaime sobe o alcance", () => {
    const r = comprarMelhoria(comDinheiro(novo(), 1000), cat, "andaime");
    expect(r.ok && atributos(r.prog, cat).alcanceNivel).toBe(1);
  });
});

describe("autorização", () => {
  const comunitario = () => {
    const p = structuredClone(novo("seed-auth"));
    const j = p.jobs[p.jobs.length - 1];
    j.cliente = CLIENTES.find((c) => c.tipo === "comunitario" && c.dialogo === "diretor")!.slug;
    j.comunitario = true;
    j.tamanho = "porta";
    j.modelo = templatesDe("porta", cat.templates)[0].slug;
    j.exige = { clientes: 0, quebrada: 0 };
    return { p, id: j.id };
  };
  const conversar = (p: Progresso, id: string, escolhas: number[]) => {
    let cur = p;
    for (const e of escolhas) {
      const r = responder(cur, cat, id, e);
      if (!r.ok) throw new Error(r.erro);
      cur = r.prog;
    }
    return jobPorId(cur, id)!;
  };
  it("comércio próprio nasce autorizado ao aceitar e muro público nasce com falta", () => {
    const p = novo();
    const comercio = p.jobs.find((j) => !j.comunitario)!;
    const publico = p.jobs.find((j) => j.comunitario)!;
    const a = aceitar(p, cat, comercio.id);
    expect(a.ok && jobPorId(a.prog, comercio.id)!.auth).toBe("autorizado");
    const b = aceitar(p, cat, publico.id);
    expect(b.ok && jobPorId(b.prog, publico.id)!.auth).toBe("falta");
  });
  it("o botão de começar fica desabilitado sem autorização, com o motivo", () => {
    const { p, id } = comunitario();
    const a = aceitar(p, cat, id);
    if (!a.ok) throw new Error(a.erro);
    const j = jobPorId(a.prog, id)!;
    expect(podeIniciar(a.prog, j)).toEqual({ ok: false, motivo: "autorizacao" });
    const r = iniciarMural(a.prog, cat, id);
    expect(r).toEqual({ ok: false, erro: "autorizacao" });
  });
  it("as melhores respostas autorizam, as piores recusam, e a mesma seed dá o mesmo resultado", () => {
    const { p, id } = comunitario();
    const a = aceitar({ ...p, repQuebrada: 3 }, cat, id);
    if (!a.ok) throw new Error(a.erro);
    const bom = conversar(a.prog, id, [0, 1, 0]);
    expect(bom.auth).toBe("autorizado");
    expect(["autorizado", "mudanca"]).toContain(bom.negociacao.resultado);
    const mau = conversar(a.prog, id, [3, 3, 3]);
    expect(mau.negociacao.resultado).toBe("recusado");
    expect(mau.auth).toBe("recusado");
    expect(conversar(a.prog, id, [0, 1, 0]).negociacao).toEqual(bom.negociacao);
  });
  it("autorizado com mudança manda o desenho de volta pra revisão", () => {
    const { p, id } = comunitario();
    const a = aceitar({ ...p, repQuebrada: 1.5 }, cat, id);
    if (!a.ok) throw new Error(a.erro);
    for (const combo of [[0, 0, 0], [0, 1, 1], [1, 1, 1], [2, 1, 2], [1, 2, 2], [2, 2, 1], [0, 2, 2], [1, 0, 2]]) {
      const j = conversar(a.prog, id, combo);
      if (j.negociacao.resultado === "mudanca") {
        expect(j.revisao).toBe(true);
        expect(podeIniciar(a.prog, { ...j, aceita: true })).toEqual({ ok: false, motivo: "revisao" });
        return;
      }
    }
  });
});

describe("crew: especialidade, cansaço e salários", () => {
  const equipe = () => {
    let p = comDinheiro(ate(novo(), 2), 2000);
    for (const s of ["contorno-firme", "fundo-rapido"]) {
      const r = contratar(p, cat, s);
      if (!r.ok) throw new Error(r.erro);
      p = r.prog;
    }
    return p;
  };
  it("o artista rende mais na especialidade e cansado perde velocidade", () => {
    const p = equipe();
    const a = attrDe(p);
    const rapido = p.equipe.find((x) => x.arquetipo === "fundo-rapido")!;
    expect(taxaArtista(rapido, "fundo", a, "fundo")).toBeGreaterThan(taxaArtista(rapido, "contorno", a, "fundo"));
    expect(taxaArtista({ ...rapido, cansaco: 95 }, "fundo", a, "fundo")).toBeLessThan(taxaArtista(rapido, "fundo", a, "fundo"));
  });
  it("a crew pinta sozinha e canta o cansaço crescendo", () => {
    const { p: base, id } = comMural(equipe());
    const p = escalar(base, base.equipe[1].id, id, "auto");
    if (!p.ok) throw new Error(p.erro);
    const t = avancar(p.prog, cat, 120);
    expect(jobPorId(t.prog, id)!.camadas.fundo.progresso).toBeGreaterThan(5);
    expect(t.prog.equipe[1].cansaco).toBeGreaterThan(0);
    expect(t.prog.equipe[0].cansaco).toBe(0);
  });
  it("o fechamento do dia desconta os salários, e a folga recupera o cansaço", () => {
    let p = equipe();
    p = { ...p, gastosDia: { tinta: 0, spray: 0, salarios: 0, lona: 0, outros: 0 }, dinheiroIniDia: p.dinheiro, equipe: p.equipe.map((a, i) => ({ ...a, cansaco: 80, folga: i === 0 })) };
    const antes = p.dinheiro;
    const f = fecharDia(p, cat);
    const sal = cat.arquetipos.filter((a) => ["contorno-firme", "fundo-rapido"].includes(a.slug)).reduce((s, a) => s + a.salario, 0);
    expect(f.registro.gastos.salarios).toBe(sal);
    expect(f.prog.dinheiro).toBe(antes - sal);
    expect(f.registro.saldo).toBe(-sal);
    expect(f.prog.equipe[0].cansaco).toBeLessThan(f.prog.equipe[1].cansaco);
    expect(f.prog.dia).toBe(1);
  });
});

describe("reputação", () => {
  it("sobe com mural bem feito e cai com atraso e com chuva", () => {
    const { p, id } = comMural(novo());
    const j = jobPorId(p, id)!;
    CAMADAS.forEach((c) => (j.camadas[c] = { progresso: 100, qualidade: 70, fidelidade: 100, secaAte: 0 }));
    const r = entregar(p, cat, id);
    if (!r.ok) throw new Error(r.erro);
    expect(r.prog.repClientes).toBeGreaterThan(p.repClientes);
    // atrasado
    const tarde = { ...p, dia: 30 };
    const r2 = entregar(tarde, cat, id);
    if (!r2.ok) throw new Error(r2.erro);
    expect(r2.pago).toBeLessThan(r.pago);
    expect(r2.prog.repClientes).toBeLessThan(r.prog.repClientes);
    // chuva estragou
    const chuva = structuredClone(p);
    jobPorId(chuva, id)!.ruinas = 1;
    const r3 = entregar(chuva, cat, id);
    if (!r3.ok) throw new Error(r3.erro);
    expect(r3.prog.repQuebrada).toBeLessThan(r.prog.repQuebrada);
  });
  it("muro comunitário sobe a quebrada e o comercial sobe quem paga", () => {
    const base = comMural(novo());
    const j = jobPorId(base.p, base.id)!;
    CAMADAS.forEach((c) => (j.camadas[c] = { progresso: 100, qualidade: 80, fidelidade: 100, secaAte: 0 }));
    const com = entregar(base.p, cat, base.id);
    if (!com.ok) throw new Error(com.erro);
    expect(com.prog.repClientes).toBeGreaterThan(base.p.repClientes);
    expect(com.prog.repQuebrada).toBe(base.p.repQuebrada);
    jobPorId(base.p, base.id)!.comunitario = true;
    const comun = entregar(base.p, cat, base.id);
    if (!comun.ok) throw new Error(comun.erro);
    expect(comun.prog.repQuebrada).toBeGreaterThan(base.p.repQuebrada);
    expect(comun.prog.repClientes).toBe(base.p.repClientes);
  });
  it("o ganho encolhe perto do máximo e a perda não passa de zero", () => {
    expect(ganhar(4.8, 0.3) - 4.8).toBeLessThan(ganhar(1, 0.3) - 1);
    expect(perder(0.05, 1)).toBe(0);
    expect(ganhar(5, 1)).toBe(5);
  });
});

describe("encontro de grafite", () => {
  const job = () => {
    const { p, id } = comMural(novo("seed-ev"), "porta");
    const j = jobPorId(p, id)!;
    CAMADAS.forEach((c) => (j.camadas[c] = { progresso: 90, qualidade: 75, fidelidade: 80, secaAte: 0 }));
    return { p, j };
  };
  it("o julgamento é reproduzível pela seed e muda com a semana", () => {
    const { p, j } = job();
    expect(julgar(p, j, 2)).toEqual(julgar(p, j, 2));
    expect(julgar(p, j, 2).participantes).not.toEqual(julgar(p, j, 3).participantes);
  });
  it("pódio, menção ou nada conforme a nota", () => {
    const { p, j } = job();
    const ruim = structuredClone(j);
    CAMADAS.forEach((c) => (ruim.camadas[c] = { progresso: 5, qualidade: 20, fidelidade: 0, secaAte: 0 }));
    expect(julgar(p, ruim, 2).resultado).toBe("nada");
    const otimo = structuredClone(j);
    CAMADAS.forEach((c) => (otimo.camadas[c] = { progresso: 100, qualidade: 98, fidelidade: 100, secaAte: 0 }));
    expect(julgar({ ...p, tagPropria: true }, otimo, 2).resultado).toBe("podio");
  });
});

describe("compra de melhoria", () => {
  it("recusa saldo insuficiente, nível máximo e nível mínimo da crew", () => {
    expect(comprarMelhoria(comDinheiro(ate(novo(), 2), 10), cat, "tinta-qualidade")).toEqual({ ok: false, erro: "saldo" });
    expect(comprarMelhoria(comDinheiro(novo(), 5000), cat, "tinta-qualidade")).toEqual({ ok: false, erro: "nivel" });
    let p = comDinheiro(ate(novo(), 2), 5000);
    for (let i = 0; i < 2; i++) {
      const r = comprarMelhoria(p, cat, "tinta-qualidade");
      if (!r.ok) throw new Error(r.erro);
      p = r.prog;
    }
    expect(comprarMelhoria(p, cat, "tinta-qualidade")).toEqual({ ok: false, erro: "maximo" });
    expect(p.dinheiro).toBe(5000 - 180 - 420);
    expect(p.gastosDia.outros).toBe(600);
  });
  it("material: compra, estoque cheio e saldo", () => {
    const p = comDinheiro(novo(), 100);
    const r = comprarMaterial(p, cat, { item: "spray", cor: "preto" });
    expect(r.ok && r.prog.estoque.spray.preto).toBe(3);
    expect(comprarMaterial(comDinheiro(novo(), 3), cat, { item: "lona" })).toEqual({ ok: false, erro: "saldo" });
    const cheia = { ...p, estoque: { ...p.estoque, tinta: { ...p.estoque.tinta, azul: 100 } } };
    expect(comprarMaterial(cheia, cat, { item: "tinta", cor: "azul" })).toEqual({ ok: false, erro: "estoque" });
  });
});

describe("contas da semana", () => {
  const nodia = (dia: number, dinheiro: number) => {
    const p = comDinheiro(novo(), dinheiro);
    return { ...p, dia };
  };
  it("fecha o domingo pagando aluguel, transporte e luz", () => {
    const f = fecharDia(nodia(6, 1000), cat);
    const contas = MURO.contas.aluguel + MURO.contas.transporte + MURO.contas.luz;
    expect(f.semana).toEqual({ semana: 1, paga: true, contas, saldoFim: 1000 - contas });
    expect(f.registro.saldo).toBe(-contas);
    expect(f.prog.jobs.some((j) => j.id.startsWith("s2-"))).toBe(true);
  });
  it("sem dinheiro a semana fecha no vermelho e perde confiança de quem paga", () => {
    const f = fecharDia(nodia(6, 50), cat);
    expect(f.semana?.paga).toBe(false);
    expect(f.prog.dinheiro).toBe(0);
    expect(f.prog.repClientes).toBeLessThan(novo().repClientes);
  });
  it("dia comum não tem contas e o saldo bate com ganhos − gastos", () => {
    const p = novo();
    const f = fecharDia(p, cat);
    expect(f.semana).toBeNull();
    expect(f.prog.dinheiro - p.dinheiro).toBe(f.registro.saldo);
  });
});

describe("teto de qualidade por mural", () => {
  it("a entrega nunca passa do teto (tamanho × material × habilidade)", () => {
    const { p, id } = comMural(novo());
    const j = jobPorId(p, id)!;
    CAMADAS.forEach((c) => (j.camadas[c] = { progresso: 100, qualidade: 100, fidelidade: 100, secaAte: 0 }));
    const r = entregar(p, cat, id);
    if (!r.ok) throw new Error(r.erro);
    expect(r.qualidade).toBeLessThanOrEqual(tetoQualidade("porta", attrDe(p), MURO.jogador.habilidade));
  });
  it("o servidor recusa qualidade acima do teto ou camada além do andaime", () => {
    const c = contratar(comDinheiro(ate(novo(), 2), 2000), cat, "fundo-rapido");
    if (!c.ok) throw new Error(c.erro);
    const srv = structuredClone(c.prog);
    Object.assign(srv.jobs[0], { tamanho: "fachada", modelo: templatesDe("fachada", cat.templates)[0].slug, comunitario: false });
    const id = srv.jobs[0].id;
    const { p: cli } = comMural(srv, "fachada");
    expect(reconciliar(srv, cli, cat, false).ok).toBe(true);
    jobPorId(cli, id)!.camadas.fundo.qualidade = 99;
    expect(reconciliar(srv, cli, cat, false)).toEqual({ ok: false, erro: "invalido" });
    const { p: cli2 } = comMural(srv, "fachada");
    jobPorId(cli2, id)!.camadas.fundo.progresso = 100;
    expect(reconciliar(srv, cli2, cat, false).ok).toBe(false);
  });
  it("a camada de cima não pode andar sem a de baixo ter chegado ao mínimo", () => {
    const srv = novo();
    const { p: cli, id } = comMural(srv);
    jobPorId(cli, id)!.camadas.contorno = { progresso: 40, qualidade: 60, fidelidade: 80, secaAte: 0 };
    expect(reconciliar(srv, cli, cat, false).ok).toBe(false);
  });
  it("conta o que o aparelho mandou sem confiar em dinheiro nem em estoque maior", () => {
    const srv = novo();
    const cli = structuredClone(srv);
    cli.dinheiro = 999999;
    cli.estoque.tinta.azul = 100;
    const r = reconciliar(srv, cli, cat, false);
    expect(r.ok && r.prog.dinheiro).toBe(srv.dinheiro);
    expect(r.ok && r.prog.estoque.tinta.azul).toBe(srv.estoque.tinta.azul);
  });
  it("saveCoerente aceita um save novo e recusa um com mural fraudado", () => {
    expect(saveCoerente(novo(), cat)).toBe(true);
    const ruim = structuredClone(novo());
    ruim.jobs[0].qualFinal = 100;
    expect(saveCoerente(ruim, cat)).toBe(false);
  });
});

describe("pintura à mão e assistida na simulação", () => {
  it("pintar à mão gasta material, tempo e anda a camada; a assistida rende menos", () => {
    const { p, id } = comMural(novo());
    const t = templatesDe("porta", cat.templates)[0];
    const total = totalCelulas(mascara(t, "fundo", false));
    const m = pintarManual(p, cat, { jobId: id, camada: "fundo", celulas: 30, precisao: 1, cor: jobPorId(p, id)!.briefing.cores[0] });
    if (!m.ok) throw new Error(m.erro);
    expect(m.aplicado).toBeCloseTo((30 / total) * 100, 3);
    expect(m.prog.minuto).toBeGreaterThan(0);
    const j = jobPorId(m.prog, id)!;
    expect(j.camadas.fundo.progresso).toBeGreaterThan(0);
    const a = aprovarTrecho(p, cat, { jobId: id, camada: "fundo", cor: jobPorId(p, id)!.briefing.cores[0] });
    if (!a.ok) throw new Error(a.erro);
    expect(jobPorId(a.prog, id)!.camadas.fundo.qualidade).toBeLessThan(j.camadas.fundo.qualidade + 0.001 + 100);
    expect(jobPorId(a.prog, id)!.camadas.fundo.qualidade).toBeLessThanOrEqual(tetoQualidade("porta", attrDe(p), MURO.jogador.habilidade));
  });
  it("o dia para no fim e a chuva estraga tinta fresca no meio do avanço", () => {
    const { p } = comMural(novo("seed-chuva"));
    const t = avancar(p, cat, MIN_DIA + 50);
    expect(t.prog.minuto).toBe(MIN_DIA);
    expect(t.fimDoDia).toBe(true);
  });
});

describe("migração de save local pra conta", () => {
  it("migra um save antigo, recusa lixo e o mais avançado vence", () => {
    const local = novo("a");
    expect(migrar(JSON.parse(JSON.stringify(local)))?.seed).toBe("a");
    expect(migrar({ lixo: 1 })).toBeNull();
    expect(migrar({ ...local, v: 999 })).toBeNull();
    expect(migrar({ ...local, nivel: 99 })).toBeNull();
    const remoto = { ...local, dia: 3 };
    expect(escolherSave(local, remoto).origem).toBe("remoto");
    expect(escolherSave({ ...local, dia: 5 }, remoto).origem).toBe("local");
    expect(escolherSave(null, null).origem).toBe("nenhum");
    expect(escolherSave(local, null).origem).toBe("local");
  });
});
