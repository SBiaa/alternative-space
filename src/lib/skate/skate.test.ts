import { describe, expect, it } from "vitest";
import { getManobras, lerManobra, problemasDasManobras } from "./manobras";
import { getTodasMaterias, lerMateria } from "./jornal";
import { areaGrande, arredondar, consulta, lerCaixa, paraPinos } from "./overpass";
import { validarSpot } from "./regras";
import { NIVEIS, type Manobra } from "./tipos";

const manobra = (slug: string, prerequisitos: string[] = [], nivel: Manobra["nivel"] = "basico"): Manobra => ({
  nome: slug,
  slug,
  nivel,
  ordem: 1,
  resumo: "",
  obstaculo: "chão liso",
  prerequisitos,
});

describe("guia de manobras", () => {
  it("lê o frontmatter", () => {
    const { meta, content } = lerManobra("---\nnome: Ollie\nslug: ollie\nnivel: basico\nordem: 5\nprerequisitos: [remada]\n---\n\nCorpo");
    expect(meta).toMatchObject({ nome: "Ollie", slug: "ollie", nivel: "basico", ordem: 5, prerequisitos: ["remada"] });
    expect(content.trim()).toBe("Corpo");
  });

  it("acha pré-requisito que não existe, slug repetido e nível inválido", () => {
    const erros = problemasDasManobras([manobra("ollie", ["remada"]), manobra("ollie"), manobra("x", [], "mestre" as Manobra["nivel"])]);
    expect(erros.some((e) => e.includes('"remada" não existe'))).toBe(true);
    expect(erros.some((e) => e.includes("slug repetido"))).toBe(true);
    expect(erros.some((e) => e.includes("nível inválido"))).toBe(true);
  });

  it("o conteúdo real não tem problemas e cobre os três níveis", () => {
    const lista = getManobras();
    expect(problemasDasManobras(lista)).toEqual([]);
    for (const n of NIVEIS) expect(lista.filter((m) => m.nivel === n).length, n).toBeGreaterThanOrEqual(3);
  });

  it("ordena do básico pro avançado", () => {
    const lista = getManobras();
    const idx = lista.map((m) => NIVEIS.indexOf(m.nivel));
    expect(idx).toEqual([...idx].sort((a, b) => a - b));
  });
});

describe("jornal da cena", () => {
  it("lê a matéria e marca rascunho", () => {
    const { meta } = lerMateria("---\ntitulo: Começo\nslug: comeco\nnomeCidade: Santos\nano: 1978\nrascunho: true\n---\n", "santos");
    expect(meta).toMatchObject({ titulo: "Começo", cidade: "santos", nomeCidade: "Santos", ano: 1978, rascunho: true });
  });

  it("todas as matérias têm título, slug e ano", () => {
    for (const m of getTodasMaterias()) {
      expect(m.titulo, m.slug).not.toBe("");
      expect(m.slug).toMatch(/^[a-z0-9-]+$/);
      expect(m.cidade).toMatch(/^[a-z0-9-]+$/);
      expect(m.ano, m.slug).toBeGreaterThan(1900);
    }
  });
});

describe("cadastro de pico", () => {
  const ok = { tipo: "pico", nome: "  Borda   da praça ", cidade: "Santos", lat: -23.96, lng: -46.33, obstaculos: ["borda"] };

  it("aceita e limpa espaços", () => {
    const r = validarSpot(ok);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.spot).toMatchObject({ nome: "Borda da praça", descricao: "", obstaculos: ["borda"] });
  });

  it("recusa sem local, nome curto, tipo ou obstáculo desconhecido", () => {
    expect(validarSpot({ ...ok, lat: 0, lng: 0 })).toEqual({ ok: false, erro: "Marque o lugar no mapa." });
    expect(validarSpot({ ...ok, lat: 200 })).toEqual({ ok: false, erro: "Marque o lugar no mapa." });
    expect(validarSpot({ ...ok, nome: "ab" }).ok).toBe(false);
    expect(validarSpot({ ...ok, tipo: "praia" }).ok).toBe(false);
    expect(validarSpot({ ...ok, obstaculos: ["piscina"] }).ok).toBe(false);
    expect(validarSpot({ ...ok, nome: "x".repeat(61) }).ok).toBe(false);
  });
});

describe("OpenStreetMap", () => {
  it("lê e valida a caixa", () => {
    expect(lerCaixa("-24,-47,-23,-46")).toEqual({ sul: -24, oeste: -47, norte: -23, leste: -46 });
    expect(lerCaixa("-23,-47,-24,-46")).toBeNull();
    expect(lerCaixa("a,b,c,d")).toBeNull();
    expect(lerCaixa(null)).toBeNull();
  });

  it("arredonda pra fora na grade e recusa área grande", () => {
    expect(arredondar({ sul: -23.96, oeste: -46.34, norte: -23.91, leste: -46.29 })).toEqual({ sul: -24, oeste: -46.35, norte: -23.9, leste: -46.25 });
    expect(areaGrande({ sul: -30, oeste: -50, norte: -20, leste: -40 })).toBe(true);
    expect(consulta({ sul: 1, oeste: 2, norte: 3, leste: 4 })).toContain('nwr["leisure"="skatepark"](1,2,3,4)');
  });

  it("converte a resposta em pinos", () => {
    const pinos = paraPinos({
      elements: [
        { type: "node", id: 1, lat: -23.9, lon: -46.3, tags: { leisure: "skatepark", name: "Pista do Emissário", lit: "yes" } },
        { type: "way", id: 2, center: { lat: -23.8, lon: -46.2 }, tags: { shop: "skate" } },
        { type: "way", id: 3, tags: { leisure: "skatepark" } },
        { type: "node", id: 1, lat: -23.9, lon: -46.3, tags: {} },
      ],
    });
    expect(pinos).toEqual([
      { id: "osm-node-1", origem: "osm", tipo: "pista", nome: "Pista do Emissário", lat: -23.9, lng: -46.3, descricao: "iluminada" },
      { id: "osm-way-2", origem: "osm", tipo: "shop", nome: "Skate shop sem nome", lat: -23.8, lng: -46.2 },
    ]);
    expect(paraPinos(null)).toEqual([]);
  });
});
