import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("./palavras", () => ({ palavrasValidas: async () => new Set(["PIXEL", "LASER", "ROBOS", "NINJA"]) }));

const puzzles = new Map([
  ["2026-11-18", { id: "p18", date: "2026-11-18", answer: "NINJA", length: 5, theme: "anime", hint: "" }],
  ["2026-11-19", { id: "p19", date: "2026-11-19", answer: "ROBOS", length: 5, theme: "ficcao-cientifica", hint: "" }],
  ["2026-11-20", { id: "p20", date: "2026-11-20", answer: "LASER", length: 5, theme: "ficcao-cientifica", hint: "Feixe" }],
]);

const dados = vi.hoisted(() => ({
  puzzleDoDia: vi.fn(),
  puzzlesDasDatas: vi.fn(),
  palpitesDe: vi.fn(),
  gravarPartida: vi.fn(),
  recalcularSequencia: vi.fn(),
  sequenciaDe: vi.fn(),
  distribuicaoDe: vi.fn(),
}));
vi.mock("./dados", () => dados);

import { jogarPalpite, migrarParaConta, montarEstado } from "./servico";
import { migrarSave } from "./save";

// 20/11/2026 12:00 em Brasília.
const AGORA = new Date("2026-11-20T12:00:00-03:00");

beforeEach(() => {
  vi.resetAllMocks();
  dados.puzzleDoDia.mockImplementation(async (dia: string) => puzzles.get(dia) ?? null);
  dados.puzzlesDasDatas.mockImplementation(async (dias: string[]) => new Map(dias.filter((d) => puzzles.has(d)).map((d) => [d, puzzles.get(d)])));
  dados.palpitesDe.mockResolvedValue({ palpites: [], finalizada: false });
  dados.sequenciaDe.mockResolvedValue({ current: 0, best: 0, lastDate: null });
  dados.distribuicaoDe.mockResolvedValue(null);
  dados.recalcularSequencia.mockResolvedValue({ current: 0, best: 0, lastDate: null });
});

describe("conferência no servidor", () => {
  it("sem conta: confere o palpite e devolve só o retorno, sem a resposta", async () => {
    const r = await jogarPalpite(null, "pixel", migrarSave({ versao: 1, dias: {} }), AGORA);
    if (!r.ok) throw new Error("esperava ok");
    expect(r.estado.partida?.resposta).toBeNull();
    expect(r.estado.partida?.retornos).toHaveLength(1);
    expect(JSON.stringify(r)).not.toContain("LASER");
    expect(dados.gravarPartida).not.toHaveBeenCalled();
  });

  it("sem conta: vitória revela a resposta e entra na sequência do navegador", async () => {
    const save = migrarSave({ versao: 1, dias: { "2026-11-19": ["ROBOS"], "2026-11-20": ["PIXEL"] } });
    const r = await jogarPalpite(null, "laser", save, AGORA);
    if (!r.ok) throw new Error("esperava ok");
    expect(r.estado.partida).toMatchObject({ solved: true, finalizada: true, resposta: "LASER", tentativas: 2 });
    expect(r.estado.sequencia).toEqual({ current: 2, best: 2, lastDate: "2026-11-20" });
  });

  it("com conta: a partida vem do banco, não do navegador, e a gravação é do servidor", async () => {
    dados.palpitesDe.mockResolvedValue({ palpites: ["PIXEL"], finalizada: false });
    const trapaca = migrarSave({ versao: 1, dias: { "2026-11-20": ["LASER"] } });
    const r = await jogarPalpite("u1", "robos", trapaca, AGORA);
    if (!r.ok) throw new Error("esperava ok");
    expect(r.estado.partida?.tentativas).toBe(2); // PIXEL (banco) + ROBOS; o LASER do navegador foi ignorado
    expect(r.estado.partida?.solved).toBe(false);
    expect(dados.gravarPartida).toHaveBeenCalledWith("u1", "p20", "2026-11-20", expect.objectContaining({ solved: false }));
  });

  it("recusa palpite fora da lista, de outro tamanho e depois do fim", async () => {
    expect(await jogarPalpite(null, "zzzzz", null, AGORA)).toEqual({ ok: false, erro: "invalida" });
    expect(await jogarPalpite(null, "dragao", null, AGORA)).toEqual({ ok: false, erro: "tamanho" });
    const save = migrarSave({ versao: 1, dias: { "2026-11-20": ["LASER"] } });
    expect(await jogarPalpite(null, "pixel", save, AGORA)).toEqual({ ok: false, erro: "finalizada" });
  });

  it("sem palavra agendada, não há partida", async () => {
    expect(await jogarPalpite(null, "pixel", null, new Date("2026-12-25T12:00:00-03:00"))).toEqual({ ok: false, erro: "sem-desafio" });
    const e = await montarEstado(null, null, new Date("2026-12-25T12:00:00-03:00"));
    expect(e.puzzle).toBeNull();
  });

  it("o estado do dia não carrega a resposta enquanto a partida está aberta", async () => {
    const e = await montarEstado(null, migrarSave({ versao: 1, dias: { "2026-11-20": ["PIXEL"] } }), AGORA);
    expect(JSON.stringify(e)).not.toContain("LASER");
    expect(e.puzzle).toEqual({ length: 5, theme: "ficcao-cientifica", hint: "Feixe" });
  });

  it("o dia vira à meia-noite de Brasília", async () => {
    const e = await montarEstado(null, null, new Date("2026-11-21T02:59:00Z"));
    expect(e.dia).toBe("2026-11-20");
    expect(e.proximoEm).toBe(60_000);
    expect((await montarEstado(null, null, new Date("2026-11-21T03:00:00Z"))).dia).toBe("2026-11-21");
  });
});

describe("migração do save local pra conta", () => {
  it("regrava cada dia conferido pelo servidor e refaz a sequência", async () => {
    const save = migrarSave({
      versao: 1,
      dias: { "2026-11-18": ["PIXEL", "NINJA"], "2026-11-19": ["ROBOS"], "2026-11-20": ["PIXEL"], "2026-11-25": ["LASER"] },
    })!;
    const n = await migrarParaConta("u1", save, AGORA);
    expect(n).toBe(3); // o dia 25 ainda não chegou
    expect(dados.gravarPartida).toHaveBeenCalledTimes(3);
    expect(dados.gravarPartida).toHaveBeenCalledWith("u1", "p18", "2026-11-18", expect.objectContaining({ solved: true, palpites: ["PIXEL", "NINJA"] }));
    expect(dados.gravarPartida).toHaveBeenCalledWith("u1", "p20", "2026-11-20", expect.objectContaining({ finalizada: false }));
    expect(dados.recalcularSequencia).toHaveBeenCalledWith("u1");
  });

  it("não inventa vitória: palpite que não é a resposta não vira acerto", async () => {
    const save = migrarSave({ versao: 1, dias: { "2026-11-18": ["PIXEL", "LASER", "ROBOS", "PIXEL", "LASER", "ROBOS"] } })!;
    await migrarParaConta("u1", save, AGORA);
    expect(dados.gravarPartida).toHaveBeenCalledWith("u1", "p18", "2026-11-18", expect.objectContaining({ solved: false, finalizada: true }));
  });

  it("save vazio não grava nada", async () => {
    expect(await migrarParaConta("u1", { versao: 1, dias: {} }, AGORA)).toBe(0);
    expect(dados.gravarPartida).not.toHaveBeenCalled();
    expect(dados.recalcularSequencia).not.toHaveBeenCalled();
  });
});
