import { describe, expect, it } from "vitest";
import { liberado } from "./sons-navio";

describe("sons do navio", () => {
  it("segura o mesmo som repetido em cima do outro", () => {
    const ultimo = new Map();
    expect(liberado("corte", 1, ultimo)).toBe(true);
    expect(liberado("corte", 1.02, ultimo)).toBe(false);
    expect(liberado("corte", 1.1, ultimo)).toBe(true);
  });

  it("sons diferentes não se atrapalham, e os raros nunca são segurados", () => {
    const ultimo = new Map();
    expect(liberado("corte", 1, ultimo)).toBe(true);
    expect(liberado("tiro", 1, ultimo)).toBe(true);
    expect(liberado("sino", 1, ultimo)).toBe(true);
    expect(liberado("sino", 1, ultimo)).toBe(true);
  });
});
