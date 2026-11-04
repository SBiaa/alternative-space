import { describe, expect, it, vi } from "vitest";
import { emailOk, postJson, text } from "./forms";

describe("emailOk", () => {
  it.each(["a@b.co", "fulana.silva+geek@alternative.space"])("aceita %s", (v) => {
    expect(emailOk(v)).toBe(true);
  });

  it.each([
    ["", "vazio"],
    ["sem-arroba.com", "sem @"],
    ["a@b", "sem domínio"],
    ["a b@c.com", "com espaço"],
    [42, "número"],
    [null, "null"],
  ])("recusa %j (%s)", (...[v]) => {
    expect(emailOk(v)).toBe(false);
  });

  it("recusa e-mail com mais de 254 caracteres", () => {
    expect(emailOk(`${"a".repeat(250)}@b.co`)).toBe(false);
  });
});

describe("text", () => {
  it("tira espaços e corta no limite", () => {
    expect(text("  oi tudo bem  ", 5)).toBe("oi tu");
  });

  it("devolve vazio para o que não é texto", () => {
    expect(text(undefined, 10)).toBe("");
    expect(text({ a: 1 }, 10)).toBe("");
  });
});

describe("postJson", () => {
  const reply = (status: number, body: unknown) =>
    vi.fn().mockResolvedValue(new Response(JSON.stringify(body), { status }));

  it("manda JSON e devolve ok com a mensagem do servidor", async () => {
    const fetch = reply(200, { message: "Pronto!" });
    vi.stubGlobal("fetch", fetch);

    expect(await postJson("/api/x", { email: "a@b.co" })).toEqual({ status: "ok", message: "Pronto!" });
    const [url, init] = fetch.mock.calls[0];
    expect(url).toBe("/api/x");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body)).toEqual({ email: "a@b.co" });
  });

  it("usa a mensagem de erro do servidor", async () => {
    vi.stubGlobal("fetch", reply(400, { message: "Confere o e-mail." }));
    expect(await postJson("/api/x", {})).toEqual({ status: "error", message: "Confere o e-mail." });
  });

  it("tem mensagem padrão quando o erro não vem em JSON", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("boom", { status: 500 })));
    expect(await postJson("/api/x", {})).toEqual({ status: "error", message: "Não rolou. Tenta de novo daqui a pouco." });
  });

  it("avisa quando não tem conexão", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
    expect(await postJson("/api/x", {})).toEqual({ status: "error", message: "Sem conexão. Tenta de novo daqui a pouco." });
  });
});
