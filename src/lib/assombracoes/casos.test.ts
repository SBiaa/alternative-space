// Confere o conteúdo dos casos: jogável, dedutível, sem vazar gabarito e com a regra de revisão.
import { describe, expect, it } from "vitest";
import { lerCasosDe, visiveis } from "./conteudo";
import { alcancaveis, problemasDoCaso, type Caso } from "./schema";

const casos = lerCasosDe();
const copia = (c: Caso): Caso => JSON.parse(JSON.stringify(c));

describe("casos do MVP", () => {
  it("existem os 3 casos (Saci, Curupira e Iara) com criaturas diferentes", () => {
    expect(casos.map((c) => c.gabarito.criatura).sort()).toEqual(["curupira", "iara", "saci"]);
  });

  for (const c of casos) {
    describe(c.publico.slug, () => {
      it("não tem problema de schema, alcance ou dedução", () => {
        expect(problemasDoCaso(c)).toEqual([]);
      });

      it("todo sinal e toda fala são alcançáveis", () => {
        const a = alcancaveis(c.publico);
        expect(a.sinais.size).toBe(c.publico.sinais.length);
        expect(a.falas.size).toBe(c.publico.moradores.flatMap((m) => m.falas).length);
      });

      it("o que vai pro navegador não contém nenhum trecho do gabarito", () => {
        const publico = JSON.stringify(c.publico);
        expect(Object.keys(c.publico)).not.toContain("gabarito");
        for (const frase of [...c.gabarito.desfecho, ...c.gabarito.origem.texto, c.gabarito.bestiario.resumo, ...c.gabarito.dicas.criatura, ...c.gabarito.dicas.motivo, ...c.gabarito.dicas.escolha])
          expect(publico).not.toContain(frase);
        expect(publico).not.toContain("pesos");
      });

      it("tem cartão de origem com fontes citadas", () => {
        expect(c.gabarito.origem.fontes.length).toBeGreaterThanOrEqual(2);
        expect(c.gabarito.origem.texto.length).toBeGreaterThan(0);
      });

      it("sem sangue, morte ou susto no texto (terror leve)", () => {
        const todo = JSON.stringify(c).toLowerCase();
        for (const proibida of ["sangue", "morte", "morreu", "cadáver", "matar", "assassin"]) expect(todo, proibida).not.toContain(proibida);
      });
    });
  }
});

describe("regras do schema", () => {
  const base = casos[0];

  it("pega sinal inalcançável (trava que nunca abre)", () => {
    const c = copia(base);
    // pegada-invertida só vem de olhar a mata (nenhuma fala rende ela): travar nela mesma a deixa inalcançável.
    const s = c.publico.sinais.find((x) => x.id === "pegada-invertida")!;
    s.requer = [s.id];
    expect(problemasDoCaso(c).some((p) => p.includes("inalcançável"))).toBe(true);
  });

  it("pega criatura errada empatando com a certa (caso não dedutível)", () => {
    const c = copia(base);
    for (const w of Object.values(c.gabarito.pesos)) delete w[c.gabarito.criatura];
    expect(problemasDoCaso(c).length).toBeGreaterThan(0);
  });

  it("pega resposta certa fora das opções", () => {
    const c = copia(base);
    c.gabarito.escolha = "nao-existe";
    expect(problemasDoCaso(c)).toContain("escolha certa fora das opções do encontro");
  });

  it("não deixa publicar sem revisão ou com menos de 2 fontes", () => {
    const c = copia(base);
    c.status = "publicado";
    c.gabarito.origem.revisao = null;
    c.gabarito.origem.fontes = c.gabarito.origem.fontes.slice(0, 1);
    const p = problemasDoCaso(c);
    expect(p).toContain("publicado sem revisão do cartão de origem");
    expect(p).toContain("publicado com menos de 2 fontes");
    c.gabarito.origem.revisao = { por: "Fulana", data: "2026-11-01" };
    c.gabarito.origem.fontes = copia(base).gabarito.origem.fontes;
    expect(problemasDoCaso(c)).toEqual([]);
  });

  it("rascunho só aparece fora de produção", () => {
    expect(visiveis(casos, false)).toEqual([]);
    expect(visiveis(casos, true).length).toBe(casos.length);
  });
});
