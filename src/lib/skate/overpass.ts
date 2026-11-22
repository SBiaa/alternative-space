import type { Pino, TipoSpot } from "./tipos";

// Pistas e skate shops do OpenStreetMap, em qualquer cidade, pela Overpass API.
// O navegador pede pro nosso servidor (/api/skate/osm), que consulta a Overpass e guarda em cache.

// O servidor principal vive lotado (responde 502/429): tenta os espelhos públicos em seguida.
export const OVERPASS_URLS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
];

// Área máxima por consulta (em graus): mais que isso é zoom longe demais e a Overpass demora.
export const AREA_MAX = 0.6 * 0.6;

export type Caixa = { sul: number; oeste: number; norte: number; leste: number };

// Arredonda a caixa pra uma grade de 0,05°: quem olha a mesma região reaproveita o cache.
export function arredondar(c: Caixa, passo = 0.05): Caixa {
  const baixo = (v: number) => Math.floor(v / passo) * passo;
  const cima = (v: number) => Math.ceil(v / passo) * passo;
  const f = (v: number) => Number(v.toFixed(4));
  return { sul: f(baixo(c.sul)), oeste: f(baixo(c.oeste)), norte: f(cima(c.norte)), leste: f(cima(c.leste)) };
}

export function lerCaixa(texto: string | null): Caixa | null {
  if (!texto) return null;
  const n = texto.split(",").map(Number);
  if (n.length !== 4 || n.some((v) => !Number.isFinite(v))) return null;
  const [sul, oeste, norte, leste] = n;
  if (sul >= norte || oeste >= leste || sul < -90 || norte > 90 || oeste < -180 || leste > 180) return null;
  return { sul, oeste, norte, leste };
}

export const areaGrande = (c: Caixa) => (c.norte - c.sul) * (c.leste - c.oeste) > AREA_MAX;

export function consulta(c: Caixa): string {
  const b = `${c.sul},${c.oeste},${c.norte},${c.leste}`;
  return `[out:json][timeout:20];
(
  nwr["leisure"="skatepark"](${b});
  nwr["sport"="skateboard"]["leisure"~"pitch|sports_centre|track"](${b});
  nwr["shop"="skate"](${b});
  nwr["shop"="sports"]["sport"~"skateboard"](${b});
);
out center tags 300;`;
}

type Elemento = {
  type: "node" | "way" | "relation";
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
};

function tipoDe(tags: Record<string, string>): TipoSpot {
  if (tags.shop) return "shop";
  return "pista";
}

function nomeDe(tags: Record<string, string>, tipo: TipoSpot): string {
  const nome = tags.name ?? tags["name:pt"] ?? tags.brand;
  if (nome) return nome;
  return tipo === "shop" ? "Skate shop sem nome" : "Pista sem nome";
}

// Converte a resposta da Overpass em pinos. Ignora o que vem sem coordenada.
export function paraPinos(resposta: unknown): Pino[] {
  const els = (resposta as { elements?: Elemento[] })?.elements;
  if (!Array.isArray(els)) return [];
  const vistos = new Set<string>();
  const pinos: Pino[] = [];
  for (const e of els) {
    const lat = e.lat ?? e.center?.lat;
    const lng = e.lon ?? e.center?.lon;
    if (typeof lat !== "number" || typeof lng !== "number") continue;
    const id = `osm-${e.type}-${e.id}`;
    if (vistos.has(id)) continue;
    vistos.add(id);
    const tags = e.tags ?? {};
    const tipo = tipoDe(tags);
    const descricao = [tags.surface && `piso: ${tags.surface}`, tags.lit === "yes" && "iluminada", tags.opening_hours && `horário: ${tags.opening_hours}`]
      .filter(Boolean)
      .join(" · ");
    pinos.push({ id, origem: "osm", tipo, nome: nomeDe(tags, tipo), lat, lng, ...(descricao && { descricao }) });
  }
  return pinos;
}
