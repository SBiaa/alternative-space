import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { NIVEIS, type Manobra, type Nivel } from "./tipos";

// Guia de manobras: um .mdx por manobra em content/skate/manobras (mesmo esquema do blog).
const DIR = path.join(process.cwd(), "content", "skate", "manobras");

type Arquivo = { meta: Manobra; content: string };

export function lerManobra(texto: string): Arquivo {
  const { data, content } = matter(texto);
  const meta: Manobra = {
    nome: String(data.nome ?? ""),
    slug: String(data.slug ?? ""),
    nivel: data.nivel as Nivel,
    ordem: Number(data.ordem ?? 99),
    resumo: String(data.resumo ?? ""),
    obstaculo: String(data.obstaculo ?? "chão"),
    prerequisitos: Array.isArray(data.prerequisitos) ? data.prerequisitos.map(String) : [],
    ...(data.video ? { video: String(data.video) } : {}),
  };
  return { meta, content };
}

function todos(dir = DIR): Arquivo[] {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".mdx"))
    .map((f) => lerManobra(fs.readFileSync(path.join(dir, f), "utf8")));
}

const ordenar = (a: Manobra, b: Manobra) => NIVEIS.indexOf(a.nivel) - NIVEIS.indexOf(b.nivel) || a.ordem - b.ordem || a.nome.localeCompare(b.nome);

export function getManobras(dir = DIR): Manobra[] {
  return todos(dir).map((a) => a.meta).sort(ordenar);
}

export function getManobra(slug: string, dir = DIR): Arquivo | null {
  return todos(dir).find((a) => a.meta.slug === slug) ?? null;
}

// Problemas no conteúdo (usado pelos testes): nível inválido, slug repetido, pré-requisito que não existe.
export function problemasDasManobras(lista: Manobra[]): string[] {
  const slugs = new Set<string>();
  const erros: string[] = [];
  for (const m of lista) {
    if (!m.nome || !m.slug) erros.push(`manobra sem nome ou slug: ${JSON.stringify(m)}`);
    if (!NIVEIS.includes(m.nivel)) erros.push(`${m.slug}: nível inválido "${m.nivel}"`);
    if (slugs.has(m.slug)) erros.push(`${m.slug}: slug repetido`);
    slugs.add(m.slug);
  }
  for (const m of lista) {
    for (const p of m.prerequisitos) {
      if (!slugs.has(p)) erros.push(`${m.slug}: pré-requisito "${p}" não existe`);
      if (p === m.slug) erros.push(`${m.slug}: é pré-requisito de si mesma`);
    }
  }
  return erros;
}
