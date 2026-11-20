import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  getUser: vi.fn(),
  refresh: vi.fn(),
  getPost: vi.fn(),
  criarPet: vi.fn(),
  abrirBase: vi.fn(),
  darPetisco: vi.fn(),
  equipar: vi.fn(),
  renomear: vi.fn(),
  registrarLeitura: vi.fn(),
  dentroDoLimitePet: vi.fn(),
}));

vi.mock("@/lib/auth/server", () => ({ getUser: m.getUser }));
vi.mock("next/cache", () => ({ refresh: m.refresh }));
vi.mock("@/lib/db", () => ({ sql: vi.fn() }));
vi.mock("@/lib/blog", () => ({ getPost: m.getPost }));
vi.mock("@/lib/bichinho/dados", () => ({
  criarPet: m.criarPet,
  abrirBase: m.abrirBase,
  darPetisco: m.darPetisco,
  equipar: m.equipar,
  renomear: m.renomear,
  registrarLeitura: m.registrarLeitura,
  dentroDoLimitePet: m.dentroDoLimitePet,
}));

import { darPetisco, escolherOvo, registrarLeitura, renomearBichinho, usarAcessorio } from "./bichinho";

beforeEach(() => {
  vi.clearAllMocks();
  m.getUser.mockResolvedValue({ id: "u1" });
  m.dentroDoLimitePet.mockResolvedValue(true);
});

describe("ações do bichinho", () => {
  it("sem login não grava nada", async () => {
    m.getUser.mockResolvedValue(null);
    expect((await darPetisco()).error).toMatch(/sessão/);
    expect((await escolherOvo({ especie: "pulvi" })).error).toMatch(/sessão/);
    expect(m.darPetisco).not.toHaveBeenCalled();
    expect(m.criarPet).not.toHaveBeenCalled();
  });

  it("o dono é sempre o usuário da sessão e o petisco não recebe argumento do cliente", async () => {
    m.darPetisco.mockResolvedValue({ ok: true, pet: {} });
    await darPetisco();
    expect(m.darPetisco).toHaveBeenCalledWith("u1");
  });

  it("segundo petisco no dia vira aviso, sem refresh", async () => {
    m.darPetisco.mockResolvedValue({ ok: false, erro: "jaDeu" });
    const r = await darPetisco();
    expect(r.error).toMatch(/amanhã/);
    expect(m.refresh).not.toHaveBeenCalled();
  });

  it("nenhuma ação aceita barra, XP ou fase vindos do cliente", async () => {
    expect((await renomearBichinho({ nome: "Lua", energy: 100 })).error).toBeTruthy();
    expect((await escolherOvo({ especie: "pulvi", xp: 999, stage: 2 })).error).toBeTruthy();
    expect((await usarAcessorio({ slot: "cabeca", slug: "antena-de-papel", stats: { energy: 100 } })).error).toBeTruthy();
    expect(m.renomear).not.toHaveBeenCalled();
    expect(m.criarPet).not.toHaveBeenCalled();
    expect(m.equipar).not.toHaveBeenCalled();
  });

  it("acessório não liberado é recusado", async () => {
    m.equipar.mockResolvedValue("bloqueado");
    expect((await usarAcessorio({ slot: "cabeca", slug: "antena-de-papel" })).error).toMatch(/liberado/);
  });

  it("escolher o ovo cria o bichinho do usuário logado; quem já tem não cria outro", async () => {
    m.criarPet.mockResolvedValueOnce(true).mockResolvedValueOnce(false);
    m.abrirBase.mockResolvedValue({ nome: "Pulvi" });
    expect((await escolherOvo({ especie: "pulvi" })).error).toBeUndefined();
    expect(m.criarPet).toHaveBeenCalledWith("u1", "pulvi");
    expect((await escolherOvo({ especie: "lumio" })).error).toMatch(/já tem/);
  });

  it("estourou o limite: recusa antes de tocar no banco", async () => {
    m.dentroDoLimitePet.mockResolvedValue(false);
    expect((await darPetisco()).error).toMatch(/Muitas/);
    expect(m.darPetisco).not.toHaveBeenCalled();
  });

  it("leitura: só post que existe, só logado", async () => {
    m.getPost.mockReturnValue({});
    await registrarLeitura({ slug: "um-post" });
    expect(m.registrarLeitura).toHaveBeenCalledWith("u1", "um-post");
    m.registrarLeitura.mockClear();
    m.getPost.mockReturnValue(null);
    await registrarLeitura({ slug: "nao-existe" });
    m.getPost.mockReturnValue({});
    m.getUser.mockResolvedValue(null);
    await registrarLeitura({ slug: "um-post" });
    expect(m.registrarLeitura).not.toHaveBeenCalled();
  });
});
