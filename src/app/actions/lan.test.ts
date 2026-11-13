import { beforeEach, describe, expect, it, vi } from "vitest";
import { CATALOGO_PADRAO } from "@/lib/lan/contexto";
import { TEXTOS_ERRO } from "@/lib/lan/conteudo";
import { novaLan } from "@/lib/lan/economia";

const user = { id: "u1" };
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
vi.mock("@/lib/auth/server", () => ({ getUser: vi.fn(async () => user) }));
vi.mock("@/lib/limite", () => ({ dentroDoLimite: vi.fn(async () => true) }));
vi.mock("@/lib/lan/dados", () => ({
  lerCatalogo: vi.fn(async () => CATALOGO_PADRAO),
  lerLan: vi.fn(),
  gravarLanInteira: vi.fn(async () => undefined),
  apagarLan: vi.fn(),
  comprarMelhoriaDb: vi.fn(async () => 10),
  contratarDb: vi.fn(),
  melhorarFuncionarioDb: vi.fn(),
  salvarLayoutDb: vi.fn(),
  gravarDiaDb: vi.fn(async () => true),
}));

const dados = await import("@/lib/lan/dados");
const { dentroDoLimite } = await import("@/lib/limite");
const { comprarMelhoriaConta, fecharDiaConta, migrarSaveLocal } = await import("./lan");

const lan = (extra = {}) => ({ ...novaLan("s", CATALOGO_PADRAO), ...extra });

beforeEach(() => vi.clearAllMocks());

describe("migrarSaveLocal", () => {
  it("leva o save do aparelho pra conta quando ele está mais avançado", async () => {
    vi.mocked(dados.lerLan).mockResolvedValue({ id: "l1", prog: lan({ dia: 1 }) });
    const local = lan({ dia: 4 });
    const r = await migrarSaveLocal(JSON.parse(JSON.stringify(local)));
    expect(r).toEqual({ ok: true, prog: local });
    expect(dados.gravarLanInteira).toHaveBeenCalledWith("u1", local, CATALOGO_PADRAO);
  });
  it("mantém a conta quando ela está mais avançada", async () => {
    const remoto = lan({ dia: 9 });
    vi.mocked(dados.lerLan).mockResolvedValue({ id: "l1", prog: remoto });
    expect(await migrarSaveLocal(lan({ dia: 2 }))).toEqual({ ok: true, prog: remoto });
    expect(dados.gravarLanInteira).not.toHaveBeenCalled();
  });
  it("recusa save local quebrado ou incoerente", async () => {
    vi.mocked(dados.lerLan).mockResolvedValue(null);
    expect((await migrarSaveLocal({ lixo: true })).prog).toBeNull();
    expect((await migrarSaveLocal(lan({ dia: 1, dinheiro: 99_000_000 }))).ok).toBe(false);
    expect(dados.gravarLanInteira).not.toHaveBeenCalled();
  });
});

describe("comprarMelhoriaConta", () => {
  it("usa o preço e o saldo do servidor", async () => {
    vi.mocked(dados.lerLan).mockResolvedValue({ id: "l1", prog: lan({ dinheiro: 30 }) });
    expect(await comprarMelhoriaConta("nobreak")).toEqual({ ok: false, erro: TEXTOS_ERRO.saldo });
    expect(dados.comprarMelhoriaDb).not.toHaveBeenCalled();
  });
});

describe("fecharDiaConta", () => {
  it("respeita o limite de gravações", async () => {
    vi.mocked(dados.lerLan).mockResolvedValue({ id: "l1", prog: lan() });
    vi.mocked(dentroDoLimite).mockResolvedValueOnce(false);
    const r = await fecharDiaConta({} as never);
    expect(r).toEqual({ ok: false, erro: TEXTOS_ERRO.limite });
    expect(dados.gravarDiaDb).not.toHaveBeenCalled();
  });
  it("não grava um dia que não confere", async () => {
    vi.mocked(dados.lerLan).mockResolvedValue({ id: "l1", prog: lan() });
    const r = await fecharDiaConta({ dia: 5 } as never);
    expect(r).toEqual({ ok: false, erro: TEXTOS_ERRO.invalido });
  });
});
