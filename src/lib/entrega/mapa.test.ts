import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { ENTREGA } from "./config";
import { caminho, distancias, lerBairro, sortearPedido, tileDe, type Tiled } from "./mapa";

const bairro = lerBairro(JSON.parse(readFileSync("public/jogos/entrega-na-chuva/bairro.tmj", "utf8")) as Tiled);

describe("bairro", () => {
  it("tem pelo menos 8 coletas e 20 endereços", () => {
    expect(bairro.coletas.length).toBeGreaterThanOrEqual(8);
    expect(bairro.enderecos.length).toBeGreaterThanOrEqual(20);
  });
  it("todo ponto fica na rua e é alcançável de qualquer outro", () => {
    const d = distancias(bairro, tileDe(bairro, bairro.coletas[0].x, bairro.coletas[0].y));
    for (const p of [...bairro.coletas, ...bairro.enderecos]) expect(d[tileDe(bairro, p.x, p.y)], p.nome).toBeGreaterThanOrEqual(0);
  });
  it("cantos das rotas dos carros ficam na rua", () => {
    for (const r of bairro.rotas) for (const p of r) expect(bairro.andavel[tileDe(bairro, p.x, p.y)]).toBe(1);
  });
  it("pedido respeita a distância mínima e o prazo relaxado dá mais tempo", () => {
    let s = 1;
    const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 30; i++) {
      const p = sortearPedido(bairro, rnd);
      expect(p.distancia).toBeGreaterThanOrEqual(ENTREGA.pedido.distanciaMinTiles);
      expect(caminho(bairro, p.coleta.x, p.coleta.y, p.entrega.x, p.entrega.y).length).toBe(p.distancia + 1);
    }
    s = 7;
    const normal = sortearPedido(bairro, rnd);
    s = 7;
    expect(sortearPedido(bairro, rnd, true).prazoS).toBeGreaterThan(normal.prazoS);
  });
});
