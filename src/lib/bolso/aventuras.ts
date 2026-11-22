// Carrega as aventuras de content/mesa-de-bolso/*.json. Só no servidor. Aventura com grafo quebrado derruba a leitura.
import "server-only";
import fs from "node:fs";
import path from "node:path";
import { validarAventura, type Aventura } from "./conteudo";

const PASTA = path.join(process.cwd(), "content", "mesa-de-bolso");
const SLUG = /^[a-z0-9][a-z0-9-]*$/;

let cache: Map<string, Aventura> | null = null;

function carregar(): Map<string, Aventura> {
  if (cache) return cache;
  const mapa = new Map<string, Aventura>();
  const arquivos = fs.existsSync(PASTA) ? fs.readdirSync(PASTA).filter((f) => f.endsWith(".json")).sort() : [];
  for (const f of arquivos) {
    const { problemas, aventura } = validarAventura(JSON.parse(fs.readFileSync(path.join(PASTA, f), "utf8")));
    if (!aventura) throw new Error(`Aventura ${f} inválida:\n- ${problemas.join("\n- ")}`);
    if (aventura.slug !== f.replace(/\.json$/, "")) throw new Error(`Aventura ${f}: o slug tem que ser o nome do arquivo.`);
    mapa.set(aventura.slug, aventura);
  }
  cache = mapa;
  return mapa;
}

export const listarAventuras = (): Aventura[] => [...carregar().values()];

export function aventuraPorSlug(slug: string): Aventura | null {
  if (!SLUG.test(slug)) return null;
  return carregar().get(slug) ?? null;
}
