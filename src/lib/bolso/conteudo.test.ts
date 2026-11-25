import fs from "node:fs";
import path from "node:path";
import { serialize } from "next-mdx-remote/serialize";
import { describe, expect, it } from "vitest";
import { validarAventura } from "./conteudo";
import { aventuraBruta } from "./fixtures";

// Os testes mexem no JSON de propósito (quebram o grafo), então o tipo aqui é solto.
/* eslint-disable @typescript-eslint/no-explicit-any */
const clonar = () => structuredClone(aventuraBruta) as any;
/* eslint-enable @typescript-eslint/no-explicit-any */

describe("grafo de cenas", () => {
  it("aceita a aventura de teste", () => {
    expect(validarAventura(aventuraBruta).problemas).toEqual([]);
  });

  it("acusa cena inalcançável", () => {
    const a = clonar();
    a.cenas.push({ id: "ilha", texto: "Ninguém chega aqui.", opcoes: [{ id: "x", texto: "Voltar", proxima: "a" }] } as never);
    expect(validarAventura(a).problemas).toContain("cena inalcançável: ilha");
  });

  it("acusa saída quebrada, inclusive em desvio de falha", () => {
    const a = clonar();
    a.cenas[0].opcoes[2].proxima = "nao-existe";
    (a.cenas[0].opcoes[0] as { desvios?: object }).desvios = { falha: "tambem-nao" };
    const p = validarAventura(a).problemas;
    expect(p).toContain("saída quebrada: a/pegar-marca → nao-existe");
    expect(p).toContain("saída quebrada: a/arriscar → tambem-nao");
  });

  it("acusa cena sem saída e sem final", () => {
    const a = clonar();
    a.cenas[2].opcoes = [];
    expect(validarAventura(a).problemas).toContain("cena sem saída e sem final: c");
  });

  it("acusa laço que nunca chega a um final", () => {
    const a = clonar();
    // b passa a só levar a c, e c só volta pra b: ninguém mais chega a um final.
    a.cenas[1].opcoes = [{ id: "ir", texto: "Ir", proxima: "c" }] as never;
    a.cenas[2].opcoes = [{ id: "voltar", texto: "Voltar", proxima: "b" }] as never;
    const p = validarAventura(a).problemas;
    expect(p).toContain("caminho sem final a partir de: b");
    expect(p).toContain("caminho sem final a partir de: c");
  });

  it("acusa final do fôlego inexistente ou que não é final", () => {
    const a = clonar();
    a.finalFolego = "sumiu";
    expect(validarAventura(a).problemas).toContain("finalFolego aponta pra cena que não existe: sumiu");
    const b = clonar();
    b.finalFolego = "b";
    expect(validarAventura(b).problemas).toContain("finalFolego (b) não é uma cena final");
  });

  it("acusa item, marca e talento que não existem", () => {
    const a = clonar();
    (a.cenas[0].opcoes[0].efeitos as { sucesso: { itens: string[] } }).sucesso.itens = ["fantasma"];
    expect(validarAventura(a).problemas).toContain("item desconhecido: a/arriscar → fantasma");
    const b = clonar();
    (b.cenas[0].opcoes[0].teste as { talentos: string[] }).talentos = ["inventado"];
    expect(validarAventura(b).problemas.some((p) => p.startsWith("schema:"))).toBe(true);
  });

  it("recusa campo desconhecido e dificuldade fora da faixa", () => {
    const a = clonar();
    (a.cenas[0].opcoes[0].teste as { dificuldade: number }).dificuldade = 30;
    expect(validarAventura(a).problemas.some((p) => p.startsWith("schema:"))).toBe(true);
    expect(validarAventura({ ...aventuraBruta, extra: 1 }).problemas.length).toBeGreaterThan(0);
  });
});

describe("aventuras de content/mesa-de-bolso", () => {
  const pasta = path.join(process.cwd(), "content", "mesa-de-bolso");
  const arquivos = fs.readdirSync(pasta).filter((f) => f.endsWith(".json"));

  it("tem as duas aventuras do MVP", () => {
    expect(arquivos.sort()).toEqual(["mercado-das-lanternas.json", "ultima-linha-da-madrugada.json"]);
  });

  for (const f of arquivos) {
    it(`${f}: schema ok, todas as cenas alcançáveis, toda saída existe, todo caminho chega a um final`, () => {
      const r = validarAventura(JSON.parse(fs.readFileSync(path.join(pasta, f), "utf8")));
      expect(r.problemas).toEqual([]);
      expect(r.aventura?.slug).toBe(f.replace(/\.json$/, ""));
    });
  }

  it("uma fantasia e uma cidade noturna, as duas livres", () => {
    const temas = arquivos.map((f) => JSON.parse(fs.readFileSync(path.join(pasta, f), "utf8")).tema).sort();
    expect(temas).toEqual(["cidade-noturna", "fantasia"]);
  });

  it("cada aventura tem os três tipos de final", () => {
    for (const f of arquivos) {
      const a = validarAventura(JSON.parse(fs.readFileSync(path.join(pasta, f), "utf8"))).aventura!;
      const tipos = new Set(a.cenas.flatMap((c) => (c.final ? [c.final.tipo] : [])));
      expect([...tipos].sort()).toEqual(["alternativo", "bom", "custo"]);
    }
  });

  it("o texto de toda cena compila como MDX (um { ou < solto quebraria a página)", async () => {
    for (const f of arquivos) {
      const a = validarAventura(JSON.parse(fs.readFileSync(path.join(pasta, f), "utf8"))).aventura!;
      for (const c of a.cenas) await expect(serialize(c.texto), `${a.slug}/${c.id}`).resolves.toBeDefined();
    }
  });
});
