import { describe, expect, it } from "vitest";
import {
  CAMINHO,
  COMPRIMENTO,
  MASTROS,
  ONDAS,
  ROTA,
  VIDAS_INICIAIS,
  casaEm,
  centro,
  colocar,
  iniciarOnda,
  livre,
  melhorar,
  novoEstado,
  posicao,
  step,
  valorVenda,
  vender,
  type Estado,
  type TipoTrip,
} from "./navio";

function rodar(e: Estado, segundos: number) {
  for (let t = 0; t < segundos && !e.fim; t += 1 / 60) step(e, 1 / 60);
}

function rodarOnda(e: Estado) {
  iniciarOnda(e);
  for (let t = 0; t < 600 && e.emOnda && !e.fim; t += 1 / 60) step(e, 1 / 60);
}

describe("convés", () => {
  it("a rota começa na prancha e termina na cabine", () => {
    expect(posicao(0)).toMatchObject(ROTA[0]);
    expect(posicao(COMPRIMENTO + 50)).toMatchObject({ x: ROTA.at(-1)!.x, y: ROTA.at(-1)!.y });
    expect(COMPRIMENTO).toBe(22 * 60);
  });

  it("não deixa colocar no caminho, no mastro ou em cima de alguém", () => {
    const e = novoEstado();
    expect(CAMINHO.has("0,1")).toBe(true);
    expect(livre(e, 0, 1)).toBe(false);
    const [mc, mr] = MASTROS[0];
    expect(livre(e, mc, mr)).toBe(false);
    expect(colocar(e, "espadachim", 1, 2)).not.toBeNull();
    expect(colocar(e, "espadachim", 1, 2)).toBeNull();
    expect(livre(e, 12, 0)).toBe(false);
  });

  it("acha a casa pelo ponto da tela", () => {
    const { x, y } = centro(4, 3);
    expect(casaEm(x, y)).toEqual({ col: 4, row: 3 });
    expect(casaEm(5, 5)).toBeNull();
  });
});

describe("moedas", () => {
  it("cobra pra contratar, melhorar e devolve parte na venda", () => {
    const e = novoEstado();
    const t = colocar(e, "atiradora", 1, 2)!;
    expect(e.moedas).toBe(150 - 70);
    expect(melhorar(e, t.id)).toBe(true);
    expect(e.moedas).toBe(10);
    expect(t.nivel).toBe(1);
    expect(melhorar(e, t.id)).toBe(false); // sem dinheiro
    const volta = valorVenda(t);
    expect(volta).toBe(Math.floor(140 * 0.7));
    expect(vender(e, t.id)).toBe(true);
    expect(e.moedas).toBe(10 + volta);
  });

  it("não contrata sem dinheiro", () => {
    const e = novoEstado();
    e.moedas = 10;
    expect(colocar(e, "canhoneiro", 1, 2)).toBeNull();
    expect(e.tripulantes).toHaveLength(0);
  });
});

describe("combate", () => {
  it("sem ninguém defendendo, a marinha leva o tesouro", () => {
    const e = novoEstado();
    for (let i = 0; i < ONDAS.length && !e.fim; i++) rodarOnda(e);
    expect(e.fim).toBe("derrota");
    expect(e.vidas).toBe(0);
  });

  it("quem chega na cabine tira vida", () => {
    const e = novoEstado();
    rodarOnda(e);
    expect(e.vidas).toBe(VIDAS_INICIAIS - 8);
    expect(e.emOnda).toBe(false);
  });

  it("derrubar marinheiro dá moeda e fechar a onda dá bônus", () => {
    const e = novoEstado();
    colocar(e, "espadachim", 2, 2);
    colocar(e, "espadachim", 4, 2);
    const antes = e.moedas;
    rodarOnda(e);
    expect(e.abatidos).toBeGreaterThan(0);
    expect(e.moedas).toBeGreaterThan(antes + e.ultimoBonus);
  });

  it("a navegadora deixa lento", () => {
    const e = novoEstado();
    colocar(e, "navegadora", 1, 2);
    iniciarOnda(e);
    rodar(e, 3);
    expect(e.inimigos.some((i) => i.lento > 0 && i.fatorLento < 1)).toBe(true);
  });

  it("o canhoneiro não acerta quem está colado", () => {
    const e = novoEstado();
    colocar(e, "canhoneiro", 4, 2); // casa (3,2) é caminho, a 60px dele
    const parado = (d: number) => ({ id: e.proxId++, tipo: "recruta" as const, d, x: 0, y: 0, ang: 0, vida: 50, vidaMax: 50, vel: 0, armadura: 0, lento: 0, fatorLento: 1, recompensa: 1, dano: 1, ferido: 0 });
    e.inimigos.push(parado(300));
    step(e, 1 / 60);
    expect(e.projeteis).toHaveLength(0);
    e.inimigos.push(parado(480)); // casa (3,4), longe o bastante
    step(e, 1 / 60);
    expect(e.projeteis).toHaveLength(1);
  });

  it("uma tripulação bem montada vence as 12 ondas", () => {
    const e = novoEstado();
    // Plano simples: contrata e melhora entre as ondas, sempre na mesma ordem.
    const plano: [TipoTrip, number, number][] = [
      ["espadachim", 2, 2],
      ["espadachim", 4, 3],
      ["navegadora", 4, 2],
      ["atiradora", 2, 3],
      ["cozinheiro", 6, 3],
      ["canhoneiro", 5, 3],
      ["atiradora", 8, 2],
      ["navegadora", 8, 3],
      ["canhoneiro", 6, 2],
      ["atiradora", 9, 2],
      ["cozinheiro", 11, 3],
      ["espadachim", 6, 5],
    ];
    let proximo = 0;
    const gastar = () => {
      let mexeu = true;
      while (mexeu) {
        mexeu = false;
        if (proximo < plano.length) {
          const [tipo, c, r] = plano[proximo];
          if (colocar(e, tipo, c, r)) {
            proximo++;
            mexeu = true;
            continue;
          }
        }
        for (const t of e.tripulantes) if (melhorar(e, t.id)) mexeu = true;
      }
    };
    for (let i = 0; i < ONDAS.length && !e.fim; i++) {
      gastar();
      rodarOnda(e);
    }
    expect(e.fim).toBe("vitoria");
    expect(e.vidas).toBeGreaterThan(0);
  });
});
