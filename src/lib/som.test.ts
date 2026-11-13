import { describe, expect, it, vi } from "vitest";
import { assinarSom, ligarSom, somLigado, tocar } from "./som";

describe("som", () => {
  it("liga, desliga e avisa quem assinou", () => {
    const ouvinte = vi.fn();
    const sair = assinarSom(ouvinte);
    ligarSom(false);
    expect(somLigado()).toBe(false);
    ligarSom(true);
    expect(somLigado()).toBe(true);
    expect(ouvinte).toHaveBeenCalledTimes(2);
    sair();
    ligarSom(false);
    expect(ouvinte).toHaveBeenCalledTimes(2);
    ligarSom(true);
  });

  it("não quebra sem Web Audio (servidor, navegador antigo)", () => {
    expect(() => tocar("rasengan")).not.toThrow();
  });
});
