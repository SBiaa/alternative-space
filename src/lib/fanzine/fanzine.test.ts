import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { lerCapitulo, schemaCapitulo, validarCapitulo, visaoPublica } from "./conteudo";
import { acharPista, conferir, deducoesFeitas, dicasLiberadas, faltamDeducoes, ligar, pedirDica } from "./motor";
import { migrar, migrarLocalParaConta, progressoVazio, sanear, unir } from "./save";
import type { Capitulo, Progresso } from "./tipos";

const bruto = () => JSON.parse(fs.readFileSync(path.join(process.cwd(), "content", "fanzine", "cruz-mansa", "capitulo.json"), "utf8"));
const cap = (): Capitulo => lerCapitulo(bruto());
const comPistas = (c: Capitulo, ids: string[], extra: Partial<Progresso> = {}): Progresso => ({ ...progressoVazio(), clues: ids, ...extra });
const TODAS = (c: Capitulo) => c.pistas.map((p) => p.id);

describe("validação do conteúdo", () => {
  it("aceita o capítulo 1", () => {
    expect(validarCapitulo(cap())).toEqual([]);
  });
  it("recusa pista numa página que não existe", () => {
    const b = bruto();
    b.pistas[0].pagina = "pagina-99";
    expect(() => lerCapitulo(b)).toThrow(/pagina-99/);
  });
  it("recusa ligação que aponta pra pista que não existe", () => {
    const b = bruto();
    b.ligacoes[0].pistas = ["carimbo", "fantasma"];
    expect(() => lerCapitulo(b)).toThrow(/fantasma/);
  });
  it("recusa ligação de uma pista com ela mesma e par repetido", () => {
    const a = bruto();
    a.ligacoes[0].pistas = ["carimbo", "carimbo"];
    expect(() => lerCapitulo(a)).toThrow(/ela mesma/);
    const b = bruto();
    b.ligacoes.push({ ...b.ligacoes[0], id: "outra" });
    expect(() => lerCapitulo(b)).toThrow(/já tem outra dedução/);
  });
  it("recusa pergunta cuja resposta não dá pra alcançar a partir das ligações", () => {
    const b = bruto();
    b.pergunta.partes[0].exige = ["nao-existe"];
    expect(() => lerCapitulo(b)).toThrow(/nao-existe/);
    const c = bruto();
    c.pergunta.partes[1].exige = [];
    expect(() => lerCapitulo(c)).toThrow(/chutar/);
  });
  it("recusa resposta certa fora das opções e área fora da página", () => {
    const b = bruto();
    b.pergunta.partes[2].certa = "outra";
    expect(() => lerCapitulo(b)).toThrow(/fora das opções/);
    const c = bruto();
    c.pistas[0].area = { x: 0.9, y: 0.1, w: 0.3, h: 0.1 };
    expect(() => lerCapitulo(c)).toThrow(/sai da página/);
  });
  it("recusa pista sem descrição pra leitor de tela", () => {
    const b = bruto();
    b.pistas[0].descricao = "";
    expect(schemaCapitulo.safeParse(b).success).toBe(false);
  });
});

describe("visão pública", () => {
  it("não leva ligações, resposta certa, exigências nem dicas pro navegador", () => {
    const c = cap();
    const texto = JSON.stringify(visaoPublica(c));
    expect(texto).not.toContain('"certa"');
    expect(texto).not.toContain('"exige"');
    expect(texto).not.toContain("ligacoes");
    expect(texto).not.toContain("faltou");
    for (const d of c.dicas) expect(texto).not.toContain(d);
    for (const l of c.ligacoes) expect(texto).not.toContain(l.texto);
  });
});

describe("pistas e ligações", () => {
  it("marca a pista uma vez só e recusa pista inexistente", () => {
    const c = cap();
    const a = acharPista(c, progressoVazio(), "carimbo");
    expect(a).toMatchObject({ ok: true, nova: true });
    if (!a.ok) throw new Error();
    expect(acharPista(c, a.prog, "carimbo")).toMatchObject({ ok: true, nova: false });
    expect(acharPista(c, a.prog, "fantasma")).toEqual({ ok: false, erro: "pista" });
  });
  it("ligação válida vira dedução, em qualquer ordem", () => {
    const c = cap();
    const p = comPistas(c, ["carimbo", "caixa-postal"]);
    for (const [a, b] of [["carimbo", "caixa-postal"], ["caixa-postal", "carimbo"]]) {
      const r = ligar(c, p, a, b);
      expect(r).toMatchObject({ ok: true, resultado: "certa", jaTinha: false });
      if (r.ok && r.resultado === "certa") expect(r.prog.deductions).toEqual(["cruz-mansa"]);
    }
  });
  it("ligação repetida não duplica", () => {
    const c = cap();
    const p = comPistas(c, ["carimbo", "caixa-postal"], { deductions: ["cruz-mansa"] });
    const r = ligar(c, p, "carimbo", "caixa-postal");
    expect(r).toMatchObject({ ok: true, resultado: "certa", jaTinha: true });
    if (r.ok && r.resultado === "certa") expect(r.prog.deductions).toEqual(["cruz-mansa"]);
  });
  it("ligação que o conteúdo não prevê não fecha e não custa nada", () => {
    const c = cap();
    const p = comPistas(c, ["carimbo", "assinatura-bf"]);
    expect(ligar(c, p, "carimbo", "assinatura-bf")).toEqual({ ok: true, resultado: "nao_fecha" });
    expect(p.deductions).toEqual([]);
  });
  it("recusa pista repetida, inexistente ou ainda não marcada", () => {
    const c = cap();
    const p = comPistas(c, ["carimbo"]);
    expect(ligar(c, p, "carimbo", "carimbo")).toEqual({ ok: false, erro: "iguais" });
    expect(ligar(c, p, "carimbo", "fantasma")).toEqual({ ok: false, erro: "pista" });
    expect(ligar(c, p, "carimbo", "caixa-postal")).toEqual({ ok: false, erro: "sem_pista" });
  });
  it("lista as deduções feitas com as pistas de cada uma", () => {
    const c = cap();
    const f = deducoesFeitas(c, comPistas(c, TODAS(c), { deductions: ["lia-editora"] }));
    expect(f).toHaveLength(1);
    expect(f[0].pistas).toEqual(["letra-estrela", "assinatura-lm"]);
  });
});

describe("pergunta", () => {
  const certas = { quem: "lia", onde: "garagem", porque: "papelaria-fechou" };
  const todasDeducoes = (c: Capitulo) => c.ligacoes.map((l) => l.id);

  it("resolve quando acerta as três partes e tem as deduções", () => {
    const c = cap();
    const r = conferir(c, comPistas(c, TODAS(c), { deductions: todasDeducoes(c) }), certas);
    expect(r.resolvida).toBe(true);
    if (r.resolvida) expect(r.prog.solved).toBe(true);
  });
  it("não resolve chute certo sem as deduções, e mostra o que faltou", () => {
    const c = cap();
    const r = conferir(c, comPistas(c, TODAS(c)), certas);
    expect(r.resolvida).toBe(false);
    if (!r.resolvida) {
      expect(r.faltou).toContain(c.ligacoes.find((l) => l.id === "lia-editora")!.faltou);
      expect(r.faltou).toContain(c.ligacoes.find((l) => l.id === "fim-papelaria")!.faltou);
    }
  });
  it("errar não pune e não entrega a resposta certa", () => {
    const c = cap();
    const p = comPistas(c, TODAS(c), { deductions: todasDeducoes(c) });
    const r = conferir(c, p, { ...certas, quem: "beto" });
    expect(r).toEqual({ resolvida: false, faltou: [] });
    expect(p.deductions).toHaveLength(c.ligacoes.length);
    expect(p.solved).toBe(false);
  });
  it("resposta em branco não resolve", () => {
    const c = cap();
    expect(conferir(c, comPistas(c, TODAS(c), { deductions: todasDeducoes(c) }), {}).resolvida).toBe(false);
  });
  it("conta quantas deduções ainda faltam", () => {
    const c = cap();
    expect(faltamDeducoes(c, progressoVazio())).toBe(4);
    expect(faltamDeducoes(c, comPistas(c, TODAS(c), { deductions: todasDeducoes(c) }))).toBe(0);
  });
});

describe("dicas", () => {
  it("libera uma por vez, na ordem, sem tirar nada", () => {
    const c = cap();
    let p = comPistas(c, ["carimbo"], { deductions: [] });
    for (const n of [1, 2, 3]) {
      const r = pedirDica(c, p);
      expect(r).toMatchObject({ ok: true, nivel: n, texto: c.dicas[n - 1] });
      if (!r.ok) throw new Error();
      p = r.prog;
      expect(p.clues).toEqual(["carimbo"]);
      expect(dicasLiberadas(c, p)).toEqual(c.dicas.slice(0, n));
    }
    expect(pedirDica(c, p)).toEqual({ ok: false, erro: "acabaram" });
    expect(p.hints).toBe(3);
  });
});

describe("save e migração do progresso local pra conta", () => {
  it("migra save sem versão e recusa lixo ou versão do futuro", () => {
    expect(migrar({ clues: ["a"], deductions: [], hints: 1, solved: false })).toMatchObject({ v: 1, clues: ["a"], hints: 1 });
    expect(migrar(null)).toBeNull();
    expect(migrar({ v: 99, clues: [], deductions: [], hints: 0, solved: false })).toBeNull();
    expect(migrar({ v: 1, clues: "x", deductions: [], hints: 0, solved: false })).toBeNull();
    expect(migrar({ v: 1, clues: [], deductions: [], hints: 7, solved: false })).toBeNull();
  });
  it("sanear tira pista inexistente e dedução sem as duas pistas", () => {
    const c = cap();
    const s = sanear(c, { v: 1, clues: ["carimbo", "fantasma", "carimbo"], deductions: ["cruz-mansa", "inventada", "lia-editora"], hints: 2, solved: true }, false);
    expect(s.clues).toEqual(["carimbo"]);
    expect(s.deductions).toEqual([]);
    expect(s.solved).toBe(false);
    expect(s.hints).toBe(2);
  });
  it("leva as pistas do aparelho pra conta e une com o que a conta já tinha", () => {
    const c = cap();
    const local = { v: 1, clues: ["carimbo", "caixa-postal", "data"], deductions: ["cruz-mansa"], hints: 1, solved: false };
    const conta: Progresso = { v: 1, clues: ["aviso-papelaria", "data"], deductions: ["fim-papelaria"], hints: 2, solved: false };
    const r = migrarLocalParaConta(c, local, conta);
    expect(new Set(r.clues)).toEqual(new Set(["carimbo", "caixa-postal", "data", "aviso-papelaria"]));
    expect(new Set(r.deductions)).toEqual(new Set(["cruz-mansa", "fim-papelaria"]));
    expect(r.hints).toBe(2);
  });
  it("não deixa o aparelho dar o selo: 'resolvido' local não migra", () => {
    const c = cap();
    const r = migrarLocalParaConta(c, { v: 1, clues: [], deductions: [], hints: 0, solved: true }, null);
    expect(r.solved).toBe(false);
  });
  it("save local adulterado não ganha dedução nem pista que não tem", () => {
    const c = cap();
    const r = migrarLocalParaConta(c, { v: 1, clues: ["carimbo"], deductions: c.ligacoes.map((l) => l.id), hints: 0, solved: false }, null);
    expect(r.deductions).toEqual([]);
    expect(migrarLocalParaConta(c, "lixo", null)).toEqual(progressoVazio());
  });
  it("união nunca perde o que já foi ganho", () => {
    const a: Progresso = { v: 1, clues: ["x"], deductions: [], hints: 3, solved: true };
    const b: Progresso = { v: 1, clues: ["y"], deductions: ["d"], hints: 0, solved: false };
    expect(unir(a, b)).toEqual({ v: 1, clues: ["x", "y"], deductions: ["d"], hints: 3, solved: true });
    expect(unir(null, null)).toEqual(progressoVazio());
  });
});
