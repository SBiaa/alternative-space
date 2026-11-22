import { cacheLife } from "next/cache";
import { NextResponse } from "next/server";
import { spotsNaCaixa } from "@/lib/skate/dados";
import { areaGrande, arredondar, consulta, lerCaixa, OVERPASS_URLS, paraPinos, type Caixa } from "@/lib/skate/overpass";
import type { Pino } from "@/lib/skate/tipos";

// Pinos do mapa na área visível: pistas e shops do OpenStreetMap + picos aprovados da comunidade.
//   GET /api/skate/pinos?caixa=sul,oeste,norte,leste

async function pinosOsm(chave: string): Promise<Pino[]> {
  "use cache";
  cacheLife("days");
  const [sul, oeste, norte, leste] = chave.split(",").map(Number);
  const body = new URLSearchParams({ data: consulta({ sul, oeste, norte, leste }) }).toString();
  const falhas: string[] = [];
  // Erro não entra no cache: a próxima visita tenta de novo.
  for (const url of OVERPASS_URLS) {
    try {
      const r = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": "AlternativeSpace-SkateUniverse/1.0" },
        body,
        signal: AbortSignal.timeout(10_000),
      });
      if (r.ok) return paraPinos(await r.json());
      falhas.push(`${new URL(url).host}: ${r.status}`);
    } catch (e) {
      falhas.push(`${new URL(url).host}: ${(e as Error).name}`);
    }
  }
  throw new Error(`Overpass indisponível (${falhas.join(", ")})`);
}

const chaveDe = (c: Caixa) => `${c.sul},${c.oeste},${c.norte},${c.leste}`;

export async function GET(req: Request) {
  const caixa = lerCaixa(new URL(req.url).searchParams.get("caixa"));
  if (!caixa) return NextResponse.json({ erro: "Caixa inválida." }, { status: 400 });
  if (areaGrande(caixa)) return NextResponse.json({ pinos: [], longe: true });

  const area = arredondar(caixa);
  const [osm, comunidade] = await Promise.allSettled([pinosOsm(chaveDe(area)), spotsNaCaixa(area)]);
  if (osm.status === "rejected") console.error("Skate Universe: OSM indisponível:", osm.reason);
  if (comunidade.status === "rejected") console.error("Skate Universe: banco indisponível:", comunidade.reason);

  const pinos = [
    ...(comunidade.status === "fulfilled" ? comunidade.value : []),
    ...(osm.status === "fulfilled" ? osm.value : []),
  ];
  return NextResponse.json(
    { pinos, avisos: { osm: osm.status === "rejected", comunidade: comunidade.status === "rejected" } },
    { headers: { "Cache-Control": "private, max-age=60" } },
  );
}
