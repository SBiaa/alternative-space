import { beforeEach, describe, expect, it, vi } from "vitest";

const sql = vi.hoisted(() => vi.fn());
vi.mock("@/lib/db", () => ({ sql }));

import { latestResultFor, lerPendente, mascararEmail, safeNext, saveResult } from "./tripulante";

beforeEach(() => {
  sql.mockReset().mockResolvedValue([]);
});

describe("safeNext", () => {
  it.each(["/conta", "/quiz/tripulacao/palha", "/colecoes?x=1"])("aceita caminho interno %s", (v) => {
    expect(safeNext(v)).toBe(v);
  });

  it.each([
    ["https://golpe.com", "URL externa"],
    ["//golpe.com", "URL sem protocolo"],
    ["/\\golpe.com", "barra invertida"],
    ["conta", "sem barra"],
    ["", "vazio"],
    [null, "null"],
    [undefined, "undefined"],
  ])("manda pra /conta quando recebe %j (%s)", (...[v]) => {
    expect(safeNext(v)).toBe("/conta");
  });
});

describe("saveResult", () => {
  it("grava um resultado válido", async () => {
    expect(await saveResult("user-1", "tripulacao", "palha")).toBe(true);
    expect(sql).toHaveBeenCalledOnce();
    const values = sql.mock.calls[0].slice(1);
    expect(values).toContain("user-1");
    expect(values).toContain("tripulacao");
    expect(values).toContain("palha");
  });

  it.each([
    ["tripulacao", "nao-existe"],
    ["quiz-que-nao-existe", "palha"],
    ["tripulacao", "toString"],
  ])("não grava %s/%s", async (quiz, result) => {
    expect(await saveResult("user-1", quiz, result)).toBe(false);
    expect(sql).not.toHaveBeenCalled();
  });
});

describe("latestResultFor", () => {
  it("devolve o resultado mais recente", async () => {
    sql.mockResolvedValue([{ result: "palha" }]);
    expect(await latestResultFor("user-1", "tripulacao")).toBe("palha");
  });

  it("devolve null quando não tem nada salvo", async () => {
    expect(await latestResultFor("user-1", "tripulacao")).toBeNull();
  });
});

describe("lerPendente", () => {
  it("lê o cookie de quem espera o código", () => {
    const v = JSON.stringify({ email: "bia@a.co", next: "/quiz/x/y", salvar: "x/y" });
    expect(lerPendente(v)).toEqual({ email: "bia@a.co", next: "/quiz/x/y", salvar: "x/y" });
  });

  it("não deixa o cookie mandar pra fora do site", () => {
    const v = JSON.stringify({ email: "bia@a.co", next: "https://golpe.com" });
    expect(lerPendente(v)?.next).toBe("/conta");
  });

  it.each([undefined, "", "lixo", "{}", JSON.stringify({ email: 1 })])("ignora valor inválido %j", (v) => {
    expect(lerPendente(v)).toBeNull();
  });
});

describe("mascararEmail", () => {
  it("esconde o nome e mostra o domínio", () => {
    expect(mascararEmail("bianca@gmail.com")).toBe("b*****@gmail.com");
    expect(mascararEmail("b@a.co")).toBe("b**@a.co");
  });
});
