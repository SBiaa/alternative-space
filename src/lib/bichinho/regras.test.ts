import { describe, expect, it } from "vitest";
import { ACESSORIOS, ESPECIES, EVENTOS, FASES, MECANICA, TEXTOS } from "./config";
import {
  aplicarQueda,
  avancar,
  efeitosDe,
  entradas,
  equipadosValidos,
  faseParaXp,
  fraseDoDia,
  guardarStats,
  hojeSP,
  humorDe,
  lerStats,
  marcosAtingidos,
  podeDarPetisco,
  xpDe,
} from "./regras";

const base = { energy: 60, curiosity: 60, affection: 60 };
const T0 = "2027-03-10T12:00:00.000Z";
const horasDepois = (h: number) => new Date(new Date(T0).getTime() + h * 3_600_000).toISOString();
const ev = (kind: string) => ({ kind, created_at: T0 });

describe("barras a partir de events", () => {
  it("cada evento sobe só a barra dele, segundo a config", () => {
    const { ganho } = efeitosDe([ev("game_played"), ev("quiz_completed"), ev("pet_treat")]);
    expect(ganho).toEqual({ energy: EVENTOS.game_played.ganho.energy, curiosity: EVENTOS.quiz_completed.ganho.curiosity, affection: EVENTOS.pet_treat.ganho.affection });
  });

  it("ignora eventos que não são do bichinho", () => {
    expect(efeitosDe([ev("inventory_added"), ev("tavern_staff_hired")])).toEqual({ ganho: { energy: 0, curiosity: 0, affection: 0 }, xp: 0 });
  });

  it("park_played (Rolê) conta como jogo terminado", () => {
    expect(efeitosDe([ev("park_played")]).ganho.energy).toBeGreaterThan(0);
  });

  it("avancar soma os ganhos depois da queda e respeita o teto de 100", () => {
    const a = avancar({ stats: { energy: 95, curiosity: 60, affection: 60 }, xp: 0, stage: 0, lastTickAt: T0 }, [ev("game_played"), ev("game_played")], T0);
    expect(a.stats.energy).toBe(100);
    expect(a.stats.curiosity).toBe(60);
  });
});

describe("queda com o tempo e piso", () => {
  it("cai na taxa da config", () => {
    const s = aplicarQueda(base, 10);
    expect(s.energy).toBe(60 - MECANICA.queda.energy * 10);
    expect(s.affection).toBe(60 - MECANICA.queda.affection * 10);
  });

  it("nunca passa do piso, mesmo depois de meses", () => {
    const s = aplicarQueda(base, 24 * 365);
    expect(s).toEqual({ energy: MECANICA.piso, curiosity: MECANICA.piso, affection: MECANICA.piso });
  });

  it("barra que já está no piso não cai (nem sobe)", () => {
    expect(aplicarQueda({ energy: MECANICA.piso, curiosity: 10, affection: 60 }, 100).curiosity).toBe(10);
  });

  it("tempo negativo ou inválido não mexe em nada", () => {
    expect(aplicarQueda(base, -5)).toEqual(base);
    expect(aplicarQueda(base, Number.NaN)).toEqual(base);
  });

  it("sumir não pune: depois de muito tempo ele acorda feliz", () => {
    const a = avancar({ stats: base, xp: 0, stage: 1, lastTickAt: T0 }, [], horasDepois(24 * 60));
    expect(a.voltou).toBe(true);
    expect(humorDe(a.stats, a.voltou)).toBe("feliz");
    expect(Math.min(...Object.values(a.stats))).toBeGreaterThanOrEqual(MECANICA.piso);
  });
});

describe("1 petisco por dia", () => {
  it("libera se nunca deu", () => expect(podeDarPetisco(null, T0)).toBe(true));
  it("bloqueia no mesmo dia (fuso de São Paulo)", () => {
    expect(podeDarPetisco(hojeSP(T0), T0)).toBe(false);
    expect(podeDarPetisco(`${hojeSP(T0)}T00:00:00`, T0)).toBe(false);
  });
  it("libera no dia seguinte", () => expect(podeDarPetisco("2027-03-09", T0)).toBe(true));
  it("a virada do dia é em São Paulo, não em UTC", () => {
    // 02:00 UTC ainda é o dia anterior em São Paulo (UTC-3).
    expect(hojeSP("2027-03-10T02:00:00Z")).toBe("2027-03-09");
    expect(podeDarPetisco("2027-03-09", "2027-03-10T02:00:00Z")).toBe(false);
    expect(podeDarPetisco("2027-03-09", "2027-03-10T03:00:00Z")).toBe(true);
  });
});

describe("evolução por XP", () => {
  it("XP é a soma ponderada dos eventos", () => {
    expect(xpDe([ev("quiz_completed"), ev("game_played"), ev("post_view")])).toBe(EVENTOS.quiz_completed.xp + EVENTOS.game_played.xp + EVENTOS.post_view.xp);
  });

  it("as fases seguem os requisitos da config", () => {
    expect(faseParaXp(0)).toBe(0);
    expect(faseParaXp(FASES[1].xp - 1)).toBe(0);
    expect(faseParaXp(FASES[1].xp)).toBe(1);
    expect(faseParaXp(FASES[2].xp)).toBe(2);
    expect(faseParaXp(999999)).toBe(2);
  });

  it("avancar registra a eclosão e a evolução, e a fase nunca desce", () => {
    const sobe = avancar({ stats: base, xp: FASES[1].xp - 1, stage: 0, lastTickAt: T0 }, [ev("post_view")], T0);
    expect(sobe.stage).toBe(1);
    expect(sobe.evolucoes).toEqual([{ de: 0, para: 1 }]);
    const igual = avancar({ stats: base, xp: 0, stage: 2, lastTickAt: T0 }, [], T0);
    expect(igual.stage).toBe(2);
    expect(igual.evolucoes).toEqual([]);
  });
});

describe("desbloqueio por marco", () => {
  it("nada liberado sem histórico", () => expect(marcosAtingidos({ quizzes: 0, jogos: 0, fichas: 0 })).toEqual([]));
  it("primeiro quiz, primeiro jogo e primeira ficha liberam o acessório de cada um", () => {
    expect(marcosAtingidos({ quizzes: 1, jogos: 0, fichas: 0 })).toEqual(["antena-de-papel"]);
    expect(marcosAtingidos({ quizzes: 0, jogos: 1, fichas: 0 })).toEqual(["fone-de-cabine"]);
    expect(marcosAtingidos({ quizzes: 0, jogos: 0, fichas: 1 })).toEqual(["cracha-de-bordo"]);
    expect(marcosAtingidos({ quizzes: 3, jogos: 2, fichas: 4 })).toHaveLength(ACESSORIOS.length);
  });
  it("só equipa acessório liberado e no slot certo", () => {
    expect(equipadosValidos({ cabeca: "antena-de-papel", corpo: "cracha-de-bordo" }, ["antena-de-papel"])).toEqual({ cabeca: "antena-de-papel" });
    expect(equipadosValidos({ corpo: "antena-de-papel" }, ["antena-de-papel"])).toEqual({});
    expect(equipadosValidos("lixo", [])).toEqual({});
  });
});

describe("humor", () => {
  it("barras baixas só fazem dormir", () => {
    expect(humorDe({ energy: 20, curiosity: 20, affection: 20 })).toBe("dormindo");
    expect(humorDe({ energy: 30, curiosity: 60, affection: 60 })).toBe("sonolento");
    expect(humorDe({ energy: 60, curiosity: 90, affection: 60 })).toBe("curioso");
    expect(humorDe({ energy: 80, curiosity: 60, affection: 80 })).toBe("feliz");
  });
  it("a frase do dia é estável no dia e vem da config", () => {
    const f = fraseDoDia("feliz", "u1", "2027-03-10");
    expect(f).toBe(fraseDoDia("feliz", "u1", "2027-03-10"));
    expect(TEXTOS.frases.feliz).toContain(f);
  });
});

describe("stats guardados com versão", () => {
  it("vai e volta", () => {
    const s = { energy: 10.5, curiosity: 99, affection: 40 };
    expect(lerStats(guardarStats(s))).toEqual(s);
  });
  it("formato antigo sem versão é migrado; lixo volta pro início", () => {
    expect(lerStats({ energy: 30, curiosity: 40, affection: 50 })).toEqual({ energy: 30, curiosity: 40, affection: 50 });
    expect(lerStats(null)).toEqual({ energy: MECANICA.inicial, curiosity: MECANICA.inicial, affection: MECANICA.inicial });
    expect(lerStats({ v: 99, energy: 1 }).energy).toBe(MECANICA.inicial);
  });
  it("valores fora de 0–100 são cortados", () => {
    expect(lerStats({ v: 1, energy: 500, curiosity: -3, affection: 50 })).toEqual({ energy: 100, curiosity: 0, affection: 50 });
  });
});

describe("o cliente não manda barra nenhuma", () => {
  it("as entradas recusam qualquer campo extra", () => {
    expect(entradas.renomear.safeParse({ nome: "Lua", energy: 100 }).success).toBe(false);
    expect(entradas.ovo.safeParse({ especie: "pulvi", xp: 999 }).success).toBe(false);
    expect(entradas.equipar.safeParse({ slot: "cabeca", slug: null, stats: {} }).success).toBe(false);
    expect(entradas.leitura.safeParse({ slug: "um-post", affection: 100 }).success).toBe(false);
  });
  it("valida nome", () => {
    expect(entradas.renomear.safeParse({ nome: "  Lua  Nova " }).data).toEqual({ nome: "Lua Nova" });
    expect(entradas.renomear.safeParse({ nome: "" }).success).toBe(false);
    expect(entradas.renomear.safeParse({ nome: "x".repeat(MECANICA.nomeMax + 1) }).success).toBe(false);
    expect(entradas.renomear.safeParse({ nome: "<script>" }).success).toBe(false);
  });
});

describe("config", () => {
  it("espécies e acessórios têm slug único, nome e texto", () => {
    for (const lista of [ESPECIES, ACESSORIOS]) {
      expect(new Set(lista.map((x) => x.slug)).size).toBe(lista.length);
      for (const x of lista) expect(x.nome.length).toBeGreaterThan(0);
    }
    expect(ESPECIES).toHaveLength(3);
  });
  it("fases em ordem crescente de XP e piso abaixo do início", () => {
    expect(FASES.map((f) => f.xp)).toEqual([...FASES.map((f) => f.xp)].sort((a, b) => a - b));
    expect(MECANICA.piso).toBeLessThan(MECANICA.inicial);
  });
});
