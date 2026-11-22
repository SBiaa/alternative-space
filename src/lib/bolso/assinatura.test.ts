import fs from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { validarAventura } from "./conteudo";
import { personagemTeste } from "./fixtures";
import { escolher, iniciar, opcoesDaCena } from "./motor";
import { assinar, verificar } from "./assinatura";

beforeEach(() => {
  vi.stubEnv("NEON_AUTH_COOKIE_SECRET", "segredo-de-teste");
});

describe("estado assinado (partida sem conta)", () => {
  it("volta igual quando a assinatura bate", () => {
    const e = { cena: "a", folego: 6, itens: ["chave"] };
    expect(verificar(assinar(e))).toEqual(e);
  });

  it("recusa estado editado pelo navegador", () => {
    const [corpo, sel] = assinar({ folego: 1 }).split(".");
    const adulterado = Buffer.from(JSON.stringify({ folego: 99 })).toString("base64url");
    expect(verificar(`${adulterado}.${sel}`)).toBeNull();
    expect(verificar(`${corpo}.${sel}x`)).toBeNull();
    expect(verificar("lixo")).toBeNull();
    expect(verificar(undefined)).toBeNull();
  });

  it("não vale com outro segredo", () => {
    const t = assinar({ a: 1 });
    vi.stubEnv("NEON_AUTH_COOKIE_SECRET", "outro-segredo");
    expect(verificar(t)).toBeNull();
  });

  it("falha alto se o segredo não existe", () => {
    vi.stubEnv("NEON_AUTH_COOKIE_SECRET", "");
    expect(() => assinar({ a: 1 })).toThrow();
  });

  it("o estado de uma partida inteira cabe num cookie (menos de 4 KB), em toda aventura e a cada passo", () => {
    const pasta = path.join(process.cwd(), "content", "mesa-de-bolso");
    for (const f of fs.readdirSync(pasta).filter((x) => x.endsWith(".json"))) {
      const a = validarAventura(JSON.parse(fs.readFileSync(path.join(pasta, f), "utf8"))).aventura!;
      // Personagem com o nome mais longo e uma sequência que alterna as opções (inclusive voltar e repetir cenas).
      let e = iniciar(a, personagemTeste({ nome: "N".repeat(28) }), "x".repeat(14));
      for (let i = 0; i < 80 && !e.final; i++) {
        const livres = opcoesDaCena(a, e).filter((o) => !o.bloqueada);
        const r = escolher(a, e, livres[i % livres.length].opcao.id);
        if (!r.ok) throw new Error(r.erro);
        e = r.estado;
        expect(assinar(e).length, `${a.slug} passo ${i}`).toBeLessThan(3800);
      }
    }
  });
});
