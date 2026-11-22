import { describe, expect, it } from "vitest";
import { climaDoDia, pomboDoDia, propostaDoDia } from "./clima";
import { CLIMAS, LAJE, PLANTAS, planta } from "./config";
import {
  assentar,
  atualizar,
  colher,
  comprarDecoracao,
  comprarSemente,
  espantar,
  infoDoVaso,
  melhorarVaso,
  novoSave,
  plantar,
  pomboAgora,
  posicionar,
  regar,
  temEspantalho,
  trocar,
  vasoVazio,
  vender,
} from "./motor";
import { migrar, normalizarImportado, saveCoerente } from "./save";
import { DIA, HORA, MIN, diaDe, inicioDoDia } from "./tempo";
import type { Save, Vaso } from "./tipos";

const D0 = 20_000;

/** Acha (seed, dia) que cumpre o critério; os testes não dependem de seed escolhida a dedo. */
function achar<T>(f: (seed: string, dia: number) => T | null): { seed: string; dia: number; valor: T } {
  for (let i = 0; i < 500; i++) {
    const seed = `t${i}`;
    for (let dia = D0; dia < D0 + 6; dia++) {
      const valor = f(seed, dia);
      if (valor) return { seed, dia, valor };
    }
  }
  throw new Error("nenhuma seed serve pra esse teste");
}
const diaComClima = (c: string) => achar((s, d) => (climaDoDia(s, d).clima === c ? true : null));

const vasoPlantado = (slug: string, em: number, agua: number = LAJE.aguaAoPlantar): Vaso => ({ slot: 0, planta: slug, plantadoEm: em, agua, aguaEm: em, nivel: 1, crescimentoMs: 0 });
const frac = (v: Vaso) => v.crescimentoMs / (planta(v.planta!)!.crescimentoMin * MIN);

describe("crescimento por tempo real", () => {
  const { seed, dia } = diaComClima("sol");
  const t0 = inicioDoDia(dia);

  it("com água em dia a cebolinha passa pelas 4 fases e fica pronta em 6h", () => {
    const v = vasoPlantado("cebolinha", t0);
    const fase = (h: number) => infoDoVaso(assentar(v, t0 + h * HORA, seed))!.fase;
    expect(fase(0.5)).toBe("semente");
    expect(fase(1.5)).toBe("broto");
    expect(fase(3)).toBe("crescendo");
    expect(fase(6)).toBe("pronta");
  });

  it("regando de tempos em tempos o tomate-cereja fica pronto em 20h; sem regar, não", () => {
    let v = vasoPlantado("tomate-cereja", t0);
    for (const h of [5, 10, 15]) v = { ...assentar(v, t0 + h * HORA, seed), agua: 100, aguaEm: t0 + h * HORA };
    expect(infoDoVaso(assentar(v, t0 + 20 * HORA, seed))!.fase).toBe("pronta");

    const seca = assentar(vasoPlantado("tomate-cereja", t0), t0 + 20 * HORA, seed);
    expect(infoDoVaso(seca)!.fase).not.toBe("pronta");
    expect(frac(seca)).toBeGreaterThan(0.3); // cresceu devagar, não parou
  });

  it("sem água a planta murcha, mas nunca morre: segue crescendo e termina", () => {
    const v = vasoPlantado("morango", t0);
    const murcha = assentar(v, t0 + 12 * HORA, seed);
    expect(murcha.agua).toBeLessThanOrEqual(LAJE.limiarMurcha);
    expect(infoDoVaso(murcha)!.murcha).toBe(true);
    expect(murcha.planta).toBe("morango");
    expect(murcha.crescimentoMs).toBeGreaterThan(0);
    // 12h depois de seca ela está atrás de uma regada, mas anda a 40% do ritmo.
    const regada = assentar(vasoPlantado("morango", t0), t0 + 12 * HORA, seed);
    expect(frac(murcha)).toBeCloseTo(frac(regada), 5);
    const semana = assentar(v, t0 + 7 * DIA, seed);
    expect(infoDoVaso(semana)!.fase).toBe("pronta");
    expect(semana.agua).toBeGreaterThanOrEqual(0);
  });

  it("regar recupera a planta murcha e ela volta ao ritmo normal", () => {
    const s0 = novoSave(seed, t0);
    const p = plantar(s0, t0, 0, "cebolinha");
    expect(p.ok).toBe(true);
    if (!p.ok) return;
    const tarde = t0 + 10 * HORA;
    const seca = atualizar(p.save, tarde); // 10h de sol sem regar: murcha
    expect(infoDoVaso(seca.vasos[0])!.murcha).toBe(true);
    const r = regar(p.save, tarde, 0);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.save.vasos[0].agua).toBe(100);
      expect(infoDoVaso(r.save.vasos[0])!.murcha).toBe(false);
    }
  });

  it("não guarda tempo a mais: planta pronta continua pronta e o crescimento não passa do total", () => {
    const v = assentar(vasoPlantado("alface", t0), t0 + 5 * DIA, seed);
    expect(v.crescimentoMs).toBe(planta("alface")!.crescimentoMin * MIN);
  });

  it("estima quando chega a próxima fase", () => {
    const v = vasoPlantado("cebolinha", t0);
    const info = infoDoVaso(v)!;
    expect(info.proximaFaseEm).toBe(t0 + Math.ceil(0.15 * 6 * HORA));
    expect(infoDoVaso(assentar(v, t0 + 6 * HORA, seed))!.proximaFaseEm).toBeNull();
  });
});

describe("clima do jogo", () => {
  it("chuva rega todos os vasos", () => {
    const { seed, dia } = diaComClima("chuva");
    const c = climaDoDia(seed, dia);
    const t0 = inicioDoDia(dia);
    const secos = [vasoPlantado("cebolinha", t0, 0), vasoPlantado("girassol", t0, 5)];
    for (const v of secos) expect(assentar(v, c.chuvaFim!, seed).agua).toBe(100);
    // e no começo da chuva já estava seco
    expect(assentar(secos[0], c.chuvaIni! - MIN, seed).agua).toBeLessThan(20);
  });

  it("sol forte seca mais rápido que sol normal", () => {
    const forte = diaComClima("solForte");
    const normal = diaComClima("sol");
    const perda = (seed: string, dia: number) => {
      const t0 = inicioDoDia(dia);
      return 100 - assentar(vasoPlantado("cebolinha", t0, 100), t0 + 4 * HORA, seed).agua;
    };
    expect(perda(forte.seed, forte.dia)).toBeCloseTo(perda(normal.seed, normal.dia) * LAJE.clima.sede.solForte, 5);
  });

  it("mesma seed dá o mesmo clima; seeds diferentes, não", () => {
    const seq = (s: string) => Array.from({ length: 60 }, (_, i) => climaDoDia(s, D0 + i));
    expect(seq("abc")).toEqual(seq("abc"));
    expect(seq("abc")).not.toEqual(seq("xyz"));
    const vistos = new Set(Array.from({ length: 400 }, (_, i) => climaDoDia("variado", D0 + i).clima));
    expect([...vistos].sort()).toEqual([...CLIMAS].sort());
  });

  it("a mesma seed também repete pombo e proposta do vizinho", () => {
    expect(pomboDoDia("abc", D0, false)).toEqual(pomboDoDia("abc", D0, false));
    expect(propostaDoDia("abc", D0)).toEqual(propostaDoDia("abc", D0));
  });

  it("o dia vira à meia-noite de Brasília", () => {
    const meiaNoite = inicioDoDia(D0);
    expect(diaDe(meiaNoite)).toBe(D0);
    expect(diaDe(meiaNoite - 1)).toBe(D0 - 1);
    expect(new Date(meiaNoite).toISOString().slice(11, 16)).toBe("03:00");
  });
});

describe("pombo e espantalho", () => {
  const prontoNoDia = (seed: string, dia: number, extra: Partial<Save> = {}): Save => {
    const s = novoSave(seed, inicioDoDia(dia) - DIA);
    s.inventario.meta.pomboDia = dia - 1;
    const total = planta("cebolinha")!.crescimentoMin * MIN;
    s.vasos[0] = { ...vasoPlantado("cebolinha", inicioDoDia(dia) - 10 * HORA, 100), aguaEm: inicioDoDia(dia), crescimentoMs: total };
    return Object.assign(s, extra);
  };
  const dia1 = achar((s, d) => (pomboDoDia(s, d, false).aparece ? true : null));
  const pd = pomboDoDia(dia1.seed, dia1.dia, false);

  it("sem espantar, o pombo bica o vaso pronto e a colheita vem menor", () => {
    const r = colher(prontoNoDia(dia1.seed, dia1.dia), pd.fim + MIN, 0);
    expect(r.ok && r.save.colhido.qtd).toBe(Math.round(4 * (1 - LAJE.pombo.perda)));
  });

  it("tocar no pombo dentro da janela espanta e a colheita vem inteira", () => {
    const s = prontoNoDia(dia1.seed, dia1.dia);
    expect(pomboAgora(s, pd.inicio + MIN).aqui).toBe(true);
    const e = espantar(s, pd.inicio + MIN);
    expect(e.ok).toBe(true);
    if (!e.ok) return;
    const r = colher(e.save, pd.fim + MIN, 0);
    expect(r.ok && r.save.colhido.qtd).toBe(4);
  });

  it("não dá pra espantar antes de ele chegar nem depois de ele ir", () => {
    const s = prontoNoDia(dia1.seed, dia1.dia);
    expect(espantar(s, pd.inicio - MIN)).toEqual({ ok: false, erro: "sem-pombo" });
    expect(espantar(s, pd.fim + MIN)).toEqual({ ok: false, erro: "sem-pombo" });
  });

  it("colher durante a visita do pombo também escapa da bicada", () => {
    const r = colher(prontoNoDia(dia1.seed, dia1.dia), pd.inicio + MIN, 0);
    expect(r.ok && r.save.colhido.qtd).toBe(4);
  });

  it("o espantalho faz o pombo aparecer bem menos", () => {
    let sem = 0;
    let com = 0;
    for (let i = 0; i < 600; i++) {
      if (pomboDoDia("freq", D0 + i, false).aparece) sem++;
      if (pomboDoDia("freq", D0 + i, true).aparece) com++;
    }
    expect(com).toBeLessThan(sem * 0.6);
    expect(sem / 600).toBeCloseTo(LAJE.pombo.chance, 1);
  });

  it("num dia em que só o espantalho evitaria o pombo, a colheita vem inteira sem precisar espantar", () => {
    const d = achar((s, dia) => (pomboDoDia(s, dia, false).aparece && !pomboDoDia(s, dia, true).aparece ? true : null));
    const s = prontoNoDia(d.seed, d.dia);
    s.decoracoes = { "canto-esq": "espantalho" };
    expect(temEspantalho(s)).toBe(true);
    const fim = pomboDoDia(d.seed, d.dia, false).fim;
    const r = colher(s, fim + MIN, 0);
    expect(r.ok && r.save.colhido.qtd).toBe(4);
  });
});

describe("colheita", () => {
  const { seed, dia } = diaComClima("sol");
  const t0 = inicioDoDia(dia);

  it("só colhe quando a fase é pronta", () => {
    const p = plantar(novoSave(seed, t0), t0, 0, "cebolinha");
    if (!p.ok) throw new Error("plantar falhou");
    expect(colher(p.save, t0 + 3 * HORA, 0)).toEqual({ ok: false, erro: "nao-pronta" });
    expect(colher(p.save, t0 + 3 * HORA, 5)).toEqual({ ok: false, erro: "vaso-vazio" });
  });

  it("a colheita vai pro cesto, esvazia o vaso e respeita o nível do vaso", () => {
    const s = novoSave(seed, t0);
    s.vasos[2] = { ...vasoPlantado("cebolinha", t0, 100), slot: 2, nivel: 2, crescimentoMs: 6 * HORA };
    const r = colher(s, t0 + MIN, 2);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.save.colhido).toEqual({ planta: "cebolinha", qtd: 5 }); // 4 × 1,25
    expect(r.save.inventario.colheita.cebolinha).toBe(5);
    expect(r.save.vasos[2].planta).toBeNull();
    expect(r.save.vasos[2].nivel).toBe(2);
  });

  it("plantar gasta semente, e não planta sem semente nem em vaso ocupado", () => {
    const s = novoSave(seed, t0);
    const p = plantar(s, t0, 0, "cebolinha");
    expect(p.ok && p.save.inventario.sementes.cebolinha).toBe(LAJE.sementesIniciais.cebolinha - 1);
    expect(plantar(s, t0, 0, "morango")).toEqual({ ok: false, erro: "sem-semente" });
    if (p.ok) expect(plantar(p.save, t0, 0, "alface")).toEqual({ ok: false, erro: "vaso-ocupado" });
    expect(plantar(s, t0, 99, "alface")).toEqual({ ok: false, erro: "invalido" });
  });
});

describe("troca com o vizinho", () => {
  const { seed, dia } = diaComClima("sol");
  const t0 = inicioDoDia(dia) + 9 * HORA;
  const farto = () => {
    const s = novoSave(seed, t0);
    for (const p of PLANTAS) s.inventario.colheita[p.slug] = 20;
    return s;
  };

  it("troca uma vez por dia e libera de novo no dia seguinte", () => {
    const a = trocar(farto(), t0);
    expect(a.ok).toBe(true);
    if (!a.ok) return;
    expect(a.save.inventario.meta.ultimaTrocaDia).toBe(dia);
    expect(trocar(a.save, t0 + HORA)).toEqual({ ok: false, erro: "troca-feita" });
    expect(trocar(a.save, t0 + DIA).ok).toBe(true);
  });

  it("entrega o que a proposta promete e tira o que ela pede", () => {
    const s = farto();
    const prop = propostaDoDia(seed, dia);
    const r = trocar(s, t0);
    if (!r.ok) throw new Error("troca falhou");
    expect(r.save.inventario.colheita[prop.pede.colheita]).toBe(20 - prop.pede.qtd);
    if (prop.da.tipo === "moedas") expect(r.save.moedas).toBe(s.moedas + prop.da.qtd);
    else expect(r.save.inventario.sementes[prop.da.slug]).toBe((s.inventario.sementes[prop.da.slug] ?? 0) + prop.da.qtd);
  });

  it("sem o que o vizinho pede, não troca e não gasta o dia", () => {
    expect(trocar(novoSave(seed, t0), t0)).toEqual({ ok: false, erro: "estoque" });
  });
});

describe("compra e venda", () => {
  const t0 = inicioDoDia(D0) + 9 * HORA;
  const base = () => novoSave("loja", t0);

  it("vende colheita por moedinhas", () => {
    const s = base();
    s.inventario.colheita.alface = 4;
    const r = vender(s, t0, "alface", 3);
    expect(r.ok && r.save.moedas).toBe(s.moedas + 3 * planta("alface")!.precoVenda);
    expect(r.ok && r.save.inventario.colheita.alface).toBe(1);
  });

  it("não vende o que não tem", () => {
    expect(vender(base(), t0, "alface", 1)).toEqual({ ok: false, erro: "estoque" });
  });

  it("compra semente e recusa com saldo insuficiente", () => {
    const s = base(); // 30 moedinhas
    const r = comprarSemente(s, t0, "morango", 1); // 22
    expect(r.ok && r.save.moedas).toBe(s.moedas - 22);
    if (r.ok) expect(comprarSemente(r.save, t0, "morango", 1)).toEqual({ ok: false, erro: "saldo" });
  });

  it("não aceita quantidade inválida nem planta que não existe", () => {
    expect(comprarSemente(base(), t0, "morango", 0)).toEqual({ ok: false, erro: "invalido" });
    expect(comprarSemente(base(), t0, "morango", -3)).toEqual({ ok: false, erro: "invalido" });
    expect(comprarSemente(base(), t0, "abacate", 1)).toEqual({ ok: false, erro: "invalido" });
  });

  it("melhora o vaso até o máximo e recusa com saldo insuficiente", () => {
    const s = base();
    expect(melhorarVaso(s, t0, 0)).toEqual({ ok: false, erro: "saldo" });
    s.moedas = 1000;
    const a = melhorarVaso(s, t0, 0);
    if (!a.ok) throw new Error("melhorar falhou");
    expect(a.save.vasos[0].nivel).toBe(2);
    expect(a.save.moedas).toBe(1000 - LAJE.vaso.preco[1]);
    const b = melhorarVaso(a.save, t0, 0);
    expect(b.ok && b.save.vasos[0].nivel).toBe(3);
    if (b.ok) expect(melhorarVaso(b.save, t0, 0)).toEqual({ ok: false, erro: "nivel-max" });
  });

  it("compra decoração, posiciona no encaixe certo e troca de lugar", () => {
    const s = base();
    s.moedas = 500;
    const a = comprarDecoracao(s, t0, "rede");
    if (!a.ok) throw new Error("comprar falhou");
    expect(comprarDecoracao(a.save, t0, "rede")).toEqual({ ok: false, erro: "ja-tem" });
    expect(posicionar(a.save, t0, "mureta", "rede")).toEqual({ ok: false, erro: "encaixe" });
    const p = posicionar(a.save, t0, "canto-esq", "rede");
    if (!p.ok) throw new Error("posicionar falhou");
    expect(p.save.decoracoes["canto-esq"]).toBe("rede");
    expect(p.save.inventario.decoracoes.rede).toBe(0);
    const q = posicionar(p.save, t0, "canto-esq", null);
    expect(q.ok && q.save.inventario.decoracoes.rede).toBe(1);
    expect(posicionar(base(), t0, "canto-esq", "rede")).toEqual({ ok: false, erro: "nao-tem" });
  });

  it("decoração cara demais dá saldo insuficiente", () => {
    expect(comprarDecoracao(base(), t0, "espantalho")).toEqual({ ok: false, erro: "saldo" });
  });
});

describe("save", () => {
  const t0 = inicioDoDia(D0);

  it("um save novo é válido e sobrevive ao JSON", () => {
    const s = novoSave("abc", t0);
    expect(migrar(JSON.parse(JSON.stringify(s)))).toEqual(s);
    expect(saveCoerente(s, t0)).toBe(true);
    expect(s.vasos).toHaveLength(LAJE.vasos);
  });

  it("recusa lixo, versão do futuro e vaso faltando", () => {
    expect(migrar(null)).toBeNull();
    expect(migrar({ v: 99 })).toBeNull();
    const s = novoSave("abc", t0);
    expect(migrar({ ...s, vasos: s.vasos.slice(1) })).toBeNull();
    expect(migrar({ ...s, v: LAJE.versaoSave + 1 })).toBeNull();
  });

  it("recusa moedas impossíveis e planta inventada", () => {
    const s = novoSave("abc", t0);
    expect(saveCoerente({ ...s, moedas: 5_000_000 }, t0)).toBe(false);
    const ruim = novoSave("abc", t0);
    ruim.vasos[0].planta = "abacate";
    expect(saveCoerente(ruim, t0)).toBe(false);
  });

  it("ao migrar pra conta, nada fica no futuro do servidor", () => {
    const s = novoSave("abc", t0 + 5 * DIA);
    s.vasos[0] = vasoPlantado("alface", t0 + 6 * DIA);
    s.inventario.meta.ultimaTrocaDia = D0 + 50;
    const n = normalizarImportado(s, t0);
    expect(n.criadoEm).toBe(t0);
    expect(n.vasos[0].aguaEm).toBe(t0);
    expect(n.vasos[0].plantadoEm).toBe(t0);
    expect(n.inventario.meta.ultimaTrocaDia).toBe(D0);
  });

  it("vaso vazio não gasta água nem cresce", () => {
    const v = vasoVazio(0, t0);
    expect(assentar(v, t0 + 3 * DIA, "abc")).toBe(v);
  });
});
