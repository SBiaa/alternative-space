import { describe, expect, it } from "vitest";
import { ANCESTRALIDADES, CLASSES, PERICIAS } from "@/lib/pathfinder";
import { MAGIAS, TALENTOS, acharMagiaPorNome, acharTalentoPorNome, magiasDaVaga, talentosDaVaga } from "../catalogo";

describe("catálogo de Pathfinder", () => {
  it("ids únicos e referências válidas", () => {
    for (const lista of [TALENTOS, MAGIAS]) expect(new Set(lista.map((x) => x.id)).size).toBe(lista.length);
    const ids = new Set(TALENTOS.map((t) => t.id));
    for (const t of TALENTOS) for (const r of t.requer ?? []) expect(ids, `${t.id} -> ${r}`).toContain(r);
  });

  it("talentos usam ancestralidades, classes e perícias que existem na ficha", () => {
    const anc = new Set(ANCESTRALIDADES.map((a) => a.id));
    const cls = new Set(CLASSES.map((c) => c.id));
    const per = new Set<string>(PERICIAS.map((p) => p.id));
    for (const t of TALENTOS) {
      if (t.ancestralidade) expect(anc, t.id).toContain(t.ancestralidade);
      for (const c of t.classes ?? []) expect(cls, t.id).toContain(c);
      if (t.pericia) expect(per, t.id).toContain(t.pericia.id);
    }
  });

  it("acha pelo nome em português ou pelo original, sem ligar pra acento", () => {
    const t = TALENTOS.find((x) => /\(.+\)/.test(x.nome))!;
    expect(acharTalentoPorNome(t.nome)).toBe(t);
    expect(acharTalentoPorNome(t.nome.match(/\((.+)\)/)![1].toUpperCase())).toBe(t);
    expect(acharTalentoPorNome(t.nome.replace(/\s*\(.*\)/, ""))).toBe(t);
    expect(acharTalentoPorNome("")).toBeUndefined();
    expect(acharMagiaPorNome(MAGIAS[0].nome)).toBe(MAGIAS[0]);
  });

  it("filtra talentos pela vaga", () => {
    const lista = talentosDaVaga("classe", 2, "humano", "guerreiro");
    expect(lista.length).toBeGreaterThan(3);
    for (const t of lista) {
      expect(t.classes).toContain("guerreiro");
      expect(t.nivel).toBeLessThanOrEqual(2);
    }
    for (const t of talentosDaVaga("ancestralidade", 1, "anao", "guerreiro")) expect(t.ancestralidade).toBe("anao");
    expect(talentosDaVaga("geral", 3, "humano", "mago").some((t) => t.tipo === "pericia")).toBe(true);
  });

  it("filtra magias por tradição e círculo", () => {
    const truques = magiasDaVaga("divina", 0);
    expect(truques.length).toBeGreaterThan(3);
    for (const m of truques) expect(m).toMatchObject({ nivel: 0 });
    for (const m of magiasDaVaga("arcana", 2)) {
      expect(m.tradicoes).toContain("arcana");
      expect(m.nivel).toBeGreaterThanOrEqual(1);
      expect(m.nivel).toBeLessThanOrEqual(2);
    }
    expect(magiasDaVaga("", 1)).toEqual([]);
  });
});
