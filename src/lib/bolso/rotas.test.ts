import { describe, expect, it } from "vitest";
import { voltaSegura } from "./rotas";

describe("voltaSegura", () => {
  it("aceita páginas da própria Mesa de Bolso", () => {
    expect(voltaSegura("/jogos/mesa-de-bolso/mercado-das-lanternas")).toBe("/jogos/mesa-de-bolso/mercado-das-lanternas");
  });
  it("recusa link pra fora e caminhos esquisitos", () => {
    for (const v of ["https://x.com", "//x.com", "/entrar", "/jogos/mesa-de-bolso//x", "/jogos/mesa-de-bolso/../admin", "/jogos/mesa-de-bolso/a?b=1", undefined, 3, "/jogos/mesa-de-bolso/" + "a".repeat(200)]) {
      expect(voltaSegura(v)).toBeUndefined();
    }
  });
});
