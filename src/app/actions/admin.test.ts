import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  assertAdmin: vi.fn(),
  banUser: vi.fn(),
  unbanUser: vi.fn(),
  refresh: vi.fn(),
}));

vi.mock("@/lib/auth/admin", () => ({ assertAdmin: m.assertAdmin }));
vi.mock("@/lib/auth/server", () => ({ auth: { admin: { banUser: m.banUser, unbanUser: m.unbanUser } } }));
vi.mock("next/cache", () => ({ refresh: m.refresh }));

import { banir, desbanir } from "./admin";

const ALVO = "0b6f3a52-1c2d-4e5f-8a9b-0c1d2e3f4a5b";
const EU = "11111111-2222-4333-8444-555555555555";

const form = (fields: Record<string, string>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(fields)) f.set(k, v);
  return f;
};

beforeEach(() => {
  vi.clearAllMocks();
  m.assertAdmin.mockResolvedValue({ id: EU, name: "Bia", email: "bia@a.co" });
  m.banUser.mockResolvedValue({});
  m.unbanUser.mockResolvedValue({});
});

describe("banir", () => {
  it("não faz nada se quem chama não é admin", async () => {
    m.assertAdmin.mockRejectedValue(new Error("Acesso negado"));
    await expect(banir(form({ userId: ALVO }))).rejects.toThrow("Acesso negado");
    expect(m.banUser).not.toHaveBeenCalled();
  });

  it("recusa id que não é de tripulante", async () => {
    await expect(banir(form({ userId: "1 or 1=1" }))).rejects.toThrow("Tripulante inválido");
    expect(m.banUser).not.toHaveBeenCalled();
  });

  it("não deixa banir a própria conta", async () => {
    await expect(banir(form({ userId: EU }))).rejects.toThrow("própria conta");
    expect(m.banUser).not.toHaveBeenCalled();
  });

  it("bane com motivo e atualiza a página", async () => {
    await banir(form({ userId: ALVO, motivo: "  spam  " }));
    expect(m.banUser).toHaveBeenCalledWith({ userId: ALVO, banReason: "spam" });
    expect(m.refresh).toHaveBeenCalled();
  });

  it("avisa quando o Neon Auth recusa", async () => {
    m.banUser.mockResolvedValue({ error: { message: "nope" } });
    await expect(banir(form({ userId: ALVO }))).rejects.toThrow("Não deu pra banir");
  });
});

describe("desbanir", () => {
  it("exige admin", async () => {
    m.assertAdmin.mockRejectedValue(new Error("Acesso negado"));
    await expect(desbanir(form({ userId: ALVO }))).rejects.toThrow("Acesso negado");
    expect(m.unbanUser).not.toHaveBeenCalled();
  });

  it("desbane", async () => {
    await desbanir(form({ userId: ALVO }));
    expect(m.unbanUser).toHaveBeenCalledWith({ userId: ALVO });
  });
});
