import { describe, expect, it } from "vitest";
import { COMBO, MANOBRA, PISTA, PONTUACAO } from "./config";
import { comboVazio, fecharCombo, multiplicador, perderCombo, placarVazio, somarManobra, valorDoCombo } from "./combo";
import { EXEMPLOS } from "./exemplos";
import { formasDaPista, marcos } from "./pecas";
import { colocarPeca, pistaVazia, validarPista, type Pista } from "./pista";
import { duracaoMinimaMs, hashDaPista, podePublicar, pontuacaoFinal, tetoDePontos, validarCorrida, type Corrida } from "./pontuacao";

const base = (): Pista => ({
  ...pistaVazia(40),
  pieces: [
    { type: "start", x: 0, y: 0, flip: false },
    { type: "finish", x: 30, y: 0, flip: false },
  ],
});

describe("validação da pista", () => {
  it("aceita uma pista mínima e os três exemplos", () => {
    expect(validarPista(base()).ok).toBe(true);
    for (const e of EXEMPLOS) expect(validarPista(e.pista)).toMatchObject({ ok: true });
  });

  it("recusa peças sólidas sobrepostas", () => {
    const p = base();
    p.pieces.push({ type: "box", x: 10, y: 1, flip: false }, { type: "ledge", x: 11, y: 1, flip: false });
    expect(validarPista(p)).toMatchObject({ ok: false, motivo: "sobreposicao" });
  });

  it("deixa o corrimão de escada passar na frente da escada", () => {
    const p = base();
    p.pieces.push({ type: "stairs3", x: 10, y: 0, flip: false }, { type: "rail_down", x: 10, y: 0, flip: false });
    expect(validarPista(p).ok).toBe(true);
  });

  it("exige exatamente uma largada e uma chegada, na ordem certa", () => {
    const sem = base();
    sem.pieces = sem.pieces.filter((x) => x.type !== "start");
    expect(validarPista(sem)).toMatchObject({ ok: false, motivo: "largada" });
    const duas = base();
    duas.pieces.push({ type: "finish", x: 20, y: 0, flip: false });
    expect(validarPista(duas)).toMatchObject({ ok: false, motivo: "chegada" });
    const invertida = base();
    invertida.pieces = [
      { type: "finish", x: 0, y: 0, flip: false },
      { type: "start", x: 30, y: 0, flip: false },
    ];
    expect(validarPista(invertida)).toMatchObject({ ok: false, motivo: "ordem" });
  });

  it("respeita os limites de grade, largura, tempo, tipo e quantidade", () => {
    const fora = base();
    fora.pieces.push({ type: "ledge", x: 38, y: 0, flip: false });
    expect(validarPista(fora)).toMatchObject({ ok: false, motivo: "foraDaGrade" });
    expect(validarPista({ ...base(), width: PISTA.larguraMax + 1 })).toMatchObject({ ok: false, motivo: "largura" });
    expect(validarPista({ ...base(), timeLimit: PISTA.tempoMin - 1 })).toMatchObject({ ok: false, motivo: "tempo" });
    expect(validarPista({ ...base(), pieces: [...base().pieces, { type: "loop", x: 5, y: 0, flip: false }] })).toMatchObject({ ok: false, motivo: "tipo" });
    const muitas = { ...base(), width: PISTA.larguraMax, pieces: Array.from({ length: PISTA.maxPecas + 1 }, (_, i) => ({ type: "ground", x: i % 200, y: Math.floor(i / 200) * 2, flip: false })) };
    expect(validarPista(muitas)).toMatchObject({ ok: false, motivo: "muitasPecas" });
    expect(validarPista({ ...base(), extra: 1 }).ok).toBe(false);
    expect(validarPista("oi").ok).toBe(false);
  });

  it("colocarPeca troca a largada de lugar em vez de duplicar", () => {
    const r = colocarPeca(base(), { type: "start", x: 4, y: 0, flip: false });
    expect(r.ok && r.pista.pieces.filter((p) => p.type === "start")).toEqual([{ type: "start", x: 4, y: 0, flip: false }]);
  });

  it("gera geometria e marcos pra pista", () => {
    const p = EXEMPLOS[0].pista;
    expect(formasDaPista(p).length).toBeGreaterThan(0);
    const m = marcos(p)!;
    expect(m.chegadaX).toBeGreaterThan(m.largada.x);
  });
});

describe("combo", () => {
  it("soma e multiplica as manobras encadeadas", () => {
    let c = comboVazio();
    c = somarManobra(c, "ollie");
    c = somarManobra(c, "kickflip");
    c = somarManobra(c, "grind_5050");
    expect(multiplicador(c)).toBe(3);
    expect(valorDoCombo(c)).toBe((MANOBRA.ollie.pontos + MANOBRA.kickflip.pontos + MANOBRA.grind_5050.pontos) * 3);
    const r = fecharCombo(placarVazio(), c);
    expect(r.placar.pontos).toBe(r.ganho);
    expect(r.placar.maiorCombo).toBe(3);
    expect(r.placar.contagem).toEqual({ ollie: 1, kickflip: 1, grind_5050: 1 });
    expect(r.combo.manobras).toHaveLength(0);
  });

  it("tem teto de multiplicador", () => {
    let c = comboVazio();
    for (let i = 0; i < COMBO.multiplicadorMax + 5; i++) c = somarManobra(c, "ollie");
    expect(multiplicador(c)).toBe(COMBO.multiplicadorMax);
  });

  it("aterrissar torto zera sem pontuar", () => {
    const c = somarManobra(comboVazio(), "kickflip");
    const perdido = perderCombo();
    expect(fecharCombo(placarVazio(), perdido).placar.pontos).toBe(0);
    expect(valorDoCombo(c)).toBeGreaterThan(0);
  });
});

describe("pontuação justa", () => {
  const pista = EXEMPLOS[0].pista;
  const corrida = (o: Partial<Corrida> = {}): Corrida => {
    const durationMs = o.durationMs ?? 30_000;
    const trickPoints = o.trickPoints ?? 1000;
    const finished = o.finished ?? true;
    return {
      durationMs,
      trickPoints,
      finished,
      score: pontuacaoFinal(trickPoints, pista.timeLimit, durationMs, finished),
      tricks: { ollie: 3, kickflip: 2 },
      maxCombo: 2,
      inputs: [],
      ...o,
    };
  };

  it("aceita uma corrida possível", () => {
    expect(validarCorrida(corrida(), pista)).toBeNull();
  });

  it("recusa pontos acima do teto pro tempo de corrida", () => {
    const d = 20_000;
    expect(tetoDePontos(d)).toBe(20 * PONTUACAO.maxPontosPorSegundo);
    expect(validarCorrida(corrida({ durationMs: d, trickPoints: tetoDePontos(d) + 1 }), pista)).toBe("teto");
  });

  it("recusa chegada mais rápida que o mínimo pra largura da pista", () => {
    expect(validarCorrida(corrida({ durationMs: duracaoMinimaMs(pista) - 1, trickPoints: 0 }), pista)).toBe("rapidaDemais");
  });

  it("recusa total que não bate com manobras + bônus", () => {
    expect(validarCorrida({ ...corrida(), score: 999_999 }, pista)).toBe("soma");
  });
});

describe("publicar só depois de terminar", () => {
  const pista = EXEMPLOS[1].pista;
  const pico = { id: "p1", userId: "u1", status: "draft" as const, layoutHash: hashDaPista(pista) };
  const ok = { userId: "u1", parkId: "p1", finished: true, layoutHash: hashDaPista(pista) };

  it("publica quando o criador terminou esta versão da pista", () => {
    expect(podePublicar(pico, ok, "u1")).toBe(true);
  });

  it("não publica sem corrida, com corrida não terminada, de outra pessoa ou de outra versão", () => {
    expect(podePublicar(pico, null, "u1")).toBe(false);
    expect(podePublicar(pico, { ...ok, finished: false }, "u1")).toBe(false);
    expect(podePublicar(pico, { ...ok, userId: "u2" }, "u1")).toBe(false);
    expect(podePublicar(pico, ok, "u2")).toBe(false);
    expect(podePublicar(pico, { ...ok, layoutHash: hashDaPista({ ...pista, timeLimit: pista.timeLimit + 1 }) }, "u1")).toBe(false);
    expect(podePublicar({ ...pico, status: "published" }, ok, "u1")).toBe(false);
  });
});

describe("nome, descrição e rascunho", async () => {
  const { gerarSlug, temPalavraBloqueada, validarNomeEDescricao } = await import("./textos");
  const { validarRascunho } = await import("./pista");

  it("filtra palavras e respeita limites", () => {
    expect(validarNomeEDescricao("Praça do Poste", "Uma reta").ok).toBe(true);
    expect(validarNomeEDescricao("oi", "").ok).toBe(false);
    expect(validarNomeEDescricao("x".repeat(PISTA.tituloMax + 1), "").ok).toBe(false);
    expect(validarNomeEDescricao("Pico bom", "y".repeat(PISTA.descricaoMax + 1)).ok).toBe(false);
    expect(temPalavraBloqueada("Pico do CARALHO")).toBe(true);
    expect(temPalavraBloqueada("Escadaria da Padaria")).toBe(false);
  });

  it("gera slug sem acento", () => {
    expect(gerarSlug("Praça do Poste!", "ab12")).toBe("praca-do-poste-ab12");
  });

  it("rascunho pode ficar sem largada, mas não com peça fora da grade", () => {
    expect(validarRascunho(pistaVazia()).ok).toBe(true);
    expect(validarRascunho({ ...pistaVazia(), pieces: [{ type: "box", x: 999, y: 0, flip: false }] }).ok).toBe(false);
  });
});
