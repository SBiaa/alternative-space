import { beforeEach, describe, expect, it, vi } from "vitest";

const sql = vi.hoisted(() => vi.fn());
vi.mock("@/lib/db", () => ({ sql }));

import { latestResultFor, safeNext, saveResult } from "./tripulante";

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
