import { beforeEach, describe, expect, it, vi } from "vitest";
import { TEXTOS } from "@/lib/role/config";
import { EXEMPLOS } from "@/lib/role/exemplos";
import { hashDaPista, pontuacaoFinal, type Corrida } from "@/lib/role/pontuacao";

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
vi.mock("@/lib/auth/server", () => ({ getUser: vi.fn(async () => ({ id: "dono" })) }));
vi.mock("@/lib/auth/admin", () => ({ assertAdmin: vi.fn(async () => { throw new Error("Acesso negado"); }) }));
vi.mock("@/lib/limite", () => ({ dentroDoLimite: vi.fn(async () => true) }));
vi.mock("@/lib/role/dados", () => ({
  acharPorId: vi.fn(),
  acharPorSlug: vi.fn(),
  contarRascunhos: vi.fn(async () => 0),
  criarRascunho: vi.fn(async () => "novo"),
  atualizarRascunho: vi.fn(async () => true),
  corridaPorId: vi.fn(),
  publicar: vi.fn(async () => true),
  registrarVerificacao: vi.fn(async () => "run1"),
  registrarCorrida: vi.fn(async () => ({ recorde: true, top1: true })),
  somarJogada: vi.fn(async () => {}),
  duplicar: vi.fn(async () => "copia"),
  apagarPico: vi.fn(async () => true),
  denunciar: vi.fn(async () => true),
  moderar: vi.fn(async () => true),
}));

const dados = await import("@/lib/role/dados");
const { getUser } = await import("@/lib/auth/server");
const { dentroDoLimite } = await import("@/lib/limite");
const acoes = await import("./role");

const pista = EXEMPLOS[0].pista;
const ID = "11111111-1111-1111-1111-111111111111";
const pico = (o: Partial<Awaited<ReturnType<typeof dados.acharPorId>>> = {}) =>
  ({ id: ID, userId: "dono", slug: null, title: "", description: "", layout: pista, layoutHash: hashDaPista(pista), status: "draft", verifiedRunId: null, playsCount: 0, createdAt: "", updatedAt: "", publishedAt: null, criador: "", apelido: null, ...o }) as NonNullable<Awaited<ReturnType<typeof dados.acharPorId>>>;

const corrida = (o: Partial<Corrida> = {}): Corrida => {
  const durationMs = 20_000;
  return { durationMs, trickPoints: 300, finished: true, score: pontuacaoFinal(300, pista.timeLimit, durationMs, true), tricks: { ollie: 2 }, maxCombo: 2, inputs: [{ t: 10, a: "k:up" }], ...o };
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getUser).mockResolvedValue({ id: "dono" } as never);
});

describe("rascunho", () => {
  it("só o dono edita, e pico publicado não muda", async () => {
    vi.mocked(dados.acharPorId).mockResolvedValue(pico({ userId: "outra" }));
    expect(await acoes.salvarRascunho(ID, pista)).toMatchObject({ ok: false, erro: TEXTOS.erros.naoEDono });
    vi.mocked(dados.acharPorId).mockResolvedValue(pico({ status: "published" }));
    expect(await acoes.salvarRascunho(ID, pista)).toMatchObject({ ok: false, erro: TEXTOS.erros.travado });
    expect(dados.atualizarRascunho).not.toHaveBeenCalled();
  });

  it("sem conta não salva no servidor", async () => {
    vi.mocked(getUser).mockResolvedValue(null);
    expect(await acoes.salvarRascunho(null, pista)).toMatchObject({ ok: false, semConta: true });
  });

  it("recusa pista com peça fora da grade", async () => {
    const r = await acoes.salvarRascunho(null, { ...pista, pieces: [{ type: "box", x: 999, y: 0, flip: false }] });
    expect(r.ok).toBe(false);
    expect(dados.criarRascunho).not.toHaveBeenCalled();
  });
});

describe("publicar só depois de terminar", () => {
  it("recusa sem corrida de verificação", async () => {
    vi.mocked(dados.acharPorId).mockResolvedValue(pico());
    expect(await acoes.publicarPico(ID, "Praça do Poste", "")).toMatchObject({ ok: false, erro: TEXTOS.erros.naoTerminou });
    expect(dados.publicar).not.toHaveBeenCalled();
  });

  it("recusa corrida de outra versão da pista", async () => {
    vi.mocked(dados.acharPorId).mockResolvedValue(pico({ verifiedRunId: "run1" }));
    vi.mocked(dados.corridaPorId).mockResolvedValue({ userId: "dono", parkId: ID, finished: true, layoutHash: "outra" });
    expect(await acoes.publicarPico(ID, "Praça do Poste", "")).toMatchObject({ ok: false });
  });

  it("publica com corrida terminada nesta versão e gera slug", async () => {
    vi.mocked(dados.acharPorId).mockResolvedValue(pico({ verifiedRunId: "run1" }));
    vi.mocked(dados.corridaPorId).mockResolvedValue({ userId: "dono", parkId: ID, finished: true, layoutHash: hashDaPista(pista) });
    const r = await acoes.publicarPico(ID, "Praça do Poste", "Reta tranquila");
    expect(r).toMatchObject({ ok: true });
    expect(r.ok && r.slug).toMatch(/^praca-do-poste-[0-9a-f]{6}$/);
  });

  it("filtra palavra no nome", async () => {
    vi.mocked(dados.acharPorId).mockResolvedValue(pico({ verifiedRunId: "run1" }));
    expect(await acoes.publicarPico(ID, "Pico do caralho", "")).toMatchObject({ ok: false, erro: TEXTOS.erros.palavra });
  });

  it("verificação exige a mesma pista salva no servidor", async () => {
    vi.mocked(dados.acharPorId).mockResolvedValue(pico());
    expect(await acoes.verificarRascunho(ID, { ...pista, timeLimit: pista.timeLimit + 1 }, corrida())).toMatchObject({ ok: false });
    expect(await acoes.verificarRascunho(ID, pista, corrida())).toEqual({ ok: true });
    expect(dados.registrarVerificacao).toHaveBeenCalledOnce();
  });
});

describe("salvarCorrida", () => {
  it("sem conta só conta a jogada e pede cadastro", async () => {
    vi.mocked(getUser).mockResolvedValue(null);
    vi.mocked(dados.acharPorSlug).mockResolvedValue(pico({ status: "published", slug: "p" }));
    expect(await acoes.salvarCorrida("p", corrida())).toMatchObject({ ok: false, semConta: true });
    expect(dados.somarJogada).toHaveBeenCalledOnce();
    expect(dados.registrarCorrida).not.toHaveBeenCalled();
  });

  it("recusa pontuação acima do teto", async () => {
    vi.mocked(dados.acharPorSlug).mockResolvedValue(pico({ status: "published", slug: "p" }));
    const c = corrida({ trickPoints: 10_000_000 });
    expect(await acoes.salvarCorrida("p", { ...c, score: pontuacaoFinal(c.trickPoints, pista.timeLimit, c.durationMs, true) })).toMatchObject({ ok: false, erro: TEXTOS.erros.corridaInvalida });
  });

  it("respeita o limite de gravações", async () => {
    vi.mocked(dentroDoLimite).mockResolvedValueOnce(false);
    expect(await acoes.salvarCorrida("p", corrida())).toMatchObject({ ok: false, erro: TEXTOS.erros.muitos });
  });

  it("grava corrida válida; pendente não conta jogada de novo", async () => {
    vi.mocked(dados.acharPorSlug).mockResolvedValue(pico({ status: "published", slug: "p" }));
    expect(await acoes.salvarCorrida("p", corrida(), true)).toEqual({ ok: true, recorde: true });
    expect(vi.mocked(dados.registrarCorrida).mock.calls[0][3]).toBe(false);
  });
});

describe("duplicar e apagar", () => {
  it("só o dono", async () => {
    vi.mocked(dados.acharPorId).mockResolvedValue(pico({ userId: "outra", status: "published" }));
    expect(await acoes.duplicarPico(ID)).toMatchObject({ ok: false });
    expect(await acoes.apagarPico(ID)).toMatchObject({ ok: false });
    expect(dados.apagarPico).not.toHaveBeenCalled();
  });
});

describe("moderação", () => {
  it("só admin esconde ou libera", async () => {
    await expect(acoes.moderarPico(ID, "esconder")).rejects.toThrow();
    expect(dados.moderar).not.toHaveBeenCalled();
    const { assertAdmin } = await import("@/lib/auth/admin");
    vi.mocked(assertAdmin).mockResolvedValueOnce({ id: "a", name: "", email: "" });
    expect(await acoes.moderarPico(ID, "esconder")).toEqual({ ok: true });
  });

  it("denúncia só com motivo da lista e em pico publicado", async () => {
    vi.mocked(dados.acharPorSlug).mockResolvedValue(pico({ status: "published", slug: "p" }));
    expect((await acoes.denunciarPico("p", "qualquer coisa")).ok).toBe(false);
    expect(await acoes.denunciarPico("p", TEXTOS.denuncia.motivos[0])).toEqual({ ok: true });
    vi.mocked(dados.denunciar).mockResolvedValueOnce(false);
    expect(await acoes.denunciarPico("p", TEXTOS.denuncia.motivos[0])).toMatchObject({ ok: false, erro: TEXTOS.denuncia.jaEnviada });
  });
});
