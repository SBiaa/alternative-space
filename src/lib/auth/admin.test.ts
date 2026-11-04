import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  getUser: vi.fn(),
  sql: vi.fn(),
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }),
  notFound: vi.fn(() => {
    throw new Error("NOT_FOUND");
  }),
}));

vi.mock("@/lib/auth/server", () => ({ getUser: m.getUser }));
vi.mock("@/lib/db", () => ({ sql: m.sql }));
vi.mock("next/navigation", () => ({ redirect: m.redirect, notFound: m.notFound }));

import { assertAdmin, getAdmin, isAdminRole, requireAdmin } from "./admin";

const linha = (extra: Record<string, unknown>) => [{ id: "u1", name: "Bia", email: "bia@a.co", role: "user", banned: false, ...extra }];

beforeEach(() => {
  vi.clearAllMocks();
});

describe("isAdminRole", () => {
  it("reconhece admin sozinho ou junto com outros papéis", () => {
    expect(isAdminRole("admin")).toBe(true);
    expect(isAdminRole("user, admin")).toBe(true);
  });
  it("recusa o resto", () => {
    expect(isAdminRole("user")).toBe(false);
    expect(isAdminRole("administrador")).toBe(false);
    expect(isAdminRole(undefined)).toBe(false);
    expect(isAdminRole(["admin"])).toBe(false);
  });
});

describe("getAdmin", () => {
  it("sem login, não consulta o banco", async () => {
    m.getUser.mockResolvedValue(null);
    expect(await getAdmin()).toBeNull();
    expect(m.sql).not.toHaveBeenCalled();
  });

  it("confia no banco, não no papel que veio na sessão", async () => {
    m.getUser.mockResolvedValue({ id: "u1", role: "admin" });
    m.sql.mockResolvedValue(linha({ role: "user" }));
    expect(await getAdmin()).toBeNull();
  });

  it("admin banido perde o acesso", async () => {
    m.getUser.mockResolvedValue({ id: "u1" });
    m.sql.mockResolvedValue(linha({ role: "admin", banned: true }));
    expect(await getAdmin()).toBeNull();
  });

  it("devolve só id, nome e e-mail de quem é admin", async () => {
    m.getUser.mockResolvedValue({ id: "u1" });
    m.sql.mockResolvedValue(linha({ role: "admin" }));
    expect(await getAdmin()).toEqual({ id: "u1", name: "Bia", email: "bia@a.co" });
  });
});

describe("requireAdmin", () => {
  it("manda quem não entrou pro login e volta pro painel", async () => {
    m.getUser.mockResolvedValue(null);
    await expect(requireAdmin()).rejects.toThrow("REDIRECT:/entrar?next=%2Fadmin");
  });

  it("tripulante comum vê 404", async () => {
    m.getUser.mockResolvedValue({ id: "u1" });
    m.sql.mockResolvedValue(linha({}));
    await expect(requireAdmin()).rejects.toThrow("NOT_FOUND");
  });
});

describe("assertAdmin", () => {
  it("lança erro pra quem não é admin", async () => {
    m.getUser.mockResolvedValue({ id: "u1" });
    m.sql.mockResolvedValue(linha({}));
    await expect(assertAdmin()).rejects.toThrow("Acesso negado");
  });
});
