import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
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
  auth: { signUp: { email: m.signUp }, signIn: { email: m.signIn }, signOut: m.signOut },
  getUser: m.getUser,
}));
vi.mock("@/lib/tripulante", async (orig) => ({ ...(await orig<typeof import("@/lib/tripulante")>()), saveResult: m.saveResult }));
vi.mock("@/lib/db", () => ({ sql: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: m.redirect }));
vi.mock("next/cache", () => ({ refresh: m.refresh }));

import { cadastrar, entrar, salvarDaPagina, salvarResultado, sair } from "./tripulante";

const form = (fields: Record<string, string>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(fields)) f.set(k, v);
  return f;
};

const user = { id: "user-1" };

beforeEach(() => {
  vi.clearAllMocks();
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

  it("cria a conta, salva o resultado pendente e redireciona", async () => {
    m.signUp.mockResolvedValue({ data: { user }, error: null });
    await expect(cadastrar(null, form({ ...valid, salvar: "tripulacao/palha", next: "/quiz/tripulacao/palha" }))).rejects.toThrow(
      "REDIRECT:/quiz/tripulacao/palha",
    );
    expect(m.signUp).toHaveBeenCalledWith({ name: "Fulana", email: "fulana@b.co", password: "12345678" });
    expect(m.saveResult).toHaveBeenCalledWith("user-1", "tripulacao", "palha");
  });

  it("não redireciona pra fora do site", async () => {
    m.signUp.mockResolvedValue({ data: { user }, error: null });
    await expect(cadastrar(null, form({ ...valid, next: "https://golpe.com" }))).rejects.toThrow("REDIRECT:/conta");
    expect(m.saveResult).not.toHaveBeenCalled();
  });
});

describe("entrar", () => {
  it("avisa quando a senha não bate", async () => {
    m.signIn.mockResolvedValue({ data: null, error: { message: "Invalid email or password" } });
    expect(await entrar(null, form({ email: "a@b.co", password: "x" }))).toEqual({ email: "a@b.co", error: "E-mail ou senha não batem." });
  });

  it("entra e vai pra conta", async () => {
    m.signIn.mockResolvedValue({ data: { user }, error: null });
    await expect(entrar(null, form({ email: " a@b.co ", password: "senha-boa" }))).rejects.toThrow("REDIRECT:/conta");
    expect(m.signIn).toHaveBeenCalledWith({ email: "a@b.co", password: "senha-boa" });
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
