import { describe, expect, it } from "vitest";
import { conferir, estadoVazio, faltamSinais, olharLugar, perguntar, podeDecidir, respostaValida, sanear } from "./investigacao";
import { lerCasosDe } from "./conteudo";
import type { Caso } from "./schema";

const casos = lerCasosDe();
const saci = casos.find((c) => c.publico.slug === "sumico-na-venda") as Caso;
const certa = { criatura: "saci", motivo: "agrado", escolha: "presente" };

describe("coleta de sinais", () => {
  it("olhar um lugar coleta só o que já dá pra perceber", () => {
    const r = olharLugar(saci.publico, estadoVazio(), "sitio");
    if (!r.ok) throw new Error("deveria olhar");
    // pegada-um-pe e isqueiro-no-bambu dependem de outros sinais.
    expect(r.novos).toEqual(["redemoinho-estrada", "assobio-bambuzal"]);
    const de_novo = olharLugar(saci.publico, r.estado, "sitio");
    if (!de_novo.ok) throw new Error("deveria olhar");
    expect(de_novo.novos).toEqual(["pegada-um-pe", "isqueiro-no-bambu"]);
  });

  it("olhar de novo não duplica nem perde nada", () => {
    const a = olharLugar(saci.publico, estadoVazio(), "venda");
    if (!a.ok) throw new Error();
    const b = olharLugar(saci.publico, a.estado, "venda");
    if (!b.ok) throw new Error();
    expect(b.novos).toEqual([]);
    expect(b.estado.sinais).toEqual(["peneira-sumida"]);
  });

  it("pergunta travada não rende nada, e a liberada rende sinal e depoimento", () => {
    const travada = perguntar(saci.publico, estadoVazio(), "seu-tonico", "tonico-avo");
    expect(travada).toEqual({ ok: false, erro: "travada" });
    const t1 = perguntar(saci.publico, estadoVazio(), "seu-tonico", "tonico-sumicos");
    if (!t1.ok) throw new Error();
    expect(t1.novos).toEqual(["peneira-sumida"]);
    expect(t1.estado.depoimentos).toEqual(["tonico-sumicos"]);
    const repetida = perguntar(saci.publico, t1.estado, "seu-tonico", "tonico-sumicos");
    if (!repetida.ok) throw new Error();
    expect(repetida.jaFeita).toBe(true);
    expect(repetida.estado).toEqual(t1.estado);
  });

  it("fala que depende de outra só abre depois dela", () => {
    expect(perguntar(saci.publico, estadoVazio(), "dona-cidinha", "cidinha-cavalo")).toEqual({ ok: false, erro: "travada" });
    const v = perguntar(saci.publico, estadoVazio(), "dona-cidinha", "cidinha-vento");
    if (!v.ok) throw new Error();
    const c = perguntar(saci.publico, v.estado, "dona-cidinha", "cidinha-cavalo");
    expect(c.ok).toBe(true);
  });

  it("recusa morador e fala que não existem", () => {
    expect(perguntar(saci.publico, estadoVazio(), "ninguem", "x").ok).toBe(false);
    expect(perguntar(saci.publico, estadoVazio(), "seu-tonico", "x").ok).toBe(false);
  });

  it("conta quantos sinais faltam pra decidir", () => {
    const e = { ...estadoVazio(), sinais: ["peneira-sumida", "redemoinho-estrada"] };
    expect(faltamSinais(saci.publico, e)).toBe(2);
    expect(podeDecidir(saci.publico, e)).toBe(false);
    expect(podeDecidir(saci.publico, { ...e, sinais: [...e.sinais, "assobio-bambuzal", "pegada-um-pe"] })).toBe(true);
  });

  it("sanear tira ids inventados e limita tentativas", () => {
    const e = sanear(saci.publico, { sinais: ["peneira-sumida", "peneira-sumida", "inventado"], depoimentos: ["x", "tonico-avo"], tentativas: -4 });
    expect(e).toEqual({ sinais: ["peneira-sumida"], depoimentos: ["tonico-avo"], tentativas: 0 });
    expect(sanear(saci.publico, { sinais: [], depoimentos: [], tentativas: 99_999 }).tentativas).toBeLessThan(99_999);
  });
});

describe("conferir a resposta", () => {
  it("acerta e entrega desfecho, origem e resumo do bestiário", () => {
    const r = conferir(saci, certa, 0);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.criatura).toBe("saci");
      expect(r.origem.titulo).toBe("Saci");
      expect(r.desfecho.length).toBeGreaterThan(0);
    }
  });

  it("erra com dica da primeira parte errada, e a dica fica mais direta a cada tentativa", () => {
    const g = saci.gabarito;
    const c1 = conferir(saci, { ...certa, criatura: "curupira" }, 0);
    const c2 = conferir(saci, { ...certa, criatura: "curupira" }, 1);
    const c9 = conferir(saci, { ...certa, criatura: "curupira" }, 9);
    expect(c1).toEqual({ ok: false, dica: g.dicas.criatura[0] });
    expect(c2).toEqual({ ok: false, dica: g.dicas.criatura[1] });
    expect(c9).toEqual({ ok: false, dica: g.dicas.criatura[g.dicas.criatura.length - 1] });
    expect(conferir(saci, { ...certa, motivo: "espantar" }, 0)).toEqual({ ok: false, dica: g.dicas.motivo[0] });
    expect(conferir(saci, { ...certa, escolha: "trancar" }, 0)).toEqual({ ok: false, dica: g.dicas.escolha[0] });
  });

  it("a resposta errada não devolve nada do gabarito", () => {
    const r = conferir(saci, { ...certa, criatura: "iara" }, 0);
    const texto = JSON.stringify(r);
    expect(r.ok).toBe(false);
    expect(texto).not.toContain("origem");
    expect(texto).not.toContain("desfecho");
    expect(Object.keys(r)).toEqual(["ok", "dica"]);
  });

  it("só aceita respostas com opções que existem no caso", () => {
    expect(respostaValida(saci.publico, certa)).toBe(true);
    expect(respostaValida(saci.publico, { ...certa, criatura: "mula" })).toBe(false);
    expect(respostaValida(saci.publico, { ...certa, escolha: "x" })).toBe(false);
    expect(respostaValida(saci.publico, null)).toBe(false);
    expect(respostaValida(saci.publico, { criatura: 1, motivo: 2, escolha: 3 })).toBe(false);
  });
});
