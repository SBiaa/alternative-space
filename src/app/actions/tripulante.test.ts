import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  // Cookies em memória, pra testar o pedido que espera o código do e-mail.
  jar: new Map<string, string>(),
  setCookie: vi.fn(),
  sendOtp: vi.fn(),
  verifyEmail: vi.fn(),
  signUp: vi.fn(),
  signIn: vi.fn(),
  signOut: vi.fn(),
  getUser: vi.fn(),
  saveResult: vi.fn(),
  refresh: vi.fn(),
  // No Next, redirect() interrompe a execução lançando um erro. Imitamos isso.
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }),
}));

vi.mock("@/lib/auth/server", () => ({
  auth: {
    signUp: { email: m.signUp },
    signIn: { email: m.signIn },
    signOut: m.signOut,
    emailOtp: { sendVerificationOtp: m.sendOtp, verifyEmail: m.verifyEmail },
  },
  getUser: m.getUser,
}));
vi.mock("@/lib/tripulante", async (orig) => ({ ...(await orig<typeof import("@/lib/tripulante")>()), saveResult: m.saveResult }));
vi.mock("@/lib/db", () => ({ sql: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: m.redirect }));
vi.mock("next/cache", () => ({ refresh: m.refresh }));
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (k: string) => (m.jar.has(k) ? { value: m.jar.get(k)! } : undefined),
    set: (k: string, v: string, opts: object) => {
      m.setCookie(k, v, opts);
      m.jar.set(k, v);
    },
    delete: (k: string) => m.jar.delete(k),
  }),
}));

import { cadastrar, entrar, reenviarCodigo, salvarDaPagina, salvarResultado, sair, verificar } from "./tripulante";
import { PENDENTE } from "@/lib/tripulante";

const form = (fields: Record<string, string>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(fields)) f.set(k, v);
  return f;
};

const user = { id: "user-1" };
const pendente = JSON.stringify({ email: "fulana@b.co", next: "/quiz/tripulacao/palha", salvar: "tripulacao/palha" });

beforeEach(() => {
  vi.clearAllMocks();
  m.jar.clear();
  m.sendOtp.mockResolvedValue({});
});

describe("cadastrar", () => {
  const valid = { name: "Fulana", email: "fulana@b.co", password: "12345678" };

  it("pede o nome", async () => {
    expect(await cadastrar(null, form({ ...valid, name: "  " }))).toMatchObject({ error: "Como a gente te chama?" });
    expect(m.signUp).not.toHaveBeenCalled();
  });

  it("pede senha com 8 caracteres e mantém o que foi digitado", async () => {
    expect(await cadastrar(null, form({ ...valid, password: "1234567" }))).toEqual({
      name: "Fulana",
      email: "fulana@b.co",
      error: "A senha precisa de pelo menos 8 caracteres.",
    });
  });

  it.each([
    ["User already exists", "Esse e-mail já tem cadastro. Tenta entrar."],
    ["Invalid email", "Confere o e-mail."],
    ["Password too short", "A senha precisa de pelo menos 8 caracteres."],
    ["Algo estranho", "Não deu certo agora. Tenta de novo em instantes."],
  ])("traduz o erro %j", async (message, error) => {
    m.signUp.mockResolvedValue({ data: null, error: { message } });
    expect(await cadastrar(null, form(valid))).toMatchObject({ error });
  });

  it("sem verificação de e-mail: cria a conta, salva o resultado pendente e redireciona", async () => {
    m.signUp.mockResolvedValue({ data: { token: "t", user }, error: null });
    await expect(cadastrar(null, form({ ...valid, salvar: "tripulacao/palha", next: "/quiz/tripulacao/palha" }))).rejects.toThrow(
      "REDIRECT:/quiz/tripulacao/palha",
    );
    expect(m.signUp).toHaveBeenCalledWith({ name: "Fulana", email: "fulana@b.co", password: "12345678" });
    expect(m.saveResult).toHaveBeenCalledWith("user-1", "tripulacao", "palha");
  });

  it("não redireciona pra fora do site", async () => {
    m.signUp.mockResolvedValue({ data: { token: "t", user }, error: null });
    await expect(cadastrar(null, form({ ...valid, next: "https://golpe.com" }))).rejects.toThrow("REDIRECT:/conta");
    expect(m.saveResult).not.toHaveBeenCalled();
  });

  it("com verificação de e-mail: guarda o pedido num cookie protegido e vai pra tela do código", async () => {
    m.signUp.mockResolvedValue({ data: { token: null, user }, error: null });
    await expect(
      cadastrar(null, form({ ...valid, email: "Fulana@B.co", salvar: "tripulacao/palha", next: "/quiz/tripulacao/palha" })),
    ).rejects.toThrow("REDIRECT:/cadastro/verificar");
    expect(JSON.parse(m.jar.get(PENDENTE)!)).toEqual(JSON.parse(pendente));
    expect(m.setCookie.mock.calls[0][2]).toMatchObject({ httpOnly: true, sameSite: "lax" });
    // Só salva depois de confirmar: com e-mail repetido o Neon devolve um usuário que não existe.
    expect(m.saveResult).not.toHaveBeenCalled();
  });
});

describe("entrar", () => {
  it("avisa quando a senha não bate", async () => {
    m.signIn.mockResolvedValue({ data: null, error: { message: "Invalid email or password" } });
    expect(await entrar(null, form({ email: "a@b.co", password: "x" }))).toEqual({ email: "a@b.co", error: "E-mail ou senha não batem." });
    expect(m.sendOtp).not.toHaveBeenCalled();
  });

  it("entra e vai pra conta", async () => {
    m.signIn.mockResolvedValue({ data: { user }, error: null });
    await expect(entrar(null, form({ email: " a@b.co ", password: "senha-boa" }))).rejects.toThrow("REDIRECT:/conta");
    expect(m.signIn).toHaveBeenCalledWith({ email: "a@b.co", password: "senha-boa" });
  });

  it("e-mail não confirmado manda código novo e vai pra tela do código", async () => {
    m.signIn.mockResolvedValue({ data: null, error: { code: "EMAIL_NOT_VERIFIED", message: "Email not verified" } });
    await expect(entrar(null, form({ email: "fulana@b.co", password: "12345678" }))).rejects.toThrow("REDIRECT:/cadastro/verificar");
    expect(m.sendOtp).toHaveBeenCalledWith({ email: "fulana@b.co", type: "email-verification" });
  });
});

describe("verificar", () => {
  it("sem pedido no cookie, pede pra recomeçar", async () => {
    expect(await verificar(null, form({ codigo: "123456" }))).toMatchObject({ error: expect.stringContaining("expirou") });
    expect(m.verifyEmail).not.toHaveBeenCalled();
  });

  it("recusa código que não tem 6 números", async () => {
    m.jar.set(PENDENTE, pendente);
    expect(await verificar(null, form({ codigo: "12a" }))).toMatchObject({ error: "O código tem 6 números." });
    expect(m.verifyEmail).not.toHaveBeenCalled();
  });

  it.each([
    ["INVALID_OTP", "Invalid OTP", "Código errado. Confere no seu e-mail."],
    ["OTP_EXPIRED", "OTP expired", "Esse código expirou. Pede um novo aqui embaixo."],
    ["TOO_MANY_ATTEMPTS", "Too many attempts", "Muitas tentativas. Pede um código novo aqui embaixo."],
  ])("traduz o erro %s e mantém o pedido", async (code, message, error) => {
    m.jar.set(PENDENTE, pendente);
    m.verifyEmail.mockResolvedValue({ data: null, error: { code, message } });
    expect(await verificar(null, form({ codigo: "123456" }))).toMatchObject({ error });
    expect(m.jar.has(PENDENTE)).toBe(true);
  });

  it("código certo apaga o pedido, salva o resultado e entra", async () => {
    m.jar.set(PENDENTE, pendente);
    m.verifyEmail.mockResolvedValue({ data: { token: "t", user }, error: null });
    await expect(verificar(null, form({ codigo: "123 456" }))).rejects.toThrow("REDIRECT:/quiz/tripulacao/palha");
    expect(m.verifyEmail).toHaveBeenCalledWith({ email: "fulana@b.co", otp: "123456" });
    expect(m.jar.has(PENDENTE)).toBe(false);
    expect(m.saveResult).toHaveBeenCalledWith("user-1", "tripulacao", "palha");
  });

  it("se o Neon não entrar sozinho depois de confirmar, manda pro login", async () => {
    m.jar.set(PENDENTE, pendente);
    m.verifyEmail.mockResolvedValue({ data: { token: null, user }, error: null });
    await expect(verificar(null, form({ codigo: "123456" }))).rejects.toThrow("REDIRECT:/entrar?next=%2Fquiz%2Ftripulacao%2Fpalha");
  });
});

describe("reenviarCodigo", () => {
  it("manda pro e-mail guardado no cookie", async () => {
    m.jar.set(PENDENTE, pendente);
    expect(await reenviarCodigo()).toMatchObject({ ok: expect.any(String) });
    expect(m.sendOtp).toHaveBeenCalledWith({ email: "fulana@b.co", type: "email-verification" });
  });

  it("limite de envio vira aviso amigável", async () => {
    m.jar.set(PENDENTE, pendente);
    m.sendOtp.mockResolvedValue({ error: { status: 429 } });
    expect(await reenviarCodigo()).toMatchObject({ error: expect.stringContaining("minutinho") });
  });
});

describe("sair", () => {
  it("sai e volta pra home", async () => {
    await expect(sair()).rejects.toThrow("REDIRECT:/");
    expect(m.signOut).toHaveBeenCalled();
  });
});

describe("salvarResultado", () => {
  it("sem login não faz nada", async () => {
    m.getUser.mockResolvedValue(null);
    expect(await salvarResultado("tripulacao", "palha")).toBe(false);
    expect(m.saveResult).not.toHaveBeenCalled();
  });

  it("com login salva", async () => {
    m.getUser.mockResolvedValue(user);
    m.saveResult.mockResolvedValue(true);
    expect(await salvarResultado("tripulacao", "palha")).toBe(true);
    expect(m.saveResult).toHaveBeenCalledWith("user-1", "tripulacao", "palha");
  });
});

describe("salvarDaPagina", () => {
  it("sem login manda pro cadastro levando o resultado", async () => {
    m.getUser.mockResolvedValue(null);
    await expect(salvarDaPagina(form({ salvar: "tripulacao/palha" }))).rejects.toThrow(
      "REDIRECT:/cadastro?salvar=tripulacao/palha&next=/quiz/tripulacao/palha",
    );
  });

  it("com login salva e atualiza a página", async () => {
    m.getUser.mockResolvedValue(user);
    await salvarDaPagina(form({ salvar: "tripulacao/palha" }));
    expect(m.saveResult).toHaveBeenCalledWith("user-1", "tripulacao", "palha");
    expect(m.refresh).toHaveBeenCalled();
  });
});
