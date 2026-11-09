import { describe, expect, it } from "vitest";
import { FICHA_VAZIA, ajustar, atributos, calcular, pendencias, profClasse, profPericias, type Ficha } from "@/lib/pathfinder";
import {
  ARMADURAS, ARMAS, ESCUDOS, ITENS, MAGIAS, TALENTOS,
  bloqueioTalento, calcularEquipamento, espacos, infoMagia, limparTudo, magiasDisponiveis, talentosPara,
} from "../calculo";
import { espacosDeMagia } from "../progressao";

// Guerreiro humano de Força, nível 1.
const guerreiro: Ficha = {
  ...FICHA_VAZIA,
  nome: "Valéria",
  ancestralidade: "humano",
  antecedente: "soldado",
  classe: "guerreiro",
  chave: "for",
  boostsAncestral: ["for", "con"],
  boostAntecedente: "for",
  boostAntecedenteLivre: "des",
  boostsLivres: ["for", "des", "con", "sab"],
  pericias: ["acrobatismo", "sobrevivencia", "medicina"],
};

describe("dados", () => {
  it.each([
    ["talentos", TALENTOS],
    ["armas", ARMAS],
    ["armaduras", ARMADURAS],
    ["escudos", ESCUDOS],
    ["itens", ITENS],
    ["magias", MAGIAS],
  ] as const)("%s têm id único", (_, lista) => {
    const ids = lista.map((x) => x.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(lista.length).toBeGreaterThan(3);
  });

  it("pré-requisitos de talento apontam pra talentos que existem", () => {
    const ids = new Set(TALENTOS.map((t) => t.id));
    for (const t of TALENTOS) for (const r of t.requer ?? []) expect(ids, `${t.id} -> ${r}`).toContain(r);
  });

  it("talentos de ancestralidade e classe dizem de quem são", () => {
    for (const t of TALENTOS) {
      if (t.tipo === "ancestralidade") expect(t.ancestralidade, t.id).toBeTruthy();
      if (t.tipo === "classe") expect(t.classes?.length, t.id).toBeGreaterThan(0);
      expect(t.nivel).toBeGreaterThanOrEqual(1);
      expect(t.nivel).toBeLessThanOrEqual(20);
    }
  });

  it("magias têm posto de 0 a 10 e pelo menos uma tradição", () => {
    for (const m of MAGIAS) {
      expect(m.nivel).toBeGreaterThanOrEqual(0);
      expect(m.nivel).toBeLessThanOrEqual(10);
      expect(m.tradicoes.length).toBeGreaterThan(0);
    }
  });
});

describe("níveis", () => {
  it("nível 1: atributos, PV e ataque", () => {
    expect(atributos(guerreiro)).toEqual({ for: 4, des: 2, con: 2, int: 0, sab: 1, car: 0 });
    const c = calcular(guerreiro);
    expect(c.pv).toBe(8 + 10 + 2);
    const espada = calcularEquipamento({ ...guerreiro, equipamento: { ...guerreiro.equipamento, armas: ["espada-longa"] } });
    // Guerreiro é especialista em armas marciais: 4 + 1 + For 4.
    const ataque = espada.ataques.find((a) => a.arma.id === "espada-longa")!;
    expect(ataque.ataque).toBe(9);
    expect(ataque.dano).toBe("1d8+4 E");
  });

  it("boost em +4 é parcial: dois boosts pra subir 1", () => {
    const f = ajustar({ ...guerreiro, nivel: 10, boostsNivel: [["for", "des", "con", "sab"], ["for", "des", "con", "int"], [], []] });
    // For: 4 -> parcial (5) -> +5 no 10.
    expect(atributos(f).for).toBe(5);
    expect(atributos({ ...f, nivel: 5 }).for).toBe(4);
  });

  it("PV crescem por nível e a progressão de classe entra", () => {
    const f = ajustar({ ...guerreiro, nivel: 7 });
    expect(calcular(f).pv).toBe(8 + (10 + 2) * 7);
    expect(profClasse(f, "percepcao")).toBe("mestre");
    expect(profClasse(f, "marcial")).toBe("mestre");
    expect(profClasse({ ...f, nivel: 4 }, "marcial")).toBe("especialista");
  });

  it("aumentos de perícia respeitam o nível mínimo", () => {
    const f = ajustar({ ...guerreiro, nivel: 7, aumentos: { "3": "acrobatismo", "5": "acrobatismo", "7": "acrobatismo" } });
    // Treinado -> especialista (3) -> mestre (5? não: mestre só no 7). O do 5 cai fora, o do 7 vira mestre.
    expect(f.aumentos).toEqual({ "3": "acrobatismo", "7": "acrobatismo" });
    expect(profPericias(f).acrobatismo).toBe("mestre");
  });

  it("pendências pedem boosts e aumentos dos níveis alcançados", () => {
    const p = pendencias(ajustar({ ...guerreiro, nivel: 5 })).join(" | ");
    expect(p).toMatch(/boosts do nível 5/);
    expect(p).toMatch(/aumento de perícia/);
  });
});

describe("talentos", () => {
  it("espaços seguem o nível e o ladino ganha talento de perícia todo nível", () => {
    expect(espacos(guerreiro).map((e) => e.chave)).toEqual(["ancestralidade-1", "classe-1"]);
    expect(espacos({ ...guerreiro, nivel: 3 }).map((e) => e.chave)).toEqual(["ancestralidade-1", "classe-1", "classe-2", "pericia-2", "geral-3"]);
    expect(espacos({ ...guerreiro, classe: "ladino", nivel: 2 }).filter((e) => e.tipo === "pericia")).toHaveLength(2);
  });

  it("só oferece talentos da classe, ancestralidade e nível certos", () => {
    const e = espacos(guerreiro).find((x) => x.chave === "classe-1")!;
    const lista = talentosPara(guerreiro, e);
    expect(lista.length).toBeGreaterThan(0);
    for (const t of lista) {
      expect(t.classes).toContain("guerreiro");
      expect(t.nivel).toBe(1);
    }
    const anc = talentosPara(guerreiro, espacos(guerreiro)[0]);
    for (const t of anc) expect(t.ancestralidade).toBe("humano");
  });

  it("descarta talento que deixou de valer ao trocar de classe", () => {
    const e = espacos(guerreiro).find((x) => x.chave === "classe-1")!;
    const t = talentosPara(guerreiro, e)[0];
    expect(bloqueioTalento(guerreiro, t, e)).toBeNull();
    const f = { ...guerreiro, talentos: { "classe-1": t.id } };
    expect(limparTudo(f).talentos).toEqual({ "classe-1": t.id });
    expect(limparTudo(ajustar({ ...f, classe: "mago", chave: "int" })).talentos).toEqual({});
  });
});

describe("equipamento e magias", () => {
  it("armadura pesada usa o teto de Destreza e a proficiência", () => {
    const placa = ARMADURAS.find((a) => a.id === "armadura-completa")!;
    const eq = calcularEquipamento({ ...guerreiro, equipamento: { ...guerreiro.equipamento, armadura: placa.id } });
    // 10 + min(Des 2, teto) + 6 + treinado (2+1).
    expect(eq.ca).toBe(10 + Math.min(2, placa.tetoDes ?? 2) + placa.bonusCA + 3);
  });

  it("espaços de magia por posto", () => {
    expect(espacosDeMagia(1, "preparada").slice(0, 2)).toEqual([2, 0]);
    expect(espacosDeMagia(2, "preparada").slice(0, 2)).toEqual([3, 0]);
    expect(espacosDeMagia(3, "espontanea").slice(0, 2)).toEqual([4, 3]);
    expect(espacosDeMagia(19, "preparada")[9]).toBe(1);
  });

  it("mago vê magias arcanas e não passa do limite", () => {
    const mago: Ficha = ajustar({ ...guerreiro, classe: "mago", chave: "int" });
    const info = infoMagia(mago)!;
    expect(info.tradicao).toBe("arcana");
    const truques = magiasDisponiveis(mago, 0);
    expect(truques.length).toBeGreaterThan(5);
    for (const m of truques) expect(m.tradicoes).toContain("arcana");
    const f = limparTudo({ ...mago, magias: truques.slice(0, 7).map((m) => m.id) });
    expect(f.magias).toHaveLength(5);
  });

  it("guerreiro não guarda magia", () => {
    expect(limparTudo({ ...guerreiro, magias: [MAGIAS[0].id] }).magias).toEqual([]);
  });
});
