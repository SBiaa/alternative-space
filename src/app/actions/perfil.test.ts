import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  getUser: vi.fn(),
  updateUser: vi.fn(),
  changePassword: vi.fn(),
  deleteUser: vi.fn(),
  salvarPerfil: vi.fn(),
  apagarDados: vi.fn(),
  latestResults: vi.fn(),
  refresh: vi.fn(),
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }),
}));

vi.mock("@/lib/auth/server", () => ({
  auth: { updateUser: m.updateUser, changePassword: m.changePassword, deleteUser: m.deleteUser },
  getUser: m.getUser,
}));
vi.mock("@/lib/perfil", async (orig) => ({
  ...(await orig<typeof import("@/lib/perfil")>()),
  salvarPerfil: m.salvarPerfil,
  apagarDados: m.apagarDados,
}));
vi.mock("@/lib/tripulante", () => ({ latestResults: m.latestResults }));
vi.mock("@/lib/db", () => ({ sql: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: m.redirect }));
vi.mock("next/cache", () => ({ refresh: m.refresh }));

import { apagarConta, atualizarPerfil, trocarSenha, usarPirata } from "./perfil";

const form = (fields: Record<string, string>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(fields)) f.set(k, v);
  return f;
};
const perfil = (extra: Record<string, string> = {}) => form({ name: "Bia", apelido: "@Bia_01", cor: "laranja", avatar: "", ...extra });

beforeEach(() => {
  vi.clearAllMocks();
  m.getUser.mockResolvedValue({ id: "user-1", name: "Bia" });
  m.updateUser.mockResolvedValue({});
  m.changePassword.mockResolvedValue({});
  m.deleteUser.mockResolvedValue({});
  m.salvarPerfil.mockResolvedValue(true);
  m.latestResults.mockResolvedValue([{ quiz: "era-da-internet", result: "orkut", created_at: "2026-01-01" }]);
});

describe("atualizarPerfil", () => {
  it("salva nome, apelido normalizado, cor e avatar", async () => {
    const res = await atualizarPerfil(null, perfil({ avatar: "/quiz/era-da-internet/orkut.webp" }));
    expect(res).toEqual({ ok: "Perfil salvo." });
    expect(m.salvarPerfil).toHaveBeenCalledWith("user-1", { apelido: "bia_01", cor: "laranja" });
    expect(m.updateUser).toHaveBeenCalledWith({ name: "Bia", image: "/quiz/era-da-internet/orkut.webp" });
    expect(m.refresh).toHaveBeenCalled();
  });

  it("sem login manda pro entrar", async () => {
    m.getUser.mockResolvedValue(null);
    await expect(atualizarPerfil(null, perfil())).rejects.toThrow("REDIRECT:/entrar?next=/conta/editar");
  });

  it("recusa avatar não desbloqueado", async () => {
    const res = await atualizarPerfil(null, perfil({ avatar: "/quiz/era-da-internet/msn.webp" }));
    expect(res?.error).toMatch(/desbloqueado/);
    expect(m.updateUser).not.toHaveBeenCalled();
  });

  it("avisa quando o apelido já tem dono", async () => {
    m.salvarPerfil.mockResolvedValue(false);
    const res = await atualizarPerfil(null, perfil());
    expect(res?.error).toBe("@bia_01 já é de outro tripulante.");
    expect(m.updateUser).not.toHaveBeenCalled();
  });

  it("valida nome, apelido e cor", async () => {
    expect((await atualizarPerfil(null, perfil({ name: " " })))?.error).toBeTruthy();
    expect((await atualizarPerfil(null, perfil({ apelido: "a b" })))?.error).toBeTruthy();
    expect((await atualizarPerfil(null, perfil({ cor: "rosa" })))?.error).toBeTruthy();
    expect(m.salvarPerfil).not.toHaveBeenCalled();
  });

  it("apelido vazio vira null", async () => {
    await atualizarPerfil(null, perfil({ apelido: "" }));
    expect(m.salvarPerfil).toHaveBeenCalledWith("user-1", { apelido: null, cor: "laranja" });
  });
});

describe("trocarSenha", () => {
  it("troca e desconecta outros aparelhos", async () => {
    const res = await trocarSenha(null, form({ atual: "velha1234", nova: "nova12345" }));
    expect(res?.ok).toBeTruthy();
    expect(m.changePassword).toHaveBeenCalledWith({ currentPassword: "velha1234", newPassword: "nova12345", revokeOtherSessions: true });
  });

  it("senha atual errada", async () => {
    m.changePassword.mockResolvedValue({ error: { code: "INVALID_PASSWORD", message: "Invalid password" } });
    expect((await trocarSenha(null, form({ atual: "x", nova: "nova12345" })))?.error).toBe("A senha atual não bate.");
  });

  it("senha nova curta", async () => {
    expect((await trocarSenha(null, form({ atual: "x", nova: "curta" })))?.error).toMatch(/8 caracteres/);
    expect(m.changePassword).not.toHaveBeenCalled();
  });
});

describe("apagarConta", () => {
  it("pede a palavra de confirmação", async () => {
    expect((await apagarConta(null, form({ senha: "s", confirma: "sim" })))?.error).toMatch(/APAGAR/);
    expect(m.deleteUser).not.toHaveBeenCalled();
  });

  it("senha errada não apaga nada", async () => {
    m.deleteUser.mockResolvedValue({ error: { message: "Invalid password" } });
    expect((await apagarConta(null, form({ senha: "s", confirma: "apagar" })))?.error).toBe("A senha não bate.");
    expect(m.apagarDados).not.toHaveBeenCalled();
  });

  it("apaga a conta, depois os dados, e volta pra home", async () => {
    await expect(apagarConta(null, form({ senha: "s", confirma: "APAGAR" }))).rejects.toThrow("REDIRECT:/?conta=apagada");
    expect(m.deleteUser).toHaveBeenCalledWith({ password: "s" });
    expect(m.apagarDados).toHaveBeenCalledWith("user-1");
  });
});

describe("usarPirata", () => {
  it("salva o código como imagem da conta", async () => {
    expect(await usarPirata("pirata:1-2-3-4-0-1-2")).toEqual({ ok: "Pronto! Seu pirata já é o avatar do perfil." });
    expect(m.updateUser).toHaveBeenCalledWith({ image: "pirata:1-2-3-4-0-1-2" });
    expect(m.refresh).toHaveBeenCalled();
  });

  it("recusa código inválido sem tocar na conta", async () => {
    expect((await usarPirata("https://site-qualquer.com/x.png"))?.error).toBeTruthy();
    expect(m.updateUser).not.toHaveBeenCalled();
  });

  it("sem login não salva", async () => {
    m.getUser.mockResolvedValue(null);
    expect((await usarPirata("pirata:1-2-3-4-0-1-2"))?.error).toMatch(/Entra/);
    expect(m.updateUser).not.toHaveBeenCalled();
  });

  it("o formulário do perfil aceita o pirata como avatar", async () => {
    const res = await atualizarPerfil(null, perfil({ avatar: "pirata:0-0-0-0-0-0-0" }));
    expect(res).toEqual({ ok: "Perfil salvo." });
    expect(m.updateUser).toHaveBeenCalledWith({ name: "Bia", image: "pirata:0-0-0-0-0-0-0" });
  });
});
