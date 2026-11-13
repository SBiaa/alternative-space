import { describe, expect, it } from "vitest";
import { vagasMagia } from "./pathfinder-magia";
import { FICHA_VAZIA, ajustar, ataque, dadosMagia, pontosFoco, atributos, calcular, grausPericia, lerFicha, normalizarFicha, pendencias, periciasParaEscolher, resumoFicha, vagasTalento, type Ficha } from "./pathfinder";

// Anã clériga acólita: exemplo bem comum de mesa.
const ana: Ficha = {
  ...FICHA_VAZIA,
  nome: "Brunhilda",
  ancestralidade: "anao",
  heranca: "anao-rocha",
  antecedente: "acolito",
  classe: "clerigo",
  chave: "sab",
  boostsAncestral: ["for"],
  boostAntecedente: "sab",
  boostAntecedenteLivre: "con",
  boostsLivres: ["for", "con", "sab", "int"],
  pericias: ["medicina", "diplomacia", "natureza"],
  talentos: { "ancestralidade-1": "Treinamento com Armas Anãs", "classe-1": "Cura Ampliada" },
  magias: { "truque-1": "Luz", "truque-2": "Lança Divina", "truque-3": "Estabilizar", "truque-4": "Escudo", "truque-5": "Mensagem", "r1-1": "Cura", "r1-2": "Bênção" },
};

describe("pathfinder 2e", () => {
  it("soma boosts e falha", () => {
    expect(atributos(ana)).toEqual({ for: 2, des: 0, con: 3, int: 1, sab: 4, car: -1 });
  });

  it("calcula PV, CA, salvamentos e perícias no nível 1", () => {
    const c = calcular(ana);
    expect(c.pv).toBe(10 + 8 + 3);
    expect(c.ca).toBe(13);
    expect(c.vontade).toBe(4 + 1 + 4);
    expect(c.fortitude).toBe(2 + 1 + 3);
    expect(c.percepcao).toBe(2 + 1 + 4);
    expect(c.cdClasse).toBe(10 + 3 + 4);
    const religiao = c.pericias.find((p) => p.id === "religiao")!;
    expect(religiao).toMatchObject({ prof: "treinado", bonus: 7 });
    expect(c.pericias.find((p) => p.id === "acrobatismo")).toMatchObject({ prof: "destreinado", bonus: 0 });
  });

  it("perícias a escolher = classe + Inteligência", () => {
    expect(periciasParaEscolher(ana)).toBe(3);
    expect(pendencias(ana)).toEqual([]);
  });

  it("aponta o que falta", () => {
    const p = pendencias(FICHA_VAZIA);
    expect(p[0]).toMatch(/nome/);
    expect(p.length).toBeGreaterThan(3);
    expect(pendencias({ ...ana, boostsLivres: ["for", "for", "con", "sab"] }).join()).toMatch(/boosts livres/);
  });

  it("ajustar limpa escolhas que deixaram de valer", () => {
    const f = ajustar({ ...ana, classe: "ladino" });
    expect(f.chave).toBe("des");
    expect(f.pericias).toEqual(["medicina", "diplomacia", "natureza"]);
    const g = ajustar({ ...ana, ancestralidade: "elfo", antecedente: "guarda" });
    expect(g.boostAntecedente).toBe("");
    expect(g.boostsAncestral).toEqual(["for"]);
  });

  it("lê ficha guardada e ignora lixo", () => {
    expect(lerFicha(JSON.stringify(ana))).toEqual(ana);
    expect(lerFicha("{quebrado")).toBeNull();
    expect(lerFicha(JSON.stringify({ classe: "nada", pericias: ["xyz"] }))).toEqual(FICHA_VAZIA);
  });

  it("normaliza o que vem do banco e resume em uma linha", () => {
    expect(normalizarFicha(ana)).toEqual(ana);
    expect(normalizarFicha(null)).toBeNull();
    expect(normalizarFicha({ nome: 42, classe: ["mago"] })).toEqual(FICHA_VAZIA);
    expect(resumoFicha(ana)).toBe("Anão · Clérigo 1");
    expect(resumoFicha(FICHA_VAZIA)).toBe("");
  });

  it("sobe de nível: PV, proficiências e aumentos de atributo", () => {
    const f: Ficha = { ...ana, nivel: 5, aumentos: { 5: ["sab", "con", "for", "des"] }, aumentosPericia: { 3: "religiao", 5: "medicina" } };
    expect(atributos(f)).toEqual({ for: 3, des: 1, con: 4, int: 1, sab: 4, car: -1 });
    const c = calcular(f);
    expect(c.pv).toBe(10 + (8 + 4) * 5);
    // Clérigo ganha Reflexos especialista no 5.
    expect(c.graus.reflexos).toBe("especialista");
    expect(c.reflexos).toBe(4 + 5 + 1);
    expect(c.pericias.find((p) => p.id === "religiao")).toMatchObject({ prof: "especialista", bonus: 4 + 5 + 4 });
  });

  it("aumento em atributo +4 ou mais é parcial", () => {
    const f: Ficha = { ...ana, nivel: 10, aumentos: { 5: ["sab", "con", "for", "des"], 10: ["sab", "con", "for", "des"] } };
    // Sabedoria começa em +4: o do 5 fica guardado e o do 10 completa o +1.
    expect(atributos(f).sab).toBe(5);
    expect(atributos({ ...f, nivel: 5 }).sab).toBe(4);
    const g: Ficha = { ...f, nivel: 15, aumentos: { ...f.aumentos, 15: ["sab", "int", "for", "des"] } };
    expect(atributos(g).sab).toBe(5);
    expect(atributos(g).int).toBe(2);
  });

  it("não deixa virar mestre antes do nível 7", () => {
    const f: Ficha = { ...ana, nivel: 5, aumentosPericia: { 3: "religiao", 5: "religiao" } };
    expect(grausPericia(f).invalidos).toEqual([5]);
    expect(pendencias(f).join()).toMatch(/limite/);
  });

  it("vagas de talento por nível", () => {
    const tipos = (n: number, classe = "clerigo") => vagasTalento({ nivel: n, classe, heranca: "" }).map((v) => v.chave);
    expect(tipos(1)).toEqual(["ancestralidade-1", "classe-1"]);
    expect(tipos(3)).toEqual(["ancestralidade-1", "classe-1", "classe-2", "pericia-2", "geral-3"]);
    expect(tipos(2, "ladino")).toContain("pericia-1");
  });

  it("lê ficha antiga, sem nível, como nível 1", () => {
    // Formato salvo antes dos níveis existirem.
    const campos = ["nome", "ancestralidade", "antecedente", "classe", "chave", "boostsAncestral", "boostAntecedente", "boostAntecedenteLivre", "boostsLivres", "pericias"] as const;
    const velha = Object.fromEntries(campos.map((k) => [k, ana[k]]));
    const f = normalizarFicha(velha)!;
    expect(f.nivel).toBe(1);
    expect(f.heranca).toBe("");
    expect(pendencias(f).join()).toMatch(/herança/);
  });

  it("calcula CA e penalidade com armadura em que a classe não é treinada", () => {
    expect(calcular(ana).ca).toBe(13);
    const c = calcular({ ...ana, armadura: "cota-malha" });
    expect(c.treinadoArmadura).toBe(false);
    expect(c.ca).toBe(14);
    expect(c.penalidade).toBe(-2);
    expect(c.deslocamento).toBe(15);
    expect(c.pericias.find((p) => p.id === "atletismo")?.bonus).toBe(0);
  });

  it("soma runas de armadura na CA e nos salvamentos", () => {
    const base = calcular({ ...ana, classe: "guerreiro", chave: "for", armadura: "couraca" });
    const runas = calcular({ ...ana, classe: "guerreiro", chave: "for", armadura: "couraca", runasArmadura: { potencia: 1, resiliente: 1 } });
    expect(runas.ca).toBe(base.ca + 1);
    expect(runas.vontade).toBe(base.vontade + 1);
  });

  it("calcula ataque e dano de armas", () => {
    const maca = ataque(ana, { id: "maca", potencia: 0, golpe: 0 })!;
    expect(maca.map).toEqual([5, 0, -5]);
    expect(maca.dano).toBe("1d6+2 E");
    const magica = ataque(ana, { id: "maca", potencia: 1, golpe: 1 })!;
    expect(magica.bonus).toBe(6);
    expect(magica.dano).toBe("2d6+2 E");
    const rapieira = ataque(ana, { id: "rapieira", potencia: 0, golpe: 0 })!;
    expect(rapieira.prof).toBe("destreinado");
    expect(rapieira.bonus).toBe(2);
    const adaga = ataque({ ...ana, classe: "guerreiro", chave: "for" }, { id: "adaga", potencia: 0, golpe: 0 })!;
    expect(adaga.prof).toBe("especialista");
    expect(adaga.map[1]).toBe(adaga.map[0] - 4);
    expect(ataque(ana, { id: "arco-longo-composto", potencia: 0, golpe: 0 })!.dano).toBe("1d8+1 P");
  });

  it("soma o Volume e marca sobrecarga", () => {
    const f: Ficha = { ...ana, armadura: "cota-malha", armas: [{ id: "maca", potencia: 0, golpe: 0 }], itens: [{ nome: "Kit de aventureiro", qtd: 1, volume: 10 }, { nome: "Tocha", qtd: 5, volume: 1 }] };
    const c = calcular(f);
    expect(c.volume.total).toBe(45);
    expect(c.volume.sobrecarregado).toBe(70);
    expect(c.sobrecarregado).toBe(false);
    expect(calcular({ ...f, itens: [{ nome: "Pedra", qtd: 5, volume: 10 }] }).sobrecarregado).toBe(true);
  });

  it("carrega save antigo sem equipamento e limpa equipamento inválido", () => {
    const velho = normalizarFicha({ nome: "X" })!;
    expect(velho.armas).toEqual([]);
    expect(velho.dinheiro.po).toBe(15);
    const sujo = normalizarFicha({ ...ana, armadura: "nada", armas: [{ id: "maca", potencia: 9, golpe: -1 }, { id: "laser" }], itens: [{ nome: "Corda", qtd: "x", volume: 1 }] })!;
    expect(sujo.armadura).toBe("");
    expect(sujo.armas).toEqual([{ id: "maca", potencia: 3, golpe: 0 }]);
    expect(sujo.itens).toEqual([{ nome: "Corda", qtd: 1, volume: 1 }]);
  });

  it("calcula ataque e CD de magia do conjurador", () => {
    const m = dadosMagia(ana)!;
    expect(m.tradicao).toBe("divina");
    expect(m.ataque).toBe(7);
    expect(m.cd).toBe(17);
    expect(dadosMagia({ ...ana, nivel: 7 })!.prof).toBe("especialista");
    expect(dadosMagia({ ...ana, classe: "guerreiro", chave: "for" })).toBeNull();
  });

  it("conta os espaços de magia por nível", () => {
    const conta = (classe: string, nivel: number, r: number) => vagasMagia({ classe, nivel }).filter((v) => v.circulo === r).length;
    expect(conta("clerigo", 1, 0)).toBe(5);
    expect(conta("clerigo", 1, 1)).toBe(2);
    expect(conta("clerigo", 3, 1)).toBe(3);
    expect(conta("clerigo", 3, 2)).toBe(2);
    expect(conta("feiticeiro", 2, 1)).toBe(4);
    expect(vagasMagia({ classe: "clerigo", nivel: 20 })).toHaveLength(5 + 9 * 3 + 1);
    expect(vagasMagia({ classe: "ladino", nivel: 20 })).toEqual([]);
  });

  it("pede tradição pro feiticeiro e conta pontos de foco", () => {
    const f: Ficha = { ...ana, classe: "feiticeiro", chave: "car" };
    expect(pendencias(f)).toContain("Escolha a tradição de magia.");
    expect(pontosFoco({ foco: ["a", " ", "b", "c", "d"] })).toBe(3);
  });

  it("limpa magias inválidas ao carregar", () => {
    const f = normalizarFicha({ ...ana, tradicao: "x", magias: { "truque-1": "Luz", lixo: "y", "r1-1": 3 }, foco: ["Cura de Toque", 5] })!;
    expect(f.tradicao).toBe("");
    expect(f.magias).toEqual({ "truque-1": "Luz" });
    expect(f.foco).toEqual(["Cura de Toque"]);
  });
});
