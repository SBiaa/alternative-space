import { describe, expect, it } from "vitest";
import { juntarEstados, migrar, progressoVazio, resolucoesLocais } from "./save";

describe("progresso local", () => {
  it("aceita o progresso vazio e recusa lixo", () => {
    expect(migrar(progressoVazio())).toEqual(progressoVazio());
    expect(migrar(null)).toBeNull();
    expect(migrar("x")).toBeNull();
    expect(migrar({ versao: 1, casos: { a: { sinais: "não" } } })).toBeNull();
    expect(migrar({ versao: 99, casos: {} })).toBeNull();
  });

  it("recusa save de versão antiga sem migração conhecida", () => {
    expect(migrar({ versao: 0, casos: {} })).toBeNull();
  });

  it("junta dois estados do mesmo caso sem perder sinal nem falas", () => {
    const j = juntarEstados({ sinais: ["a", "b"], depoimentos: ["x"], tentativas: 2 }, { sinais: ["b", "c"], depoimentos: ["y"], tentativas: 1 });
    expect(j).toEqual({ sinais: ["a", "b", "c"], depoimentos: ["x", "y"], tentativas: 2 });
  });

  it("lista só as resoluções que o navegador diz ter", () => {
    const p = progressoVazio();
    p.casos.a = { sinais: [], depoimentos: [], tentativas: 0, resolvida: { criatura: "saci", motivo: "agrado", escolha: "presente" } };
    p.casos.b = { sinais: [], depoimentos: [], tentativas: 1, resolvida: null };
    expect(resolucoesLocais(p)).toEqual([{ caso: "a", resposta: { criatura: "saci", motivo: "agrado", escolha: "presente" } }]);
  });
});
