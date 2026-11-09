import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  getUser: vi.fn(),
  refresh: vi.fn(),
  criarQuest: vi.fn(),
  mudarStatusQuest: vi.fn(),
  marcarHabito: vi.fn(),
  criarItem: vi.fn(),
}));

vi.mock("@/lib/auth/server", () => ({ getUser: m.getUser }));
vi.mock("next/cache", () => ({ refresh: m.refresh }));
vi.mock("@/lib/db", () => ({ sql: vi.fn() }));
vi.mock("@/lib/diario/dados", () => ({
  criarQuest: m.criarQuest,
  mudarStatusQuest: m.mudarStatusQuest,
  marcarHabito: m.marcarHabito,
  criarItem: m.criarItem,
}));

import { marcarHabito, novaQuest, novoItem, statusQuest } from "./diario";

const ID = "0b9c1d7e-4a2f-4c3e-9b1a-2f3e4d5c6b7a";

beforeEach(() => m.getUser.mockResolvedValue({ id: "u1" }));

describe("ações do diário", () => {
  it("sem login não grava nada", async () => {
    m.getUser.mockResolvedValue(null);
    expect((await novaQuest({ scope: "day", date: "2027-01-04" }, "Treinar"))?.error).toMatch(/sessão/);
    expect(m.criarQuest).not.toHaveBeenCalled();
  });

  it("grava a quest no usuário logado e atualiza a tela", async () => {
    m.criarQuest.mockResolvedValue(ID);
    expect(await novaQuest({ scope: "day", date: "2027-01-04" }, "  Treinar  ")).toEqual({ id: ID });
    expect(m.criarQuest).toHaveBeenCalledWith("u1", { scope: "day", date: "2027-01-04" }, "Treinar");
    expect(m.refresh).toHaveBeenCalled();
  });

  it("recusa datas fora do diário e textos vazios", async () => {
    expect((await novaQuest({ scope: "day", date: "2026-12-31" }, "x"))?.error).toBeTruthy();
    expect((await novaQuest({ scope: "month", year: 2027, month: 13 }, "x"))?.error).toBeTruthy();
    expect((await novaQuest({ scope: "day", date: "2027-01-04" }, "   "))?.error).toBeTruthy();
    expect(m.criarQuest).not.toHaveBeenCalled();
  });

  it("quest de outro usuário não é achada", async () => {
    m.mudarStatusQuest.mockResolvedValue("nao-achou");
    expect((await statusQuest(ID, "done"))?.error).toMatch(/Não achei/);
    expect(m.mudarStatusQuest).toHaveBeenCalledWith("u1", ID, "done");
  });

  it("recusa status e ids inválidos", async () => {
    expect((await statusQuest(ID, "feito"))?.error).toBeTruthy();
    expect((await statusQuest("1; drop table", "done"))?.error).toBeTruthy();
    expect((await marcarHabito(ID, "2027-02-30", true))?.error).toBeTruthy();
  });

  it("item do inventário valida tipo e nota", async () => {
    expect((await novoItem(1, { type: "filme", title: "X", rating: null, status: "quero" }))?.error).toBeTruthy();
    expect((await novoItem(1, { type: "anime", title: "X", rating: 6, status: "quero" }))?.error).toBeTruthy();
    m.criarItem.mockResolvedValue(ID);
    expect(await novoItem(1, { type: "anime", title: "Frieren", rating: 5, status: "fazendo" })).toEqual({ id: ID });
    expect(m.criarItem).toHaveBeenCalledWith("u1", 1, { type: "anime", title: "Frieren", rating: 5, status: "fazendo" });
  });
});
