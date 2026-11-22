import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import type { Materia } from "./tipos";

// Jornal da cena: content/skate/jornal/<cidade>/*.mdx. Rascunhos só aparecem em desenvolvimento.
const DIR = path.join(process.cwd(), "content", "skate", "jornal");

type Arquivo = { meta: Materia; content: string };

const mostrarRascunhos = () => process.env.NODE_ENV === "development";

export function lerMateria(texto: string, cidade: string): Arquivo {
  const { data, content } = matter(texto);
  return {
    meta: {
      titulo: String(data.titulo ?? ""),
      slug: String(data.slug ?? ""),
      cidade,
      nomeCidade: String(data.nomeCidade ?? cidade),
      epoca: String(data.epoca ?? ""),
      ano: Number(data.ano ?? 0),
      autor: String(data.autor ?? ""),
      resumo: String(data.resumo ?? ""),
      ...(data.capa ? { capa: String(data.capa) } : {}),
      ...(data.rascunho ? { rascunho: true } : {}),
    },
    content,
  };
}

function todas(dir = DIR, rascunhos = mostrarRascunhos()): Arquivo[] {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .flatMap((d) =>
      fs
        .readdirSync(path.join(dir, d.name))
        .filter((f) => f.endsWith(".mdx"))
        .map((f) => lerMateria(fs.readFileSync(path.join(dir, d.name, f), "utf8"), d.name)),
    )
    .filter((a) => rascunhos || !a.meta.rascunho);
}

export type Cidade = { slug: string; nome: string; total: number; de: number; ate: number };

export function getCidades(dir = DIR, rascunhos?: boolean): Cidade[] {
  const mapa = new Map<string, Cidade>();
  for (const { meta } of todas(dir, rascunhos)) {
    const c = mapa.get(meta.cidade) ?? { slug: meta.cidade, nome: meta.nomeCidade, total: 0, de: meta.ano, ate: meta.ano };
    c.total += 1;
    c.de = Math.min(c.de, meta.ano);
    c.ate = Math.max(c.ate, meta.ano);
    mapa.set(meta.cidade, c);
  }
  return [...mapa.values()].sort((a, b) => a.nome.localeCompare(b.nome));
}

// Linha do tempo da cidade: dos começos até hoje.
export function getMaterias(cidade: string, dir = DIR, rascunhos?: boolean): Materia[] {
  return todas(dir, rascunhos)
    .filter((a) => a.meta.cidade === cidade)
    .map((a) => a.meta)
    .sort((a, b) => a.ano - b.ano || a.titulo.localeCompare(b.titulo));
}

export function getMateria(cidade: string, slug: string, dir = DIR, rascunhos?: boolean): Arquivo | null {
  return todas(dir, rascunhos).find((a) => a.meta.cidade === cidade && a.meta.slug === slug) ?? null;
}

// Todas as matérias, rascunhos incluídos (pros testes e pro generateStaticParams).
export const getTodasMaterias = (dir = DIR) => todas(dir, true).map((a) => a.meta);
