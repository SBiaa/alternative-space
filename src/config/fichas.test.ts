import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { sistemasFicha } from "./fichas";

describe("sistemas de ficha", () => {
  it("slugs e ids são únicos e servem de caminho", () => {
    for (const k of ["slug", "id"] as const) {
      const v = sistemasFicha.map((s) => s[k]);
      expect(new Set(v).size).toBe(v.length);
    }
    for (const s of sistemasFicha) expect(s.slug).toMatch(/^[a-z0-9-]+$/);
  });

  it("cada sistema tem a sua página", () => {
    for (const s of sistemasFicha) expect(existsSync(`src/app/fichas/${s.slug}/page.tsx`)).toBe(true);
  });
});
