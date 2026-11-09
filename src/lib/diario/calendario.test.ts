import { describe, expect, it } from "vitest";
import {
  diasDoMes,
  fimDoDiario,
  hoje,
  mesDaData,
  mesPorSlug,
  noDiario,
  preMissao,
  semana,
  semanaDaData,
  semanasDoMes,
  totalSemanas,
} from "./calendario";
import { aplicaXP, deltaXP, destinoMovida, mesDoXP } from "./regras";

describe("calendário 2027", () => {
  it("semana 01 vai de 04 a 10/jan", () => {
    const s = semana(1)!;
    expect(s.inicio).toBe("2027-01-04");
    expect(s.fim).toBe("2027-01-10");
    expect(s.dias).toHaveLength(7);
    expect(s.mes).toBe(1);
  });

  it("semana 13 vai de 29/mar a 04/abr e pertence a março", () => {
    const s = semana(13)!;
    expect(s.inicio).toBe("2027-03-29");
    expect(s.fim).toBe("2027-04-04");
    expect(s.mes).toBe(3);
    expect(semanasDoMes(3).map((x) => x.n)).toContain(13);
    expect(semanasDoMes(4).map((x) => x.n)).not.toContain(13);
    expect(mesDaData("2027-04-02")).toBe(3);
  });

  it("pré-missão são 01 a 03/jan", () => {
    expect(preMissao()).toEqual(["2027-01-01", "2027-01-02", "2027-01-03"]);
    expect(semanaDaData("2027-01-03")).toBe(0);
    expect(semanaDaData("2027-01-04")).toBe(1);
    expect(mesDaData("2027-01-02")).toBe(1);
  });

  it("tem 52 semanas, a última termina em 02/jan/2028", () => {
    expect(totalSemanas()).toBe(52);
    expect(semana(53)).toBeNull();
    expect(semana(0)).toBeNull();
    expect(fimDoDiario()).toBe("2028-01-02");
    expect(semanaDaData("2028-01-02")).toBe(52);
    expect(mesDaData("2028-01-01")).toBe(12);
    expect(noDiario("2028-01-03")).toBe(false);
    expect(noDiario("2026-12-31")).toBe(false);
    expect(noDiario("2027-02-30")).toBe(false);
  });

  it("toda semana cobre exatamente os dias entre a pré-missão e o fim", () => {
    const n = semanaDaData("2027-07-15")!;
    expect(semana(n)!.dias).toContain("2027-07-15");
  });

  it("dias do mês e slugs", () => {
    expect(diasDoMes(2)).toHaveLength(28);
    expect(diasDoMes(12).at(-1)).toBe("2027-12-31");
    expect(mesPorSlug("marco")).toBe(3);
    expect(mesPorSlug("março")).toBeNull();
  });

  it("hoje usa o horário de Brasília", () => {
    // 02h UTC de 04/jan ainda é 03/jan em Brasília.
    expect(hoje(new Date("2027-01-04T02:00:00Z"))).toBe("2027-01-03");
  });
});

describe("regras das quests", () => {
  it("XP soma ao concluir, tira ao desmarcar e fica entre 0 e 10", () => {
    expect(deltaXP("open", "done")).toBe(1);
    expect(deltaXP("done", "moved")).toBe(-1);
    expect(deltaXP("urgent", "dropped")).toBe(0);
    expect(aplicaXP(10, 1)).toBe(10);
    expect(aplicaXP(0, -1)).toBe(0);
  });

  it("quest movida vai para o mesmo dia da semana seguinte", () => {
    expect(destinoMovida({ scope: "day", date: "2027-03-31" })).toEqual({ scope: "day", date: "2027-04-07" });
    expect(destinoMovida({ scope: "day", date: "2027-12-28" })).toBeNull();
  });

  it("quest do mês movida vai para o mês seguinte", () => {
    expect(destinoMovida({ scope: "month", year: 2027, month: 3 })).toEqual({ scope: "month", year: 2027, month: 4 });
    expect(destinoMovida({ scope: "month", year: 2027, month: 12 })).toBeNull();
  });

  it("XP de quest do dia vai para o mês da semana", () => {
    expect(mesDoXP({ scope: "day", date: "2027-04-03" })).toEqual({ year: 2027, month: 3 });
  });
});
