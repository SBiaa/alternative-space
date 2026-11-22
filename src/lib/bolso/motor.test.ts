import { describe, expect, it } from "vitest";
import { aventuraTeste, personagemTeste } from "./fixtures";
import { escolher, iniciar, opcoesDaCena, recompensasDe, resumoDaPartida } from "./motor";
import { rolarDados } from "./regras";
import { migrar } from "./save";

const a = aventuraTeste();
const novo = (seed = "semente-1", p = personagemTeste()) => iniciar(a, p, seed);

// Acha uma seed em que o primeiro teste cai na faixa pedida (dificuldade 8, Mente 3, mais o bônus de talento).
function seedPara(faixa: "sucesso" | "custo" | "falha", bonus = 1) {
  for (let i = 0; i < 5000; i++) {
    const seed = `semente-${i}`;
    const total = rolarDados(seed, 1).reduce((x, y) => x + y, 0) + 3 + bonus;
    if (faixa === "sucesso" && total >= 8) return seed;
    if (faixa === "custo" && total >= 6 && total < 8) return seed;
    if (faixa === "falha" && total < 6) return seed;
  }
  throw new Error("sem seed");
}

describe("motor de cenas", () => {
  it("começa na cena inicial com o fôlego cheio e sem itens", () => {
    const e = novo();
    expect(e.cena).toBe("a");
    expect(e.folego).toBe(e.folegoMax);
    expect(e.itens).toEqual([]);
    expect(e.rolagens).toBe(0);
  });

  it("sucesso aplica o efeito de sucesso e segue pra proxima", () => {
    const r = escolher(a, novo(seedPara("sucesso")), "arriscar");
    if (!r.ok) throw new Error(r.erro);
    expect(r.rolagem?.faixa).toBe("sucesso");
    expect(r.estado.itens).toEqual(["chave"]);
    expect(r.estado.folego).toBe(r.estado.folegoMax);
    expect(r.estado.cena).toBe("b");
    expect(r.estado.rolagens).toBe(1);
    expect(r.estado.porFaixa).toEqual({ sucesso: 1, custo: 0, falha: 0 });
  });

  it("sucesso com custo gasta fôlego e segue", () => {
    const r = escolher(a, novo(seedPara("custo")), "arriscar");
    if (!r.ok) throw new Error(r.erro);
    expect(r.rolagem?.faixa).toBe("custo");
    expect(r.estado.folego).toBe(r.estado.folegoMax - 1);
    expect(r.estado.cena).toBe("b");
  });

  it("falha avança a história pelo desvio e nunca trava", () => {
    // Sem o talento que ajuda (Observador), o total mínimo (1+1+3) cai abaixo de 6.
    const p = personagemTeste({ talentos: ["corredor", "blefe"] });
    const r = escolher(a, novo(seedPara("falha", 0), p), "arriscar");
    if (!r.ok) throw new Error(r.erro);
    expect(r.rolagem?.faixa).toBe("falha");
    expect(r.estado.cena).toBe("c");
    expect(r.estado.folego).toBe(r.estado.folegoMax - 2);
    expect(opcoesDaCena(a, r.estado).length).toBeGreaterThan(0);
  });

  it("talento do personagem entra na conta só quando a aventura lista aquele talento", () => {
    const seed = seedPara("sucesso");
    const com = escolher(a, novo(seed, personagemTeste({ talentos: ["observador", "corredor"] })), "arriscar");
    const sem = escolher(a, novo(seed, personagemTeste({ talentos: ["corredor", "blefe"] })), "arriscar");
    if (!com.ok || !sem.ok) throw new Error("falhou");
    expect(com.rolagem!.bonusTalento).toBe(1);
    expect(sem.rolagem!.bonusTalento).toBe(0);
    expect(com.rolagem!.total).toBe(sem.rolagem!.total + 1);
  });

  it("fôlego zerado leva ao final alternativo, não a game over", () => {
    const r = escolher(a, novo(), "cansar");
    if (!r.ok) throw new Error(r.erro);
    expect(r.estado.folego).toBe(0);
    expect(r.estado.cena).toBe("f-folego");
    expect(r.terminou).toBe(true);
    expect(r.estado.final).toEqual({ id: "folego", tipo: "alternativo" });
    expect(resumoDaPartida(a, r.estado)?.tipo).toBe("alternativo");
  });

  it("requisito de item bloqueia a opção até ter o item", () => {
    let e = novo();
    const r1 = escolher(a, e, "pegar-marca");
    if (!r1.ok) throw new Error(r1.erro);
    e = r1.estado;
    expect(opcoesDaCena(a, e).find((o) => o.opcao.id === "porta")?.bloqueada).toBe(true);
    expect(escolher(a, e, "porta").ok).toBe(false);
    const r2 = escolher(a, { ...e, itens: ["chave"] }, "porta");
    expect(r2.ok && r2.estado.cena).toBe("f-bom");
  });

  it("recusa opção que não existe na cena atual e depois do fim", () => {
    expect(escolher(a, novo(), "porta").ok).toBe(false);
    const fim = escolher(a, novo(), "cansar");
    if (!fim.ok) throw new Error();
    expect(escolher(a, fim.estado, "arriscar")).toEqual({ ok: false, erro: "Essa aventura já terminou." });
  });

  it("marcas e itens não se repetem e saem nas recompensas", () => {
    let e = novo();
    for (let i = 0; i < 2; i++) {
      const r = escolher(a, { ...e, cena: "a" }, "pegar-marca");
      if (!r.ok) throw new Error();
      e = r.estado;
    }
    expect(e.marcas).toEqual(["valente"]);
    expect(recompensasDe(a, e).marcas.map((m) => m.nome)).toEqual(["Valente"]);
  });

  it("a mesma seed com as mesmas escolhas repete a partida inteira", () => {
    const jogar = (seed: string) => {
      let e = novo(seed);
      const caminho: string[] = [];
      for (const op of ["arriscar", "fim"]) {
        const r = escolher(a, e, op);
        if (!r.ok) {
          // O desvio de falha vai pra cena c, que só tem "seguir".
          const r2 = escolher(a, e, "seguir");
          if (!r2.ok) throw new Error(r2.erro);
          e = r2.estado;
        } else e = r.estado;
        caminho.push(e.cena);
      }
      return { e, caminho };
    };
    expect(jogar("repete-1")).toEqual(jogar("repete-1"));
  });

  it("o estado sobrevive ao ciclo gravar e ler (migrar)", () => {
    const r = escolher(a, novo(seedPara("sucesso")), "arriscar");
    if (!r.ok) throw new Error();
    expect(migrar(JSON.parse(JSON.stringify(r.estado)))).toEqual(r.estado);
    expect(migrar({ ...r.estado, folego: -3 })).toBeNull();
    expect(migrar(null)).toBeNull();
  });
});
