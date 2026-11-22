import { describe, expect, it } from "vitest";
import { gerarCandidatos, novaBanda } from "./candidatos";
import { BANDA, CLIMAS, COMPOR, DEMO, EFEITOS, ESTILOS, ESTRUTURAS, HUMOR, MANIAS, MOMENTOS, PALCOS, PAPEIS, TEMAS } from "./config";
import { APELIDOS, NOME_ACAO, NOME_CLIMA, NOME_ESTILO, NOME_ESTRUTURA, NOME_MANIA, NOME_PALCO, NOME_TEMA, NOMES_MUSICAS, TEXTO_MOMENTO, TIPO_PALCO } from "./conteudo";
import { calcularMusica, cansados, compor, consertar, fazerDia, gravarDemo, musicasBoas, sugerirTitulos } from "./motor";
import { escolherSave, migrar, passoDe, saveCoerente } from "./save";
import { maiorPalco, oQueFalta, palcoLiberado, palcosLiberados, pularShow, tocarShow } from "./show";
import type { AcaoDia, Musica, Papel, Progresso } from "./tipos";

const montar = (seed = "semente-1", estilo = "rock-de-garagem"): Progresso => {
  const escolhidos = Object.fromEntries(PAPEIS.map((p) => [p, gerarCandidatos(seed, p)[0].id])) as Record<Papel, string>;
  const b = novaBanda(seed, { nome: "Os Pavios", estilo, logo: { forma: "raio", corFundo: "#1f3a2e", corForma: "#dd5d05" }, escolhidos });
  if (!b) throw new Error("banda não montou");
  return b;
};

/** Faz uma sequência de ações (menos compor) e falha o teste se alguma for recusada. */
const fazer = (p: Progresso, acoes: AcaoDia[]): Progresso => {
  let atual = p;
  for (const a of acoes) {
    const r = fazerDia(atual, a);
    if (!r.ok) throw new Error(`ação ${a} recusada: ${r.erro}`);
    atual = r.prog;
  }
  return atual;
};

const titulos = ["Esquina das Seis", "Muro Descascado", "Rua Sem Saída", "Luz do Poste", "Quintal de Terra", "Folha em Branco"];
const comporUma = (p: Progresso, i: number, clima = "energico"): Progresso => {
  const r = compor(p, { estrutura: "classica", clima, tema: "bairro", titulo: titulos[i] });
  if (!r.ok) throw new Error(`compor recusada: ${r.erro}`);
  return r.prog;
};
/** Música com nota alta, sem passar pelo sorteio da composição. */
const musica = (slot: number, nota: number, semana = 1): Musica => ({
  slot,
  titulo: `Música ${slot}`,
  estrutura: { id: "direta", secoes: [{ nome: "verso", compassos: 8 }] },
  clima: "energico",
  bpm: 140,
  tema: "bairro",
  nota,
  semana,
});
const noFimDeSemana = (p: Progresso, extra: Partial<Progresso> = {}): Progresso => ({ ...p, dia: 6, agenda: Array(6).fill("descansar") as AcaoDia[], ...extra });

describe("montar a banda", () => {
  it("cria uma banda válida com os quatro papéis e os números iniciais", () => {
    const b = montar();
    expect(b.membros.map((m) => m.papel)).toEqual(PAPEIS);
    expect(b.dinheiro).toBe(BANDA.dinheiroInicial);
    expect(b.fama).toBe(0);
    expect(b.semana).toBe(1);
    expect(b.dia).toBe(0);
    expect(saveCoerente(b)).toBe(true);
    expect(new Set(b.membros.map((m) => m.nome)).size).toBe(4);
  });

  it("os candidatos saem da seed: mesma seed, mesmos candidatos", () => {
    expect(gerarCandidatos("abc", "voz")).toEqual(gerarCandidatos("abc", "voz"));
    expect(gerarCandidatos("abc", "voz")).not.toEqual(gerarCandidatos("xyz", "voz"));
    expect(gerarCandidatos("abc", "voz")).toHaveLength(BANDA.candidatosPorPapel);
  });

  it("rejeita nome vazio, estilo inventado, logo fora da lista e candidato que não existe", () => {
    const base = { nome: "Banda", estilo: "punk", logo: { forma: "raio", corFundo: "#1f3a2e", corForma: "#dd5d05" }, escolhidos: Object.fromEntries(PAPEIS.map((p) => [p, gerarCandidatos("s", p)[0].id])) as Record<Papel, string> };
    expect(novaBanda("s", base)).not.toBeNull();
    expect(novaBanda("s", { ...base, nome: "   " })).toBeNull();
    expect(novaBanda("s", { ...base, nome: "x".repeat(BANDA.nomeMax + 1) })).toBeNull();
    expect(novaBanda("s", { ...base, estilo: "samba" })).toBeNull();
    expect(novaBanda("s", { ...base, logo: { ...base.logo, forma: "caveira" } })).toBeNull();
    expect(novaBanda("s", { ...base, logo: { ...base.logo, corFundo: "#000000" } })).toBeNull();
    expect(novaBanda("s", { ...base, escolhidos: { ...base.escolhidos, voz: "voz-9-9" } })).toBeNull();
    expect(novaBanda("s", { ...base, escolhidos: { ...base.escolhidos, voz: gerarCandidatos("outra", "voz")[0].id.replace("0-0", "0-7") } })).toBeNull();
  });
});

describe("efeito de cada ação da semana", () => {
  it("ensaiar sobe técnica e entrosamento, e cansa e baixa o humor", () => {
    const b = montar();
    const r = fazerDia(b, "ensaiar");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    r.prog.membros.forEach((m, i) => {
      expect(m.tecnica).toBeGreaterThan(b.membros[i].tecnica - 1);
      expect(m.tecnica).toBeGreaterThanOrEqual(Math.min(100, b.membros[i].tecnica + EFEITOS.ensaiar.tecnica));
      expect(m.humor).toBeLessThan(b.membros[i].humor);
      expect(m.cansaco).toBe(EFEITOS.ensaiar.cansaco);
    });
    expect(r.prog.entrosamento).toBe(b.entrosamento + EFEITOS.ensaiar.entrosamento);
    expect(r.prog.dia).toBe(1);
    expect(r.prog.agenda).toEqual(["ensaiar"]);
    expect(r.prog.equipamento.instrumentos).toBeLessThan(b.equipamento.instrumentos);
  });

  it("o perfeccionista ganha mais técnica no ensaio", () => {
    const b = montar();
    const membros = b.membros.map((m, i) => ({ ...m, tecnica: 40, mania: i === 0 ? "perfeccionista" : "empolga-o-publico" }));
    const r = fazerDia({ ...b, membros }, "ensaiar");
    if (!r.ok) throw new Error();
    expect(r.prog.membros[0].tecnica).toBeGreaterThan(r.prog.membros[1].tecnica);
  });

  it("divulgar enche a divulgação, gasta dinheiro e rende um tico de fama", () => {
    const b = montar();
    const r = fazerDia(b, "divulgar");
    if (!r.ok) throw new Error();
    expect(r.prog.divulgacao).toBe(EFEITOS.divulgar.divulgacao);
    expect(r.prog.dinheiro).toBe(b.dinheiro + EFEITOS.divulgar.dinheiro);
    expect(r.prog.fama).toBe(b.fama + EFEITOS.divulgar.fama);
  });

  it("divulgar sem dinheiro é recusado", () => {
    const r = fazerDia({ ...montar(), dinheiro: 5 }, "divulgar");
    expect(r).toEqual({ ok: false, erro: "dinheiro" });
  });

  it("trabalhar rende dinheiro perto do valor base (±20%) e cansa", () => {
    const b = montar();
    const r = fazerDia(b, "trabalhar");
    if (!r.ok) throw new Error();
    const ganho = r.prog.dinheiro - b.dinheiro;
    expect(ganho).toBeGreaterThanOrEqual(Math.round(EFEITOS.trabalhar.dinheiro * 0.8));
    expect(ganho).toBeLessThanOrEqual(Math.round(EFEITOS.trabalhar.dinheiro * 1.2));
    expect(r.prog.membros[0].cansaco).toBe(EFEITOS.trabalhar.cansaco);
    expect(r.prog.membros[0].humor).toBeLessThan(b.membros[0].humor);
  });

  it("descansar devolve humor e tira cansaço", () => {
    const b = montar();
    const cansada = { ...b, membros: b.membros.map((m) => ({ ...m, humor: 40, cansaco: 60 })) };
    const r = fazerDia(cansada, "descansar");
    if (!r.ok) throw new Error();
    r.prog.membros.forEach((m) => {
      expect(m.humor).toBeGreaterThan(40);
      expect(m.cansaco).toBe(60 + EFEITOS.descansar.cansaco);
    });
  });

  it("depois do sexto dia não cabe ação; compor não vale como ação comum; ação inventada é recusada", () => {
    let p = montar();
    p = fazer(p, ["descansar", "descansar", "descansar", "descansar", "descansar", "descansar"]);
    expect(p.dia).toBe(6);
    expect(fazerDia(p, "descansar")).toEqual({ ok: false, erro: "semDia" });
    expect(fazerDia(montar(), "compor")).toEqual({ ok: false, erro: "invalido" });
    expect(fazerDia(montar(), "tocar")).toEqual({ ok: false, erro: "invalido" });
    expect(fazerDia(montar(), undefined)).toEqual({ ok: false, erro: "invalido" });
  });

  it("os valores nunca saem de 0 a 100", () => {
    let p = montar();
    p = { ...p, membros: p.membros.map((m) => ({ ...m, humor: 98, tecnica: 99 })) };
    p = fazer(p, ["descansar", "descansar", "ensaiar", "ensaiar"]);
    for (const m of p.membros) {
      for (const v of [m.humor, m.tecnica, m.cansaco, m.presenca, m.criatividade]) {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(100);
      }
    }
  });
});

describe("humor, cansaço e risco de briga", () => {
  it("ensaiar e trabalhar sem parar deixa a banda mais cansada e de pior humor que alternar com descanso", () => {
    const b = montar();
    const sem = fazer(b, ["ensaiar", "trabalhar", "ensaiar", "trabalhar", "ensaiar", "trabalhar"]);
    const com = fazer(b, ["ensaiar", "trabalhar", "descansar", "ensaiar", "trabalhar", "descansar"]);
    const hum = (p: Progresso) => p.membros.reduce((s, m) => s + m.humor, 0) / 4;
    const can = (p: Progresso) => p.membros.reduce((s, m) => s + m.cansaco, 0) / 4;
    expect(hum(com)).toBeGreaterThan(hum(sem));
    expect(can(com)).toBeLessThan(can(sem));
  });

  it("com o humor do descanso não compensando o cansaço, o humor despenca (cansaço acima do limiar pesa)", () => {
    const b = montar();
    const folgado = { ...b, membros: b.membros.map((m) => ({ ...m, humor: 80, cansaco: 0 })) };
    const exausto = { ...b, membros: b.membros.map((m) => ({ ...m, humor: 80, cansaco: 90 })) };
    const a = fazerDia(folgado, "compor" as AcaoDia); // recusado: compor tem tela própria
    expect(a.ok).toBe(false);
    const f = fazerDia(folgado, "descansar");
    const e = fazerDia(exausto, "divulgar");
    if (!f.ok || !e.ok) throw new Error();
    expect(f.prog.membros[0].humor).toBeGreaterThan(e.prog.membros[0].humor);
  });

  it("não dá briga com menos de dois integrantes cansados", () => {
    for (let s = 0; s < 60; s++) {
      const b = montar(`seed-${s}`);
      const um = { ...b, membros: b.membros.map((m, i) => ({ ...m, cansaco: i === 0 ? 80 : 0 })) };
      const r = fazerDia(um, "ensaiar");
      if (!r.ok) throw new Error();
      expect(r.briga).toBeNull();
    }
  });

  it("com todos cansados dá briga em alguns dias e não em outros, e a briga custa entrosamento e humor", () => {
    let brigas = 0;
    const total = 80;
    for (let s = 0; s < total; s++) {
      const b = montar(`seed-${s}`);
      const todos = { ...b, entrosamento: 50, membros: b.membros.map((m) => ({ ...m, humor: 80, cansaco: 70 })) };
      expect(cansados(todos)).toHaveLength(4);
      const r = fazerDia(todos, "ensaiar");
      if (!r.ok) throw new Error();
      if (r.briga) {
        brigas++;
        expect(r.briga.a).not.toBe(r.briga.b);
        expect(r.prog.entrosamento).toBe(50 + EFEITOS.ensaiar.entrosamento - 8);
      }
    }
    expect(brigas).toBeGreaterThan(total * 0.3);
    expect(brigas).toBeLessThan(total);
  });

  it("a briga é determinística: mesma seed, mesmo dia, mesmo resultado", () => {
    const b = montar("fixa");
    const todos = { ...b, membros: b.membros.map((m) => ({ ...m, humor: 80, cansaco: 70 })) };
    expect(fazerDia(todos, "ensaiar")).toEqual(fazerDia(todos, "ensaiar"));
  });

  it("humor baixo gera o aviso uma vez, com a semana do aviso", () => {
    const b = montar();
    const baixo = { ...b, membros: b.membros.map((m, i) => ({ ...m, humor: i === 1 ? 15 : 80 })) };
    const r = fazerDia(baixo, "descansar");
    if (!r.ok) throw new Error();
    expect(r.aviso).toContain(baixo.membros[1].nome);
    expect(r.prog.membros[1].avisoSemana).toBe(1);
    const r2 = fazerDia({ ...r.prog, membros: r.prog.membros.map((m, i) => (i === 1 ? { ...m, humor: 20 } : m)) }, "ensaiar");
    if (!r2.ok) throw new Error();
    expect(r2.aviso).not.toContain(baixo.membros[1].nome);
  });

  it("quem se recupera perde o aviso", () => {
    const b = montar();
    const m = { ...b, membros: b.membros.map((x, i) => (i === 0 ? { ...x, humor: 70, avisoSemana: 1 } : x)) };
    const r = fazerDia(m, "descansar");
    if (!r.ok) throw new Error();
    expect(r.prog.membros[0].avisoSemana).toBeNull();
  });

  it("conserto gasta dinheiro, recupera o equipamento e não gasta dia", () => {
    const b = { ...montar(), equipamento: { instrumentos: 40, amplificador: 100, cabos: 90 } };
    const r = consertar(b, "instrumentos");
    if (!r.ok) throw new Error();
    expect(r.prog.equipamento.instrumentos).toBe(65);
    expect(r.prog.dinheiro).toBe(b.dinheiro - r.custo);
    expect(r.prog.dia).toBe(b.dia);
    expect(consertar(b, "amplificador")).toEqual({ ok: false, erro: "equipOk" });
    expect(consertar({ ...b, dinheiro: 1 }, "instrumentos")).toEqual({ ok: false, erro: "dinheiro" });
    expect(consertar(b, "violao")).toEqual({ ok: false, erro: "invalido" });
    const cabos = consertar(b, "cabos");
    if (!cabos.ok) throw new Error();
    expect(cabos.prog.equipamento.cabos).toBe(100);
  });
});

describe("cálculo da composição", () => {
  it("a nota fica entre 0 e 100 e o BPM acompanha o estilo e o clima", () => {
    const b = montar();
    for (const est of ESTRUTURAS) {
      for (const cl of CLIMAS) {
        const c = calcularMusica(b, est.id, cl.id)!;
        expect(c.nota).toBeGreaterThanOrEqual(0);
        expect(c.nota).toBeLessThanOrEqual(100);
        expect(c.bpm).toBeGreaterThanOrEqual(60);
        expect(c.bpm).toBeLessThanOrEqual(220);
      }
    }
    const punk = montar("s", "punk");
    const indie = montar("s", "indie");
    expect(calcularMusica(punk, "direta", "energico")!.bpm).toBeGreaterThan(calcularMusica(indie, "direta", "melancolico")!.bpm);
  });

  it("banda mais talentosa e de melhor humor compõe melhor", () => {
    const b = montar();
    const fraca = { ...b, membros: b.membros.map((m) => ({ ...m, criatividade: 20, tecnica: 20, humor: 30 })) };
    const forte = { ...b, membros: b.membros.map((m) => ({ ...m, criatividade: 90, tecnica: 90, humor: 90 })) };
    expect(calcularMusica(forte, "classica", "energico")!.nota).toBeGreaterThan(calcularMusica(fraca, "classica", "energico")!.nota + 25);
  });

  it("o clima que combina com o estilo rende mais", () => {
    const punk = montar("s", "punk");
    const forte = { ...punk, membros: punk.membros.map((m) => ({ ...m, criatividade: 80, tecnica: 80, humor: 90 })) };
    expect(calcularMusica(forte, "classica", "energico")!.nota).toBeGreaterThan(calcularMusica(forte, "classica", "melancolico")!.nota);
  });

  it("estrutura mais completa rende mais que a direta", () => {
    const b = montar();
    expect(calcularMusica(b, "longa", "energico")!.nota).toBeGreaterThan(calcularMusica(b, "direta", "energico")!.nota - 1);
  });

  it("a mesma seed e o mesmo dia dão a mesma nota", () => {
    const a = calcularMusica(montar("k"), "classica", "sombrio");
    expect(calcularMusica(montar("k"), "classica", "sombrio")).toEqual(a);
  });

  it("compor cria a música em formato pronto pro Riff (BPM, estrutura, clima), gasta o dia e guarda a semana", () => {
    const b = montar();
    const r = compor(b, { estrutura: "classica", clima: "energico", tema: "bairro", titulo: "  Esquina   das Seis " });
    if (!r.ok) throw new Error();
    expect(r.musica).toMatchObject({ slot: 1, titulo: "Esquina das Seis", clima: "energico", tema: "bairro", semana: 1 });
    expect(r.musica!.estrutura.secoes.length).toBeGreaterThan(2);
    expect(r.musica!.bpm).toBeGreaterThan(0);
    expect(r.prog.musicas).toHaveLength(1);
    expect(r.prog.dia).toBe(1);
    expect(r.prog.agenda).toEqual(["compor"]);
    expect(r.prog.membros[0].criatividade).toBe(Math.min(100, b.membros[0].criatividade + EFEITOS.compor.criatividade));
  });

  it("recusa título vazio, longo, repetido, com caractere de controle e escolhas inventadas", () => {
    const b = comporUma(montar(), 0);
    const ok = { estrutura: "direta", clima: "energico", tema: "bairro", titulo: "Outra" };
    expect(compor(b, { ...ok, titulo: "" })).toEqual({ ok: false, erro: "titulo" });
    expect(compor(b, { ...ok, titulo: "x".repeat(BANDA.tituloMax + 1) })).toEqual({ ok: false, erro: "titulo" });
    expect(compor(b, { ...ok, titulo: "esquina das seis" })).toEqual({ ok: false, erro: "titulo" });
    expect(compor(b, { ...ok, titulo: "a\u0000b" })).toEqual({ ok: false, erro: "titulo" });
    expect(compor(b, { ...ok, estrutura: "epica" })).toEqual({ ok: false, erro: "invalido" });
    expect(compor(b, { ...ok, clima: "feliz" })).toEqual({ ok: false, erro: "invalido" });
    expect(compor(b, { ...ok, tema: "dinheiro" })).toEqual({ ok: false, erro: "invalido" });
    expect(compor({ ...b, dia: 6 }, ok)).toEqual({ ok: false, erro: "semDia" });
  });

  it("as sugestões de título vêm do tema, sem repetir as que a banda já usou", () => {
    const b = comporUma(montar(), 0);
    const s = sugerirTitulos(b, "bairro");
    expect(s).toHaveLength(COMPOR.sugestoes);
    expect(s).not.toContain("Esquina das Seis");
    s.forEach((t) => expect(NOMES_MUSICAS.bairro).toContain(t));
    expect(sugerirTitulos(b, "tema-que-nao-existe")).toEqual([]);
  });

  it("música boa é a de nota a partir do limiar", () => {
    const b = { ...montar(), musicas: [musica(1, COMPOR.notaBoa), musica(2, COMPOR.notaBoa - 1)] };
    expect(musicasBoas(b)).toHaveLength(1);
  });
});

describe("cálculo do show", () => {
  const preparada = (seed = "show-1", extra: Partial<Progresso> = {}) => {
    const b = montar(seed);
    return noFimDeSemana({ ...b, musicas: [musica(1, 70), musica(2, 75), musica(3, 65)], entrosamento: 60, divulgacao: 40, ...extra });
  };

  it("com a mesma seed o show dá exatamente o mesmo resultado", () => {
    const a = tocarShow(preparada(), "garagem-do-tuco", [1, 2]);
    const b = tocarShow(preparada(), "garagem-do-tuco", [1, 2]);
    expect(a).toEqual(b);
    expect(a.ok).toBe(true);
  });

  it("seeds diferentes dão resultados diferentes (a sorte varia o show)", () => {
    const notas = new Set<number>();
    for (let s = 0; s < 25; s++) {
      const r = tocarShow(preparada(`seed-${s}`), "bar-tampinha", [1, 2, 3], );
      if (r.ok || r.erro !== "palcoFechado") continue;
    }
    for (let s = 0; s < 25; s++) {
      const r = tocarShow(preparada(`seed-${s}`, { fama: 20 }), "bar-tampinha", [1, 2, 3]);
      if (!r.ok) throw new Error(r.erro);
      notas.add(r.registro.nota);
    }
    expect(notas.size).toBeGreaterThan(2);
  });

  it("o resultado fica dentro dos limites e o público não passa da lotação", () => {
    for (let s = 0; s < 40; s++) {
      const r = tocarShow(preparada(`lim-${s}`, { fama: 100, demo: true }), "festival-quintal-aberto", [1, 2, 3]);
      if (!r.ok) throw new Error(r.erro);
      expect(r.registro.nota).toBeGreaterThanOrEqual(0);
      expect(r.registro.nota).toBeLessThanOrEqual(100);
      expect(r.registro.publico).toBeLessThanOrEqual(PALCOS[4].capacidade);
      expect(r.registro.publico).toBeGreaterThanOrEqual(0);
      expect(r.registro.cache).toBeGreaterThanOrEqual(0);
      expect(r.registro.energia).toBeLessThanOrEqual(100);
      expect(r.registro.momentos.length).toBeGreaterThanOrEqual(1);
      r.registro.momentos.forEach((m) => expect(TEXTO_MOMENTO[m]).toBeTruthy());
    }
  });

  it("músicas melhores, mais entrosamento, melhor equipamento e mais divulgação rendem nota maior (mesma sorte)", () => {
    const base = preparada("peso");
    const nota = (p: Progresso) => {
      const r = tocarShow(p, "garagem-do-tuco", [1, 2, 3]);
      if (!r.ok) throw new Error(r.erro);
      return r.registro.nota;
    };
    const n0 = nota(base);
    expect(nota({ ...base, musicas: base.musicas.map((m) => ({ ...m, nota: m.nota + 20 })) })).toBeGreaterThan(n0);
    expect(nota({ ...base, entrosamento: 95 })).toBeGreaterThan(n0);
    expect(nota({ ...base, equipamento: { instrumentos: 100, amplificador: 100, cabos: 100 } })).toBeGreaterThan(nota({ ...base, equipamento: { instrumentos: 20, amplificador: 20, cabos: 20 } }));
    expect(nota({ ...base, divulgacao: 100 })).toBeGreaterThanOrEqual(nota({ ...base, divulgacao: 0 }));
    expect(nota({ ...base, membros: base.membros.map((m) => ({ ...m, presenca: 95 })) })).toBeGreaterThan(nota({ ...base, membros: base.membros.map((m) => ({ ...m, presenca: 10 })) }));
  });

  it("mais divulgação e mais fama trazem mais público", () => {
    const pub = (extra: Partial<Progresso>) => {
      const r = tocarShow(preparada("publico", { fama: 20, ...extra }), "bar-tampinha", [1, 2, 3]);
      if (!r.ok) throw new Error(r.erro);
      return r.registro.publico;
    };
    expect(pub({ divulgacao: 90 })).toBeGreaterThan(pub({ divulgacao: 0 }));
    expect(pub({ fama: 40 })).toBeGreaterThan(pub({ fama: 16 }));
  });

  it("o show rende cachê no caixa, mexe na fama, desgasta o equipamento e vira a semana", () => {
    const p = preparada("efeitos", { fama: 20, dinheiro: 10 });
    const r = tocarShow(p, "bar-tampinha", [1, 2, 3]);
    if (!r.ok) throw new Error();
    expect(r.prog.dinheiro).toBe(10 + r.registro.cache);
    expect(r.prog.fama).toBe(Math.max(0, Math.min(100, 20 + r.registro.famaDelta)));
    expect(r.prog.equipamento.cabos).toBeLessThan(p.equipamento.cabos);
    expect(r.prog.semana).toBe(2);
    expect(r.prog.dia).toBe(0);
    expect(r.prog.agenda).toEqual([]);
    expect(r.prog.divulgacao).toBe(0);
    expect(r.prog.shows).toHaveLength(1);
    expect(r.prog.shows[0]).toEqual(r.registro);
    expect(saveCoerente(r.prog)).toBe(true);
  });

  it("só toca no fim de semana, com repertório de músicas que existem e cabem no palco", () => {
    const p = preparada();
    expect(tocarShow({ ...p, dia: 3, agenda: ["descansar", "descansar", "descansar"] }, "garagem-do-tuco", [1])).toEqual({ ok: false, erro: "diaErrado" });
    expect(tocarShow(p, "garagem-do-tuco", [])).toEqual({ ok: false, erro: "repertorio" });
    expect(tocarShow(p, "garagem-do-tuco", [9])).toEqual({ ok: false, erro: "repertorio" });
    expect(tocarShow(p, "garagem-do-tuco", [1, 1])).toEqual({ ok: false, erro: "repertorio" });
    expect(tocarShow(p, "garagem-do-tuco", [1, 2, 3, 3])).toEqual({ ok: false, erro: "repertorio" });
    expect(tocarShow(p, "garagem-do-tuco", "1")).toEqual({ ok: false, erro: "repertorio" });
    expect(tocarShow(p, "palco-que-nao-existe", [1])).toEqual({ ok: false, erro: "invalido" });
    expect(tocarShow({ ...p, musicas: [] }, "garagem-do-tuco", [1])).toEqual({ ok: false, erro: "semMusica" });
    const cheio = { ...p, fama: 20, musicas: [1, 2, 3, 4, 5].map((i) => musica(i, 70)) };
    expect(tocarShow(cheio, "bar-tampinha", [1, 2, 3, 4, 5])).toEqual({ ok: false, erro: "repertorio" });
  });

  it("quem está no chão pode faltar e o show piora; mania de atrasar rende o momento", () => {
    let faltas = 0;
    let atrasos = 0;
    for (let s = 0; s < 60; s++) {
      const p = preparada(`falta-${s}`);
      const mal = { ...p, membros: p.membros.map((m, i) => ({ ...m, humor: i === 0 ? HUMOR.faltar - 5 : 80, mania: i === 1 ? "sempre-atrasa" : "perfeccionista" })) };
      const r = tocarShow(mal, "garagem-do-tuco", [1, 2, 3]);
      if (!r.ok) throw new Error();
      if (r.faltou.length) faltas++;
      if (r.registro.momentos.includes("chegou-atrasado")) atrasos++;
    }
    expect(faltas).toBeGreaterThan(10);
    expect(faltas).toBeLessThan(60);
    expect(atrasos).toBeGreaterThan(5);
    const p = preparada("sem-falta");
    const bom = { ...p, membros: p.membros.map((m) => ({ ...m, humor: 80, mania: "perfeccionista" })) };
    const r = tocarShow(bom, "garagem-do-tuco", [1, 2, 3]);
    if (!r.ok) throw new Error();
    expect(r.faltou).toEqual([]);
  });

  it("saída: só sai quem foi avisado numa semana anterior e está no fundo; entra um substituto", () => {
    let saiu = 0;
    for (let s = 0; s < 40; s++) {
      const p = preparada(`saida-${s}`, { semana: 3 });
      const aviso = (semana: number | null) => ({ ...p, membros: p.membros.map((m, i) => ({ ...m, humor: i === 0 ? HUMOR.saida : 80, avisoSemana: i === 0 ? semana : null })) });
      const sem = tocarShow(aviso(null), "garagem-do-tuco", [1]);
      const mesma = tocarShow(aviso(3), "garagem-do-tuco", [1]);
      const antes = tocarShow(aviso(2), "garagem-do-tuco", [1]);
      if (!sem.ok || !mesma.ok || !antes.ok) throw new Error();
      expect(sem.saidas).toEqual([]);
      expect(mesma.saidas).toEqual([]);
      if (antes.saidas.length) {
        saiu++;
        expect(antes.prog.membros[0].nome).toBe(antes.saidas[0].entrou);
        expect(antes.prog.membros[0].nome).not.toBe(p.membros[0].nome);
        expect(antes.prog.membros[0].papel).toBe(p.membros[0].papel);
        expect(antes.prog.membros[0].avisoSemana).toBeNull();
        expect(new Set(antes.prog.membros.map((m) => m.nome)).size).toBe(4);
      }
    }
    expect(saiu).toBeGreaterThan(5);
  });

  it("pular o show vira a semana e custa um pouco de fama e humor", () => {
    const p = preparada("pular", { fama: 10 });
    const r = pularShow(p);
    if (!r.ok) throw new Error();
    expect(r.prog.semana).toBe(2);
    expect(r.prog.fama).toBeLessThan(10);
    expect(r.prog.membros[0].humor).toBeLessThan(p.membros[0].humor);
    expect(pularShow({ ...p, dia: 2, agenda: ["descansar", "descansar"] })).toEqual({ ok: false, erro: "diaErrado" });
  });

  it("os momentos têm texto e condições coerentes na config", () => {
    MOMENTOS.forEach((m) => {
      expect(TEXTO_MOMENTO[m.id]).toBeTruthy();
      expect(m.chance).toBeGreaterThan(0);
      expect(m.chance).toBeLessThanOrEqual(1);
    });
  });
});

describe("liberação de palcos por fama", () => {
  it("cada palco abre na fama certa, e os maiores pedem a demo", () => {
    const b = montar();
    expect(palcosLiberados({ ...b, fama: 0 }).map((p) => p.slug)).toEqual(["garagem-do-tuco"]);
    expect(palcosLiberados({ ...b, fama: 14 })).toHaveLength(1);
    expect(palcosLiberados({ ...b, fama: 15 }).map((p) => p.slug)).toEqual(["garagem-do-tuco", "bar-tampinha"]);
    expect(palcosLiberados({ ...b, fama: 30 })).toHaveLength(3);
    expect(palcosLiberados({ ...b, fama: 100 })).toHaveLength(3); // sem a demo, os dois maiores seguem fechados
    expect(palcosLiberados({ ...b, fama: 45, demo: true })).toHaveLength(4);
    expect(palcosLiberados({ ...b, fama: 100, demo: true })).toHaveLength(5);
    expect(palcosLiberados({ ...b, fama: 69, demo: true })).toHaveLength(4);
  });

  it("dizer o que falta pro palco fechado", () => {
    const b = { ...montar(), fama: 20 };
    const centro = PALCOS[3];
    expect(oQueFalta(b, centro)).toEqual({ fama: 25, demo: true });
    expect(oQueFalta({ ...b, fama: 50, demo: true }, centro)).toEqual({ fama: 0, demo: false });
    expect(palcoLiberado({ ...b, fama: 50 }, centro)).toBe(false);
  });

  it("tocar num palco fechado é recusado", () => {
    const p = noFimDeSemana({ ...montar(), musicas: [musica(1, 70)] });
    expect(tocarShow(p, "bar-tampinha", [1])).toEqual({ ok: false, erro: "palcoFechado" });
  });

  it("o maior palco é o mais alto da lista que já foi tocado", () => {
    expect(maiorPalco([])).toBeNull();
    expect(maiorPalco([{ palco: "garagem-do-tuco" }, { palco: "festa-ipe-roxo" }, { palco: "bar-tampinha" }])).toBe("festa-ipe-roxo");
  });
});

describe("gravação da demo", () => {
  const comBoas = (n: number, extra: Partial<Progresso> = {}) => ({ ...montar(), dinheiro: 1000, musicas: Array.from({ length: n }, (_, i) => musica(i + 1, 80)), ...extra });

  it("exige 4 músicas boas, dinheiro e só vale uma vez", () => {
    expect(gravarDemo(comBoas(3))).toEqual({ ok: false, erro: "demoRequisito" });
    expect(gravarDemo({ ...comBoas(4), musicas: [...comBoas(3).musicas, musica(4, COMPOR.notaBoa - 1)] })).toEqual({ ok: false, erro: "demoRequisito" });
    expect(gravarDemo(comBoas(4, { dinheiro: DEMO.custo - 1 }))).toEqual({ ok: false, erro: "dinheiro" });
    const r = gravarDemo(comBoas(4));
    if (!r.ok) throw new Error();
    expect(r.prog.demo).toBe(true);
    expect(r.prog.dinheiro).toBe(1000 - DEMO.custo);
    expect(r.prog.fama).toBe(DEMO.famaBonus);
    expect(gravarDemo(r.prog)).toEqual({ ok: false, erro: "demoJa" });
  });

  it("depois da demo, os palcos maiores abrem pela fama", () => {
    const r = gravarDemo(comBoas(4, { fama: 50 }));
    if (!r.ok) throw new Error();
    expect(palcosLiberados(r.prog).map((p) => p.slug)).toContain("centro-varzea-viva");
  });
});

describe("save: validação, migração e migração do save local pra conta", () => {
  it("um save válido sobrevive ao vai-e-volta por JSON", () => {
    const p = fazer(montar(), ["ensaiar", "descansar"]);
    expect(migrar(JSON.parse(JSON.stringify(p)))).toEqual(p);
  });

  it("recusa lixo, campo faltando, valor fora da faixa e versão do futuro", () => {
    const p = montar();
    expect(migrar(null)).toBeNull();
    expect(migrar("oi")).toBeNull();
    expect(migrar({})).toBeNull();
    expect(migrar({ ...p, dinheiro: -1 })).toBeNull();
    expect(migrar({ ...p, fama: 101 })).toBeNull();
    expect(migrar({ ...p, estilo: "samba" })).toBeNull();
    expect(migrar({ ...p, membros: p.membros.slice(0, 3) })).toBeNull();
    expect(migrar({ ...p, v: BANDA.versaoSave + 1 })).toBeNull();
    expect(migrar({ ...p, logo: { ...p.logo, corForma: "#000000" } })).toBeNull();
    const { seed, ...semSeed } = p;
    void seed;
    expect(migrar(semSeed)).toBeNull();
  });

  it("um save sem número de versão é lido como v1", () => {
    const { v, ...resto } = montar();
    void v;
    expect(migrar(resto)?.v).toBe(BANDA.versaoSave);
  });

  it("o save mais avançado vence; no empate, a conta", () => {
    const novo = montar("a");
    const adiantado = fazer(novo, ["ensaiar", "trabalhar"]);
    expect(escolherSave(adiantado, novo).origem).toBe("local");
    expect(escolherSave(novo, adiantado).origem).toBe("remoto");
    expect(escolherSave(novo, novo).origem).toBe("remoto");
    expect(escolherSave(adiantado, null)).toEqual({ save: adiantado, origem: "local" });
    expect(escolherSave(null, adiantado)).toEqual({ save: adiantado, origem: "remoto" });
    expect(escolherSave(null, null).origem).toBe("nenhum");
    const semanaDois = { ...novo, semana: 2 };
    expect(passoDe(semanaDois)).toBeGreaterThan(passoDe(adiantado));
  });

  it("a checagem de integridade pega save adulterado", () => {
    const p = montar();
    expect(saveCoerente(p)).toBe(true);
    expect(saveCoerente({ ...p, dinheiro: 5_000_000 })).toBe(false);
    expect(saveCoerente({ ...p, musicas: [musica(1, 90)] })).toBe(false); // uma música sem nenhum dia jogado
    expect(saveCoerente({ ...p, dia: 3 })).toBe(false); // agenda não bate com o dia
    expect(saveCoerente({ ...p, demo: true })).toBe(false); // demo sem as músicas boas
    expect(saveCoerente({ ...p, membros: [p.membros[0], p.membros[0], p.membros[2], p.membros[3]] })).toBe(false);
    expect(saveCoerente({ ...p, shows: [{ semana: 1, palco: "garagem-do-tuco", repertorio: [1], publico: 1, cache: 0, famaDelta: 1, nota: 50, energia: 50, momentos: [] }] })).toBe(false);
  });

  it("uma banda jogada de verdade continua coerente semana após semana", () => {
    let p = montar("jogada", "indie");
    for (let semana = 0; semana < 5; semana++) {
      p = comporUma(p, semana % titulos.length, "ensolarado");
      p = fazer(p, ["trabalhar", "descansar", "divulgar", "ensaiar", "descansar"]);
      const r = tocarShow(p, "garagem-do-tuco", [1]);
      if (!r.ok) throw new Error(r.erro);
      p = r.prog;
      expect(saveCoerente(p)).toBe(true);
      expect(migrar(JSON.parse(JSON.stringify(p)))).toEqual(p);
    }
    expect(p.semana).toBe(6);
    expect(p.musicas).toHaveLength(5);
    expect(p.shows).toHaveLength(5);
  });
});

describe("config e conteúdo", () => {
  it("os palcos estão em ordem de fama e todo palco tem nome e tipo", () => {
    const fama = PALCOS.map((p) => p.famaMin);
    expect([...fama].sort((a, b) => a - b)).toEqual(fama);
    expect(PALCOS).toHaveLength(5);
    expect(PALCOS[0].famaMin).toBe(0);
    PALCOS.forEach((p) => {
      expect(NOME_PALCO[p.slug]).toBeTruthy();
      expect(TIPO_PALCO[p.slug]).toBeTruthy();
    });
  });

  it("todo estilo, clima, tema, estrutura, mania e ação tem rótulo", () => {
    ESTILOS.forEach((e) => {
      expect(NOME_ESTILO[e.id]).toBeTruthy();
      CLIMAS.forEach((c) => expect(e.afinidade[c.id]).toBeGreaterThan(0));
    });
    CLIMAS.forEach((c) => expect(NOME_CLIMA[c.id]).toBeTruthy());
    TEMAS.forEach((t) => {
      expect(NOME_TEMA[t]).toBeTruthy();
      expect(NOMES_MUSICAS[t].length).toBeGreaterThanOrEqual(COMPOR.sugestoes);
    });
    ESTRUTURAS.forEach((e) => expect(NOME_ESTRUTURA[e.id]).toBeTruthy());
    MANIAS.forEach((m) => expect(NOME_MANIA[m.id]).toBeTruthy());
    Object.keys(EFEITOS).forEach((a) => expect(NOME_ACAO[a as AcaoDia]).toBeTruthy());
  });

  it("os candidatos e os nomes de música são inventados: nada de banda, música ou marca conhecida", () => {
    const proibidos = ["beatles", "nirvana", "metallica", "ramones", "queen", "fender", "gibson", "marshall", "yamaha", "ibanez", "pearl jam", "legiao", "legião", "titas", "titãs"];
    const todos = [
      ...Object.values(NOMES_MUSICAS).flat(),
      ...Object.values(NOME_PALCO),
      ...Object.values(TIPO_PALCO),
      ...APELIDOS,
      ...Object.values(NOME_ESTILO),
    ].map((t) => t.toLowerCase());
    for (const t of todos) for (const p of proibidos) expect(t).not.toContain(p);
    // Todos os títulos cabem no limite do jogo.
    Object.values(NOMES_MUSICAS).flat().forEach((t) => expect(t.length).toBeLessThanOrEqual(BANDA.tituloMax));
    // Nada de bebida alcoólica como mecânica.
    for (const t of Object.values(TEXTO_MOMENTO)) expect(t.toLowerCase()).not.toMatch(/cerveja|bebid|álcool|alcool|vodka|pinga/);
  });
});
