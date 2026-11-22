import { beforeEach, describe, expect, it, vi } from "vitest";

const sql = vi.hoisted(() => vi.fn());
vi.mock("@/lib/db", () => ({ sql }));

import { darPetisco, tick } from "./dados";

// Texto das consultas feitas, pra conferir o que foi (e o que não foi) ao banco.
const consultas = () => sql.mock.calls.map((c) => (c[0] as string[]).join("?"));

beforeEach(() => sql.mockReset());

describe("petisco no banco", () => {
  it("segundo petisco do dia: a trava do update não devolve linha e nada mais é gravado", async () => {
    sql.mockResolvedValueOnce([{ ok: 1 }]); // tem bichinho
    sql.mockResolvedValueOnce([]); // update condicional: já deu hoje
    const r = await darPetisco("u1");
    expect(r).toEqual({ ok: false, erro: "jaDeu" });
    expect(sql).toHaveBeenCalledTimes(2);
    expect(consultas().some((q) => q.includes("pet_treat"))).toBe(false);
  });

  it("sem bichinho não há petisco", async () => {
    sql.mockResolvedValueOnce([]);
    expect(await darPetisco("u1")).toEqual({ ok: false, erro: "semPet" });
  });
});

describe("cálculo preguiçoso (tick)", () => {
  const linha = { id: "p1", species: "pulvi", name: "Pulvi", stage: 0, stats: { v: 1, energy: 60, curiosity: 60, affection: 60 }, xp: 0, accessories_equipped: {}, tick_txt: "2027-03-10 12:00:00+00", agora_txt: "2027-03-10 12:00:00+00", treat_txt: null };

  it("lê só os eventos do intervalo, grava com a trava de relógio e libera marcos", async () => {
    sql.mockResolvedValueOnce([linha]); // linhaDe
    sql.mockResolvedValueOnce([{ kind: "quiz_completed", created_at: "x" }]); // eventos
    sql.mockResolvedValueOnce([{ id: "p1" }]); // update gravou
    sql.mockResolvedValueOnce([{ quizzes: 1, jogos: 0 }]); // resumo
    sql.mockResolvedValueOnce([{ n: 0 }]); // fichas
    sql.mockResolvedValueOnce([]); // insert unlocks
    sql.mockResolvedValueOnce([{ accessory_slug: "antena-de-papel" }]); // liberados
    const pet = await tick("u1");
    const q = consultas();
    expect(q[1]).toContain("created_at >");
    expect(q[2]).toContain("last_tick_at =");
    expect(pet?.stats.curiosity).toBe(75);
    expect(pet?.liberados).toEqual(["antena-de-papel"]);
  });

  it("se outra aba avançou o relógio antes, não grava de novo", async () => {
    sql.mockResolvedValueOnce([linha]);
    sql.mockResolvedValueOnce([{ kind: "quiz_completed", created_at: "x" }]);
    sql.mockResolvedValueOnce([]); // update não casou
    sql.mockResolvedValueOnce([{ ...linha, stats: { v: 1, energy: 60, curiosity: 75, affection: 60 }, xp: 10 }]); // releitura
    sql.mockResolvedValueOnce([]); // liberados
    const pet = await tick("u1");
    expect(pet?.stats.curiosity).toBe(75);
    expect(consultas().filter((q) => q.includes("update pets")).length).toBe(1);
    expect(consultas().some((q) => q.includes("pet_hatched"))).toBe(false);
  });
});
