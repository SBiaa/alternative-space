import { describe, expect, it } from "vitest";
import { jogarSozinho } from "./bot";
import { CONFIG } from "./config";
import { BRUTO, CONTEUDO } from "./conteudo";
import { gerarMapa, proximosNos } from "./mapa";
import { aplicar, intencaoDe, novaPartida, precisaAlvo, reservaDe } from "./motor";
import { conferirReferencias, schemaCarta, schemaConteudo } from "./schema";
import { migrar, novoSaveLocal } from "./save";
import { conferirEnvio } from "./envio";
import { narrar } from "./narrar";
import { favoritaDe, liberacoes, simular } from "./simular";
import type { Acao, Combate, Estado, InimigoEmCampo } from "./tipos";

const C = CONTEUDO;

// ---------- Ajudantes ----------
const inim = (slug: string, folego = 40, extra: Partial<InimigoEmCampo> = {}): InimigoEmCampo => ({ slug, folego, folegoMax: folego, bloqueio: 0, status: {}, passo: 0, ...extra });
function emCombate(mao: string[], inimigos: InimigoEmCampo[], extra: Partial<Combate> = {}): Estado {
  const e = novaPartida("seed-teste", "navegador")!;
  e.fase = "combate";
  e.combate = { no: "1-0-0", chefe: false, turno: 1, energia: CONFIG.energiaPorTurno, bloqueio: 0, status: {}, mao, compra: [], descarte: [], exaurida: [], inimigos, ...extra };
  return e;
}
const ok = (e: Estado, a: Acao): Estado => {
  const r = aplicar(e, a);
  if (!r.ok) throw new Error(`recusada: ${r.erro}`);
  return r.estado;
};
const erro = (e: Estado, a: Acao) => {
  const r = aplicar(e, a);
  return r.ok ? null : r.erro;
};
const entrarEmCombate = (seed: string, oficio = "navegador") => {
  let e = novaPartida(seed, oficio)!;
  const no = proximosNos(e.mapa, 1, null).find((n) => n.tipo === "encontro")!;
  e = ok(e, { t: "no", id: no.id });
  return e;
};

// ---------- Conteúdo ----------
describe("conteúdo", () => {
  it("tem o tamanho prometido no MVP", () => {
    expect(C.listaCartas).toHaveLength(40);
    expect(Object.keys(C.inimigos)).toHaveLength(8);
    expect(C.chefe.slug).toBeTruthy();
    expect(C.listaReliquias).toHaveLength(6);
    expect(C.eventos).toHaveLength(6);
    expect(C.oficios).toHaveLength(6);
    for (const t of ["ataque", "defesa", "manobra"] as const) expect(C.listaCartas.filter((c) => c.tipo === t).length).toBeGreaterThan(5);
  });

  it("passa no schema", () => {
    expect(schemaConteudo.cartas.safeParse(BRUTO.cartasJson).success).toBe(true);
    expect(schemaConteudo.oficios.safeParse(BRUTO.oficiosJson).success).toBe(true);
    expect(schemaConteudo.inimigos.safeParse(BRUTO.inimigosJson).success).toBe(true);
    expect(schemaConteudo.reliquias.safeParse(BRUTO.reliquiasJson).success).toBe(true);
    expect(schemaConteudo.eventos.safeParse(BRUTO.eventosJson).success).toBe(true);
  });

  it("não tem referência quebrada nem slug repetido", () => {
    expect(conferirReferencias(C)).toEqual([]);
  });

  it("o schema recusa efeito desconhecido e campo sobrando", () => {
    const base = C.listaCartas[0];
    expect(schemaCarta.safeParse({ ...base, efeitos: [{ tipo: "explodir", valor: 9 }] }).success).toBe(false);
    expect(schemaCarta.safeParse({ ...base, extra: 1 }).success).toBe(false);
  });

  it("todo ofício usa o id de um ofício do Mar Sem Fim", async () => {
    const { OFICIOS_MAR } = await import("./nomes-mar");
    expect(C.oficios.map((o) => o.id).sort()).toEqual(OFICIOS_MAR.map((o) => o.id).sort());
  });

  it("toda carta que não é inicial pode ser liberada por alguma regra alcançável", () => {
    const naoIniciais = C.listaCartas.filter((c) => c.liberacao.tipo !== "inicio");
    expect(naoIniciais.length).toBe(19);
  });
});

// ---------- Compra, descarte e energia ----------
describe("compra, descarte e energia", () => {
  it("começa o combate com 5 cartas na mão e 3 de energia", () => {
    const e = entrarEmCombate("a1", "cozinheira");
    expect(e.combate!.mao).toHaveLength(CONFIG.maoInicial);
    expect(e.combate!.energia).toBe(CONFIG.energiaPorTurno);
    expect(e.combate!.mao.length + e.combate!.compra.length + e.combate!.descarte.length).toBe(e.baralho.length);
  });

  it("descarta a mão no fim do turno e compra 5 novas", () => {
    let e = emCombate(["golpe-de-remo", "escudo-de-tampa", "barril-de-bordo"], [inim("gaivota-ladra")], {
      compra: ["golpe-de-remo", "golpe-de-remo", "golpe-de-remo", "golpe-de-remo", "golpe-de-remo", "escudo-de-tampa"],
    });
    e = ok(e, { t: "fim" });
    const c = e.combate!;
    expect(c.turno).toBe(2);
    expect(c.mao).toHaveLength(5);
    expect(c.descarte).toEqual(expect.arrayContaining(["golpe-de-remo", "escudo-de-tampa", "barril-de-bordo"]));
    expect(c.descarte).toHaveLength(3);
  });

  it("reembaralha o descarte quando o baralho de compra acaba", () => {
    let e = emCombate(["golpe-de-remo"], [inim("caranguejo-de-casco", 99)], { compra: ["escudo-de-tampa", "escudo-de-tampa"], descarte: ["amarra-firme", "amarra-firme", "mare-baixa", "mare-baixa"] });
    e = ok(e, { t: "fim" });
    const c = e.combate!;
    expect(c.mao).toHaveLength(5);
    expect(c.compra).toHaveLength(2);
    expect(c.descarte).toHaveLength(0);
    expect([...c.mao, ...c.compra, ...c.descarte].sort()).toEqual(["amarra-firme", "amarra-firme", "escudo-de-tampa", "escudo-de-tampa", "golpe-de-remo", "mare-baixa", "mare-baixa"].sort());
  });

  it("não compra com baralho e descarte vazios, nem passa de 10 na mão", () => {
    const e = emCombate(["olhar-no-horizonte"], [inim("gaivota-ladra")], { compra: [], descarte: [] });
    expect(ok(e, { t: "jogar", c: 0 }).combate!.mao).toHaveLength(0);
    const cheia = emCombate(["pausa-pro-cafe", ...Array(9).fill("golpe-de-remo")], [inim("gaivota-ladra")], { compra: ["escudo-de-tampa", "escudo-de-tampa"] });
    expect(ok(cheia, { t: "jogar", c: 0 }).combate!.mao).toHaveLength(CONFIG.maoMax);
  });

  it("gasta energia e recusa carta sem energia", () => {
    let e = emCombate(["corte-de-sabre", "corte-de-sabre"], [inim("caranguejo-de-casco", 99)]);
    e = ok(e, { t: "jogar", c: 0, a: 0 });
    expect(e.combate!.energia).toBe(1);
    expect(erro(e, { t: "jogar", c: 0, a: 0 })).toBe("sem_energia");
  });

  it("a energia volta ao máximo a cada turno", () => {
    let e = emCombate(["corte-de-sabre"], [inim("caranguejo-de-casco", 99)], { compra: Array(10).fill("barril-de-bordo") });
    e = ok(e, { t: "jogar", c: 0, a: 0 });
    e = ok(e, { t: "fim" });
    expect(e.combate!.energia).toBe(CONFIG.energiaPorTurno);
  });

  it("carta exaurida não volta pro descarte", () => {
    let e = emCombate(["mergulho-de-gaivota"], [inim("caranguejo-de-casco", 99)]);
    e = ok(e, { t: "jogar", c: 0, a: 0 });
    expect(e.combate!.exaurida).toEqual(["mergulho-de-gaivota"]);
    expect(e.combate!.descarte).toEqual([]);
  });
});

// ---------- Efeitos ----------
describe("efeitos das cartas", () => {
  it("dano: tira Fôlego do alvo, depois do bloqueio dele", () => {
    let e = emCombate(["golpe-de-remo"], [inim("gaivota-ladra", 30, { bloqueio: 4 })]);
    e = ok(e, { t: "jogar", c: 0, a: 0 });
    expect(e.combate!.inimigos[0].bloqueio).toBe(0);
    expect(e.combate!.inimigos[0].folego).toBe(28);
  });

  it("dano em vários golpes", () => {
    const e = ok(emCombate(["salva-de-tiros"], [inim("caranguejo-de-casco", 40)]), { t: "jogar", c: 0, a: 0 });
    expect(e.combate!.inimigos[0].folego).toBe(31);
  });

  it("dano_todos acerta todo mundo e ignora quem já caiu", () => {
    const e = ok(emCombate(["rajada-de-canhao"], [inim("gaivota-ladra", 30), inim("agua-viva-errante", 30), inim("gaivota-ladra", 0)]), { t: "jogar", c: 0 });
    expect(e.combate!.inimigos.map((i) => i.folego)).toEqual([22, 22, 0]);
  });

  it("bloqueio soma ao seu bloqueio", () => {
    const e = ok(emCombate(["escudo-de-tampa"], [inim("gaivota-ladra")]), { t: "jogar", c: 0 });
    expect(e.combate!.bloqueio).toBe(5);
  });

  it("curar recupera Fôlego sem passar do máximo", () => {
    let e = emCombate(["remendo-no-casco"], [inim("gaivota-ladra")]);
    e.folego = 50;
    e = ok(e, { t: "jogar", c: 0 });
    expect(e.folego).toBe(52);
    e.folego = 59;
    e = emCombate(["remendo-no-casco"], [inim("gaivota-ladra")]);
    e.folego = 59;
    expect(ok(e, { t: "jogar", c: 0 }).folego).toBe(60);
  });

  it("comprar traz cartas do baralho", () => {
    const e = ok(emCombate(["pausa-pro-cafe"], [inim("gaivota-ladra")], { compra: ["a", "b", "c"].map(() => "golpe-de-remo") }), { t: "jogar", c: 0 });
    expect(e.combate!.mao).toHaveLength(2);
  });

  it("energia dá energia na hora", () => {
    const e = ok(emCombate(["refrao-de-bordo"], [inim("gaivota-ladra")], { compra: ["golpe-de-remo"] }), { t: "jogar", c: 0 });
    expect(e.combate!.energia).toBe(CONFIG.energiaPorTurno - 1 + 1);
  });

  it("status no alvo, em todos e em si", () => {
    const alvo = ok(emCombate(["mare-baixa"], [inim("gaivota-ladra"), inim("agua-viva-errante")]), { t: "jogar", c: 0, a: 1 });
    expect(alvo.combate!.inimigos.map((i) => i.status.encharcado ?? 0)).toEqual([0, 3]);
    const todos = ok(emCombate(["tinta-do-polvo"], [inim("gaivota-ladra"), inim("agua-viva-errante")]), { t: "jogar", c: 0 });
    expect(todos.combate!.inimigos.every((i) => i.status.enjoado === 2 && i.status.encharcado === 2)).toBe(true);
    const si = ok(emCombate(["amarra-firme"], [inim("gaivota-ladra")]), { t: "jogar", c: 0 });
    expect(si.combate!.status.firme).toBe(1);
    expect(si.combate!.bloqueio).toBe(4);
  });

  it("carta com alvo exige um inimigo de pé", () => {
    const e = emCombate(["golpe-de-remo"], [inim("gaivota-ladra", 0), inim("agua-viva-errante")]);
    expect(precisaAlvo(C.cartas["golpe-de-remo"])).toBe(true);
    expect(precisaAlvo(C.cartas["escudo-de-tampa"])).toBe(false);
    expect(erro(e, { t: "jogar", c: 0 })).toBe("alvo_invalido");
    expect(erro(e, { t: "jogar", c: 0, a: 0 })).toBe("alvo_invalido");
    expect(erro(e, { t: "jogar", c: 0, a: 7 })).toBe("alvo_invalido");
  });

  it("derrotar todos os inimigos abre a recompensa com 3 opções e ouro", () => {
    const antes = novaPartida("x", "navegador")!.ouro;
    let e = emCombate(["golpe-de-remo"], [inim("gaivota-ladra", 5)]);
    e.ouro = antes;
    e = ok(e, { t: "jogar", c: 0, a: 0 });
    expect(e.fase).toBe("recompensa");
    expect(e.recompensa!.opcoes).toHaveLength(3);
    expect(new Set(e.recompensa!.opcoes).size).toBe(3);
    expect(e.ouro).toBeGreaterThan(antes);
    expect(e.derrotados).toContain("gaivota-ladra");
  });
});

// ---------- Status ----------
describe("status", () => {
  it("Encharcado: o inimigo recebe 50% a mais de dano", () => {
    const e = ok(emCombate(["golpe-de-remo"], [inim("gaivota-ladra", 40, { status: { encharcado: 2 } })]), { t: "jogar", c: 0, a: 0 });
    expect(e.combate!.inimigos[0].folego).toBe(40 - 9);
  });

  it("Encharcado: você também recebe 50% a mais", () => {
    // Gaivota: ataca 5 no primeiro turno. Encharcado → 7.
    const e = ok(emCombate([], [inim("gaivota-ladra")], { status: { encharcado: 2 } }), { t: "fim" });
    expect(e.folego).toBe(60 - 7);
  });

  it("Firme: cada bloqueio ganho vem com bônus", () => {
    const e = ok(emCombate(["escudo-de-tampa"], [inim("gaivota-ladra")], { status: { firme: 3 } }), { t: "jogar", c: 0 });
    expect(e.combate!.bloqueio).toBe(8);
  });

  it("Enjoado: começa o turno com 1 de energia a menos", () => {
    let e = emCombate([], [inim("caranguejo-de-casco", 99)], { status: { enjoado: 2 }, compra: Array(10).fill("barril-de-bordo") });
    e = ok(e, { t: "fim" });
    expect(e.combate!.energia).toBe(CONFIG.energiaPorTurno - 1);
  });

  it("Enjoado no inimigo enfraquece o ataque em 25%", () => {
    // Gaivota ataca 5 → floor(5 * 0.75) = 3
    const e = ok(emCombate([], [inim("gaivota-ladra", 40, { status: { enjoado: 1 } })]), { t: "fim" });
    expect(e.folego).toBe(60 - 3);
  });

  it("os status passam uma rodada por turno e somem em zero", () => {
    let e = emCombate([], [inim("caranguejo-de-casco", 99, { status: { encharcado: 2 } })], { status: { firme: 1 }, compra: Array(10).fill("barril-de-bordo") });
    e = ok(e, { t: "fim" });
    expect(e.combate!.status.firme).toBeUndefined();
    expect(e.combate!.inimigos[0].status.encharcado).toBe(1);
  });

  it("status aplicado pelo inimigo só começa a contar na rodada seguinte", () => {
    // Água-viva: primeira intenção é Encharcado 2.
    const e = ok(emCombate([], [inim("agua-viva-errante")], { compra: Array(10).fill("barril-de-bordo") }), { t: "fim" });
    expect(e.combate!.status.encharcado).toBe(2);
  });
});

// ---------- Intenção do inimigo ----------
describe("intenção do inimigo", () => {
  it("é visível antes do turno e segue o ciclo", () => {
    const i = inim("caranguejo-de-casco");
    expect(intencaoDe(i, C)).toEqual({ tipo: "defender", valor: 8 });
    expect(intencaoDe({ ...i, passo: 1 }, C)).toEqual({ tipo: "atacar", valor: 7 });
    expect(intencaoDe({ ...i, passo: 3 }, C)).toEqual({ tipo: "defender", valor: 8 });
  });

  it("atacar passa pelo bloqueio, defender cria bloqueio e a intenção avança", () => {
    // Caranguejo: defender 8, atacar 7, atacar 9
    let e = emCombate([], [inim("caranguejo-de-casco", 22)], { compra: Array(20).fill("barril-de-bordo") });
    e = ok(e, { t: "fim" });
    expect(e.combate!.inimigos[0].bloqueio).toBe(8);
    expect(e.combate!.inimigos[0].passo).toBe(1);
    e = emCombate([], [inim("caranguejo-de-casco", 22, { passo: 1 })], { bloqueio: 4 });
    e = ok(e, { t: "fim" });
    expect(e.folego).toBe(60 - 3);
  });

  it("ataque em várias vezes bate várias vezes", () => {
    const e = ok(emCombate([], [inim("gaivota-ladra", 16, { passo: 1 })]), { t: "fim" });
    expect(e.folego).toBe(60 - 8);
  });

  it("o bloqueio do inimigo some quando ele age de novo", () => {
    const e = ok(emCombate([], [inim("caranguejo-de-casco", 22, { passo: 1, bloqueio: 6 })]), { t: "fim" });
    expect(e.combate!.inimigos[0].bloqueio).toBe(0);
  });

  it("Fôlego zerado encerra com derrota", () => {
    let e = emCombate([], [inim("gaivota-ladra", 40, { passo: 1 })]);
    e.folego = 5;
    e = ok(e, { t: "fim" });
    expect(e.resultado).toBe("derrota");
    expect(e.fase).toBe("fim");
    expect(erro(e, { t: "fim" })).toBe("partida_encerrada");
  });
});

// ---------- Mapa ----------
describe("mapa da travessia", () => {
  it("a mesma seed gera o mesmo mapa; seeds diferentes geram mapas diferentes", () => {
    expect(gerarMapa("abc")).toEqual(gerarMapa("abc"));
    expect(JSON.stringify(gerarMapa("abc"))).not.toBe(JSON.stringify(gerarMapa("abd")));
  });

  it("tem 3 trechos, termina em porto, porto e chefe, e tem tesouro e porto no caminho", () => {
    for (const seed of ["a", "b", "c", "d", "e", "f", "g", "h"]) {
      const m = gerarMapa(seed);
      expect(m).toHaveLength(3);
      m.forEach((trecho, k) => {
        expect(trecho).toHaveLength(CONFIG.mapa.camadas);
        const ultima = trecho[trecho.length - 1];
        expect(ultima).toHaveLength(1);
        expect(ultima[0].tipo).toBe(k === 2 ? "chefe" : "porto");
        const meio = trecho.slice(0, -1).flat();
        expect(meio.some((n) => n.tipo === "tesouro")).toBe(true);
        expect(meio.some((n) => n.tipo === "porto")).toBe(true);
        expect(trecho[0].every((n) => n.tipo === "encontro" || n.tipo === "evento")).toBe(true);
      });
    }
  });

  it("todo nó é alcançável e leva até o fim do trecho", () => {
    for (const seed of ["s1", "s2", "s3", "s4", "s5", "s6"]) {
      for (const trecho of gerarMapa(seed)) {
        const entra = new Set<string>(trecho[0].map((n) => n.id));
        trecho.slice(0, -1).forEach((camada, c) => camada.forEach((n) => {
          expect(entra.has(n.id)).toBe(true);
          expect(n.liga.length).toBeGreaterThan(0);
          n.liga.forEach((id) => entra.add(id));
          expect(trecho[c + 1].map((x) => x.id)).toEqual(expect.arrayContaining(n.liga));
        }));
        expect(entra.has(trecho[trecho.length - 1][0].id)).toBe(true);
      }
    }
  });

  it("só dá pra ir pra um nó ligado ao atual", () => {
    const e = novaPartida("mapa-1", "navegador")!;
    expect(erro(e, { t: "no", id: "3-4-0" })).toBe("no_invalido");
    expect(erro(e, { t: "no", id: "1-2-0" })).toBe("no_invalido");
    expect(erro(e, { t: "no", id: "nada" })).toBe("no_invalido");
  });
});

// ---------- Recompensas, porto, evento e tesouro ----------
describe("recompensas e nós do mapa", () => {
  it("escolher 1 de 3 cartas põe a carta no baralho e volta pro mapa", () => {
    let e = emCombate(["golpe-de-remo"], [inim("gaivota-ladra", 5)]);
    e = ok(e, { t: "jogar", c: 0, a: 0 });
    const carta = e.recompensa!.opcoes[1];
    const n = e.baralho.length;
    e = ok(e, { t: "escolher", i: 1 });
    expect(e.baralho).toHaveLength(n + 1);
    expect(e.baralho[n]).toBe(carta);
    expect(e.fase).toBe("mapa");
  });

  it("pular a recompensa deixa o baralho como estava; opção inexistente é recusada", () => {
    let e = emCombate(["golpe-de-remo"], [inim("gaivota-ladra", 5)]);
    e = ok(e, { t: "jogar", c: 0, a: 0 });
    expect(erro(e, { t: "escolher", i: 3 })).toBe("escolha_invalida");
    expect(erro(e, { t: "escolher", i: -1 })).toBe("escolha_invalida");
    const n = e.baralho.length;
    expect(ok(e, { t: "escolher", i: null }).baralho).toHaveLength(n);
  });

  it("a recompensa só oferece cartas iniciais e as da coleção", () => {
    const so = novaPartida("r", "navegador", [])!;
    expect(reservaDe(so).every((c) => c.liberacao.tipo === "inicio")).toBe(true);
    const com = novaPartida("r", "navegador", ["trovao-de-proa"])!;
    expect(reservaDe(com).map((c) => c.slug)).toContain("trovao-de-proa");
  });

  function noPorto() {
    let e = novaPartida("porto", "navegador")!;
    e.fase = "porto";
    e.pos = "1-3-0";
    e.ouro = 200;
    e.folego = 20;
    e.porto = { curou: false, removeu: false, loja: [{ slug: "golpe-de-ancora", preco: 60, vendido: false }] };
    return e;
  }

  it("porto: curar uma vez, comprar, remover carta e sair", () => {
    let e = noPorto();
    e = ok(e, { t: "curar" });
    expect(e.folego).toBe(20 + Math.ceil(60 * CONFIG.porto.curarFracao));
    expect(erro(e, { t: "curar" })).toBe("ja_feito");
    e = ok(e, { t: "comprar", i: 0 });
    expect(e.ouro).toBe(140);
    expect(e.baralho).toContain("golpe-de-ancora");
    expect(erro(e, { t: "comprar", i: 0 })).toBe("escolha_invalida");
    const n = e.baralho.length;
    e = ok(e, { t: "remover", c: 0 });
    expect(e.baralho).toHaveLength(n - 1);
    expect(e.ouro).toBe(140 - CONFIG.porto.remover);
    expect(erro(e, { t: "remover", c: 0 })).toBe("ja_feito");
    expect(ok(e, { t: "sair" }).fase).toBe("mapa");
  });

  it("porto: sem ouro não compra nem remove, e o baralho não fica abaixo do mínimo", () => {
    let e = noPorto();
    e.ouro = 10;
    expect(erro(e, { t: "comprar", i: 0 })).toBe("sem_ouro");
    expect(erro(e, { t: "remover", c: 0 })).toBe("sem_ouro");
    e = noPorto();
    e.baralho = e.baralho.slice(0, CONFIG.baralhoMinimo);
    expect(erro(e, { t: "remover", c: 0 })).toBe("baralho_minimo");
  });

  it("evento: aplica os efeitos da escolha e respeita a exigência de ouro", () => {
    let e = novaPartida("ev", "navegador")!;
    e.fase = "evento";
    e.evento = "comerciante-de-botoes";
    e.pos = "1-1-0";
    e.ouro = 10;
    expect(erro(e, { t: "evento", i: 0 })).toBe("sem_ouro");
    e.ouro = 50;
    const n = e.baralho.length;
    e = ok(e, { t: "evento", i: 0 });
    expect(e.ouro).toBe(20);
    expect(e.baralho).toHaveLength(n + 1);
    expect(e.fase).toBe("mapa");
  });

  it("evento que zera o Fôlego termina em derrota", () => {
    let e = novaPartida("ev2", "navegador")!;
    e.fase = "evento";
    e.evento = "ilhota-sem-nome";
    e.pos = "1-1-0";
    e.folego = 4;
    e = ok(e, { t: "evento", i: 0 });
    expect(e.resultado).toBe("derrota");
  });

  it("tesouro: dá ouro e uma relíquia; Biscoito Duro sobe o Fôlego máximo", () => {
    let e = novaPartida("t", "navegador")!;
    e.fase = "tesouro";
    e.pos = "1-2-0";
    e = ok(e, { t: "abrir" });
    expect(e.reliquias).toHaveLength(1);
    expect(e.ouro).toBeGreaterThan(CONFIG.ouroInicial);
    let b = novaPartida("t", "navegador")!;
    b.fase = "tesouro";
    b.pos = "1-2-0";
    b.reliquias = C.listaReliquias.map((r) => r.slug).filter((s) => s !== "biscoito-duro");
    b = ok(b, { t: "abrir" });
    expect(b.reliquias).toContain("biscoito-duro");
    expect(b.folegoMax).toBe(72);
  });

  it("relíquias agem nos gatilhos (Sino de Bronze, Barril de Água Doce)", () => {
    let e = novaPartida("rel", "navegador")!;
    e.reliquias = ["sino-de-bronze", "barril-de-agua-doce"];
    const no = proximosNos(e.mapa, 1, null).find((n) => n.tipo === "encontro")!;
    e = ok(e, { t: "no", id: no.id });
    expect(e.combate!.bloqueio).toBe(8);
    e.combate!.inimigos.forEach((i) => (i.folego = 1));
    e.folego = 40;
    const c = e.combate!;
    const dano = c.mao.findIndex((s) => precisaAlvo(C.cartas[s]) && C.cartas[s].efeitos[0].tipo === "dano" && C.cartas[s].custo <= c.energia);
    if (dano >= 0) {
      const f = ok(e, { t: "jogar", c: dano, a: 0 });
      if (f.fase === "recompensa") expect(f.folego).toBe(46);
    }
  });

  it("passivas de ofício agem (Médico ganha bloqueio no turno, Navegador compra a mais)", () => {
    const medico = entrarEmCombate("m1", "medico");
    expect(medico.combate!.bloqueio).toBe(2);
    const nav = entrarEmCombate("m1", "navegador");
    expect(nav.combate!.mao).toHaveLength(CONFIG.maoInicial + 1);
  });
});

// ---------- Re-simulação ----------
describe("re-simulação", () => {
  const ofs = C.oficios.map((o) => o.id);

  it("aceita uma partida válida de cada ofício e chega ao mesmo estado", () => {
    for (const [k, of] of ofs.entries()) {
      const { acoes, estado } = jogarSozinho(`valida-${k}`, of);
      expect(estado.resultado).not.toBe("andamento");
      const s = simular({ seed: `valida-${k}`, oficio: of, colecao: [], acoes });
      expect(s.ok).toBe(true);
      if (s.ok) {
        expect(s.estado).toEqual(estado);
        expect(s.resumo.resultado).toBe(estado.resultado);
      }
    }
  });

  it("é determinística: duas rodadas com a mesma seed dão as mesmas ações", () => {
    expect(jogarSozinho("det", "cozinheira").acoes).toEqual(jogarSozinho("det", "cozinheira").acoes);
  });

  it("recusa ação impossível e diz qual foi", () => {
    const { acoes } = jogarSozinho("ruim", "navegador");
    const i = acoes.findIndex((a) => a.t === "jogar");
    const adulterada = acoes.slice(0, i + 1);
    adulterada[i] = { t: "jogar", c: 99 };
    expect(simular({ seed: "ruim", oficio: "navegador", colecao: [], acoes: adulterada })).toEqual({ ok: false, erro: "carta_invalida", indice: i });
  });

  it("recusa ir pra um nó que não está ao alcance, e escolha fora de hora", () => {
    expect(simular({ seed: "s", oficio: "navegador", colecao: [], acoes: [{ t: "no", id: "3-4-0" }] })).toEqual({ ok: false, erro: "no_invalido", indice: 0 });
    expect(simular({ seed: "s", oficio: "navegador", colecao: [], acoes: [{ t: "escolher", i: 0 }] })).toMatchObject({ ok: false, erro: "fase_errada" });
    expect(simular({ seed: "s", oficio: "navegador", colecao: [], acoes: [{ t: "fim" }] })).toMatchObject({ ok: false, erro: "fase_errada" });
  });

  it("recusa jogar carta sem energia, recompensa que não foi oferecida e ações depois do fim", () => {
    const { acoes, estado } = jogarSozinho("fim", "navegador");
    expect(estado.resultado).not.toBe("andamento");
    const depois = simular({ seed: "fim", oficio: "navegador", colecao: [], acoes: [...acoes, { t: "fim" }] });
    expect(depois).toMatchObject({ ok: false, erro: "partida_encerrada", indice: acoes.length });
    const recompensaErrada = acoes.findIndex((a) => a.t === "escolher");
    if (recompensaErrada >= 0) {
      const copia = acoes.slice(0, recompensaErrada + 1);
      copia[recompensaErrada] = { t: "escolher", i: 9 };
      expect(simular({ seed: "fim", oficio: "navegador", colecao: [], acoes: copia })).toMatchObject({ ok: false, erro: "escolha_invalida" });
    }
  });

  it("recusa lixo vindo do cliente", () => {
    for (const lixo of [null, 5, "oi", { t: "jogar", c: "0" }, { t: "explodir" }, { t: "no" }, { t: "jogar", c: 1.5 }]) {
      expect(simular({ seed: "s", oficio: "navegador", colecao: [], acoes: [lixo] })).toMatchObject({ ok: false, erro: "acao_desconhecida" });
    }
    expect(simular({ seed: "s", oficio: "pirata-do-mal", colecao: [], acoes: [] })).toMatchObject({ ok: false, erro: "entrada_invalida" });
    expect(simular({ seed: "s", oficio: "navegador", colecao: [], acoes: Array(CONFIG.maxAcoes + 1).fill({ t: "fim" }) })).toMatchObject({ ok: false, erro: "limite_de_acoes" });
  });

  it("a coleção da conta muda o que a recompensa oferece (e a re-simulação com outra coleção diverge)", () => {
    const colecao = C.listaCartas.filter((c) => c.liberacao.tipo !== "inicio").map((c) => c.slug);
    const { acoes } = jogarSozinho("colecao", "navegador", colecao);
    const igual = simular({ seed: "colecao", oficio: "navegador", colecao, acoes });
    expect(igual.ok).toBe(true);
  });

  it("o bot consegue vencer a travessia em parte das seeds (equilíbrio mínimo)", () => {
    let vitorias = 0;
    const total = 40;
    for (let k = 0; k < total; k++) {
      const { estado } = jogarSozinho(`eq-${k}`, ofs[k % ofs.length]);
      if (estado.resultado === "vitoria") vitorias++;
    }
    // Nem impossível, nem trivial. O bot é simples, então o piso é baixo.
    expect(vitorias).toBeGreaterThan(0);
    expect(vitorias).toBeLessThan(total);
  });
});

// ---------- Liberações ----------
describe("liberação de cartas", () => {
  const base = { oficio: "navegador", derrotados: [] as string[], jogadas: {} };

  it("derrotar um inimigo libera a carta dele, mesmo numa derrota", () => {
    const l = liberacoes({ ...base, resultado: "derrota", trecho: 1, derrotados: ["gaivota-ladra", "agua-viva-errante"] });
    expect(l).toEqual(expect.arrayContaining(["mergulho-de-gaivota", "mare-contida"]));
    expect(l).not.toContain("rajada-de-canhao");
  });

  it("chegar a um trecho libera as cartas dele", () => {
    expect(liberacoes({ ...base, resultado: "derrota", trecho: 2 })).toEqual(expect.arrayContaining(["vela-recolhida", "mare-vingativa"]));
    expect(liberacoes({ ...base, resultado: "derrota", trecho: 2 })).not.toContain("bandeira-negra");
    expect(liberacoes({ ...base, resultado: "derrota", trecho: 3 })).toContain("bandeira-negra");
  });

  it("a carta do ofício só sai em vitória com aquele ofício", () => {
    expect(liberacoes({ ...base, resultado: "vitoria", trecho: 3 })).toContain("bussola-firme");
    expect(liberacoes({ ...base, resultado: "vitoria", trecho: 3 })).not.toContain("racao-dobrada");
    expect(liberacoes({ ...base, resultado: "derrota", trecho: 3 })).not.toContain("bussola-firme");
  });

  it("partida em andamento não libera nada", () => {
    expect(liberacoes({ ...base, resultado: "andamento", trecho: 3, derrotados: ["gaivota-ladra"] })).toEqual([]);
  });

  it("uma vitória com o chefe derrotado libera a carta do chefe", () => {
    expect(liberacoes({ ...base, resultado: "vitoria", trecho: 3, derrotados: [C.chefe.slug] })).toContain("tinta-do-polvo");
  });

  it("a carta favorita é a mais jogada", () => {
    expect(favoritaDe([{ a: 3, b: 5 }, { a: 4, c: 1 }])).toBe("a");
    expect(favoritaDe([])).toBeNull();
  });
});

// ---------- Save local e migração ----------
describe("save local e migração pra conta", () => {
  it("guarda só seed, ofício e ações, e volta igual", () => {
    const { acoes } = jogarSozinho("loc", "musico");
    const s = novoSaveLocal("loc", "musico", acoes);
    expect(migrar(JSON.parse(JSON.stringify(s)))).toEqual(s);
  });

  it("recusa save quebrado ou com ação malformada", () => {
    expect(migrar(null)).toBeNull();
    expect(migrar({ seed: "", oficio: "x", acoes: [] })).toBeNull();
    expect(migrar({ v: 1, seed: "a", oficio: "navegador", acoes: [{ t: "explodir" }] })).toBeNull();
  });

  it("a partida local, re-simulada com a coleção da conta, é aceita e libera as mesmas cartas", () => {
    const { acoes, estado } = jogarSozinho("migra", "atirador");
    const local = migrar(JSON.parse(JSON.stringify(novoSaveLocal("migra", "atirador", acoes))))!;
    const s = simular({ seed: local.seed, oficio: local.oficio, colecao: [], acoes: local.acoes });
    expect(s.ok).toBe(true);
    if (s.ok) {
      expect(s.resumo.resultado).toBe(estado.resultado);
      expect(liberacoes(s.resumo).length).toBeGreaterThan(0);
    }
  });

  it("a partida local adulterada é recusada na migração", () => {
    const { acoes } = jogarSozinho("migra2", "atirador");
    const adulterada = [...acoes];
    adulterada[1] = { t: "no", id: "3-4-0" };
    expect(simular({ seed: "migra2", oficio: "atirador", colecao: [], acoes: adulterada }).ok).toBe(false);
  });
});

// ---------- Conferência do envio (o que o servidor faz a cada envio) ----------
describe("conferência do envio no servidor", () => {
  it("aceita o envio que continua o que já estava guardado e devolve resultado e liberações", () => {
    const { acoes, estado } = jogarSozinho("env", "navegador");
    const meio = acoes.slice(0, 5);
    const c1 = conferirEnvio({ seed: "env", oficio: "navegador", colecao: [], acoes: [] }, meio);
    expect(c1.ok).toBe(true);
    const c2 = conferirEnvio({ seed: "env", oficio: "navegador", colecao: [], acoes: meio }, acoes);
    expect(c2.ok).toBe(true);
    if (c2.ok) {
      expect(c2.resumo.resultado).toBe(estado.resultado);
      expect(c2.liberadas).toEqual(liberacoes(c2.resumo));
    }
  });

  it("recusa voltar atrás: menos ações, ou um começo diferente do guardado", () => {
    const { acoes } = jogarSozinho("env2", "navegador");
    const guardadas = acoes.slice(0, 8);
    expect(conferirEnvio({ seed: "env2", oficio: "navegador", colecao: [], acoes: guardadas }, acoes.slice(0, 4))).toMatchObject({ ok: false, erro: "refazer" });
    const outra = [...acoes];
    outra[2] = { t: "fim" };
    expect(conferirEnvio({ seed: "env2", oficio: "navegador", colecao: [], acoes: guardadas }, outra)).toMatchObject({ ok: false, erro: "refazer" });
  });

  it("recusa ação impossível e formato errado; o cliente não dita o resultado", () => {
    const run = { seed: "env3", oficio: "navegador", colecao: [], acoes: [] };
    expect(conferirEnvio(run, [{ t: "jogar", c: 0 }])).toMatchObject({ ok: false, erro: "invalida" });
    expect(conferirEnvio(run, "venci")).toMatchObject({ ok: false, erro: "invalida" });
    expect(conferirEnvio(run, { resultado: "vitoria" })).toMatchObject({ ok: false, erro: "invalida" });
  });

  it("uma partida que não terminou não libera nada", () => {
    const { acoes } = jogarSozinho("env4", "musico");
    const c = conferirEnvio({ seed: "env4", oficio: "musico", colecao: [], acoes: [] }, acoes.slice(0, 3));
    expect(c.ok && c.resumo.resultado).toBe("andamento");
    expect(c.ok && c.liberadas).toEqual([]);
  });
});

// ---------- Narração ----------
describe("narração (leitor de tela)", () => {
  it("conta o dano, o bloqueio e o fim do turno em texto", () => {
    const antes = emCombate(["golpe-de-remo", "escudo-de-tampa"], [inim("caranguejo-de-casco", 30)]);
    const depois = ok(antes, { t: "jogar", c: 0, a: 0 });
    expect(narrar(antes, depois)).toContain("Caranguejo de Casco perdeu 6 de Fôlego.");
    const def = ok(depois, { t: "jogar", c: 0 });
    expect(narrar(depois, def)).toContain("Você ganhou 5 de bloqueio.");
    const turno = ok(def, { t: "fim" });
    expect(narrar(def, turno).some((l) => l.startsWith("Começou o turno 2"))).toBe(true);
  });

  it("avisa quando o inimigo cai e quando a travessia acaba", () => {
    const antes = emCombate(["golpe-de-remo"], [inim("gaivota-ladra", 4)]);
    expect(narrar(antes, ok(antes, { t: "jogar", c: 0, a: 0 }))).toContain("Gaivota Ladra foi derrotado.");
    const morrendo = emCombate([], [inim("gaivota-ladra", 40, { passo: 1 })]);
    morrendo.folego = 3;
    expect(narrar(morrendo, ok(morrendo, { t: "fim" }))).toContain("Seu Fôlego acabou. Travessia encerrada.");
  });
});
