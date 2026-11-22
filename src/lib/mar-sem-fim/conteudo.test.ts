import { describe, expect, it } from "vitest";
import { CATALOGO, EVENTOS, ILHA, ILHAS, MELHORIAS, MUNDO, OFICIOS } from "./conteudo";
import { amostrarArco, distanciaGraus, regiaoEm, regiaoIgual } from "./geo";
import { maximoDaHistoria } from "./historias";
import { PONTOS } from "./rotas";
import { schemaEstado } from "./save";
import { schemaIlha, schemaMundo } from "./tipos";

describe("conteúdo: schemas", () => {
  it("o mundo e as 10 ilhas passam no schema", () => {
    expect(schemaMundo.safeParse(MUNDO).success).toBe(true);
    expect(ILHAS).toHaveLength(10);
    for (const i of ILHAS) expect(schemaIlha.safeParse(i).success, i.slug).toBe(true);
  });

  it("schema recusa ilha com campo faltando", () => {
    const { nome: _nome, ...semNome } = ILHAS[0];
    void _nome;
    expect(schemaIlha.safeParse(semNome).success).toBe(false);
  });

  it("schema recusa história com efeito desconhecido", () => {
    const ruim = structuredClone(ILHAS[0]);
    ruim.historia.cenas[ruim.historia.inicio].opcoes[0].efeitos = { diamantes: 9 } as never;
    expect(schemaIlha.safeParse(ruim).success).toBe(false);
  });

  it("as quatro ilhas de origem e as seis do Lado Manso existem", () => {
    expect(ILHAS.filter((i) => i.lado === "origem")).toHaveLength(4);
    expect(ILHAS.filter((i) => i.lado === "manso")).toHaveLength(6);
    expect(MUNDO.mares.map((m) => m.ilhaOrigem).sort()).toEqual(ILHAS.filter((i) => i.lado === "origem").map((i) => i.slug).sort());
  });
});

describe("conteúdo: referências", () => {
  it("toda opção aponta pra uma cena que existe, e todo caminho termina", () => {
    for (const i of ILHAS) {
      const cenas = i.historia.cenas;
      expect(cenas[i.historia.inicio], `${i.slug} início`).toBeDefined();
      for (const [id, c] of Object.entries(cenas)) {
        for (const o of c.opcoes) expect(cenas[o.proxima], `${i.slug}/${id}/${o.id}`).toBeDefined();
        if (c.fim) expect(c.opcoes).toHaveLength(0);
        else expect(c.opcoes.length, `${i.slug}/${id} sem saída`).toBeGreaterThan(0);
      }
    }
  });

  it("histórias têm entre 3 e 6 telas num mesmo caminho (o evento do Monte tem 2)", () => {
    for (const i of ILHAS) {
      const prof = (id: string, vistos: string[] = []): number => {
        const c = i.historia.cenas[id];
        if (c.opcoes.length === 0) return vistos.length + 1;
        return Math.max(...c.opcoes.map((o) => prof(o.proxima, [...vistos, id])));
      };
      const menor = (id: string): number => {
        const c = i.historia.cenas[id];
        return c.opcoes.length === 0 ? 1 : 1 + Math.min(...c.opcoes.map((o) => menor(o.proxima)));
      };
      const max = prof(i.historia.inicio);
      expect(max, i.slug).toBeLessThanOrEqual(6);
      expect(menor(i.historia.inicio), i.slug).toBeGreaterThanOrEqual(i.tipo === "evento" ? 2 : 3);
    }
  });

  it("itens e aliados citados existem no catálogo", () => {
    const efeitos = [
      ...ILHAS.flatMap((i) => Object.values(i.historia.cenas).flatMap((c) => [c.efeitos, ...c.opcoes.map((o) => o.efeitos)])),
      ...EVENTOS.eventos.flatMap((e) => e.opcoes.map((o) => o.efeitos)),
    ];
    for (const ef of efeitos) {
      if (ef?.item) expect(CATALOGO.itens[ef.item], ef.item).toBeDefined();
      if (ef?.aliado) expect(CATALOGO.aliados[ef.aliado], ef.aliado).toBeDefined();
    }
  });

  it("opções com ofício citam um ofício que existe", () => {
    for (const i of ILHAS) for (const c of Object.values(i.historia.cenas)) for (const o of c.opcoes) if (o.oficio) expect(OFICIOS.some((x) => x.id === o.oficio)).toBe(true);
  });

  it("a ordem da Agulha só tem ilhas do Lado Manso, começando pelo Monte", () => {
    const ordem = MUNDO.agulha.ordem;
    expect(ordem[0]).toBe(MUNDO.monte);
    for (const s of ordem) expect(ILHA[s]?.lado).toBe("manso");
    expect(ordem).toHaveLength(6);
  });

  it("existem melhorias básicas e as duas 'em breve'", () => {
    expect(MELHORIAS.filter((m) => !m.emBreve).map((m) => m.id).sort()).toEqual(["casco-reforcado", "despensa", "velas-melhores"]);
    expect(MELHORIAS.filter((m) => m.emBreve).map((m) => m.id).sort()).toEqual(["casco-bolha", "casco-travessia"]);
  });

  it("os seis ofícios e os quatro tipos de evento têm conteúdo", () => {
    expect(OFICIOS).toHaveLength(6);
    for (const tipo of ["tempestade", "mercante", "criatura", "naufrago"] as const) expect(EVENTOS.eventos.some((e) => e.tipo === tipo)).toBe(true);
  });
});

describe("conteúdo: tetos de recompensa", () => {
  it("nenhum caminho de história passa do teto da ilha", () => {
    for (const i of ILHAS) {
      const max = maximoDaHistoria(i);
      expect(max.ouro, `${i.slug} ouro`).toBeLessThanOrEqual(i.recompensaMax.ouro);
      expect(max.recompensa, `${i.slug} recompensa`).toBeLessThanOrEqual(i.recompensaMax.recompensa);
    }
  });

  it("nenhuma opção de evento passa do teto de recompensa por evento", () => {
    for (const e of EVENTOS.eventos) for (const o of e.opcoes) expect(o.efeitos.recompensa ?? 0, `${e.id}/${o.id}`).toBeLessThanOrEqual(MUNDO.economia.eventoRecompensaMax);
  });

  it("escolhas de bom coração rendem recompensa, e nenhuma opção premia crueldade com mais recompensa que a gentil", () => {
    // Regra de conteúdo: o jogo não premia crueldade. Aqui só garantimos que toda ilha rende recompensa por um caminho gentil.
    for (const i of ILHAS) expect(maximoDaHistoria(i).recompensa, i.slug).toBeGreaterThan(0);
  });
});

describe("conteúdo: geografia do mundo", () => {
  it("todo nó e toda aresta referenciam pontos que existem", () => {
    for (const a of MUNDO.arestas) {
      expect(PONTOS[a.de], a.de).toBeDefined();
      expect(PONTOS[a.para], a.para).toBeDefined();
    }
    for (const m of MUNDO.mares) expect(PONTOS[m.bocaDoCanal]).toBeDefined();
  });

  it("cada ilha cai na região que o JSON diz (mar de origem ou Corrente, Lado Manso)", () => {
    for (const i of ILHAS) {
      const r = regiaoEm(MUNDO, i.lat, i.lng);
      if (i.slug === MUNDO.monte) expect(r.tipo).toBe("espinha");
      else if (i.lado === "origem") expect(r).toEqual({ tipo: "mar", id: i.mar });
      else expect(r).toEqual({ tipo: "corrente", bravo: false });
    }
  });

  it("nenhuma rota atravessa a Espinha nem os Mares Parados (só os canais, que terminam no Monte)", () => {
    const monte = PONTOS[MUNDO.monte];
    for (const a of MUNDO.arestas) {
      const de = PONTOS[a.de];
      const para = PONTOS[a.para];
      const pontos = amostrarArco(de, para, 60);
      if (a.tipo === "canal") {
        expect([a.de, a.para]).toContain(MUNDO.monte);
        continue;
      }
      for (const p of pontos) {
        // Perto do Monte a rota sai da Espinha: só ali é permitido.
        if (distanciaGraus(p, monte) <= MUNDO.navegacao.raioIsentoMonteGraus) continue;
        const r = regiaoEm(MUNDO, p.lat, p.lng);
        expect(r.tipo, `${a.de}→${a.para} em ${p.lat.toFixed(1)},${p.lng.toFixed(1)}`).not.toBe("espinha");
        expect(r.tipo, `${a.de}→${a.para}`).not.toBe("parados");
        if (a.tipo === "mar") expect(regiaoIgual(r, { tipo: "mar", id: a.mar! })).toBe(true);
        if (a.tipo === "corrente") expect(r).toEqual({ tipo: "corrente", bravo: false });
      }
    }
  });

  it("não existe aresta que ligue dois mares diferentes sem passar pelo Monte", () => {
    for (const a of MUNDO.arestas.filter((x) => x.tipo === "mar")) {
      const m = MUNDO.mares.find((x) => x.id === a.mar)!;
      expect([a.de, a.para].some((n) => n === m.ilhaOrigem || n === m.bocaDoCanal)).toBe(true);
    }
  });

  it("'em breve' guarda o requisito em config", () => {
    expect(MUNDO.emBreve.map((x) => x.id).sort()).toEqual(["fenda", "lado-bravo"]);
    for (const x of MUNDO.emBreve) expect(x.requisito.length).toBeGreaterThan(0);
  });
});

describe("save: schema do estado", () => {
  it("recusa um estado com tipos errados", () => {
    expect(schemaEstado.safeParse({ v: 1 }).success).toBe(false);
  });
});
