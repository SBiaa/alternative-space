// Leitura dos capítulos em content/fanzine/. Só roda no servidor: o capítulo completo tem ligações, resposta e dicas.
import "server-only";
import fs from "node:fs";
import path from "node:path";
import { lerCapitulo } from "./conteudo";
import type { Capitulo, ResumoCapitulo } from "./tipos";

const RAIZ = path.join(process.cwd(), "content", "fanzine");
const SLUG = /^[a-z0-9][a-z0-9-]{0,47}$/;

export const hojeISO = (agora = new Date()) => agora.toISOString().slice(0, 10);

/** Capítulo publicado é o que tem data de publicação de hoje ou antes: dá pra deixar um por mês já pronto na pasta. */
export const publicado = (cap: Capitulo, agora = new Date()) => cap.publicadoEm <= hojeISO(agora);

export function slugsDeCapitulos(): string[] {
  if (!fs.existsSync(RAIZ)) return [];
  return fs.readdirSync(RAIZ, { withFileTypes: true }).filter((d) => d.isDirectory() && SLUG.test(d.name)).map((d) => d.name);
}

/** Lê e valida um capítulo (qualquer data). Devolve null se o slug não existe. */
export function lerCapituloArquivo(slug: string): Capitulo | null {
  if (typeof slug !== "string" || !SLUG.test(slug)) return null;
  const arquivo = path.join(RAIZ, slug, "capitulo.json");
  if (!fs.existsSync(arquivo)) return null;
  const cap = lerCapitulo(JSON.parse(fs.readFileSync(arquivo, "utf8")));
  if (cap.slug !== slug) throw new Error(`capítulo ${slug}: o slug do JSON (${cap.slug}) não bate com a pasta`);
  return cap;
}

export function capituloPublicado(slug: string, agora = new Date()): Capitulo | null {
  const cap = lerCapituloArquivo(slug);
  return cap && publicado(cap, agora) ? cap : null;
}

export function capitulosPublicados(agora = new Date()): Capitulo[] {
  return slugsDeCapitulos()
    .map((s) => lerCapituloArquivo(s))
    .filter((c): c is Capitulo => c !== null && publicado(c, agora))
    .sort((a, b) => a.ordem - b.ordem);
}

export const resumoDe = (c: Capitulo): ResumoCapitulo => ({ slug: c.slug, ordem: c.ordem, titulo: c.titulo, resumo: c.resumo, selo: c.selo, totalPistas: c.pistas.length });

/** Texto MDX de uma página (já validado: o nome do arquivo vem do capitulo.json e não pode sair da pasta). */
export function lerMdx(cap: Capitulo, paginaId: string): string {
  const p = cap.paginas.find((x) => x.id === paginaId);
  if (!p) return "";
  const arquivo = path.join(RAIZ, cap.slug, "paginas", path.basename(p.mdx));
  return fs.existsSync(arquivo) ? fs.readFileSync(arquivo, "utf8") : "";
}
