import { describe, expect, it } from "vitest";
import { origemDoSistema, sistemasAtivos, sistemasFicha } from "./fichas";

const sr = sistemasFicha.find((s) => s.slug === "shadowrun")!;

describe("sistemas de ficha", () => {
  it("slugs são únicos e servem de caminho", () => {
    const slugs = sistemasFicha.map((s) => s.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const s of slugs) expect(s).toMatch(/^[a-z0-9-]+$/);
  });

  it("usa a variável do deploy, sem barra no fim", () => {
    expect(origemDoSistema(sr, { NODE_ENV: "production", FICHAS_SHADOWRUN_URL: "https://fixer.vercel.app/" } as NodeJS.ProcessEnv)).toBe("https://fixer.vercel.app");
  });

  it("em dev cai no localhost; em produção sem variável, some", () => {
    expect(origemDoSistema(sr, { NODE_ENV: "development" } as NodeJS.ProcessEnv)).toBe("http://localhost:3001");
    expect(origemDoSistema(sr, { NODE_ENV: "production" } as NodeJS.ProcessEnv)).toBeNull();
    expect(sistemasAtivos({ NODE_ENV: "production" } as NodeJS.ProcessEnv)).toEqual([]);
  });
});
