import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({ sql: vi.fn() }));
import { recordeValido } from "@/lib/jogos";
import { nomeNoRanking } from "@/lib/ranking";

describe("recordeValido", () => {
  it("aceita inteiro positivo de jogo com recorde", () => {
    expect(recordeValido("picles-no-ralo", 120)).toBe(true);
  });
  it("recusa jogo sem recorde, slug desconhecido e número estranho", () => {
    expect(recordeValido("duelo-pirata", 5)).toBe(false);
    expect(recordeValido("nada", 5)).toBe(false);
    expect(recordeValido("picles-no-ralo", 0)).toBe(false);
    expect(recordeValido("picles-no-ralo", 2.5)).toBe(false);
    expect(recordeValido("picles-no-ralo", "9")).toBe(false);
  });
  it("respeita o máximo do jogo", () => {
    expect(recordeValido("defenda-o-navio", 13)).toBe(true);
    expect(recordeValido("defenda-o-navio", 14)).toBe(false);
  });
});

describe("nomeNoRanking", () => {
  it("usa @apelido, senão o primeiro nome", () => {
    expect(nomeNoRanking("bia", "Beatriz Souza")).toBe("@bia");
    expect(nomeNoRanking(null, "Beatriz Souza")).toBe("Beatriz");
    expect(nomeNoRanking(null, null)).toBe("Tripulante");
  });
});
